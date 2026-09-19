"use client";

import React, { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Download,
  Tv,
  Sparkles,
  Calendar,
  Layers,
  ChevronDown,
  Loader2,
  AlertCircle,
  X,
  Printer,
  Upload,
  Globe,
  Languages,
  BookOpen,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { ScriptItem } from "@/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TeleprompterView } from "@/components/teleprompter/teleprompter-view";
import { processUploadFile, ProcessedFileResult } from "@/lib/file-processor";

const SCRIPT_CATEGORIES = [
  { id: "all", label: "All Scripts" },
  { id: "anchor", label: "Anchor" },
  { id: "organizer", label: "Stage Manager / Organizer" },
  { id: "speaker", label: "Speaker" },
  { id: "artist", label: "Artist / Performer" },
  { id: "award", label: "Award Ceremony" },
] as const;

const SCRIPT_TYPES_BY_CATEGORY: Record<string, string[]> = {
  anchor: [
    "Opening Address",
    "Welcome Speech",
    "Guest Introduction",
    "Speaker Introduction",
    "Artist Introduction",
    "Performance Introduction",
    "Stage Transition",
    "Audience Engagement",
    "Delay Filler",
    "Emergency Filler",
    "Closing & Vote of Thanks",
  ],
  organizer: [
    "Stage Instruction",
    "Speaker Call",
    "Artist Call",
    "Schedule Announcement",
    "Delay Announcement",
    "Technical Issue Announcement",
    "Unexpected Break Announcement",
    "Venue Change Announcement",
  ],
  speaker: [
    "Speaker Introduction",
    "Session Opening",
    "Session Closing",
  ],
  artist: [
    "Artist Introduction",
    "Performance Transition",
  ],
  award: [
    "Nominee Announcement",
    "Winner Announcement",
    "Felicitation Script",
    "Photo Session Transition",
    "Ceremony Closing",
  ],
};

const SUPPORTED_LANGUAGES = [
  { id: "English", label: "English" },
  { id: "Hindi", label: "Hindi (हिंदी)" },
  { id: "Gujarati", label: "Gujarati (ગુજરાતી)" },
  { id: "Hindi + English", label: "Bilingual (Hindi + English)" },
  { id: "Gujarati + English", label: "Bilingual (Gujarati + English)" },
  { id: "Hindi + Gujarati", label: "Bilingual (Hindi + Gujarati)" },
];

export default function ScriptsPage() {
  const router = useRouter();

  const {
    events,
    activeEventId,
    setActiveEvent,
    scripts,
    speakers,
    addScript,
    updateScript,
    deleteScript,
  } = useEventStore();

  const [selectedEventId, setSelectedEventId] = useState<string>(activeEventId || events[0]?.id || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Generation Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [genCategory, setGenCategory] = useState<"anchor" | "organizer" | "speaker" | "artist" | "award">("anchor");
  const [genScriptType, setGenScriptType] = useState<string>("Opening Address");
  const [genSpeakerId, setGenSpeakerId] = useState<string>("");
  const [genCustomPrompt, setGenCustomPrompt] = useState<string>("");
  const [genLanguage, setGenLanguage] = useState<string>("English");
  const [genTone, setGenTone] = useState<"Formal" | "Energetic" | "Warm" | "Humorous">("Warm");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Upload Script State
  const [uploadedScriptFile, setUploadedScriptFile] = useState<ProcessedFileResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<"anchor" | "organizer" | "speaker" | "artist" | "award">("anchor");
  const [uploadLanguage, setUploadLanguage] = useState("English");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Translate State
  const [translatingScriptId, setTranslatingScriptId] = useState<string | null>(null);

  // Card Editing, Reading Modal & Teleprompter State
  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
  const [readingScript, setReadingScript] = useState<ScriptItem | null>(null);
  const [teleprompterScriptItem, setTeleprompterScriptItem] = useState<ScriptItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Resolve current active event
  const currentEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const eventSpeakers = useMemo(
    () => speakers.filter((s) => s.eventId === selectedEventId),
    [speakers, selectedEventId]
  );

  const eventScripts = useMemo(() => {
    return scripts.filter((s) => s.eventId === selectedEventId);
  }, [scripts, selectedEventId]);

  const filteredScripts = useMemo(() => {
    return eventScripts.filter((s) => {
      const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.scriptType.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        (s.targetName && s.targetName.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [eventScripts, selectedCategory, searchQuery]);

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setActiveEvent(eventId);
    setEditingScriptId(null);
  };

  const handleCopy = (scriptId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScriptId(scriptId);
    setTimeout(() => setCopiedScriptId(null), 2000);
  };

  const handleStartEdit = (script: ScriptItem) => {
    setEditingScriptId(script.id);
    setEditedContent(script.editedContent || script.content);
  };

  const handleSaveEdit = (scriptId: string) => {
    updateScript(scriptId, { editedContent });
    setEditingScriptId(null);
    if (readingScript?.id === scriptId) {
      setReadingScript((prev) => (prev ? { ...prev, editedContent } : null));
    }
  };

  const handleDelete = (scriptId: string) => {
    deleteScript(scriptId);
    setDeleteConfirmId(null);
    if (readingScript?.id === scriptId) {
      setReadingScript(null);
    }
  };

  const handleDownloadTxt = (script: ScriptItem) => {
    const text = script.editedContent || script.content;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${script.title.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = (script: ScriptItem) => {
    const text = script.editedContent || script.content;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${script.title}</title>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Gujarati", "Noto Sans Devanagari", Helvetica, Arial, sans-serif;
              padding: 40px;
              color: #111;
              line-height: 1.7;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              border-bottom: 2px solid #2563eb;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            .header h1 {
              margin: 0 0 6px 0;
              font-size: 24px;
              color: #0f172a;
            }
            .header .meta {
              font-size: 13px;
              color: #64748b;
            }
            .content {
              font-size: 16px;
              white-space: pre-wrap;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${script.title}</h1>
            <div class="meta">
              Event: ${currentEvent?.name || "StageX Event"} | Category: ${script.category.toUpperCase()} | Type: ${script.scriptType} | Language: ${script.language || "English"}
              ${script.targetName ? " | Target: " + script.targetName : ""}
            </div>
          </div>
          <div class="content">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleOpenTeleprompter = (script: ScriptItem) => {
    router.push(`/teleprompter?scriptId=${script.id}`);
  };

  const handleGenerateScript = async () => {
    if (!currentEvent) {
      setGenError("Please select an event first.");
      return;
    }

    setIsGenerating(true);
    setGenError(null);

    const targetSpeaker = eventSpeakers.find((s) => s.id === genSpeakerId);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "role_script",
          role:
            genCategory === "anchor"
              ? "Anchor"
              : genCategory === "organizer"
              ? "Stage Manager / Organizer"
              : genCategory === "speaker"
              ? "Speaker"
              : genCategory === "artist"
              ? "Artist / Performer"
              : "Award Ceremony Host",
          scriptCategory: genScriptType,
          targetPerson: targetSpeaker ? `${targetSpeaker.name} (${targetSpeaker.designation || "Featured"})` : undefined,
          prompt: genCustomPrompt || `Generate stage-ready ${genScriptType} for ${currentEvent.name}`,
          language: genLanguage,
          context: {
            event: {
              name: currentEvent.name,
              type: currentEvent.type,
              date: currentEvent.startDate || currentEvent.date,
              venue: currentEvent.venue,
              organizer: currentEvent.organizer,
              description: currentEvent.description,
            },
            speaker: targetSpeaker
              ? {
                  name: targetSpeaker.name,
                  designation: targetSpeaker.designation,
                  organization: targetSpeaker.organization,
                  bio: targetSpeaker.bio,
                }
              : undefined,
            request: {
              tone: genTone,
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate script.");
      }

      const scriptContent = data.text;
      const title = `${genScriptType}${targetSpeaker ? " - " + targetSpeaker.name : ""}`;

      addScript({
        eventId: currentEvent.id,
        title,
        category: genCategory,
        scriptType: genScriptType,
        targetName: targetSpeaker ? targetSpeaker.name : undefined,
        content: scriptContent,
        language: genLanguage,
      });

      setIsGenerateModalOpen(false);
      setGenCustomPrompt("");
      setGenSpeakerId("");
    } catch (err: unknown) {
      setGenError((err as Error)?.message || "Script generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploading(true);
    try {
      const result = await processUploadFile(file);
      if (result.error) {
        alert(result.error);
      } else {
        setUploadedScriptFile(result);
        setUploadTitle(result.fileName.replace(/\.[^/.]+$/, ""));
        setUploadModalOpen(true);
      }
    } catch (err: unknown) {
      alert("Failed to read script file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveUploadedScript = (asImprovedText?: string) => {
    if (!currentEvent || !uploadedScriptFile) return;

    const contentToSave = asImprovedText || uploadedScriptFile.extractedText;

    addScript({
      eventId: currentEvent.id,
      title: uploadTitle || uploadedScriptFile.fileName,
      category: uploadCategory,
      scriptType: "Imported Script",
      content: contentToSave,
      language: uploadLanguage,
    });

    setUploadModalOpen(false);
    setUploadedScriptFile(null);
  };

  const handleImproveUploadedScript = async () => {
    if (!uploadedScriptFile || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "improve_script",
          extractedText: uploadedScriptFile.extractedText,
          prompt: `Polish and improve this uploaded script for ${currentEvent?.name || "Stage Event"}. Make it natural, stage-ready and engaging.`,
          language: uploadLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to polish script.");

      handleSaveUploadedScript(data.text);
    } catch (err: unknown) {
      alert((err as Error)?.message || "Failed to improve script.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTranslateScript = async (script: ScriptItem, targetLang: string) => {
    setTranslatingScriptId(script.id);
    try {
      const sourceText = script.editedContent || script.content;
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "script_translate",
          extractedText: sourceText,
          language: targetLang,
          prompt: `Translate this stage script into ${targetLang}. Ensure natural, spoken flow suitable for stage reading or teleprompter.`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Translation failed.");

      addScript({
        eventId: script.eventId,
        title: `${script.title} (${targetLang})`,
        category: script.category,
        scriptType: script.scriptType,
        targetName: script.targetName,
        content: data.text,
        language: targetLang,
      });
    } catch (err: unknown) {
      alert((err as Error)?.message || "Translation failed.");
    } finally {
      setTranslatingScriptId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Scripts & Teleprompter
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {eventScripts.length} saved
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Spoken stage scripts with Gujarati, Hindi & English support and dedicated Live Teleprompter.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Event Selector Dropdown */}
            <div className="relative">
              <select
                aria-label="Select Event"
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 pr-10 text-xs font-semibold text-slate-200 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer shadow-sm transition-all"
              >
                {events.length === 0 ? (
                  <option value="">No events available</option>
                ) : (
                  events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Hidden Script File Upload Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            {/* Upload Script Button */}
            <Button
              variant="outline"
              disabled={!currentEvent || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="border-slate-700 hover:border-blue-500 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-2"
            >
              {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Upload className="w-3.5 h-3.5 text-blue-400" />}
              <span>Upload Script</span>
            </Button>

            {/* Generate Script Button */}
            <Button
              onClick={() => setIsGenerateModalOpen(true)}
              disabled={!currentEvent}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate Script
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {!currentEvent ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title="No event selected"
            description="Create or select an event to view, generate, and manage role-specific stage scripts."
          />
        ) : (
          <>
            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/40 p-2.5 rounded-2xl border border-slate-800/80">
              {/* Category Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {SCRIPT_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search scripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {/* Script Cards Grid */}
            {filteredScripts.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-semibold text-slate-300 mb-1">
                  {searchQuery ? "No matching scripts found" : "No scripts saved for this category"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                  Generate tailored anchor addresses, speaker introductions, and stage announcements for{" "}
                  <span className="text-slate-300 font-medium">{currentEvent.name}</span> in English, Hindi, or Gujarati.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="border-slate-700 text-xs px-4 py-2 rounded-xl inline-flex items-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Existing Script
                  </Button>
                  <Button
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-xl inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate First Script
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredScripts.map((script) => {
                  const isEditing = editingScriptId === script.id;
                  const isTranslating = translatingScriptId === script.id;
                  const activeText = isEditing ? editedContent : script.editedContent || script.content;

                  return (
                    <div
                      key={script.id}
                      className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700/80 transition-all shadow-sm group"
                    >
                      {/* Card Header */}
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {script.category}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                {script.language || "English"}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-white tracking-tight">{script.title}</h3>
                            {script.targetName && (
                              <span className="text-xs text-blue-400 font-medium block mt-0.5">
                                For: {script.targetName}
                              </span>
                            )}
                          </div>

                          {/* Quick Translate Menu */}
                          <div className="relative group/lang">
                            <button
                              title="Translate Script"
                              aria-label="Translate Script"
                              disabled={isTranslating}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition"
                            >
                              {isTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
                            </button>
                            <div className="absolute right-0 top-full mt-1 hidden group-hover/lang:block bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-2xl z-30 min-w-[130px]">
                              {SUPPORTED_LANGUAGES.map((lang) => (
                                <button
                                  key={lang.id}
                                  onClick={() => handleTranslateScript(script, lang.id)}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-blue-600 hover:text-white transition"
                                >
                                  {lang.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Content Area Preview */}
                        {isEditing ? (
                          <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            rows={6}
                            className="w-full bg-slate-950 border border-blue-500/60 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                          />
                        ) : (
                          <div className="space-y-2">
                            <div
                              onClick={() => setReadingScript(script)}
                              className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/60 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-3 font-sans cursor-pointer hover:border-slate-700 transition-colors"
                              title="Click to read full script"
                            >
                              {activeText}
                            </div>
                            <button
                              onClick={() => setReadingScript(script)}
                              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1.5 transition-colors"
                            >
                              <BookOpen className="w-3 h-3" />
                              <span>Read Full Script</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopy(script.id, activeText)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs flex items-center gap-1"
                            title="Copy to clipboard"
                            aria-label="Copy to clipboard"
                          >
                            {copiedScriptId === script.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDownloadTxt(script)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Download complete script as TXT"
                            aria-label="Download TXT"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handlePrintPdf(script)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Print / Save PDF"
                            aria-label="Print PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenTeleprompter(script)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition flex items-center gap-1 text-xs"
                            title="Open in Teleprompter"
                            aria-label="Open in Teleprompter"
                          >
                            <Tv className="w-3.5 h-3.5 text-blue-400" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingScriptId(null)}
                                className="h-7 px-2.5 text-xs text-slate-400 hover:text-white"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(script.id)}
                                className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                              >
                                <Save className="w-3 h-3 mr-1" /> Save
                              </Button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(script)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                title="Edit text"
                                aria-label="Edit script"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(script.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                                title="Delete script"
                                aria-label="Delete script"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Delete Confirmation Modal Overlay */}
                      {deleteConfirmId === script.id && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
                            <div className="flex items-center gap-3 text-red-400">
                              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                                <Trash2 className="w-5 h-5" />
                              </div>
                              <h3 className="text-base font-semibold text-white">Delete Script?</h3>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Are you sure you want to delete &ldquo;{script.title}&rdquo;? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-2 pt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-slate-400 hover:text-white text-xs rounded-xl"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDelete(script.id)}
                                className="bg-red-600 hover:bg-red-500 text-white text-xs rounded-xl"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── FULL SCRIPT READER MODAL ── */}
      {readingScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                    {readingScript.category}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {readingScript.language || "English"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {readingScript.scriptType}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {readingScript.title}
                </h2>
                {readingScript.targetName && (
                  <p className="text-xs text-blue-400">For: {readingScript.targetName}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleOpenTeleprompter(readingScript)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Teleprompter</span>
                </Button>

                <button
                  onClick={() => setReadingScript(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  aria-label="Close Reader"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content */}
            <div
              className="p-6 md:p-8 overflow-y-auto max-h-[60vh] space-y-4 bg-slate-950/30 text-slate-200 text-sm md:text-base leading-relaxed"
              style={{
                fontFamily:
                  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif",
              }}
            >
              {(readingScript.editedContent || readingScript.content)
                .split(/\n\n+/)
                .map((paragraph, idx) => {
                  const trimmed = paragraph.trim();
                  if (!trimmed) return null;
                  const isStageDirection = /^\[.*\]$/.test(trimmed) || /^\(.*\)$/.test(trimmed);

                  if (isStageDirection) {
                    return (
                      <div key={idx} className="my-3">
                        <span className="inline-block px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-xs uppercase tracking-wide italic">
                          {trimmed}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <p key={idx} className="whitespace-pre-wrap break-words leading-relaxed text-slate-200">
                      {trimmed}
                    </p>
                  );
                })}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 text-xs">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(readingScript.id, readingScript.editedContent || readingScript.content)}
                  className="border-slate-700 text-xs rounded-xl flex items-center gap-1.5"
                >
                  {copiedScriptId === readingScript.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedScriptId === readingScript.id ? "Copied" : "Copy"}</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadTxt(readingScript)}
                  className="border-slate-700 text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download TXT</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePrintPdf(readingScript)}
                  className="border-slate-700 text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </Button>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReadingScript(null)}
                className="text-slate-400 hover:text-white text-xs rounded-xl"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── GENERATE SCRIPT MODAL ── */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h3 className="text-base font-semibold text-white">Generate Stage Script</h3>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {genError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {genError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Target Role & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Speaker / Role</label>
                  <select
                    value={genCategory}
                    onChange={(e) => {
                      const newCat = e.target.value as any;
                      setGenCategory(newCat);
                      setGenScriptType(SCRIPT_TYPES_BY_CATEGORY[newCat]?.[0] || "Custom");
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="anchor">Anchor</option>
                    <option value="organizer">Organizer / Stage Manager</option>
                    <option value="speaker">Speaker</option>
                    <option value="artist">Artist / Performer</option>
                    <option value="award">Award Ceremony</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Script Type</label>
                  <select
                    value={genScriptType}
                    onChange={(e) => setGenScriptType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {(SCRIPT_TYPES_BY_CATEGORY[genCategory] || ["General"]).map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Language Selector */}
              <div>
                <label className="text-slate-400 font-medium block mb-1">Language</label>
                <select
                  value={genLanguage}
                  onChange={(e) => setGenLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Person / Subject Tagging */}
              {eventSpeakers.length > 0 && (
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Focus Speaker (Optional)</label>
                  <select
                    value={genSpeakerId}
                    onChange={(e) => setGenSpeakerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">None (General Stage Script)</option>
                    {eventSpeakers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.designation ? `(${s.designation})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tone Selection */}
              <div>
                <label className="text-slate-400 font-medium block mb-1">Stage Tone</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["Formal", "Energetic", "Warm", "Humorous"] as const).map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setGenTone(tone)}
                      className={`py-1.5 rounded-lg border text-center font-medium transition ${
                        genTone === tone
                          ? "bg-blue-600 text-white border-blue-500"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Instructions */}
              <div>
                <label className="text-slate-400 font-medium block mb-1">Custom Notes / Key Points</label>
                <textarea
                  rows={3}
                  value={genCustomPrompt}
                  onChange={(e) => setGenCustomPrompt(e.target.value)}
                  placeholder="e.g. Welcome chief guest, acknowledge platinum sponsors, keep it under 2 minutes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsGenerateModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isGenerating}
                onClick={handleGenerateScript}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl flex items-center gap-2"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Generate Script
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── UPLOAD / IMPORT SCRIPT MODAL ── */}
      {uploadModalOpen && uploadedScriptFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                <h3 className="text-base font-semibold text-white">Import Uploaded Script</h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Script Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="anchor">Anchor</option>
                    <option value="organizer">Organizer</option>
                    <option value="speaker">Speaker</option>
                    <option value="artist">Artist</option>
                    <option value="award">Award</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-medium block mb-1">Language</label>
                  <select
                    value={uploadLanguage}
                    onChange={(e) => setUploadLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Extracted Script Preview</label>
                <textarea
                  rows={6}
                  value={uploadedScriptFile.extractedText}
                  onChange={(e) =>
                    setUploadedScriptFile({ ...uploadedScriptFile, extractedText: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <Button
                size="sm"
                variant="outline"
                disabled={isGenerating}
                onClick={handleImproveUploadedScript}
                className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 text-xs rounded-xl flex items-center gap-1.5"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Improve with AI
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUploadModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveUploadedScript()}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl"
                >
                  Import as Script
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
