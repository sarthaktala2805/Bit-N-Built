"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  X,
  RotateCcw,
  Sliders,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeleprompterViewProps {
  scriptText?: string;
  scriptTitle?: string;
  language?: string;
  eventTitle?: string;
  isOpen?: boolean;
  onClose?: () => void;
  // Alternative prop names for compatibility
  initialScript?: string;
}

export const TeleprompterView: React.FC<TeleprompterViewProps> = ({
  scriptText,
  scriptTitle = "Stage Script",
  language = "English",
  eventTitle,
  isOpen = true,
  onClose,
  initialScript,
}) => {
  const activeScriptText = scriptText || initialScript || "";

  const [isPlaying, setIsPlaying] = useState(false);
  const [fontSize, setFontSize] = useState(36); // default 36px readable stage font
  const [scrollSpeed, setScrollSpeed] = useState(3); // scale 1 to 10
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Screen Wake Lock API
  useEffect(() => {
    let wakeLock: any = null;
    if (isOpen && "wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          wakeLock = lock;
        })
        .catch(() => {});
    }

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isOpen]);

  // Fullscreen API toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        if (onClose) onClose();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setScrollSpeed((prev) => Math.min(10, prev + 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setScrollSpeed((prev) => Math.max(1, prev - 1));
      } else if (e.key === "r" || e.key === "R") {
        handleRestart();
      } else if (e.key === "+" || e.key === "=") {
        setFontSize((prev) => Math.min(80, prev + 4));
      } else if (e.key === "-" || e.key === "_") {
        setFontSize((prev) => Math.max(20, prev - 4));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-scroll loop with delta time
  const scrollStep = useCallback(
    (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isPlaying && scrollContainerRef.current) {
        // Pixel movement formula based on speed (1x = ~25px/s, 3x = ~75px/s, 10x = ~250px/s)
        const pxPerSecond = 20 + scrollSpeed * 22;
        scrollContainerRef.current.scrollTop += pxPerSecond * delta;

        // Check if reached the end
        const isAtBottom =
          scrollContainerRef.current.scrollTop + scrollContainerRef.current.clientHeight >=
          scrollContainerRef.current.scrollHeight - 10;

        if (isAtBottom) {
          setIsPlaying(false);
        }
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(scrollStep);
      }
    },
    [isPlaying, scrollSpeed]
  );

  // Manage animation frame lifecycle
  useEffect(() => {
    // Clear any existing frame first to prevent duplicate loops
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(scrollStep);
    } else {
      lastTimeRef.current = null;
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, scrollStep]);

  // Handle user manual scroll
  const handleManualScroll = () => {
    setShowControls(true);
  };

  const handleRestart = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsPlaying(false);
  };

  if (!isOpen) return null;

  // Format script paragraphs and stage cues
  const formattedParagraphs = activeScriptText
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#03060d] text-slate-100 flex flex-col select-none overflow-hidden"
    >
      {/* Top Floating Control Bar */}
      <div
        className={`transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-30 hover:opacity-100"
        } bg-slate-950/90 border-b border-slate-800/80 px-4 sm:px-6 py-3 flex items-center justify-between backdrop-blur-md z-20`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1 text-xs"
              aria-label="Back / Exit"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">
                TELEPROMPTER
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {language}
              </span>
              {eventTitle && (
                <span className="text-xs text-slate-400 truncate hidden md:inline">
                  • {eventTitle}
                </span>
              )}
            </div>
            <h2 className="text-xs font-bold text-white truncate max-w-xs sm:max-w-md mt-0.5">
              {scriptTitle}
            </h2>
          </div>
        </div>

        {/* Speed, Font & Screen Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Speed Preset / Slider */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-slate-200">{scrollSpeed}x</span>
            <input
              type="range"
              min="1"
              max="10"
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(Number(e.target.value))}
              aria-label="Scroll Speed"
              className="w-20 accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Font size + / - */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setFontSize((prev) => Math.max(20, prev - 4))}
              aria-label="Decrease font size"
              title="Decrease Font Size (-)"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono px-1.5 text-slate-300 font-bold min-w-[36px] text-center">
              {fontSize}px
            </span>
            <button
              onClick={() => setFontSize((prev) => Math.min(80, prev + 4))}
              aria-label="Increase font size"
              title="Increase Font Size (+)"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mirror Flip Toggle */}
          <button
            onClick={() => setIsMirrored((prev) => !prev)}
            aria-label="Mirror Text"
            title="Mirror / Flip Text"
            className={`p-2 rounded-xl border transition-colors ${
              isMirrored
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle Fullscreen"
            title="Fullscreen (F)"
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit Button */}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Exit Teleprompter"
              title="Exit (Esc)"
              className="p-2 text-slate-400 hover:text-rose-400 rounded-xl bg-slate-900 border border-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Teleprompter Text Viewport */}
      <div
        ref={scrollContainerRef}
        onWheel={handleManualScroll}
        onTouchMove={handleManualScroll}
        className={`flex-1 overflow-y-auto px-6 sm:px-16 md:px-32 lg:px-44 py-16 cursor-text scroll-smooth ${
          isMirrored ? "scale-x-[-1]" : ""
        }`}
        style={{
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif",
        }}
      >
        <div className="max-w-4xl mx-auto space-y-8">
          {formattedParagraphs.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <p className="text-lg">No script content available.</p>
            </div>
          ) : (
            formattedParagraphs.map((paragraph, pIdx) => {
              // Check if paragraph is purely a stage direction [Pause], [Applause], (Welcome), etc.
              const isStageDirection = /^\[.*\]$/.test(paragraph) || /^\(.*\)$/.test(paragraph);

              if (isStageDirection) {
                return (
                  <div key={pIdx} className="my-6">
                    <span className="inline-block px-4 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-sm tracking-wide uppercase italic">
                      {paragraph}
                    </span>
                  </div>
                );
              }

              // Normal spoken paragraph
              return (
                <p
                  key={pIdx}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
                  className="font-medium text-slate-100 tracking-wide selection:bg-blue-600 leading-relaxed break-words"
                >
                  {paragraph}
                </p>
              );
            })
          )}
          {/* Buffer space so the speaker can read all the way to the end */}
          <div className="h-[65vh]"></div>
        </div>
      </div>

      {/* Bottom Floating Playbar */}
      <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-md flex items-center justify-center gap-4 z-20">
        <button
          onClick={handleRestart}
          aria-label="Restart to top"
          title="Restart to beginning (R)"
          className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying((prev) => !prev)}
          aria-label={isPlaying ? "Pause Auto-scroll" : "Start Auto-scroll"}
          className={`px-8 py-3 rounded-full font-bold text-sm flex items-center gap-2 shadow-xl transition-all ${
            isPlaying
              ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-400/50"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/25 ring-2 ring-blue-400/40"
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Pause (Space)</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Start Scroll (Space)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
