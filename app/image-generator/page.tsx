"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Download,
  Copy,
  RefreshCw,
  Calendar,
  Layers,
  Wand2,
  Check,
  AlertCircle,
  Camera,
  Palette,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { Button } from "@/components/ui/button";

const PRESET_TEMPLATES = [
  {
    id: "stage_backdrop",
    label: "Stage Backdrop & Lighting",
    description: "Curved LED stage screens & volumetric illumination",
    prompt: "auditorium stage lighting volumetric blue laser beams conference presentation",
  },
  {
    id: "keynote_speaker",
    label: "Keynote & Speaker Presentation",
    description: "Speaker on spotlight stage addressing audience",
    prompt: "keynote speaker on stage podium spotlight auditorium conference",
  },
  {
    id: "hackathon_arena",
    label: "Hackathon & Tech Arena",
    description: "Illuminated workstations & developers festival",
    prompt: "tech hackathon conference arena neon blue computer workstations",
  },
  {
    id: "luxury_gala",
    label: "Luxury Gala & Awards Night",
    description: "Golden banquet lighting & award ceremony stage",
    prompt: "luxury awards ceremony stage banquet hall golden chandelier bokeh",
  },
  {
    id: "cultural_festival",
    label: "Cultural & Music Festival",
    description: "Live stage performance with vibrant concert lighting",
    prompt: "music festival concert stage dynamic colorful beams crowd",
  },
];

const STYLE_CHIPS = [
  "Stage Lighting",
  "Keynote Spotlight",
  "Auditorium Crowd",
  "Neon Cyberpunk",
  "Executive Gold",
  "Laser Beams",
  "High Tech Arena",
  "Grand Ballroom",
];

interface GeneratedImageRecord {
  id: string;
  imageUrl: string;
  prompt: string;
  mode: string;
  source: string;
  author?: string;
  timestamp: number;
}

