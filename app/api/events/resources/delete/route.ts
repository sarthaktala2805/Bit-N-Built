// StageX AI — Secure Event Resource Deletion Route
// Verifies organizer ownership before deleting objects from private Supabase Storage bucket.

import { NextRequest, NextResponse } from "next/server";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  getSupabaseServerClient,
  isSupabaseServerConfigured,
  STAGEX_STORAGE_BUCKET,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { storagePath, eventCode, organizerUid } = body;

    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json(
        { ok: false, error: "Storage path is required." },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Supabase Storage server credentials missing." },
        { status: 503 }
      );
    }

    // Security: Check event ownership if eventCode is provided
    if (eventCode && isFirebaseConfigured()) {
      try {
        const db = getFirebaseDb();
        if (db) {
          const snap = await getDoc(doc(db, "publicEvents", eventCode));
          if (snap.exists()) {
            const data = snap.data();
            if (data.ownerUserId && organizerUid && data.ownerUserId !== organizerUid) {
              return NextResponse.json(
                { ok: false, error: "Unauthorized: You do not own this event." },
                { status: 403 }
              );
            }
          }
        }
      } catch (lookupErr) {
        console.warn("[Resource Delete: Firestore lookup error]", lookupErr);
      }
    }

    // Delete object from private Supabase Storage bucket
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.storage
      .from(STAGEX_STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error("[Supabase Storage remove error]", error);
      return NextResponse.json(
        { ok: false, error: error.message || "Failed to delete file from storage." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, storagePath });
  } catch (err: unknown) {
    console.error("[Resource Delete Route Exception]", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
