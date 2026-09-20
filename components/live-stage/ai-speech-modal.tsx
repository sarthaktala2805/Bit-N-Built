"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Sparkles,
  Play,
  Pause,
  Square,
  Languages,
  Clock,
  Save,
  Check,
  Copy,
  Sliders,
  Mic,
  RefreshCw,
  Edit3,
  CheckCircle2,
  SkipForward,
  SkipBack,
  AlertCircle,
  Volume2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useEventStore } from "@/store/event-store";
import { Session, Event } from "@/types";
import {
  SPEECH_EMOTIONS,
  SpeechEmotion,
  parseSpeechScript,
  requestStandinSpeech,
  estimateSpeechDurationSeconds,
  formatSpeechTime,
  categorizeVoices,
} from "@/lib/ai-standin-speech";

interface AISpeechModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  event: Event | null;
  onOpenInTeleprompter?: (text: string) => void;
}

export const AISpeechModal: React.FC<AISpeechModalProps> = ({
  isOpen,
  onClose,
  session,
  event,
  onOpenInTeleprompter,
}) => {
  const { addScript, addEventResource } = useEventStore();

  const [selectedEmotion, setSelectedEmotion] = useState<SpeechEmotion>("inspiring");
  const [selectedLanguage, setSelectedLanguage] = useState<"English" | "Hindi" | "Hinglish">("English");
  const [durationMinutes, setDurationMinutes] = useState<number>(2);
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>("");

  // Script text & editing state
  const [scriptText, setScriptText] = useState<string>("");
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editedScriptDraft, setEditedScriptDraft] = useState<string>("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  // Timing & Pacing controls ("speech ki timing hamare hisab se")
  const [pitch, setPitch] = useState<number>(1.05);
  const [rate, setRate] = useState<number>(0.96);
  const [pauseDurationSeconds, setPauseDurationSeconds] = useState<number>(1.0);

  // Browser voices & language-specific voice routing
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");

  // Sequential Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(-1);
  const [isStagePaused, setIsStagePaused] = useState<boolean>(false);
  const [stagePauseLabel, setStagePauseLabel] = useState<string>("");
  const [playbackElapsedSeconds, setPlaybackElapsedSeconds] = useState<number>(0);
  const [currentWordCharIndex, setCurrentWordCharIndex] = useState<number>(-1);

  // Refs to control playback loop
  const isPlayingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const activeBlockIndexRef = useRef<number>(-1);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeBlockRef = useRef<HTMLDivElement | HTMLParagraphElement | null>(null);

  // Sync ref values
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    isPausedRef.current = isPaused;
    activeBlockIndexRef.current = activeBlockIndex;
  }, [isPlaying, isPaused, activeBlockIndex]);

  // Auto-scroll teleprompter during speech delivery (especially for long 15-60+ min speeches)
  useEffect(() => {
    if (isPlaying && activeBlockIndex >= 0 && activeBlockRef.current) {
      activeBlockRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeBlockIndex, isPlaying]);

  // Load available browser voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Voice Categorization based on selected language
  const voiceInfo = useMemo(() => {
    return categorizeVoices(availableVoices, selectedLanguage);
  }, [availableVoices, selectedLanguage]);

  // Auto-switch to best voice when language changes
  useEffect(() => {
    if (availableVoices.length > 0) {
      if (voiceInfo.bestVoiceURI) {
        setSelectedVoiceURI(voiceInfo.bestVoiceURI);
      }
    }
  }, [selectedLanguage, availableVoices, voiceInfo.bestVoiceURI]);

  // Sync default pitch & rate when emotion changes
  useEffect(() => {
    const config = SPEECH_EMOTIONS.find((e) => e.id === selectedEmotion);
    if (config) {
      setPitch(config.defaultPitch);
      setRate(config.defaultRate);
    }
  }, [selectedEmotion]);

  // Parse current script into display blocks and clean spoken text
  const parsed = useMemo(() => {
    return parseSpeechScript(scriptText);
  }, [scriptText]);

  // Calculate estimated total speech duration based on current rate and pauses
  const estimatedDurationSecs = useMemo(() => {
    return estimateSpeechDurationSeconds(scriptText, rate, pauseDurationSeconds);
  }, [scriptText, rate, pauseDurationSeconds]);

  // Generate speech when opening modal or on user trigger
  const handleGenerate = useCallback(
    async (
      overrideEmotion?: SpeechEmotion,
      overrideLang?: "English" | "Hindi" | "Hinglish",
      overrideDuration?: number,
      overridePrompt?: string
    ) => {
      if (!session && !customPrompt && overridePrompt === undefined) return;
      setIsGenerating(true);
      setHasSaved(false);
      setIsEditingScript(false);

      const emotionToUse = overrideEmotion || selectedEmotion;
      const langToUse = overrideLang || selectedLanguage;
      const durationToUse = overrideDuration !== undefined ? overrideDuration : durationMinutes;
      const promptToUse = overridePrompt !== undefined ? overridePrompt : customPrompt;

      const res = await requestStandinSpeech({
        sessionTitle: session?.title || "Custom Keynote Address",
        sessionType: session?.type || "Keynote",
        eventName: event?.name,
        organizer: event?.organizer,
        venue: event?.venue,
        emotion: emotionToUse,
        language: langToUse,
        durationMinutes: durationToUse,
        customPrompt: promptToUse.trim() || undefined,
      });

      setScriptText(res.script);
      setEditedScriptDraft(res.script);
      setIsGenerating(false);
    },
    [session, event, selectedEmotion, selectedLanguage, durationMinutes, customPrompt]
  );

  useEffect(() => {
    if (isOpen && session && !scriptText) {
      handleGenerate();
    }
  }, [isOpen, session, scriptText, handleGenerate]);

  // Stop playback and cleanup
  const handleStop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }

    setIsPlaying(false);
    setIsPaused(false);
    setActiveBlockIndex(-1);
    setIsStagePaused(false);
    setStagePauseLabel("");
    setPlaybackElapsedSeconds(0);
    setCurrentWordCharIndex(-1);
  }, []);

  // Stop speech when modal closes
  useEffect(() => {
    if (!isOpen) {
      handleStop();
    }
  }, [isOpen, handleStop]);

  // Play a specific block sequentially
  const playBlockAtIndex = useCallback(
    (index: number) => {
      if (!isPlayingRef.current) return;
      if (index >= parsed.blocks.length) {
        handleStop();
        return;
      }

      setActiveBlockIndex(index);
      const currentBlock = parsed.blocks[index];

      // If it's a stage direction / pause cue
      if (currentBlock.type === "stage_cue") {
        setIsStagePaused(true);
        setStagePauseLabel(currentBlock.text);

        const pauseMs = Math.round(pauseDurationSeconds * 1000);
        pauseTimerRef.current = setTimeout(() => {
          if (!isPlayingRef.current) return;
          setIsStagePaused(false);
          setStagePauseLabel("");
          playBlockAtIndex(index + 1);
        }, pauseMs);
        return;
      }

      // If it's spoken text
      setIsStagePaused(false);
      setStagePauseLabel("");

      const spokenText = currentBlock.text.trim();
      if (!spokenText) {
        playBlockAtIndex(index + 1);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.pitch = pitch;
      utterance.rate = rate;

      // Set language tag to instruct the engine's phonetic rules
      if (selectedLanguage === "Hindi") {
        utterance.lang = "hi-IN";
      } else if (selectedLanguage === "Hinglish") {
        utterance.lang = "en-IN";
      } else {
        utterance.lang = "en-US";
      }

      // Assign selected browser voice
      if (selectedVoiceURI && availableVoices.length > 0) {
        const v = availableVoices.find((voice) => voice.voiceURI === selectedVoiceURI);
        if (v) utterance.voice = v;
      }

      utterance.onboundary = (e) => {
        if (e.name === "word") {
          setCurrentWordCharIndex(e.charIndex);
        }
      };

      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        // Natural micro-pause between sentences
        setTimeout(() => {
          if (!isPlayingRef.current) return;
          playBlockAtIndex(index + 1);
        }, 200);
      };

      utterance.onerror = (e) => {
        console.error("[SpeechSynthesis Error]:", e);
        if (!isPlayingRef.current) return;
        playBlockAtIndex(index + 1);
      };

      window.speechSynthesis.speak(utterance);
    },
    [
      parsed.blocks,
      pitch,
      rate,
      selectedLanguage,
      selectedVoiceURI,
      availableVoices,
      pauseDurationSeconds,
      handleStop,
    ]
  );

  // Play / Resume
  const handlePlay = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    handleStop();
    setIsPlaying(true);
    setIsPaused(false);

    // Start elapsed timer
    elapsedTimerRef.current = setInterval(() => {
      setPlaybackElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Start from first block
    setTimeout(() => {
      playBlockAtIndex(0);
    }, 100);
  };

  const handlePause = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  // Skip forward to next block
  const handleSkipNext = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
    const nextIdx = activeBlockIndex + 1;
    if (nextIdx < parsed.blocks.length) {
      playBlockAtIndex(nextIdx);
    } else {
      handleStop();
    }
  };

  // Skip back to previous block
  const handleSkipPrev = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
    const prevIdx = Math.max(0, activeBlockIndex - 1);
    playBlockAtIndex(prevIdx);
  };

  // Save edited script draft
  const handleSaveEdit = () => {
    setScriptText(editedScriptDraft);
    setIsEditingScript(false);
    handleStop();
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!scriptText) return;
    try {
      await navigator.clipboard.writeText(scriptText);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  // Save to Event Scripts & Resources
  const handleSaveToEvent = () => {
    if (!event || !session || !scriptText) return;

    // Save as dedicated Script Item
    addScript({
      eventId: event.id,
      title: `Stand-in Speech: ${session.title}`,
      category: "speaker",
      scriptType: "Keynote Stand-in Address",
      content: scriptText,
      targetPerson: "AI Stand-in Speaker",
      deliveryNotes: `Emotion: ${selectedEmotion} | Language: ${selectedLanguage} | Speed: ${rate}x | Duration: ${formatSpeechTime(
        estimatedDurationSecs
      )}`,
    });

    // Also add to event resources
    addEventResource(event.id, {
      name: `AI Stand-in Speech: ${session.title}`,
      type: "script",
      size: `${scriptText.length} chars`,
      data: scriptText,
    });

    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 3000);
  };

  if (!isOpen) return null;

  const activeEmotionConfig = SPEECH_EMOTIONS.find((e) => e.id === selectedEmotion);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" title="">
      <div className="space-y-4 -mt-2">
        {/* Header with Live Stand-in Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
                <Mic className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                AI Stand-in Speaker
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-pink-300 border border-pink-500/30">
                  Custom Timing &amp; Feeling
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              When a speaker is missing or delayed, AI delivers the address live with native pronunciation in Hindi, Hinglish, or English, with exact pacing and pauses you control.
            </p>
          </div>

          {session && (
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-right shrink-0">
              <span className="text-[10px] text-slate-400 block font-medium">SESSION</span>
              <span className="text-xs font-bold text-white truncate max-w-[180px] block">
                {session.title}
              </span>
            </div>
          )}
        </div>

        {/* Emotion / Feeling Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Speech Feeling &amp; Emotional Cadence
            </label>
            <span className="text-[11px] text-slate-400">
              {activeEmotionConfig?.hindiLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPEECH_EMOTIONS.map((em) => {
              const isSelected = selectedEmotion === em.id;
              return (
                <button
                  key={em.id}
                  onClick={() => {
                    setSelectedEmotion(em.id);
                    handleGenerate(em.id, selectedLanguage);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? `bg-slate-800/90 ${em.badgeColor} shadow-md shadow-indigo-500/10 ring-1 ring-offset-1 ring-offset-slate-900 ring-indigo-500/50`
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">{em.emoji}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{em.label}</h4>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{em.tagline}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Speech Prompt / Topic Input Card */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Custom Speech Topic &amp; Guidelines (आपकी पसंद का विषय / प्रॉम्प्ट)
            </label>
            {customPrompt.trim() && (
              <button
                type="button"
                onClick={() => {
                  setCustomPrompt("");
                  handleGenerate(selectedEmotion, selectedLanguage, durationMinutes, "");
                }}
                className="text-[10px] text-slate-400 hover:text-rose-400 underline"
              >
                Clear Prompt
              </button>
            )}
          </div>

          <div className="relative">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={2}
              placeholder="e.g. 'Congratulate our student winners, thank mentor Dr. Sharma, and inspire the hall on Quantum AI startups...' (अपना विषय या मुख्य बिंदु यहाँ लिखें)"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg p-2.5 text-xs text-white placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-sans"
            />
          </div>

          {/* Quick Prompt Idea Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400">Quick ideas:</span>
            {[
              "🏆 Award & Winner Tribute",
              "🚀 Startup & Bold Vision",
              "🙏 Heartfelt Vote of Thanks",
              "💡 Overcoming Hard Obstacles",
              "🤝 Community & Teamwork",
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const newPrompt = customPrompt ? `${customPrompt}. Focus also on: ${tag}` : `Focus on: ${tag}`;
                  setCustomPrompt(newPrompt);
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:bg-indigo-900/40 hover:text-indigo-200 transition-all"
              >
                {tag}
              </button>
            ))}

            <Button
              type="button"
              onClick={() => handleGenerate(selectedEmotion, selectedLanguage, durationMinutes, customPrompt)}
              disabled={isGenerating}
              size="sm"
              className="ml-auto text-xs h-7 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20"
            >
              <Sparkles className="w-3 h-3 mr-1 text-amber-300" />
              Generate from My Prompt
            </Button>
          </div>
        </div>

        {/* Language Selection & Voice Routing */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
                <Languages className="w-3.5 h-3.5 text-indigo-400" />
                Language:
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                {(["English", "Hindi", "Hinglish"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      setSelectedLanguage(lang);
                      handleGenerate(selectedEmotion, lang);
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      selectedLanguage === lang
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {lang === "Hindi" ? "🇮🇳 हिंदी (Hindi)" : lang === "Hinglish" ? "🇮🇳 हिंग्लिश (Hinglish)" : "🌐 English"}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Duration Pills & Custom Duration */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Duration (लंबाई):
              </span>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 flex-wrap">
                {[1, 2, 5, 10, 15, 20, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setDurationMinutes(mins);
                      setIsCustomDuration(false);
                      handleGenerate(selectedEmotion, selectedLanguage, mins);
                    }}
                    className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                      !isCustomDuration && durationMinutes === mins
                        ? "bg-slate-800 text-white font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
                <button
                  onClick={() => setIsCustomDuration(!isCustomDuration)}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                    isCustomDuration
                      ? "bg-indigo-600 text-white font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Custom
                </button>
              </div>

              {isCustomDuration && (
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-indigo-500/50 text-xs">
                  <span className="text-slate-400">Set:</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(180, parseInt(e.target.value) || 1));
                      setDurationMinutes(val);
                    }}
                    className="w-14 bg-slate-950 border border-slate-700 text-white font-mono text-xs rounded px-1.5 py-0.5 text-center focus:border-indigo-400 focus:outline-none"
                  />
                  <span className="text-slate-400">min</span>
                  <button
                    onClick={() => handleGenerate(selectedEmotion, selectedLanguage, durationMinutes)}
                    className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded ml-1"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Long speech scale indicator */}
              <div className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <span className={durationMinutes >= 15 ? "text-amber-400 font-bold" : "text-emerald-400"}>
                  {durationMinutes >= 60 ? "🔥 Marathon Keynote" : durationMinutes >= 30 ? "⚡ Extended Address" : durationMinutes >= 15 ? "🎙️ In-Depth Keynote" : "⏱️ Live Address"}
                </span>
                <span className="text-slate-400 font-mono">
                  (~{Math.round(durationMinutes * 125).toLocaleString()} words)
                </span>
                {durationMinutes >= 15 && (
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 rounded border border-indigo-500/30">
                    8K Tokens
                  </span>
                )}
              </div>

              <Button
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="text-xs h-7 bg-slate-900 border-slate-800"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
            </div>
          </div>

          {/* Voice Accent Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="text-slate-300 font-medium shrink-0">Voice Engine:</span>
              <select
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 max-w-[280px] truncate"
              >
                {voiceInfo.recommended.length > 0 && (
                  <optgroup label="🌟 Recommended for this Language">
                    {voiceInfo.recommended.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </optgroup>
                )}

                {voiceInfo.hindiVoices.length > 0 && selectedLanguage !== "Hindi" && (
                  <optgroup label="🇮🇳 Hindi Voices (hi-IN)">
                    {voiceInfo.hindiVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </optgroup>
                )}

                {voiceInfo.indianEnglishVoices.length > 0 && selectedLanguage !== "Hinglish" && (
                  <optgroup label="🇮🇳 Indian English (en-IN)">
                    {voiceInfo.indianEnglishVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup label="🌐 All System Voices">
                  {voiceInfo.allVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {selectedLanguage === "Hindi" && voiceInfo.hindiVoices.length === 0 && (
              <span className="text-[11px] text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Native Hindi voice not detected in browser. Indian English voice will be used.
              </span>
            )}

            {selectedLanguage === "Hinglish" && (
              <span className="text-[11px] text-indigo-300">
                ✨ Indian accent voice active for natural Hindi/English blend
              </span>
            )}
          </div>
        </div>

        {/* Speech Timing & Pacing Controls ("timing hamare hisab se") */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Timing &amp; Pace Customization
            </span>

            {/* Real-time Estimated Duration Display */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Total Delivery Time:</span>
              <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                ⏱️ {formatSpeechTime(estimatedDurationSecs)}
              </span>
              <span className="text-[11px] text-slate-500">
                ({parsed.blocks.filter((b) => b.type === "spoken").reduce((acc, b) => acc + b.text.split(/\s+/).filter(Boolean).length, 0)} words)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Speed / Rate Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Speaking Speed (गति):</span>
                <span className="font-mono text-slate-200 font-bold">{rate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.65"
                max="1.45"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 rounded bg-slate-800"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <button onClick={() => setRate(0.8)} className="hover:text-slate-300">Slow (0.8x)</button>
                <button onClick={() => setRate(1.0)} className="hover:text-slate-300">Stage (1.0x)</button>
                <button onClick={() => setRate(1.2)} className="hover:text-slate-300">Brisk (1.2x)</button>
              </div>
            </div>

            {/* Pause / Breath Duration Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Pause on Cues (ठहराव):</span>
                <span className="font-mono text-slate-200 font-bold">{pauseDurationSeconds.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={pauseDurationSeconds}
                onChange={(e) => setPauseDurationSeconds(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 rounded bg-slate-800"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <button onClick={() => setPauseDurationSeconds(0.5)} className="hover:text-slate-300">Quick (0.5s)</button>
                <button onClick={() => setPauseDurationSeconds(1.0)} className="hover:text-slate-300">Natural (1.0s)</button>
                <button onClick={() => setPauseDurationSeconds(1.8)} className="hover:text-slate-300">Dramatic (1.8s)</button>
              </div>
            </div>

            {/* Pitch / Vocal Depth Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Vocal Depth (पिच):</span>
                <span className="font-mono text-slate-200 font-bold">{pitch.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.3"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 rounded bg-slate-800"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <button onClick={() => setPitch(0.85)} className="hover:text-slate-300">Deeper</button>
                <button onClick={() => setPitch(1.0)} className="hover:text-slate-300">Natural</button>
                <button onClick={() => setPitch(1.15)} className="hover:text-slate-300">Energetic</button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Audio Visualizer & Stage Teleprompter */}
        <div className="rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900/90 border border-slate-800 p-4 shadow-2xl relative overflow-hidden">
          {/* Progress Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              {/* Wave Bars */}
              <div className="flex items-center gap-1 h-5">
                {[40, 75, 100, 60, 90, 45, 80, 100, 70, 50, 85, 60, 95, 40, 70, 50].map((h, i) => (
                  <span
                    key={i}
                    style={{
                      height:
                        isPlaying && !isPaused && !isStagePaused
                          ? `${Math.max(20, Math.sin(Date.now() / 200 + i) * 100)}%`
                          : isStagePaused
                          ? "15%"
                          : "20%",
                      transition: "height 0.15s ease",
                    }}
                    className={`w-1 rounded-full transition-all ${
                      isPlaying && !isPaused && !isStagePaused
                        ? "bg-gradient-to-t from-violet-500 to-pink-400"
                        : isStagePaused
                        ? "bg-amber-400 animate-pulse"
                        : "bg-slate-700/50"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  {isStagePaused ? (
                    <span className="text-amber-300 font-bold animate-pulse">
                      ⏸️ Stage Breath ({pauseDurationSeconds.toFixed(1)}s): [{stagePauseLabel}]
                    </span>
                  ) : isPlaying && !isPaused ? (
                    <span className="text-emerald-300 font-bold">
                      🎙️ Speaking with Feeling ({rate}x speed)...
                    </span>
                  ) : isPaused ? (
                    "⏸️ Speech Paused"
                  ) : (
                    "Ready for Stage Delivery"
                  )}
                </span>
              </div>
            </div>

            {/* Live Playback Timers */}
            <div className="flex items-center gap-2 text-xs font-mono">
              {isPlaying && (
                <span className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {formatSpeechTime(playbackElapsedSeconds)} / {formatSpeechTime(estimatedDurationSecs)}
                </span>
              )}

              <Button
                onClick={() => {
                  if (isEditingScript) {
                    handleSaveEdit();
                  } else {
                    setEditedScriptDraft(scriptText);
                    setIsEditingScript(true);
                  }
                }}
                variant="outline"
                size="sm"
                className="text-xs h-7 bg-slate-900 border-slate-800 text-slate-300"
              >
                {isEditingScript ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                    Done Editing
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3 h-3 mr-1 text-indigo-400" />
                    Edit Words
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Teleprompter / Script Display */}
          {isEditingScript ? (
            <div className="space-y-2">
              <textarea
                value={editedScriptDraft}
                onChange={(e) => setEditedScriptDraft(e.target.value)}
                rows={7}
                className="w-full bg-slate-900 border border-indigo-500/50 rounded-xl p-3 text-sm text-slate-200 font-sans focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                placeholder="Type or edit your speech in Hindi, Hinglish, or English. You can use square brackets [like this] for emotional stage cues."
              />
              <p className="text-[11px] text-slate-400">
                💡 Tip: Use square brackets like <code>[गहरी सांस लेते हुए]</code> or <code>[Passionate pause]</code> for stage pauses and emotion cues.
              </p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto pr-2 space-y-3 font-sans text-sm leading-relaxed scrollbar-thin">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
                  <p className="text-xs">Generating speech with native pronunciation &amp; stage cues...</p>
                </div>
              ) : (
                parsed.blocks.map((block, idx) => {
                  const isActive = activeBlockIndex === idx;

                  if (block.type === "stage_cue") {
                    return (
                      <div
                        key={idx}
                        ref={isActive ? (activeBlockRef as React.RefObject<HTMLDivElement>) : null}
                        className={`inline-block my-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium italic transition-all ${
                          isActive
                            ? "bg-amber-500/20 border border-amber-500/60 text-amber-200 shadow-md ring-1 ring-amber-500/30 scale-105"
                            : "bg-indigo-950/60 border border-indigo-500/30 text-indigo-300"
                        }`}
                      >
                        🎭 Stage Cue: [{block.text}] {isActive && `(Pausing ${pauseDurationSeconds}s...)`}
                      </div>
                    );
                  }

                  // Spoken paragraph
                  return (
                    <p
                      key={idx}
                      ref={isActive ? (activeBlockRef as React.RefObject<HTMLParagraphElement>) : null}
                      className={`text-sm md:text-base leading-relaxed tracking-wide transition-all p-2 rounded-xl ${
                        isActive
                          ? "bg-indigo-950/40 border border-indigo-500/50 text-white font-medium shadow-inner"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {block.text}
                    </p>
                  );
                })
              )}
            </div>
          )}

          {/* Primary Speech Delivery Controls */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {!isPlaying || isPaused ? (
                <Button
                  onClick={handlePlay}
                  disabled={isGenerating || !scriptText}
                  variant="primary"
                  size="md"
                  className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white font-bold shadow-lg shadow-indigo-500/25 px-5 hover:from-violet-500 hover:to-purple-500"
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  {isPaused ? "Resume Speech" : "Deliver Speech with Feeling"}
                </Button>
              ) : (
                <Button
                  onClick={handlePause}
                  variant="outline"
                  size="md"
                  className="bg-amber-950/40 border-amber-600/50 text-amber-200 hover:bg-amber-900"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}

              <Button
                onClick={handleStop}
                disabled={!isPlaying && !isPaused}
                variant="outline"
                size="md"
                className="bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
              >
                <Square className="w-3.5 h-3.5 mr-1 text-rose-400" />
                Stop
              </Button>

              {isPlaying && (
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={handleSkipPrev}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                    title="Previous paragraph"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleSkipNext}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                    title="Next paragraph"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Active Speech Timing Badge */}
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span>Selected Voice:</span>
              <span className="font-semibold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[160px]">
                {availableVoices.find((v) => v.voiceURI === selectedVoiceURI)?.name || "Default Browser Voice"}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions: Save, Copy & Teleprompter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveToEvent}
              disabled={hasSaved || !scriptText}
              variant="outline"
              size="sm"
              className="text-xs bg-slate-900 border-slate-800 text-emerald-400 hover:bg-slate-800"
            >
              {hasSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Saved to Event Archive
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  Save to Event Archive
                </>
              )}
            </Button>

            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="text-xs bg-slate-900 border-slate-800 text-slate-300"
            >
              {hasCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Copied Script
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copy Script
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {onOpenInTeleprompter && (
              <Button
                onClick={() => {
                  onOpenInTeleprompter(parsed.cleanSpokenText || scriptText);
                  onClose();
                }}
                variant="secondary"
                size="sm"
                className="text-xs"
              >
                Launch on Stage Teleprompter
              </Button>
            )}

            <Button onClick={onClose} variant="ghost" size="sm" className="text-xs text-slate-400">
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