export default function ImageGeneratorPage() {
  const { events, activeEventId, setActiveEvent, updateEvent } = useEventStore();
  const isEventEnded = (e: { status?: string; endedAt?: number | null }) =>
    e.status === "Completed" || Boolean(e.endedAt);
  const activeEvents = events.filter((e) => !isEventEnded(e));
  const activeEvent = activeEvents.find((e) => e.id === activeEventId) || activeEvents[0] || null;

  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"photo" | "artwork">("photo");
  const [theme, setTheme] = useState("modern_dark");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [eventSetSuccess, setEventSetSuccess] = useState(false);

  // Gallery of generated images
  const [history, setHistory] = useState<GeneratedImageRecord[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // Pre-fill prompt on mount or event switch
  useEffect(() => {
    if (!prompt) {
      if (activeEvent) {
        setPrompt(`${activeEvent.name} ${activeEvent.type} stage keynote lighting`);
      } else {
        setPrompt(PRESET_TEMPLATES[0].prompt);
      }
    }
  }, [activeEvent]);

  const activeImage = history[selectedImageIndex] || null;

  const handleGenerate = async (customMode?: "photo" | "artwork") => {
    setErrorMsg(null);
    setIsGenerating(true);
    setEventSetSuccess(false);

    const activeMode = customMode || mode;

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          title: activeEvent?.name || "StageX Event",
          type: activeEvent?.type || "Keynote",
          eventName: activeEvent?.name,
          mode: activeMode,
          theme,
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok && data.imageUrl) {
        const newRecord: GeneratedImageRecord = {
          id: `img_${Date.now()}`,
          imageUrl: data.imageUrl,
          prompt: data.prompt || prompt,
          mode: activeMode,
          source: data.source || "generator",
          author: data.author,
          timestamp: Date.now(),
        };

        setHistory((prev) => [newRecord, ...prev]);
        setSelectedImageIndex(0);
      } else {
        setErrorMsg(data.error || "Failed to generate image.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network request failed. Please check connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const appendChip = (chip: string) => {
    setPrompt((prev) => (prev.trim() ? `${prev.trim()} ${chip}` : chip));
  };

  const handleDownload = () => {
    if (!activeImage) return;
    const link = document.createElement("a");
    link.href = activeImage.imageUrl;
    link.download = `stagex-visual-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = async () => {
    if (!activeImage) return;
    try {
      await navigator.clipboard.writeText(activeImage.imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSetAsEventPoster = () => {
    if (!activeImage || !activeEvent) return;
    updateEvent(activeEvent.id, {
      posterUrl: activeImage.imageUrl,
    });
    setEventSetSuccess(true);
    setTimeout(() => setEventSetSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-900/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                AI Image & Stage Visual Studio
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                100% Free • No Login Required
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Generate photorealistic 4K stage backdrops, keynote visuals, and event posters instantly with zero setup
            </p>
          </div>
        </div>

        {/* Active Event Selector */}
        {activeEvents.length > 0 && (
          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
            <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="text-left">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Active Event
              </span>
              <select
                value={activeEvent?.id || ""}
                onChange={(e) => setActiveEvent(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
              >
                {activeEvents.map((ev) => (
                  <option key={ev.id} value={ev.id} className="bg-slate-900 text-white">
                    {ev.name} ({ev.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Controls & Prompt Studio (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Engine / Mode Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMode("photo")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                mode === "photo"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Photorealistic Visuals
            </button>
            <button
              type="button"
              onClick={() => setMode("artwork")}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                mode === "artwork"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Graphic Stage Poster
            </button>
          </div>

          {/* Quick Presets */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Quick Theme Presets
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setPrompt(tpl.prompt)}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 text-left hover:border-blue-500/50 hover:bg-slate-900 transition-all group"
                >
                  <p className="text-xs font-semibold text-white group-hover:text-blue-300">
                    {tpl.label}
                  </p>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {tpl.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Studio Input */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                Prompt / Description
              </label>
              <button
                type="button"
                onClick={() => {
                  if (activeEvent) {
                    setPrompt(
                      `${activeEvent.name} ${activeEvent.type} keynote presentation stage auditorium lighting`
                    );
                  }
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline"
              >
                Auto-Fill from Event
              </button>
            </div>

            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Keynote stage lighting conference auditorium crowd"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600 resize-none leading-relaxed"
            />

            {/* Style Chips */}
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1.5 font-semibold">
                Quick Keywords
              </span>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => appendChip(chip)}
                    className="px-2 py-0.5 text-[10px] rounded-md bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Poster Theme Selector (if mode === artwork) */}
            {mode === "artwork" && (
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Poster Visual Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                >
                  <option value="modern_dark">Modern Obsidian & Blue Laser</option>
                  <option value="executive_gold">Executive Gold & Shimmer</option>
                  <option value="neon_tech">Neon Cyberpunk & Cyan</option>
                  <option value="luxury_gala">Luxury Gala & Purple Glow</option>
                  <option value="cultural_warm">Cultural Festive & Ruby Warm</option>
                  <option value="clean_minimal">Clean Emerald & Minimalist</option>
                </select>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Generation Button */}
            <div className="pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => handleGenerate()}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-sm py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                {isGenerating ? "Generating Image..." : "Generate Image (Instant & Free)"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Active Output & Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-4 min-h-[480px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-white">
                    Generated Visual
                  </span>
                  {activeImage && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {activeImage.mode === "artwork" ? "Vector Poster" : "4K Photorealistic"}
                    </span>
                  )}
                </div>

                {activeImage && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                      title="Copy Data URL"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs flex items-center gap-1 transition-colors"
                      title="Download Image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Main Image Frame */}
              <div className="mt-4 relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center group shadow-2xl">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3 text-center p-6 animate-pulse">
                    <div className="p-4 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400">
                      <RefreshCw className="w-8 h-8 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Generating High-Resolution Stage Visual...
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Composing lighting and cinematic render
                      </p>
                    </div>
                  </div>
                ) : activeImage ? (
                  <>
                    <img
                      src={activeImage.imageUrl}
                      alt="Generated Artwork"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-xs text-white">
                      <span className="truncate max-w-md text-[11px] text-slate-200">
                        {activeImage.prompt}
                      </span>
                      {activeImage.author && (
                        <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                          Photo by {activeImage.author}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center p-8 text-slate-500">
                    <ImageIcon className="w-12 h-12 stroke-[1.2] text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">
                      Ready to Generate Images
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Select a preset on the left or type your prompt, then click &quot;Generate Image&quot; — no login or API key required!
                    </p>
                  </div>
                )}
              </div>

              {/* Prompt Info & Set as Poster Action */}
              {activeImage && !isGenerating && (
                <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-300 italic leading-relaxed truncate">
                      &quot;{activeImage.prompt}&quot;
                    </p>
                    {activeEvent && (
                      <button
                        type="button"
                        onClick={handleSetAsEventPoster}
                        className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0 font-medium transition-colors"
                      >
                        Set as Event Poster
                      </button>
                    )}
                  </div>

                  {eventSetSuccess && (
                    <div className="p-2 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Attached to active event successfully!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Gallery Strip */}
            {history.length > 1 && (
              <div className="pt-3 border-t border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                  Recent Generations ({history.length})
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {history.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border transition-all ${
                        selectedImageIndex === idx
                          ? "border-blue-500 ring-2 ring-blue-500/40"
                          : "border-slate-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
