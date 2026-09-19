"use client";

import React, { useRef, useImperativeHandle, forwardRef, useEffect } from "react";
import { InvitationData, InvitationTheme } from "@/types";
import { Calendar, Clock, MapPin, Award, Users } from "lucide-react";

export interface InvitationExportCardProps {
  data: InvitationData;
  theme?: InvitationTheme;
  id?: string;
  className?: string;
}

export interface InvitationExportCardRef {
  downloadPNG: (filename?: string) => void;
  printCard: () => void;
}

export const THEME_STYLES: Record<
  InvitationTheme,
  {
    name: string;
    description: string;
    bgClass: string;
    borderClass: string;
    titleColor: string;
    accentColor: string;
    bodyColor: string;
    canvasBg: string;
    canvasBorder: string;
    canvasTitle: string;
    canvasAccent: string;
    canvasText: string;
    badgeBg: string;
  }
> = {
  modern_dark: {
    name: "Modern Dark",
    description: "Sleek slate with indigo & cyan highlights",
    bgClass: "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70",
    borderClass: "border-indigo-500/40 shadow-2xl shadow-indigo-500/10",
    titleColor: "text-white",
    accentColor: "text-cyan-400",
    bodyColor: "text-slate-300",
    canvasBg: "#090d16",
    canvasBorder: "#4338ca",
    canvasTitle: "#ffffff",
    canvasAccent: "#22d3ee",
    canvasText: "#cbd5e1",
    badgeBg: "rgba(99, 102, 241, 0.15)",
  },
  executive_gold: {
    name: "Executive Gold",
    description: "Prestigious obsidian with rich gold accents",
    bgClass: "bg-gradient-to-br from-stone-950 via-neutral-900 to-amber-950/40",
    borderClass: "border-amber-500/50 shadow-2xl shadow-amber-500/10",
    titleColor: "text-amber-100",
    accentColor: "text-amber-400",
    bodyColor: "text-stone-300",
    canvasBg: "#0c0a09",
    canvasBorder: "#d97706",
    canvasTitle: "#fef3c7",
    canvasAccent: "#fbbf24",
    canvasText: "#d6d3d1",
    badgeBg: "rgba(245, 158, 11, 0.15)",
  },
  neon_tech: {
    name: "Neon Tech",
    description: "Cyberpunk violet & emerald glow",
    bgClass: "bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-900",
    borderClass: "border-fuchsia-500/50 shadow-2xl shadow-fuchsia-500/15",
    titleColor: "text-white",
    accentColor: "text-emerald-400",
    bodyColor: "text-purple-200",
    canvasBg: "#050510",
    canvasBorder: "#a855f7",
    canvasTitle: "#ffffff",
    canvasAccent: "#34d399",
    canvasText: "#e9d5ff",
    badgeBg: "rgba(168, 85, 247, 0.2)",
  },
  clean_minimal: {
    name: "Clean Minimal",
    description: "High-contrast architectural monochrome",
    bgClass: "bg-neutral-950",
    borderClass: "border-neutral-700 shadow-2xl",
    titleColor: "text-white",
    accentColor: "text-neutral-400",
    bodyColor: "text-neutral-300",
    canvasBg: "#0a0a0a",
    canvasBorder: "#525252",
    canvasTitle: "#ffffff",
    canvasAccent: "#a3a3a3",
    canvasText: "#d4d4d4",
    badgeBg: "rgba(255, 255, 255, 0.08)",
  },
  cultural_warm: {
    name: "Cultural Warmth",
    description: "Vibrant sunset orange & saffron festive tones",
    bgClass: "bg-gradient-to-br from-stone-950 via-rose-950/40 to-orange-950/40",
    borderClass: "border-orange-500/50 shadow-2xl shadow-orange-500/10",
    titleColor: "text-orange-50",
    accentColor: "text-orange-400",
    bodyColor: "text-stone-300",
    canvasBg: "#120805",
    canvasBorder: "#ea580c",
    canvasTitle: "#fff7ed",
    canvasAccent: "#fb923c",
    canvasText: "#fed7aa",
    badgeBg: "rgba(234, 88, 12, 0.2)",
  },
  premium_dark: {
    name: "Premium Dark",
    description: "Deep midnight with sapphire & cyan aura",
    bgClass: "bg-gradient-to-br from-slate-950 via-blue-950/60 to-slate-900",
    borderClass: "border-blue-500/50 shadow-2xl shadow-blue-500/15",
    titleColor: "text-blue-50",
    accentColor: "text-blue-400",
    bodyColor: "text-slate-200",
    canvasBg: "#070b14",
    canvasBorder: "#2563eb",
    canvasTitle: "#eff6ff",
    canvasAccent: "#60a5fa",
    canvasText: "#bfdbfe",
    badgeBg: "rgba(37, 99, 235, 0.2)",
  },
  luxury_gala: {
    name: "Luxury Gala",
    description: "Deep black with champagne gold and velvet glow",
    bgClass: "bg-gradient-to-br from-neutral-950 via-amber-950/50 to-stone-950",
    borderClass: "border-amber-400/60 shadow-2xl shadow-amber-400/15",
    titleColor: "text-amber-50",
    accentColor: "text-yellow-400",
    bodyColor: "text-stone-200",
    canvasBg: "#0a0705",
    canvasBorder: "#f59e0b",
    canvasTitle: "#fffbeb",
    canvasAccent: "#fde047",
    canvasText: "#fef3c7",
    badgeBg: "rgba(245, 158, 11, 0.25)",
  },
  college_event: {
    name: "College Event",
    description: "Youthful vibrant gradient with electric violet & teal",
    bgClass: "bg-gradient-to-br from-slate-950 via-indigo-950/50 to-teal-950/40",
    borderClass: "border-teal-500/50 shadow-2xl shadow-teal-500/15",
    titleColor: "text-white",
    accentColor: "text-teal-300",
    bodyColor: "text-slate-200",
    canvasBg: "#051114",
    canvasBorder: "#0d9488",
    canvasTitle: "#f0fdfa",
    canvasAccent: "#2dd4bf",
    canvasText: "#99f6e4",
    badgeBg: "rgba(13, 148, 136, 0.25)",
  },
  cultural_festival: {
    name: "Cultural Festival",
    description: "Rich festive maroon, gold & vermillion shades",
    bgClass: "bg-gradient-to-br from-stone-950 via-red-950/50 to-amber-950/40",
    borderClass: "border-red-500/60 shadow-2xl shadow-red-500/15",
    titleColor: "text-red-50",
    accentColor: "text-amber-300",
    bodyColor: "text-orange-100",
    canvasBg: "#170404",
    canvasBorder: "#dc2626",
    canvasTitle: "#fef2f2",
    canvasAccent: "#f59e0b",
    canvasText: "#fed7aa",
    badgeBg: "rgba(220, 38, 38, 0.25)",
  },
  tech_conference: {
    name: "Tech Conference",
    description: "Matrix slate, cyan grid styling & electric blue",
    bgClass: "bg-gradient-to-br from-slate-950 via-cyan-950/40 to-slate-900",
    borderClass: "border-cyan-500/60 shadow-2xl shadow-cyan-500/15",
    titleColor: "text-cyan-50",
    accentColor: "text-cyan-400",
    bodyColor: "text-slate-300",
    canvasBg: "#040d12",
    canvasBorder: "#06b6d4",
    canvasTitle: "#ecfeff",
    canvasAccent: "#22d3ee",
    canvasText: "#a5f3fc",
    badgeBg: "rgba(6, 182, 212, 0.2)",
  },
  music_event: {
    name: "Music Event",
    description: "Concert stage neon magenta and purple spotlights",
    bgClass: "bg-gradient-to-br from-slate-950 via-fuchsia-950/60 to-purple-950/60",
    borderClass: "border-fuchsia-500/60 shadow-2xl shadow-fuchsia-500/20",
    titleColor: "text-pink-50",
    accentColor: "text-fuchsia-400",
    bodyColor: "text-purple-200",
    canvasBg: "#100412",
    canvasBorder: "#d946ef",
    canvasTitle: "#fdf4ff",
    canvasAccent: "#f472b6",
    canvasText: "#f5d0fe",
    badgeBg: "rgba(217, 70, 239, 0.25)",
  },
  minimal_professional: {
    name: "Minimal Professional",
    description: "Refined graphite & crisp platinum clean hierarchy",
    bgClass: "bg-zinc-950 border border-zinc-800",
    borderClass: "border-zinc-600 shadow-xl",
    titleColor: "text-zinc-100",
    accentColor: "text-zinc-300",
    bodyColor: "text-zinc-400",
    canvasBg: "#09090b",
    canvasBorder: "#71717a",
    canvasTitle: "#fafafa",
    canvasAccent: "#e4e4e7",
    canvasText: "#a1a1aa",
    badgeBg: "rgba(255, 255, 255, 0.1)",
  },
  bold_modern: {
    name: "Bold Modern",
    description: "High impact contrasting yellow & dark charcoal poster",
    bgClass: "bg-gradient-to-br from-neutral-950 via-stone-900 to-yellow-950/30",
    borderClass: "border-yellow-400/80 shadow-2xl shadow-yellow-400/20",
    titleColor: "text-yellow-300",
    accentColor: "text-yellow-400",
    bodyColor: "text-stone-200",
    canvasBg: "#0c0a00",
    canvasBorder: "#eab308",
    canvasTitle: "#fef08a",
    canvasAccent: "#fde047",
    canvasText: "#fef9c3",
    badgeBg: "rgba(234, 179, 8, 0.25)",
  },
};

