// StageX AI — Public Event Resource Delivery & Download Gateway
// Validates event-scoped public access, enforces content disposition for native downloads,
// generates short-lived Supabase signed download URLs for private bucket files,
// and streams files securely without exposing private internal storage structure or secret keys.

import { NextRequest, NextResponse } from "next/server";
import { validateEventCode } from "@/lib/event-code";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { PublicEventDoc, EventResource } from "@/types";
import {
  getSupabaseServerClient,
  isSupabaseServerConfigured,
  STAGEX_STORAGE_BUCKET,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCode = searchParams.get("code") || "";
    const resourceId = searchParams.get("id") || "";
    const isDownload = searchParams.get("download") === "1";

    // 1. Validate Event Code
    const codeVal = validateEventCode(rawCode);
    if (!codeVal.valid) {
      return NextResponse.json(
        { ok: false, error: codeVal.error || "Valid 6-character event code required." },
        { status: 400 }
      );
    }

    if (!resourceId) {
      return NextResponse.json(
        { ok: false, error: "Resource ID parameter is required." },
        { status: 400 }
      );
    }

    const eventCode = codeVal.code;

    // 2. Fetch public event document from Firestore
    let publicDoc: PublicEventDoc | null = null;

    if (isFirebaseConfigured()) {
      try {
        const db = getFirebaseDb();
        if (db) {
          const snap = await getDoc(doc(db, "publicEvents", eventCode));
          if (snap.exists()) {
            publicDoc = snap.data() as PublicEventDoc;
          }
        }
      } catch (err) {
        console.warn("[Resource Gateway: Firestore lookup warning]", err);
      }
    }

    // 3. Authorization check: Event must exist, be public, and not be deleted
    if (publicDoc) {
      if (publicDoc.publicEnabled === false || (publicDoc as unknown as Record<string, unknown>).isDeleted === true) {
        return NextResponse.json(
          { ok: false, success: false, error: "EVENT_NOT_FOUND" },
          { status: 404, headers: { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate" } }
        );
      }
    } else if (isFirebaseConfigured()) {
      // In configured Firebase environments, missing public document means event was deleted or does not exist
      return NextResponse.json(
        { ok: false, success: false, error: "EVENT_NOT_FOUND" },
        { status: 404, headers: { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate" } }
      );
    }

    // 4. Find the specific resource inside the event
    const resources: EventResource[] = Array.isArray(publicDoc?.resources)
      ? publicDoc.resources
      : [];

    const targetResource = resources.find((r) => r.id === resourceId);

    if (publicDoc && !targetResource) {
      return NextResponse.json(
        { ok: false, success: false, error: "Resource not found in this event." },
        { status: 404, headers: { "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate" } }
      );
    }

    const fileUrl = targetResource?.url || searchParams.get("url") || "";
    const storagePath = targetResource?.storagePath || searchParams.get("path") || "";
    const fileName = targetResource?.fileName || searchParams.get("filename") || "stagex-resource";
    const mimeType = targetResource?.fileMimeType || "application/octet-stream";

    // 5. If resource is an external streaming embed (e.g. YouTube), redirect directly
    if (fileUrl.includes("youtube.com") || fileUrl.includes("youtu.be")) {
      return NextResponse.redirect(fileUrl);
    }

    // 6. If resource has a storagePath in private Supabase Storage, generate a signed download URL
    let downloadSourceUrl = fileUrl;

    if (storagePath && isSupabaseServerConfigured()) {
      try {
        const supabase = getSupabaseServerClient();
        // Short-lived signed download URL (60 seconds)
        const { data: signedData, error: signError } = await supabase.storage
          .from(STAGEX_STORAGE_BUCKET)
          .createSignedUrl(storagePath, 60);

        if (!signError && signedData?.signedUrl) {
          downloadSourceUrl = signedData.signedUrl;
        } else {
          console.warn("[Supabase createSignedUrl error]", signError);
        }
      } catch (err) {
        console.warn("[Supabase signed URL generation failed]", err);
      }
    }

    // 7. Check if file requires re-upload (legacy local or broken pointer)
    if (!downloadSourceUrl || downloadSourceUrl === resourceId || downloadSourceUrl.startsWith("file_")) {
      return NextResponse.json(
        {
          ok: false,
          code: "REUPLOAD_REQUIRED",
          error: "File needs to be re-uploaded.",
        },
        { status: 410 }
      );
    }

    // 8. Stream binary content directly to enforce Content-Disposition (Download vs Inline)
    if (downloadSourceUrl.startsWith("http://") || downloadSourceUrl.startsWith("https://")) {
      try {
        const upstream = await fetch(downloadSourceUrl);
        if (upstream.ok && upstream.body) {
          const disposition = isDownload ? "attachment" : "inline";
          const safeFilename = fileName.replace(/[^\w.-]/g, "_");

          const headers = new Headers();
          headers.set("Content-Type", upstream.headers.get("content-type") || mimeType);
          headers.set(
            "Content-Disposition",
            `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
          );
          headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

          const contentLength = upstream.headers.get("content-length");
          if (contentLength) {
            headers.set("Content-Length", contentLength);
          }

          return new NextResponse(upstream.body, {
            status: 200,
            headers,
          });
        }
      } catch (fetchErr) {
        console.warn("[Resource Gateway: Upstream fetch failed, redirecting]", fetchErr);
      }

      // Fallback: Redirect to signed download URL
      return NextResponse.redirect(downloadSourceUrl);
    }

    return NextResponse.json(
      { ok: false, error: "File is currently unavailable." },
      { status: 404 }
    );
  } catch (err) {
    console.error("[Resource Download Gateway Error]", err);
    return NextResponse.json(
      { ok: false, error: "File is currently unavailable." },
      { status: 500 }
    );
  }
}
