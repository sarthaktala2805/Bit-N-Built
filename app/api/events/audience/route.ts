// StageX AI — Server-side Audience Event Lookup Route
// GET /api/events/audience?code=ST8X9B
// Allows audience members anywhere in the world to fetch public event data by event code.

import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb, isFirebaseConfigured, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { validateEventCode } from "@/lib/event-code";

const NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCode = searchParams.get("code") || "";
    const val = validateEventCode(rawCode);

    if (!val.valid) {
      return NextResponse.json(
        { ok: false, success: false, error: val.error || "A valid 6-character event code is required." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cleanCode = val.code;

    if (!isFirebaseConfigured()) {
      return NextResponse.json(
        { ok: false, success: false, error: "Firebase is not configured on the server." },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    const targetDb = getFirebaseDb() || db;
    if (!targetDb) {
      return NextResponse.json(
        { ok: false, success: false, error: "Database connection unavailable." },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // 1. Primary lookup: publicEvents/{cleanCode}
    let snapshot;
    try {
      let docRef = doc(targetDb, "publicEvents", cleanCode);
      snapshot = await getDoc(docRef);

      // 2. Legacy fallback: public_events/{cleanCode}
      if (!snapshot.exists()) {
        docRef = doc(targetDb, "public_events", cleanCode);
        snapshot = await getDoc(docRef);
      }
    } catch (fbErr: unknown) {
      console.error("[API Audience Firestore Lookup Error]:", fbErr);
      const errMsg = (fbErr as Error)?.message || "Database query failed";
      const isPermission = errMsg.toLowerCase().includes("permission") || (fbErr as { code?: string })?.code?.includes("permission");
      return NextResponse.json(
        {
          ok: false,
          success: false,
          error: isPermission
            ? "Firestore permission denied. Please ensure Firestore Security Rules allow public read on publicEvents/{eventCode} in Firebase Console."
            : `Failed to query event code: ${errMsg}`,
          details: errMsg,
        },
        { status: isPermission ? 403 : 500, headers: NO_CACHE_HEADERS }
      );
    }

    if (!snapshot.exists()) {
      return NextResponse.json(
        { ok: false, success: false, error: "EVENT_NOT_FOUND" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const data = snapshot.data();
    if (!data) {
      return NextResponse.json(
        { ok: false, success: false, error: "EVENT_NOT_FOUND" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // If marked deleted or public access is disabled, return clean not-found response
    if (data.isDeleted === true || data.publicEnabled === false) {
      return NextResponse.json(
        { ok: false, success: false, error: "EVENT_NOT_FOUND" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // Exact code matching check
    if (data.eventCode && String(data.eventCode).trim().toUpperCase() !== cleanCode) {
      return NextResponse.json(
        { ok: false, success: false, error: "EVENT_NOT_FOUND" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // If join is disabled, report joining disabled
    if (data.joinEnabled === false) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          joinDisabled: true,
          error: "This event is currently not accepting audience members.",
        },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Build public bundle
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

    return NextResponse.json(
      {
        ok: true,
        success: true,
        data: {
          event: sanitizedEvent,
          sessions: Array.isArray(data.sessions) ? data.sessions : [],
          speakers: Array.isArray(data.speakers) ? data.speakers : [],
          updatedAt: typeof data.publicUpdatedAt === "number" ? data.publicUpdatedAt : (data.updatedAt || Date.now()),
          publicEnabled: true,
          joinEnabled: true,
          ownerUserId: sanitizedEvent.ownerUserId,
        },
      },
      {
        headers: NO_CACHE_HEADERS,
      }
    );
  } catch (err) {
    console.error("[API Audience Event Lookup Error]:", err);
    return NextResponse.json(
      { ok: false, success: false, error: "Failed to look up event code." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