export const InvitationExportCard = forwardRef<InvitationExportCardRef, InvitationExportCardProps>(
  ({ data, theme, id = "invitation-export-root", className = "" }, ref) => {
    const activeTheme = theme || data.theme || "luxury_gala";
    const themeConfig = THEME_STYLES[activeTheme] || THEME_STYLES.luxury_gala;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Text wrapping helper for Canvas rendering
    const wrapCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = words[0] || "";

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          lines.push(currentLine);
          currentLine = word;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    // Render high-res 2x canvas on change
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = 1200;
      const height = 1600;
      canvas.width = width;
      canvas.height = height;

      // 1. Background Fill
      ctx.fillStyle = themeConfig.canvasBg;
      ctx.fillRect(0, 0, width, height);

      // Decorative outer border
      ctx.strokeStyle = themeConfig.canvasBorder;
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      // Decorative inner thin border
      ctx.strokeStyle = themeConfig.canvasBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(42, 42, width - 84, height - 84);

      // Header Badge / Organizer
      ctx.textAlign = "center";
      ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
      ctx.fillStyle = themeConfig.canvasAccent;
      ctx.fillText((data.organizer || "EVENT ORGANIZER").toUpperCase(), width / 2, 120);

      // Subtitle / Event Type
      ctx.font = "18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
      ctx.fillStyle = themeConfig.canvasText;
      ctx.fillText(`INVITATION TO ${(data.eventType || "SPECIAL EVENT").toUpperCase()}`, width / 2, 160);

      // Main Title
      ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
      ctx.fillStyle = themeConfig.canvasTitle;
      const titleLines = wrapCanvasText(ctx, data.title, width - 160);
      let y = 240;
      for (const line of titleLines) {
        ctx.fillText(line, width / 2, y);
        y += 62;
      }

      // Subtitle
      if (data.subtitle) {
        ctx.font = "italic 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
        ctx.fillStyle = themeConfig.canvasAccent;
        ctx.fillText(data.subtitle, width / 2, y + 10);
        y += 48;
      }

      // Divider line
      y += 18;
      ctx.strokeStyle = themeConfig.canvasBorder;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 140, y);
      ctx.lineTo(width / 2 + 140, y);
      ctx.stroke();
      y += 40;

      // Description
      if (data.description) {
        ctx.font = "22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
        ctx.fillStyle = themeConfig.canvasText;
        const descLines = wrapCanvasText(ctx, data.description, width - 220);
        for (const line of descLines.slice(0, 4)) {
          ctx.fillText(line, width / 2, y);
          y += 34;
        }
      }

      // Schedule Box (Date, Time, Venue)
      y += 35;
      const boxY = y;
      const boxHeight = 160;
      ctx.fillStyle = themeConfig.badgeBg;
      ctx.fillRect(80, boxY, width - 160, boxHeight);
      ctx.strokeStyle = themeConfig.canvasBorder;
      ctx.strokeRect(80, boxY, width - 160, boxHeight);

      ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
      ctx.fillStyle = themeConfig.canvasAccent;
      ctx.fillText(data.dateText, width / 2, boxY + 45);

      ctx.font = "24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
      ctx.fillStyle = themeConfig.canvasTitle;
      ctx.fillText(data.timeText, width / 2, boxY + 90);

      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
      ctx.fillStyle = themeConfig.canvasText;
      ctx.fillText(`📍 ${data.venueText}`, width / 2, boxY + 130);

      y = boxY + boxHeight + 50;

      // Chief Guest
      if (data.chiefGuest) {
        ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
        ctx.fillStyle = themeConfig.canvasAccent;
        ctx.fillText("CHIEF GUEST OF HONOUR", width / 2, y);
        y += 32;
        ctx.font = "bold 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
        ctx.fillStyle = themeConfig.canvasTitle;
        ctx.fillText(data.chiefGuest, width / 2, y);
        y += 50;
      }

      // Keynotes / Highlights
      if (data.highlightPeople && data.highlightPeople.length > 0) {
        ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
        ctx.fillStyle = themeConfig.canvasAccent;
        ctx.fillText("FEATURING KEYNOTES & ARTISTS", width / 2, y);
        y += 32;
        ctx.font = "22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
        ctx.fillStyle = themeConfig.canvasTitle;
        ctx.fillText(data.highlightPeople.join("   •   "), width / 2, y);
        y += 45;
      }

      // Footer Notes / RSVP
      if (data.customNotes) {
        ctx.font = "18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif";
        ctx.fillStyle = themeConfig.canvasText;
        ctx.fillText(data.customNotes, width / 2, height - 70);
      }
    }, [data, themeConfig]);

    useImperativeHandle(ref, () => ({
      downloadPNG: (filename?: string) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const pngUrl = canvas.toDataURL("image/png");
        const safeTitle = (data.title || "invitation").toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
        const link = document.createElement("a");
        link.download = filename || `${safeTitle}-invitation.png`;
        link.href = pngUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      printCard: () => {
        window.print();
      },
    }));

    return (
      <>
        {/* The Print & Visual Export Target */}
        <div
          id={id}
          className={`w-full max-w-lg rounded-2xl border p-8 transition-all relative overflow-hidden text-center select-none ${themeConfig.bgClass} ${themeConfig.borderClass} ${className}`}
          style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif" }}
        >
          {/* Header Badge / Organizer */}
          <div className="space-y-1 mb-6">
            <span className={`text-[11px] font-bold uppercase tracking-widest block ${themeConfig.accentColor}`}>
              {data.organizer || "EVENT ORGANIZER"}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              CORDIALLY INVITES YOU TO {(data.eventType || "SPECIAL EVENT").toUpperCase()}
            </span>
          </div>

          {/* Event Title */}
          <div className="space-y-2 mb-6">
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${themeConfig.titleColor}`}>
              {data.title}
            </h1>
            {data.subtitle && (
              <p className={`text-xs italic ${themeConfig.accentColor}`}>
                {data.subtitle}
              </p>
            )}
          </div>

          {/* Decorative Divider */}
          <div className="w-24 h-0.5 mx-auto mb-6 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>

          {/* Description */}
          {data.description && (
            <p className={`text-xs text-center leading-relaxed mb-6 ${themeConfig.bodyColor}`}>
              {data.description}
            </p>
          )}

          {/* Schedule & Location Box */}
          <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2 text-center mb-6">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-white">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{data.dateText}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{data.timeText}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-200">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>{data.venueText}</span>
            </div>
          </div>

          {/* Chief Guest */}
          {data.chiefGuest && (
            <div className="space-y-1 mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block">
                Chief Guest of Honour
              </span>
              <p className={`text-sm font-bold ${themeConfig.titleColor}`}>
                {data.chiefGuest}
              </p>
            </div>
          )}

          {/* Featured Keynotes & Artists */}
          {data.highlightPeople && data.highlightPeople.length > 0 && (
            <div className="space-y-1 mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Featured Keynotes & Artists
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300">
                {data.highlightPeople.map((p, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Highlights / Special Sessions */}
          {data.highlights && data.highlights.length > 0 && (
            <div className="space-y-1 mb-4">
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400">
                {data.highlights.map((h, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <span>✦ {h}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer Notes / RSVP */}
          {data.customNotes && (
            <div className="pt-4 border-t border-white/10 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                {data.customNotes}
              </p>
            </div>
          )}
        </div>

        {/* Hidden 2x High-Res Canvas for PNG Generation */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </>
    );
  }
);

InvitationExportCard.displayName = "InvitationExportCard";
