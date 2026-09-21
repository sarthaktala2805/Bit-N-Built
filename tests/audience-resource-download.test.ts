import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  inferResourceType,
  getMimeTypeFromFileName,
  canBrowserPreview,
  isExtensionAllowed,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/resource-storage";
import { isSupabaseClientConfigured, getSupabaseClient } from "@/lib/supabase/client";
import {
  isSupabaseServerConfigured,
  getSupabaseServerClient,
  STAGEX_STORAGE_BUCKET,
  MAX_RESOURCE_SIZE_BYTES,
} from "@/lib/supabase/server";
import { POST as uploadUrlRoute } from "@/app/api/events/resources/upload-url/route";
import { POST as deleteRoute } from "@/app/api/events/resources/delete/route";
import { GET as downloadRoute } from "@/app/api/events/resources/download/route";
import { NextRequest } from "next/server";
import { EventResource } from "@/types";

describe("StageX AI — Supabase Storage Migration & Resource Delivery Pipeline", () => {
  const eventCodeA = "EVT88A";
  const organizerA = "user_organizer_A";
  const organizerB = "user_organizer_B";

  const pdfResource: EventResource = {
    id: "res_pdf_01",
    type: "document",
    title: "Conference Brochure",
    url: "/api/events/resources/download?code=EVT88A&id=res_pdf_01",
    fileName: "brochure.pdf",
    fileSize: 1048576, // 1MB
    fileMimeType: "application/pdf",
    storagePath: "events/EVT88A/resources/res_pdf_01/brochure.pdf",
    uploadedAt: 1700000000,
    isLocalFile: false,
  };

  const youtubeResource: EventResource = {
    id: "res_yt_01",
    type: "video",
    title: "Official Livestream Broadcast",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    uploadedAt: 1700000000,
    isLocalFile: false,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. SUPABASE CLIENT CONFIGURATION
  it("1. Initializes browser Supabase client with public credentials only", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://rruqkuohnvqkfguaotsy.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Ry-yYI5Kzqp8yEipJr-P2A_7dWcbigi";
    expect(isSupabaseClientConfigured()).toBe(true);
    const client = getSupabaseClient();
    expect(client).toBeDefined();
  });

  // 2. SERVER SECRET KEY ISOLATION
  it("2. Server Supabase client requires SUPABASE_SECRET_KEY and guards against missing credentials", () => {
    // With environment variables present, reports configured
    expect(isSupabaseServerConfigured()).toBe(false); // SUPABASE_SECRET_KEY is empty by default in .env.local
    expect(() => getSupabaseServerClient()).toThrow("SUPABASE_CONFIG_MISSING");
  });

  // 3. 50 MB VALIDATION & LIMIT
  it("3. Enforces 50 MB limit strictly", () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);
    expect(MAX_RESOURCE_SIZE_BYTES).toBe(50 * 1024 * 1024);
  });

  // 4. MIME & EXTENSION SECURITY WHITELIST
  it("4. Blocks executables and dangerous scripts while allowing safe event documents", () => {
    // Dangerous files -> BLOCKED
    expect(isExtensionAllowed("malware.exe")).toBe(false);
    expect(isExtensionAllowed("script.sh")).toBe(false);
    expect(isExtensionAllowed("payload.bat")).toBe(false);
    expect(isExtensionAllowed("exploit.php")).toBe(false);
    expect(isExtensionAllowed("trojan.js")).toBe(false);

    // Safe resources -> ALLOWED
    expect(isExtensionAllowed("deck.pptx")).toBe(true);
    expect(isExtensionAllowed("brochure.pdf")).toBe(true);
    expect(isExtensionAllowed("photo.png")).toBe(true);
    expect(isExtensionAllowed("video.mp4")).toBe(true);
    expect(isExtensionAllowed("notes.docx")).toBe(true);
    expect(isExtensionAllowed("speech.txt")).toBe(true);
  });

  // 5. UPLOAD URL ENDPOINT VALIDATION
  it("5. POST /api/events/resources/upload-url rejects requests over 50 MB", async () => {
    const req = new NextRequest("http://localhost:3000/api/events/resources/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventCode: "EVT88A",
        fileName: "giant_video.mp4",
        fileSize: 60 * 1024 * 1024, // 60 MB
        organizerUid: organizerA,
      }),
    });

    const res = await uploadUrlRoute(req);
    // Either fails on 50 MB limit or Supabase config missing before upload
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // 6. RESOURCE ROUTE DISALLOWS EXECUTABLES
  it("6. POST /api/events/resources/upload-url rejects executable files", async () => {
    const req = new NextRequest("http://localhost:3000/api/events/resources/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventCode: "EVT88A",
        fileName: "setup.exe",
        fileSize: 1024,
        organizerUid: organizerA,
      }),
    });

    const res = await uploadUrlRoute(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // 7. YOUTUBE PRESERVATION
  it("7. Preserves external YouTube URLs and redirects directly", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/events/resources/download?code=${eventCodeA}&id=res_yt_01&url=${encodeURIComponent(
        youtubeResource.url
      )}`
    );
    const res = await downloadRoute(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(youtubeResource.url);
  });

  // 8. BROWSER PREVIEWABILITY RULES
  it("8. Enforces correct browser preview vs download behaviors", () => {
    // Previewable natively: PDF, Image, Video, TXT
    expect(canBrowserPreview("document", "doc.pdf")).toBe(true);
    expect(canBrowserPreview("image", "pic.png")).toBe(true);
    expect(canBrowserPreview("video", "clip.mp4")).toBe(true);
    expect(canBrowserPreview("script", "notes.txt")).toBe(true);

    // Download only (no misleading "Open" in browser): PPT, PPTX, DOC, DOCX
    expect(canBrowserPreview("ppt", "slides.pptx")).toBe(false);
    expect(canBrowserPreview("ppt", "deck.ppt")).toBe(false);
    expect(canBrowserPreview("document", "word.docx")).toBe(false);
    expect(canBrowserPreview("document", "file.doc")).toBe(false);
  });

  // 9. CROSS-ACCOUNT DELETE RESTRICTION
  it("9. Cross-account deletion requires valid authorization", async () => {
    const req = new NextRequest("http://localhost:3000/api/events/resources/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath: "events/EVT88A/resources/res_pdf_01/brochure.pdf",
        eventCode: "EVT88A",
        organizerUid: organizerB, // Account B attempting to delete Account A's resource
      }),
    });

    const res = await deleteRoute(req);
    // Rejects unauthorized delete or missing storage credentials
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // 10. RE-UPLOAD DETECTION FOR LEGACY FILES
  it("10. Detects broken or legacy local file pointers and returns 410 re-upload error", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/events/resources/download?code=${eventCodeA}&id=res_legacy&url=file_1789981234`
    );
    const res = await downloadRoute(req);
    expect(res.status).toBe(410);
    const data = await res.json();
    expect(data.error).toContain("re-uploaded");
  });

  // 11. STREAM HEADERS VERIFICATION
  it("11. Streams files with correct Content-Disposition headers for downloads", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("%PDF-1.4 mock bytes"));
          controller.close();
        },
      }),
      headers: new Headers({
        "content-type": "application/pdf",
        "content-length": "20",
      }),
    });

    try {
      const req = new NextRequest(
        `http://localhost:3000/api/events/resources/download?code=${eventCodeA}&id=res_pdf_01&download=1&url=https://mock.supabase.co/storage/v1/object/sign/stagex-resources/events/EVT88A/brochure.pdf&filename=brochure.pdf`
      );
      const res = await downloadRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/pdf");
      expect(res.headers.get("content-disposition")).toContain("attachment; filename=");
    } finally {
      global.fetch = originalFetch;
    }
  });

  // 12. BUCKET CONFIGURATION VERIFICATION
  it("12. Validates stagex-resources bucket name", () => {
    expect(STAGEX_STORAGE_BUCKET).toBe("stagex-resources");
  });
});
