// StageX AI — Server-side Audience Event Lookup Route
// GET /api/events/audience?code=ST8X9B
// Allows audience members to fetch event data by access code with server-side caching and Firestore lookup

import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb, isFirebaseConfigured, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCode = searchParams.get("code") || "";
    const cleanCode = rawCode.trim().toUpperCase();

    if (!cleanCode || cleanCode.length !== 6) {
      return NextResponse.json(
        { ok: false, error: "A valid 6-character event code is required." },
        { status: 400 }
      );
    }

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

    const docRef = doc(targetDb, "public_events", cleanCode);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return NextResponse.json(
        { ok: false, error: `No event found matching code "${cleanCode}".` },
        { status: 404 }
      );
    }

    const data = snapshot.data();
    if (!data || !data.event) {
      return NextResponse.json(
        { ok: false, error: "Event data format is invalid." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          event: data.event,
          sessions: Array.isArray(data.sessions) ? data.sessions : [],
          speakers: Array.isArray(data.speakers) ? data.speakers : [],
          updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("[API Audience Event Lookup Error]:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to look up event code." },
      { status: 500 }
    );
  }
}
