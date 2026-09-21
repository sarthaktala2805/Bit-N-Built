"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  KeyRound,
  Video,
  Presentation,
  FileCode,
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  Search,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Download,
  Play,
  FileText,
  AlertTriangle,
  RotateCcw,
  Share2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { Event, EventResource } from "@/types";
import { findEventByAccessCode, findEventByAccessCodeAsync, PublicEventBundle } from "@/lib/events-registry";
import { validateEventCode, normalizeEventCode } from "@/lib/event-code";
import { startAudiencePresence, subscribeActiveAttendeeCount } from "@/lib/audience-presence";
import { getMediaObjectUrl } from "@/lib/media-storage";
import { canBrowserPreview } from "@/lib/resource-storage";


function getEmbedUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    // YouTube watch URL
    if (url.hostname.includes("youtube.com") && url.searchParams.get("v")) {
      return `https://www.youtube-nocookie.com/embed/${url.searchParams.get("v")}`;
    }
    // YouTube short URL (youtu.be/ID)
    if (url.hostname === "youtu.be") {
      const id = url.pathname.replace(/^\//, "");
      return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    // Vimeo
    if (url.hostname.includes("vimeo.com")) {
      const id = url.pathname.replace(/^\//, "");
      if (/^\d+$/.test(id)) {
        return `https://player.vimeo.com/video/${id}`;
      }
    }
    // Google Slides embed
    if (url.hostname.includes("docs.google.com") && url.pathname.includes("/presentation/")) {
      return rawUrl.replace(/\/pub\?.*$/, "/embed").replace(/\/edit.*$/, "/embed");
    }
    return null;
  } catch {
    return null;
  }
}

function formatResourceSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDownloadLink(resource: EventResource, eventCode: string, download = true): string {
  if (eventCode && resource.id) {
    return `/api/events/resources/download?code=${encodeURIComponent(eventCode)}&id=${encodeURIComponent(resource.id)}${download ? "&download=1" : "&inline=1"}`;
  }
  return resource.url;
}

/**
 * Component to play local/cloud videos or external YouTube streams
 */
function AudienceVideoItem({ resource, eventCode }: { resource: EventResource; eventCode: string }) {
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    if (resource.isLocalFile && !resource.url.startsWith("http")) {
      getMediaObjectUrl(resource.url).then((url) => {
        if (active && url) setLocalBlobUrl(url);
      });
    }
    return () => {
      active = false;
    };
  }, [resource]);

  const embedUrl = !resource.isLocalFile ? getEmbedUrl(resource.url) : null;
  const isDirectVideo = !embedUrl;
  const videoSrc = localBlobUrl || resource.url;
  const downloadUrl = getDownloadLink(resource, eventCode, true);

  return (
    <div className="rounded-2xl overflow-hidden bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col">
      {hasError ? (
        <div className="aspect-video w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center border-b border-slate-800">
          <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
          <span className="text-xs font-semibold text-rose-300">File is currently unavailable.</span>
          <span className="text-[11px] text-slate-500 mt-1">Please check back later or contact the event host.</span>
        </div>
      ) : embedUrl ? (
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={resource.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      ) : isDirectVideo ? (
        <div className="relative aspect-video w-full bg-black">
          <video
            src={videoSrc}
            controls
            preload="metadata"
            onError={() => setHasError(true)}
            className="w-full h-full object-contain bg-black"
          />
        </div>
      ) : (
        <div className="aspect-video w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center border-b border-slate-800">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-2">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
          <span className="text-xs text-slate-400">External Video Stream</span>
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-base font-bold text-white">{resource.title}</h3>
            {resource.author && (
              <span className="text-xs text-slate-400 font-medium">Speaker: {resource.author}</span>
            )}
          </div>
          {resource.description && (
            <p className="text-xs text-slate-400 leading-relaxed mt-2">{resource.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-500">
            {resource.fileName ? resource.fileName : "Video Recording"}
            {resource.fileSize ? ` · ${formatResourceSize(resource.fileSize)}` : ""}
          </span>
          <div className="flex items-center gap-2">
            {embedUrl ? (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
              >
                Watch on YouTube
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <a
                href={downloadUrl}
                download={resource.fileName || `${resource.title}.mp4`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download Video
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Component to open/download PPT slides
 */
function AudienceSlideItem({ resource, eventCode }: { resource: EventResource; eventCode: string }) {
  const embedUrl = !resource.isLocalFile ? getEmbedUrl(resource.url) : null;
  const isWebUrl = resource.url.startsWith("http") && !resource.storagePath && !resource.fileName;
  const downloadUrl = getDownloadLink(resource, eventCode, true);

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
      <div>
        {embedUrl && (
          <div className="relative aspect-video w-full mb-4 rounded-xl overflow-hidden bg-black border border-slate-800">
            <iframe src={embedUrl} title={resource.title} className="w-full h-full border-0" allowFullScreen />
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Presentation className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white">{resource.title}</h3>
        </div>

        {resource.author && (
          <p className="text-xs text-amber-300/80 mb-2">Presented by {resource.author}</p>
        )}

        {resource.description && (
          <p className="text-xs text-slate-400 leading-relaxed mb-2">{resource.description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-800/80">
        <span className="text-[11px] text-slate-500">
          {resource.fileName || "Presentation Deck"}
          {resource.fileSize ? ` · ${formatResourceSize(resource.fileSize)}` : ""}
        </span>

        {isWebUrl ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-sm"
          >
            Open Presentation Link
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <a
            href={downloadUrl}
            download={resource.fileName || `${resource.title}.pptx`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Download Slides / PPT
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Component to open/download PDF, Word, and text documents
 */
function AudienceDocumentItem({ resource, eventCode }: { resource: EventResource; eventCode: string }) {
  const isPdf = Boolean(resource.fileName && /\.pdf$/i.test(resource.fileName)) || resource.fileMimeType === "application/pdf";
  const isTxt = Boolean(resource.fileName && /\.(txt|md|csv)$/i.test(resource.fileName)) || resource.fileMimeType?.startsWith("text/");
  const canPreview = isPdf || isTxt;

  const openUrl = getDownloadLink(resource, eventCode, false);
  const downloadUrl = getDownloadLink(resource, eventCode, true);

  return (
    <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white">{resource.title}</h3>
        </div>

        {resource.author && (
          <p className="text-xs text-blue-300/80 mb-2">Author: {resource.author}</p>
        )}

        {resource.description && (
          <p className="text-xs text-slate-400 leading-relaxed mb-2">{resource.description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-800/80">
        <span className="text-[11px] text-slate-500">
          {resource.fileName || "Document File"}
          {resource.fileSize ? ` · ${formatResourceSize(resource.fileSize)}` : ""}
        </span>

        <div className="flex items-center gap-2">
          {canPreview && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
            >
              Open in Browser
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <a
            href={downloadUrl}
            download={resource.fileName || `${resource.title}`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Download File
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Component to view/download event photos and images
 */
function AudienceImageItem({ resource, eventCode }: { resource: EventResource; eventCode: string }) {
  const [hasError, setHasError] = useState(false);
  const openUrl = getDownloadLink(resource, eventCode, false);
  const downloadUrl = getDownloadLink(resource, eventCode, true);
  const imageSrc = resource.url.startsWith("http") ? resource.url : openUrl;

  return (
    <div className="rounded-2xl overflow-hidden bg-slate-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
      <div>
        {hasError ? (
          <div className="aspect-video w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center border-b border-slate-800">
            <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
            <span className="text-xs font-semibold text-rose-300">Image is currently unavailable.</span>
          </div>
        ) : (
          <div className="relative aspect-video w-full bg-black/60 overflow-hidden group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={resource.title}
              onError={() => setHasError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <ImageIcon className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-white truncate">{resource.title}</h3>
          </div>
          {resource.description && (
            <p className="text-xs text-slate-400 line-clamp-2 mt-1">{resource.description}</p>
          )}
        </div>
      </div>

      <div className="p-4 pt-0 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 mt-2">
        <span className="text-[11px] text-slate-500">
          {resource.fileName || "Photo"}
          {resource.fileSize ? ` · ${formatResourceSize(resource.fileSize)}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Open Full
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={downloadUrl}
            download={resource.fileName || `${resource.title}.jpg`}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm"
          >
            <Download className="w-3 h-3" />
            Download
          </a>
        </div>
      </div>
    </div>
  );
}


function AudiencePortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawParam = searchParams.get("code") || "";
  const validatedParam = validateEventCode(rawParam);
  const codeParam = validatedParam.valid ? validatedParam.code : rawParam.trim().toUpperCase();

  const { events, sessions, speakers, hydrated, hydrate } = useEventStore();

  const [inputCode, setInputCode] = useState(codeParam);
  const [activeTab, setActiveTab] = useState<"all" | "videos" | "slides" | "docs" | "photos" | "scripts" | "schedule">("all");
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
  const [copiedEventCode, setCopiedEventCode] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [activeAttendeeCount, setActiveAttendeeCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [matchedBundle, setMatchedBundle] = useState<PublicEventBundle | null>(() => {
    if (!codeParam) return null;
    return findEventByAccessCode(codeParam, events, sessions, speakers);
  });
  const [isSearchingCode, setIsSearchingCode] = useState(false);

  // Auto-hydrate
  useEffect(() => {
    if (!hydrated) {
      hydrate(null);
    }
  }, [hydrated, hydrate]);

  // Sync input when codeParam changes and resolve event bundle across devices/accounts
  useEffect(() => {
    if (codeParam) {
      setInputCode(codeParam);
    }

    if (!codeParam) {
      setMatchedBundle(null);
      setIsSearchingCode(false);
      return;
    }

    // 1. Immediate check from local in-memory store and localStorage
    const local = findEventByAccessCode(codeParam, events, sessions, speakers);
    if (local) {
      setMatchedBundle(local);
      setIsSearchingCode(false);
      return;
    }

    // 2. Asynchronous query to Cloud Firestore and Server API
    let active = true;
    setIsSearchingCode(true);

    findEventByAccessCodeAsync(codeParam, events, sessions, speakers)
      .then((res) => {
        if (active) {
          setMatchedBundle(res);
          setIsSearchingCode(false);
        }
      })
      .catch((err) => {
        console.warn("[Audience Lookup Error]:", err);
        if (active) {
          setMatchedBundle(null);
          setIsSearchingCode(false);
        }
      });

    return () => {
      active = false;
    };
  }, [codeParam, events, sessions, speakers]);

  const currentEvent = matchedBundle?.event || null;
  const eventSessions = matchedBundle?.sessions || [];
  const eventSpeakers = matchedBundle?.speakers || [];

  const isJoinDisabled = Boolean(
    currentEvent &&
      (matchedBundle?.joinEnabled === false || currentEvent.joinEnabled === false)
  );

  // Real-time audience presence session & active attendee count
  useEffect(() => {
    if (!currentEvent || !currentEvent.accessCode || isJoinDisabled) return;

    const cleanupPresence = startAudiencePresence(currentEvent.accessCode, null);
    const unsubscribeCount = subscribeActiveAttendeeCount(currentEvent.accessCode, (count) => {
      setActiveAttendeeCount(count);
    });

    return () => {
      cleanupPresence();
      unsubscribeCount();
    };
  }, [currentEvent, isJoinDisabled]);

  const resources = currentEvent?.resources || [];
  const videoResources = resources.filter((r) => r.type === "video");
  const pptResources = resources.filter(
    (r) => r.type === "ppt" || (r.fileName && /\.(ppt|pptx|odp|key)$/i.test(r.fileName))
  );
  const docResources = resources.filter(
    (r) => r.type === "document" || (r.fileName && /\.(pdf|docx?|txt|rtf)$/i.test(r.fileName))
  );
  const imageResources = resources.filter(
    (r) => r.type === "image" || (r.fileName && /\.(png|jpe?g|webp|gif|svg)$/i.test(r.fileName))
  );
  const scriptResources = resources.filter((r) => r.type === "script");

  const handleSearchCode = (e: React.FormEvent) => {
    e.preventDefault();
    const val = validateEventCode(inputCode);
    if (!val.valid) {
      setErrorMsg(val.error || "Please enter a valid 6-character event code.");
      return;
    }
    setErrorMsg(null);
    router.push(`/audience?code=${val.code}`);
  };

  const handleCopyCode = () => {
    if (currentEvent?.accessCode) {
      navigator.clipboard.writeText(currentEvent.accessCode);
      setCopiedEventCode(true);
      setTimeout(() => setCopiedEventCode(false), 2000);
    }
  };

  const handleCopyShareLink = () => {
    if (typeof window !== "undefined" && currentEvent?.accessCode) {
      const shareUrl = `${window.location.origin}/audience?code=${currentEvent.accessCode}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
    }
  };

  const handleCopyScript = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScriptId(id);
    setTimeout(() => setCopiedScriptId(null), 2000);
  };

  // Has code parameter in URL, search completed, but NO event matched: explicit 404
  const isCodeNotFound = Boolean(
    codeParam &&
      !isSearchingCode &&
      (!currentEvent || currentEvent.publicEnabled === false)
  );

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/login" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950 p-1">
              <Image src="/brand/stagex-logo.png" alt="StageX" fill className="object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white group-hover:text-amber-300 transition">
                Stage<span className="text-amber-400">X</span> Audience Portal
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Attendee Access Mode
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {codeParam && (
            <button
              type="button"
              onClick={() => {
                setInputCode("");
                router.push("/audience");
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Enter Different Code
            </button>
          )}

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Organizer Login
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {isSearchingCode ? (
          /* Connecting to Cloud Registry */
          <div className="max-w-md mx-auto mt-16 sm:mt-24 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-950/40">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Connecting to Event Portal…</h2>
              <p className="text-xs text-slate-400 mt-1">
                Searching event code{" "}
                <span className="font-mono text-amber-300 font-bold px-1.5 py-0.5 bg-amber-500/10 rounded">
                  {codeParam}
                </span>{" "}
                in cloud registry…
              </p>
            </div>
          </div>
        ) : isCodeNotFound ? (
          /* Explicit Wrong Code / 404 Screen */
          <div className="max-w-md mx-auto mt-12 sm:mt-20 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400 shadow-xl shadow-red-950/40">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Event Not Found
              </h1>
              <p className="text-xs text-slate-400 mt-2">
                No event matches code{" "}
                <span className="font-mono text-red-300 font-bold px-1.5 py-0.5 bg-red-500/10 rounded">
                  {codeParam}
                </span>
                . Please check the code provided by your event organizer and try again.
              </p>
            </div>

            <form onSubmit={handleSearchCode} className="space-y-4 pt-2">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setInputCode(val);
                  }}
                  placeholder="Enter 6-char code"
                  autoFocus
                  className="w-full text-center font-mono text-2xl tracking-[0.3em] font-bold py-3.5 bg-slate-900/90 border-2 border-red-500/40 rounded-xl text-white placeholder:text-slate-700 focus:outline-none focus:border-amber-400 uppercase"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInputCode("");
                    router.push("/audience");
                  }}
                  className="flex-1 py-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={inputCode.trim().length !== 6}
                  className="flex-2 py-3 px-6 rounded-xl font-semibold text-xs bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white transition disabled:opacity-40"
                >
                  Search Again
                </button>
              </div>
            </form>
          </div>
        ) : isJoinDisabled ? (
          /* State D: Valid Event but Joining Disabled */
          <div className="max-w-md mx-auto mt-12 sm:mt-20 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-950/40">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Joining Currently Disabled
              </h1>
              <p className="text-xs text-slate-400 mt-2">
                This event is currently not accepting audience members. Please check with your event organizer.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setInputCode("");
                router.push("/audience");
              }}
              className="px-6 py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Enter Different Code
            </button>
          </div>
        ) : !currentEvent ? (
          /* Initial Code Entry Screen (When no code in URL) */
          <div className="max-w-lg mx-auto mt-8 sm:mt-16 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-950/40">
              <KeyRound className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Enter 6-Character Event Code
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                Enter the exact 6-character code provided by your event organizer to view recordings,
                slides, and scripts.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs text-left">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSearchCode} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    setInputCode(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="e.g. ST8X9B"
                  autoFocus
                  className="w-full text-center font-mono text-3xl tracking-[0.35em] font-extrabold py-4 bg-slate-900/90 border-2 border-amber-500/40 rounded-2xl text-amber-300 placeholder:text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 shadow-2xl transition uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={inputCode.trim().length !== 6}
                className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-xl shadow-amber-900/40 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                Access Event Materials
              </button>
            </form>
          </div>
        ) : (
          /* Sahi Code Matched: Full Meeting Materials Display */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Event Hero Card */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/80 shadow-2xl">
              {currentEvent.posterUrl && (
                <div className="relative w-full h-48 sm:h-64 bg-slate-950 overflow-hidden">
                  <img
                    src={currentEvent.posterUrl}
                    alt={currentEvent.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-black/30" />
                </div>
              )}

              <div className="p-6 sm:p-8 relative">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                      {currentEvent.type}
                    </span>
                    {currentEvent.status === "Completed" ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        Concluded Event
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Live / In Progress
                      </span>
                    )}

                    {activeAttendeeCount > 0 && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {activeAttendeeCount} {activeAttendeeCount === 1 ? "Active Attendee" : "Active Attendees"}
                      </span>
                    )}
                  </div>

                  {/* 6-Character Event Code & Share Buttons */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 border border-amber-500/40 rounded-xl">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] text-slate-400">Event Code:</span>
                      <span className="font-mono font-bold text-amber-300 tracking-wider text-sm">
                        {currentEvent.accessCode || codeParam}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="ml-1 text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        title="Copy Event Code"
                      >
                        {copiedEventCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition"
                      title="Copy Public Share URL"
                    >
                      {copiedShareLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 text-[11px]">Copied Link</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[11px]">Share</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
                  {currentEvent.name}
                </h1>

                {currentEvent.description && (
                  <p className="text-sm text-slate-300 max-w-3xl leading-relaxed mb-6">
                    {currentEvent.description}
                  </p>
                )}

                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-4 border-t border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>
                      {currentEvent.startDate || currentEvent.date}
                      {currentEvent.endDate && currentEvent.endDate !== (currentEvent.startDate || currentEvent.date)
                        ? ` to ${currentEvent.endDate}`
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      {currentEvent.startTime} – {currentEvent.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{currentEvent.venue}</span>
                  </div>
                  {currentEvent.organizer && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>Host: {currentEvent.organizer}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Tabs for Audience */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
                  activeTab === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                All Resources ({resources.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("videos")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
                  activeTab === "videos"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Video className="w-4 h-4" />
                Videos ({videoResources.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("slides")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
                  activeTab === "slides"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Presentation className="w-4 h-4" />
                Slides ({pptResources.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("docs")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
                  activeTab === "docs"
                    ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <FileText className="w-4 h-4" />
                Docs & PDFs ({docResources.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("photos")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
                  activeTab === "photos"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Photos ({imageResources.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("scripts")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
                  activeTab === "scripts"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <FileCode className="w-4 h-4" />
                Scripts ({scriptResources.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 ${
                  activeTab === "schedule"
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Schedule ({eventSessions.length})
              </button>
            </div>

            {/* Tab 0: All Resources */}
            {activeTab === "all" && (
              <div className="space-y-6">
                {resources.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                    <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No resources published yet</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      The event organizers will upload videos, slides, photos, and materials here soon.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {resources.map((res) => {
                      const eventCode = currentEvent.accessCode || "";
                      if (res.type === "video" || res.fileMimeType?.startsWith("video/")) {
                        return <AudienceVideoItem key={res.id} resource={res} eventCode={eventCode} />;
                      }
                      if (res.type === "ppt" || (res.fileName && /\.(ppt|pptx|odp|key)$/i.test(res.fileName))) {
                        return <AudienceSlideItem key={res.id} resource={res} eventCode={eventCode} />;
                      }
                      if (res.type === "image" || res.fileMimeType?.startsWith("image/")) {
                        return <AudienceImageItem key={res.id} resource={res} eventCode={eventCode} />;
                      }
                      return <AudienceDocumentItem key={res.id} resource={res} eventCode={eventCode} />;
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 1: Video Recordings */}
            {activeTab === "videos" && (
              <div className="space-y-6">
                {videoResources.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                    <Video className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No video recordings yet</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      The event organizers will upload stage recordings and session streams soon.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {videoResources.map((vid) => (
                      <AudienceVideoItem key={vid.id} resource={vid} eventCode={currentEvent.accessCode || ""} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Presentation & PPT Slides */}
            {activeTab === "slides" && (
              <div className="space-y-6">
                {pptResources.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                    <Presentation className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No PPT slides uploaded yet</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Check back shortly for official keynote slide decks and presentation links.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {pptResources.map((slide) => (
                      <AudienceSlideItem key={slide.id} resource={slide} eventCode={currentEvent.accessCode || ""} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2B: Documents & PDFs */}
            {activeTab === "docs" && (
              <div className="space-y-6">
                {docResources.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                    <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No documents or PDFs uploaded yet</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Official brochures, PDFs, and handouts will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {docResources.map((docItem) => (
                      <AudienceDocumentItem key={docItem.id} resource={docItem} eventCode={currentEvent.accessCode || ""} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2C: Photos & Images */}
            {activeTab === "photos" && (
              <div className="space-y-6">
                {imageResources.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                    <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No photos uploaded yet</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Stage photos, badges, and event galleries will be published here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {imageResources.map((img) => (
                      <AudienceImageItem key={img.id} resource={img} eventCode={currentEvent.accessCode || ""} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Event Scripts & Notes */}
            {activeTab === "scripts" && (
              <div className="space-y-4">
                {scriptResources.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                    <FileCode className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No scripts published yet</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Official remarks and speaker scripts will appear here once finalized.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {scriptResources.map((scr) => (
                      <div
                        key={scr.id}
                        className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                              <FileCode className="w-4 h-4" />
                            </div>
                            <h3 className="text-base font-bold text-white">{scr.title}</h3>
                            {scr.author && (
                              <span className="text-xs text-slate-400">({scr.author})</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {scr.url.startsWith("http") ? (
                              <a
                                href={scr.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
                              >
                                Source Link
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCopyScript(scr.id, scr.url)}
                                className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs rounded-lg transition"
                              >
                                {copiedScriptId === scr.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedScriptId === scr.id ? "Copied" : "Copy Script"}
                              </button>
                            )}
                          </div>
                        </div>

                        {scr.description && (
                          <p className="text-xs text-slate-400 mb-3">{scr.description}</p>
                        )}

                        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 font-sans text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                          {scr.url.startsWith("http") ? (
                            <a
                              href={scr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {scr.url}
                            </a>
                          ) : (
                            scr.url
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Event Schedule */}
            {activeTab === "schedule" && (
              <div className="space-y-4">
                {eventSessions.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
                    <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-300">No agenda sessions scheduled</h3>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {eventSessions.map((session, idx) => {
                      const spk = eventSpeakers.find((s) => s.id === session.speakerId);
                      return (
                        <div
                          key={session.id}
                          className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{session.title}</h4>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase font-semibold">
                                  {session.type}
                                </span>
                              </div>
                              {spk && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Speaker: <span className="text-slate-200 font-medium">{spk.name}</span>
                                  {spk.organization ? ` (${spk.organization})` : ""}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-300 font-mono bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {session.startTime} – {session.endTime}
                            </span>
                            <span className="text-slate-500">({session.duration}m)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500">
        <p>StageX AI Audience Portal · Protected Attendee Material Viewer</p>
      </footer>
    </div>
  );
}

export default function AudiencePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070B14] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AudiencePortalContent />
    </Suspense>
  );
}
