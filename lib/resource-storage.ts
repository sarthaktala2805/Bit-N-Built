// StageX AI — Event Resource & File Storage Service (Supabase Storage Engine)
// Handles secure uploads via Supabase signed upload URLs, client direct binary transfer,
// short-lived signed download URL retrieval, and server-side object deletion.
// Replaces Firebase Storage while preserving Firebase Auth + Firestore.

import { EventResourceType } from "@/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import { auth } from "@/lib/firebase";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB Free tier bucket limit

export interface UploadResourceParams {
  eventId: string;
  eventCode: string;
  file: File;
  resourceType?: EventResourceType;
  ownerUserId?: string;
  onProgress?: (progressPercent: number) => void;
}

export interface UploadResourceResult {
  id: string;
  url: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  type: EventResourceType;
  isLocalFile: boolean;
}

/**
 * Maps common file extensions to standard MIME types
 */
export function getMimeTypeFromFileName(fileName: string): string {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  switch (ext) {
    // Images
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    // Videos
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "mkv":
      return "video/x-matroska";
    // Presentations
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "key":
      return "application/x-iwork-keynote-sffkey";
    case "odp":
      return "application/vnd.oasis.opendocument.presentation";
    // Documents
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":
      return "text/plain";
    case "md":
      return "text/markdown";
    case "csv":
      return "text/csv";
    case "rtf":
      return "application/rtf";
    default:
      return "application/octet-stream";
  }
}

/**
 * Checks if a file extension is allowed (blocks executables and dangerous scripts)
 */
export function isExtensionAllowed(fileName: string): boolean {
  if (!fileName) return false;
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  // Strictly blocked dangerous executable formats
  const blocked = [
    "exe", "bat", "cmd", "sh", "js", "html", "htm", "php", "py", "vbs", "ps1",
    "msi", "bin", "com", "scr", "jar", "apk"
  ];
  if (blocked.includes(ext)) {
    return false;
  }

  // Allowed safe resource formats
  const allowed = [
    "jpg", "jpeg", "png", "webp", "gif", "svg",
    "pdf", "doc", "docx", "txt", "md", "csv", "rtf",
    "ppt", "pptx", "key", "odp",
    "mp4", "webm", "mov", "mkv"
  ];
  return allowed.includes(ext);
}

/**
 * Infers appropriate EventResourceType from file extension and MIME type
 */
export function inferResourceType(fileName: string, mimeType?: string): EventResourceType {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "mkv"].includes(ext)) {
    return "video";
  }
  if (
    ["ppt", "pptx", "key", "odp"].includes(ext) ||
    mime.includes("presentation") ||
    mime.includes("powerpoint")
  ) {
    return "ppt";
  }
  if (["txt", "md"].includes(ext) || mime.startsWith("text/")) {
    return "script";
  }
  return "document";
}

/**
 * Determines whether a file type can be natively previewed in standard browsers
 */
export function canBrowserPreview(type: EventResourceType, fileName?: string): boolean {
  if (type === "image" || type === "video") return true;
  if (!fileName) return false;
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  // PDF and plain text can open directly in browser tabs
  if (["pdf", "txt", "md", "csv"].includes(ext)) return true;
  // PPT, PPTX, DOC, DOCX cannot be natively rendered by browsers without third-party plugins -> Download only
  return false;
}

/**
 * Uploads an event resource file using Supabase Storage signed upload URLs.
 * Flow:
 * 1. Validate file size <= 50MB and safe MIME type
 * 2. Request signed upload URL from StageX server (/api/events/resources/upload-url)
 * 3. Upload file directly to Supabase Storage with progress
 * 4. Return canonical storagePath, resourceId, and secure download route URL
 */
export async function uploadEventResourceFile(
  params: UploadResourceParams
): Promise<UploadResourceResult> {
  const { eventId, eventCode, file, ownerUserId, onProgress } = params;

  // 1. File size pre-validation
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds the free 50 MB limit.");
  }

  // 2. File security validation
  if (!isExtensionAllowed(file.name)) {
    throw new Error("File type not supported or security restricted.");
  }

  const mimeType = file.type || getMimeTypeFromFileName(file.name);
  const resolvedType = params.resourceType || inferResourceType(file.name, mimeType);
  const currentUserId = auth?.currentUser?.uid || ownerUserId || "organizer";

  // 3. Request signed upload authorization from StageX server
  let authData: {
    ok: boolean;
    resourceId: string;
    storagePath: string;
    signedUrl: string;
    token?: string;
    path?: string;
    error?: string;
  } | null = null;

  try {
    const res = await fetch("/api/events/resources/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventCode,
        eventId,
        fileName: file.name,
        fileSize: file.size,
        fileType: mimeType,
        organizerUid: currentUserId,
      }),
    });

    authData = await res.json();
    if (!res.ok || !authData?.ok) {
      throw new Error(authData?.error || "Failed to obtain upload authorization.");
    }
  } catch (authErr: unknown) {
    console.warn("[Upload URL authorization failed, checking fallback]", authErr);
    // If upload-url endpoint failed or Supabase is unconfigured, throw informative error
    throw authErr instanceof Error ? authErr : new Error("Failed to authorize file upload.");
  }

  const { resourceId, storagePath, signedUrl, token } = authData;

  // 4. Direct upload to Supabase Storage via signed URL or uploadToSignedUrl
  const supabase = getSupabaseClient();

  if (onProgress) onProgress(10);

  if (supabase && token) {
    // Standard Supabase client signed upload
    const { error: uploadError } = await supabase.storage
      .from("stagex-resources")
      .uploadToSignedUrl(storagePath, token, file);

    if (uploadError) {
      throw new Error(`Upload to Supabase Storage failed: ${uploadError.message}`);
    }
    if (onProgress) onProgress(100);
  } else {
    // Direct PUT to signedUrl with XMLHttpRequest for progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl, true);
      xhr.setRequestHeader("Content-Type", mimeType);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.min(99, Math.round((e.loaded / e.total) * 90) + 10);
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          reject(new Error(`Storage server returned error code ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network connection error during file upload."));
      };

      xhr.send(file);
    });
  }

  // Canonical gateway download URL for this resource
  const deliveryUrl = `/api/events/resources/download?code=${encodeURIComponent(
    eventCode
  )}&id=${encodeURIComponent(resourceId)}`;

  return {
    id: resourceId,
    url: deliveryUrl,
    storagePath,
    fileName: file.name,
    fileSize: file.size,
    fileMimeType: mimeType,
    type: resolvedType,
    isLocalFile: false,
  };
}

/**
 * Deletes an event resource file from Supabase Storage via server endpoint
 */
export async function deleteEventResourceFile(
  storagePath?: string,
  eventCode?: string,
  resourceId?: string
): Promise<boolean> {
  if (!storagePath) return false;
  try {
    const currentUserId = auth?.currentUser?.uid;
    const res = await fetch("/api/events/resources/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath,
        eventCode,
        resourceId,
        organizerUid: currentUserId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return Boolean(data.ok);
  } catch (err) {
    console.warn("[deleteEventResourceFile warning]", err);
    return false;
  }
}
