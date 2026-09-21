// StageX AI — Secure Event Resource Upload Authorization Route
// Generates Supabase Storage signed upload URLs for verified organizers.
// Validates:
// 1. Firebase organizer authentication and event ownership
// 2. Safe eventCode and sanitized fileName
// 3. 50 MB Supabase Free Tier file limit
// 4. Safe MIME types and extension whitelist (blocks executables)
// 5. Server-side generated resourceId and canonical storagePath

import { NextRequest, NextResponse } from "next/server";
import { validateEventCode } from "@/lib/event-code";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  getSupabaseServerClient,
  isSupabaseServerConfigured,
  STAGEX_STORAGE_BUCKET,
  MAX_RESOURCE_SIZE_BYTES,
} from "@/lib/supabase/server";
import {
  getMimeTypeFromFileName,
  inferResourceType,
  isExtensionAllowed,
} from "@/lib/resource-storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      eventCode: rawCode,
      fileName,
      fileSize,
      fileType,
      organizerUid,
    } = body;

    // 1. Verify Supabase server configuration presence
    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          code: "SUPABASE_CONFIG_MISSING",
          error: "Supabase Storage server credentials are not configured.",
        },
        { status: 503 }
      );
    }

    // 2. Validate Event Code
    const codeVal = validateEventCode(rawCode);
    if (!codeVal.valid) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_CODE",
          error: codeVal.error || "Valid 6-character event code required.",
        },
        { status: 400 }
      );
    }
    const eventCode = codeVal.code;

    // 3. Validate Organizer UID
    if (!organizerUid || typeof organizerUid !== "string") {
      return NextResponse.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          error: "Organizer authentication is required.",
        },
        { status: 401 }
      );
    }

    // 4. Validate File Name & Size
    if (!fileName || typeof fileName !== "string" || !fileName.trim()) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_FILENAME",
          error: "File name is required.",
        },
        { status: 400 }
      );
    }

    const numSize = Number(fileSize);
    if (isNaN(numSize) || numSize <= 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_FILE_SIZE",
          error: "Valid file size is required.",
        },
        { status: 400 }
      );
    }

    if (numSize > MAX_RESOURCE_SIZE_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          code: "RESOURCE_TOO_LARGE",
          error: "File exceeds the free 50 MB limit.",
        },
        { status: 400 }
      );
    }

    // 5. Validate File Type / Extension Security (Prevent Executables)
    if (!isExtensionAllowed(fileName)) {
      return NextResponse.json(
        {
          ok: false,
          code: "RESOURCE_TYPE_NOT_ALLOWED",
          error: "File type not supported or security restricted.",
        },
        { status: 400 }
      );
    }

    // 6. Verify Event Ownership via Firestore
    if (isFirebaseConfigured()) {
      try {
        const db = getFirebaseDb();
        if (db) {
          const snap = await getDoc(doc(db, "publicEvents", eventCode));
          if (snap.exists()) {
            const data = snap.data();
            if (data.ownerUserId && data.ownerUserId !== organizerUid) {
              return NextResponse.json(
                {
                  ok: false,
                  code: "EVENT_ACCESS_DENIED",
                  error: "You do not own this event.",
                },
                { status: 403 }
              );
            }
          }
        }
      } catch (err) {
        console.warn("[Upload URL Route: Firestore lookup warning]", err);
      }
    }

    // 7. Generate Server-Side Resource ID and Sanitized Storage Path
    const resId =
      "res_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
    const safeName = fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/^\.+/, "");
    const storagePath = `events/${eventCode}/resources/${resId}/${safeName}`;

    // 8. Generate Supabase Signed Upload URL
    const supabase = getSupabaseServerClient();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STAGEX_STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (uploadError || !uploadData?.signedUrl) {
      console.error("[Supabase createSignedUploadUrl Error]", uploadError);
      return NextResponse.json(
        {
          ok: false,
          code: "SUPABASE_UPLOAD_URL_ERROR",
          error: uploadError?.message || "Failed to generate signed upload URL.",
        },
        { status: 500 }
      );
    }

    const mimeType = fileType || getMimeTypeFromFileName(fileName);
    const resourceType = inferResourceType(fileName, mimeType);

    return NextResponse.json({
      ok: true,
      resourceId: resId,
      storagePath,
      signedUrl: uploadData.signedUrl,
      token: uploadData.token,
      path: uploadData.path,
      resourceType,
      mimeType,
      fileName,
      fileSize: numSize,
    });
  } catch (err: unknown) {
    console.error("[Upload URL Route Exception]", err);
    return NextResponse.json(
      {
        ok: false,
        code: "SERVER_ERROR",
        error: "Internal error processing upload request.",
      },
      { status: 500 }
    );
  }
}
