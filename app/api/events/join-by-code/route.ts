// StageX AI — Server-side Join By Code Endpoint
// POST /api/events/join-by-code
// Request body: { eventCode: string }
// Resolves global public event directory entry and returns permitted public event bundle.

import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb, isFirebaseConfigured, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { validateEventCode } from "@/lib/event-code";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawCode = body?.eventCode || "";
    const val = validateEventCode(rawCode);

    if (!val.valid) {
      return NextResponse.json(
        { ok: false, error: val.error || "A valid 6-character event code is required." },
        { status: 400 }
      );
    }

    const cleanCode = val.code;

    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Firebase is not configured on the server." },
        { status: 503 }
      );
    }

    const targetDb = getFirebaseDb() || db;
    if (!targetDb) {
      return NextResponse.json(
        { ok: false, error: "Database connection unavailable." },
        { status: 500 }
      );
    }

    // 1. Primary lookup: publicEvents/{cleanCode}
    let docRef = doc(targetDb, "publicEvents", cleanCode);
    let snapshot = await getDoc(docRef);

    // 2. Legacy fallback: public_events/{cleanCode}
    if (!snapshot.exists()) {
      docRef = doc(targetDb, "public_events", cleanCode);
      snapshot = await getDoc(docRef);
    }

    if (!snapshot.exists()) {
      return NextResponse.json(
        { ok: false, error: `No event found matching code "${cleanCode}".` },
        { status: 404 }
      );
    }

    const data = snapshot.data();
    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Event data format is invalid." },
        { status: 500 }
      );
    }

    if (data.publicEnabled === false) {
      return NextResponse.json(
        { ok: false, error: `No event found matching code "${cleanCode}".` },
        { status: 404 }
      );
    }

    if (data.joinEnabled === false) {
      return NextResponse.json(
        {
          ok: false,
          joinDisabled: true,
          error: "This event is currently not accepting audience members.",
        },
        { status: 403 }
      );
    }

    const rawEvent = (data.event as Record<string, unknown>) || {};
    const sanitizedEvent = {
      id: data.eventId || rawEvent.id || "event_" + cleanCode,
      name: data.eventName || rawEvent.name || "Event",
      type: data.eventType || rawEvent.type || "Conference",
      status: data.eventStatus || rawEvent.status || "Scheduled",
      date: data.startDate || rawEvent.date || "",
      startDate: data.startDate || rawEvent.startDate || "",
      endDate: data.endDate || rawEvent.endDate || data.startDate || "",
      startTime: data.startTime || rawEvent.startTime || "09:00",
      endTime: data.endTime || rawEvent.endTime || "17:00",
      startDateTime: typeof data.scheduledStart === "number" ? data.scheduledStart : (rawEvent.startDateTime || 0),
      endDateTime: typeof data.scheduledEnd === "number" ? data.scheduledEnd : (rawEvent.endDateTime || 0),
      venue: data.venue || rawEvent.venue || "",
      description: data.description ?? rawEvent.description ?? "",
      organizer: data.organizer ?? rawEvent.organizer ?? "",
      posterUrl: data.posterUrl ?? rawEvent.posterUrl ?? null,
      accessCode: cleanCode,
      resources: Array.isArray(data.resources)
        ? data.resources
        : Array.isArray(rawEvent.resources)
        ? rawEvent.resources
        : [],
      endedAt: typeof rawEvent.endedAt === "number" ? rawEvent.endedAt : null,
      publicEnabled: true,
      joinEnabled: true,
      ownerUserId: data.ownerUserId || rawEvent.ownerUserId || "organizer",
    };

    return NextResponse.json({
      ok: true,
      data: {
        event: sanitizedEvent,
        sessions: Array.isArray(data.sessions) ? data.sessions : [],
        speakers: Array.isArray(data.speakers) ? data.speakers : [],
        updatedAt: typeof data.publicUpdatedAt === "number" ? data.publicUpdatedAt : (data.updatedAt || Date.now()),
        publicEnabled: true,
        joinEnabled: true,
        ownerUserId: sanitizedEvent.ownerUserId,
      },
    });
  } catch (err) {
    console.error("[API Join-By-Code Error]:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to join event." },
      { status: 500 }
    );
  }
}
