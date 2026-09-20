"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Mail,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  Sparkles,
  Calendar,
  Loader2,
  AlertCircle,
  Eye,
  Download,
  Printer,
  Check,
  Edit,
  X,
  Image as ImageIcon,
  ZoomIn,
  Upload,
  Globe,
  FileText,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { InvitationRecord, InvitationData, InvitationTheme } from "@/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InvitationDesigner } from "@/components/ai/invitation-designer";
import { generateEventArtworkSVG } from "@/lib/image-generator";
import { processUploadFile } from "@/lib/file-processor";

const LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Hindi", label: "Hindi (हिंदी)" },
  { value: "Gujarati", label: "Gujarati (ગુજરાતી)" },
  { value: "Bilingual (Hindi + English)", label: "Bilingual (Hindi + English)" },
  { value: "Bilingual (Gujarati + English)", label: "Bilingual (Gujarati + English)" },
  { value: "Bilingual (Hindi + Gujarati)", label: "Bilingual (Hindi + Gujarati)" },
];

export default function InvitationsPage() {
  const {
    events,
    activeEventId,
    setActiveEvent,
    invitations,
    speakers,
    addInvitation,
    updateInvitation,
    deleteInvitation,
  } = useEventStore();

  const isEventEnded = (e: { status?: string; endedAt?: number | null }) =>
    e.status === "Completed" || Boolean(e.endedAt);
  const activeEvents = useMemo(() => events.filter((e) => !isEventEnded(e)), [events]);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    activeEvents.find((e) => e.id === activeEventId)?.id || activeEvents[0]?.id || ""
  );
  const [activeInvitationId, setActiveInvitationId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingArtwork, setIsGeneratingArtwork] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [previewPosterUrl, setPreviewPosterUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected Event
  const currentEvent = useMemo(
    () => activeEvents.find((e) => e.id === selectedEventId) || null,
    [activeEvents, selectedEventId]
  );

  const eventSpeakers = useMemo(
    () => speakers.filter((s) => s.eventId === selectedEventId),
    [speakers, selectedEventId]
  );

  const eventInvitations = useMemo(
    () => invitations.filter((i) => i.eventId === selectedEventId),
    [invitations, selectedEventId]
  );

  const activeInvitation = useMemo(
    () => eventInvitations.find((i) => i.id === activeInvitationId) || eventInvitations[0] || null,
    [eventInvitations, activeInvitationId]
  );

  const handleEventChange = (eventId: string) => {
    setSelectedEventId(eventId);
    setActiveEvent(eventId);
    setActiveInvitationId(null);
    setIsEditorOpen(false);
  };

  const handleGenerateAIInvitation = async (theme: InvitationTheme = "luxury_gala", customLang?: string) => {
    if (!currentEvent) return;

    const lang = customLang || selectedLanguage;
    setIsGenerating(true);
    setGenError(null);

    const keySpeaker = eventSpeakers[0];

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "invitation",
          language: lang,
          prompt: `Create a professional, stunning invitation card in ${lang} for ${currentEvent.name}. Ensure all visible invitation text, title, subtitle, custom notes, and description are in ${lang}. Preserve proper names accurately.`,
          context: {
            event: {
              name: currentEvent.name,
              type: currentEvent.type,
              date: currentEvent.startDate || currentEvent.date,
              venue: currentEvent.venue,
              organizer: currentEvent.organizer,
              description: currentEvent.description,
            },
            speaker: keySpeaker
              ? {
                  name: keySpeaker.name,
                  designation: keySpeaker.designation,
                  organization: keySpeaker.organization,
                }
              : undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to generate invitation.");
      }

      let parsed: Partial<InvitationData> = {};
      try {
        const jsonMatch = data.text.match(/```json\s*([\s\S]*?)\s*```/) || [null, data.text];
        parsed = JSON.parse(jsonMatch[1] || data.text);
      } catch {
        parsed = {
          title: currentEvent.name,
          subtitle: "You are cordially invited",
          dateText: currentEvent.startDate || currentEvent.date,
          timeText: `${currentEvent.startTime} - ${currentEvent.endTime}`,
          venueText: currentEvent.venue,
          description: currentEvent.description || "Join us for an exceptional gathering.",
          organizer: currentEvent.organizer,
        };
      }

      const invData: InvitationData = {
        title: parsed.title || currentEvent.name,
        subtitle: parsed.subtitle || "Exclusive Invitation",
        eventType: parsed.eventType || currentEvent.type,
        dateText: parsed.dateText || currentEvent.startDate || currentEvent.date,
        timeText: parsed.timeText || `${currentEvent.startTime} – ${currentEvent.endTime}`,
        venueText: parsed.venueText || currentEvent.venue,
        description: parsed.description || currentEvent.description,
        organizer: parsed.organizer || currentEvent.organizer,
        chiefGuest: parsed.chiefGuest || (keySpeaker ? keySpeaker.name : undefined),
        highlightPeople: parsed.highlightPeople || eventSpeakers.slice(0, 3).map((s) => s.name),
        highlights: parsed.highlights || ["Keynote Presentations", "Live Networking", "Interactive Q&A"],
        theme,
        language: lang,
        customNotes: parsed.customNotes || "Please arrive 15 minutes before opening.",
      };

      // Also synthesize matching artwork
      const artworkUrl = generateEventArtworkSVG({
        title: invData.title,
        subtitle: invData.subtitle,
        theme,
        eventType: invData.eventType,
        organizer: invData.organizer,
        venue: invData.venueText,
        dateText: invData.dateText,
      });

      const addRes = addInvitation({
        eventId: currentEvent.id,
        title: invData.title,
        theme,
        data: invData,
        artworkUrl,
      });

      if (addRes.ok && addRes.invitationId) {
        setActiveInvitationId(addRes.invitationId);
        setIsEditorOpen(true);
      }
    } catch (err: unknown) {
      setGenError((err as Error)?.message || "Invitation generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadInvitation = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEvent) return;

    setIsUploading(true);
    setGenError(null);

    try {
      const processed = await processUploadFile(file);
      const safeFileName = processed.fileName || processed.name || file.name || "invitation";

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "invitation",
          language: selectedLanguage,
          prompt: `Extract all structured invitation card details from this uploaded invitation document/image (${safeFileName}). Extract title, subtitle, dateText, timeText, venueText, organizer, chiefGuest, highlightPeople, highlights, and customNotes. Return purely a valid JSON matching the invitation schema.`,
          fileData: processed.fileData,
          context: {
            event: {
              name: currentEvent.name,
              type: currentEvent.type,
              date: currentEvent.startDate || currentEvent.date,
              venue: currentEvent.venue,
              organizer: currentEvent.organizer,
            },
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to extract invitation from file.");
      }

      let parsed: Partial<InvitationData> = {};
      try {
        const jsonMatch = data.text.match(/```json\s*([\s\S]*?)\s*```/) || [null, data.text];
        parsed = JSON.parse(jsonMatch[1] || data.text);
      } catch {
        parsed = {
          title: `${safeFileName.replace(/\.[^/.]+$/, "")} (Imported)`,
          subtitle: "Imported Invitation",
          dateText: currentEvent.startDate || currentEvent.date,
          timeText: `${currentEvent.startTime} - ${currentEvent.endTime}`,
          venueText: currentEvent.venue,
          description: data.text.slice(0, 200),
          organizer: currentEvent.organizer,
        };
      }

      const invData: InvitationData = {
        title: parsed.title || `${currentEvent.name} Invitation`,
        subtitle: parsed.subtitle || "Exclusive Invitation",
        eventType: parsed.eventType || currentEvent.type,
        dateText: parsed.dateText || currentEvent.startDate || currentEvent.date,
        timeText: parsed.timeText || `${currentEvent.startTime} – ${currentEvent.endTime}`,
        venueText: parsed.venueText || currentEvent.venue,
        description: parsed.description || currentEvent.description,
        organizer: parsed.organizer || currentEvent.organizer,
        chiefGuest: parsed.chiefGuest,
        highlightPeople: parsed.highlightPeople || [],
        highlights: parsed.highlights || [],
        theme: "luxury_gala",
        language: selectedLanguage,
        customNotes: parsed.customNotes || "Please arrive on time.",
      };

      const artworkUrl = generateEventArtworkSVG({
        title: invData.title,
        subtitle: invData.subtitle,
        theme: "luxury_gala",
        eventType: invData.eventType,
        organizer: invData.organizer,
        venue: invData.venueText,
        dateText: invData.dateText,
      });

      const addRes = addInvitation({
        eventId: currentEvent.id,
        title: invData.title,
        theme: "luxury_gala",
        data: invData,
        artworkUrl,
      });

      if (addRes.ok && addRes.invitationId) {
        setActiveInvitationId(addRes.invitationId);
        setIsEditorOpen(true);
      }
    } catch (err: unknown) {
      setGenError((err as Error)?.message || "File upload & extraction failed.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGenerateArtworkOnly = async () => {
    if (!currentEvent) return;
    setIsGeneratingArtwork(true);
    try {
      const theme = activeInvitation?.theme || "modern_dark";
      const prompt = `Cinematic 8K luxury invitation poster for ${activeInvitation?.title || currentEvent.name}, ${currentEvent.type} event at ${currentEvent.venue || "grand hall"}. Dramatic stage lighting, elegant atmosphere, photorealistic 8k render.`;
      const hfToken = typeof window !== "undefined" ? localStorage.getItem("stagex_hf_token") || undefined : undefined;

      let artworkUrl: string = "";
      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            title: activeInvitation?.title || currentEvent.name,
            type: currentEvent.type,
            eventName: currentEvent.name,
            hfToken,
            fallback: !hfToken,
          }),
        });
        const data = await res.json();
        if (data.ok && data.imageUrl) {
          artworkUrl = data.imageUrl;
        }
      } catch {
        // Fallback to SVG
      }

      if (!artworkUrl) {
        artworkUrl = generateEventArtworkSVG({
          title: activeInvitation?.title || currentEvent.name,
          subtitle: activeInvitation?.data?.subtitle || currentEvent.description,
          theme,
          eventType: currentEvent.type,
          organizer: currentEvent.organizer,
          venue: currentEvent.venue,
          dateText: currentEvent.startDate || currentEvent.date,
        });
      }

      if (activeInvitation) {
        updateInvitation(activeInvitation.id, {
          artworkUrl,
        });
      }
      setPreviewPosterUrl(artworkUrl);
    } catch (err) {
      setGenError("Failed to synthesize artwork.");
    } finally {
      setIsGeneratingArtwork(false);
    }
  };

  const handleTranslateInvitation = async (inv: InvitationRecord, targetLang: string) => {
    setIsGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "invitation",
          language: targetLang,
          prompt: `Translate this invitation card into ${targetLang}. All visible fields (title, subtitle, description, customNotes, highlights) must be in ${targetLang}. Keep proper names and venue addresses accurate. Original title: ${inv.data.title}, description: ${inv.data.description || ""}, customNotes: ${inv.data.customNotes || ""}`,
          context: {
            event: currentEvent
              ? {
                  name: currentEvent.name,
                  type: currentEvent.type,
                  date: currentEvent.startDate || currentEvent.date,
                  venue: currentEvent.venue,
                  organizer: currentEvent.organizer,
                }
              : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Translation failed.");
      let parsed: Partial<InvitationData> = {};
      try {
        const jsonMatch = data.text.match(/```json\s*([\s\S]*?)\s*```/) || [null, data.text];
        parsed = JSON.parse(jsonMatch[1] || data.text);
      } catch {
        parsed = {};
      }
      const updatedData: InvitationData = {
        ...inv.data,
        title: parsed.title || inv.data.title,
        subtitle: parsed.subtitle || inv.data.subtitle,
        description: parsed.description || inv.data.description,
        customNotes: parsed.customNotes || inv.data.customNotes,
        highlights: parsed.highlights || inv.data.highlights,
        language: targetLang,
      };
      updateInvitation(inv.id, {
        title: updatedData.title,
        data: updatedData,
      });
    } catch (err: unknown) {
      setGenError((err as Error)?.message || "Translation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDuplicate = (inv: InvitationRecord) => {
    addInvitation({
      eventId: inv.eventId,
      title: `${inv.title} (Copy)`,
      theme: inv.theme,
      data: { ...inv.data, title: `${inv.data.title} (Copy)` },
      artworkUrl: inv.artworkUrl,
    });
  };

  const handleDelete = (id: string) => {
    deleteInvitation(id);
    if (activeInvitationId === id) {
      setActiveInvitationId(null);
    }
    setDeleteConfirmId(null);
  };

  const handleSaveDesignerUpdates = (updatedData: InvitationData) => {
    if (!activeInvitation) return;
    updateInvitation(activeInvitation.id, {
      title: updatedData.title,
      theme: updatedData.theme,
      data: updatedData,
    });
  };

  const handleDownloadPoster = (url: string) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = 1080 * scale;
      canvas.height = 1350 * scale;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.drawImage(image, 0, 0, 1080, 1350);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `${currentEvent?.name || "StageX"}_Poster_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };
    image.src = url;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUploadInvitation}
        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.png,.jpg,.jpeg,.webp"
        className="hidden"
      />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Invitation Cards & Posters
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                  {eventInvitations.length} saved
                </span>
              </h1>
              <p className="text-xs text-slate-400">Two-layer architecture: Structured invitation data + Visual artwork generation.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Event Selector Dropdown */}
            <div className="relative">
              <select
                aria-label="Select Event"
                value={selectedEventId}
                onChange={(e) => handleEventChange(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 pr-10 text-xs font-semibold text-slate-200 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 cursor-pointer shadow-sm transition-all"
              >
                {activeEvents.length === 0 ? (
                  <option value="">No active events available</option>
                ) : (
                  activeEvents.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <select
                aria-label="Select Language"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 pr-8 text-xs font-semibold text-slate-200 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40 cursor-pointer shadow-sm transition-all"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Globe className="w-3.5 h-3.5 text-fuchsia-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Upload Invitation Button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={!currentEvent || isUploading}
              variant="outline"
              className="border-slate-700 hover:border-fuchsia-500 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>Upload Invitation</span>
                </>
              )}
            </Button>

            {/* AI Poster Artwork Button */}
            <Button
              onClick={handleGenerateArtworkOnly}
              disabled={!currentEvent || isGeneratingArtwork}
              variant="outline"
              className="border-slate-700 hover:border-fuchsia-500 text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-2"
            >
              <ImageIcon className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Generate Poster</span>
            </Button>

            {/* AI Generate Button */}
            <Button
              onClick={() => handleGenerateAIInvitation("luxury_gala")}
              disabled={!currentEvent || isGenerating}
              className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow-md shadow-fuchsia-500/20 transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Generate Card
                </>
              )}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {genError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {genError}
          </div>
        )}

        {!currentEvent ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title="No event selected"
            description="Create or select an event to design and export customized event invitation cards."
          />
        ) : eventInvitations.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/20">
            <Mail className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-slate-300 mb-1">No invitations saved yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
              Generate visual invitation cards for <span className="text-slate-300 font-medium">{currentEvent.name}</span> with 8 distinctive professional themes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
              {(
                [
                  { theme: "luxury_gala", label: "Luxury Gala" },
                  { theme: "premium_dark", label: "Premium Dark" },
                  { theme: "tech_conference", label: "Tech Conference" },
                  { theme: "cultural_festival", label: "Cultural Festival" },
                  { theme: "college_event", label: "College Event" },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.theme}
                  onClick={() => handleGenerateAIInvitation(preset.theme)}
                  disabled={isGenerating}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700/60 hover:border-slate-600 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-fuchsia-400" />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Saved Invitations Carousel / Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Saved Cards & Artwork for {currentEvent.name}
                </h2>
                <span className="text-xs text-slate-500">
                  Click any card to open in live editor
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {eventInvitations.map((inv) => {
                  const isSelected = activeInvitation?.id === inv.id;

                  return (
                    <div
                      key={inv.id}
                      onClick={() => {
                        setActiveInvitationId(inv.id);
                        setIsEditorOpen(true);
                      }}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all relative group flex flex-col justify-between ${
                        isSelected
                          ? "bg-slate-900 border-fuchsia-500/80 shadow-lg shadow-fuchsia-500/15 ring-1 ring-fuchsia-500/50"
                          : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30">
                            {inv.theme.replace("_", " ")}
                          </span>
                          <span className="text-slate-500">
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1 mb-1">
                          {inv.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {inv.data.subtitle || inv.data.description || "Customized invitation card"}
                        </p>

                        {inv.artworkUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-slate-800/80 aspect-[16/9] relative group/art">
                            <img src={inv.artworkUrl} alt={inv.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/art:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewPosterUrl(inv.artworkUrl!);
                                }}
                                className="p-1.5 rounded bg-slate-800 text-white hover:bg-slate-700"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPoster(inv.artworkUrl!);
                                }}
                                className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-500"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-[11px] text-fuchsia-400 flex items-center gap-1 font-medium">
                          <Edit className="w-3 h-3" />
                          Edit Design
                        </span>

                        <div
                          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Quick Translate Menu */}
                          <select
                            aria-label="Translate invitation"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleTranslateInvitation(inv, e.target.value);
                              }
                            }}
                            className="bg-slate-800 border border-slate-700/60 rounded px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-white cursor-pointer"
                          >
                            <option value="">Translate...</option>
                            <option value="Hindi">Hindi</option>
                            <option value="Gujarati">Gujarati</option>
                            <option value="English">English</option>
                            <option value="Bilingual (Hindi + English)">Bilingual (Hindi + English)</option>
                            <option value="Bilingual (Gujarati + English)">Bilingual (Gujarati + English)</option>
                          </select>

                          <button
                            onClick={() => {
                              setActiveInvitationId(inv.id);
                              setTimeout(() => window.print(), 100);
                            }}
                            title="Print / Save PDF"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                          >
                            <Printer className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(inv)}
                            title="Duplicate Card"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(inv.id)}
                            title="Delete Card"
                            className="p-1 rounded bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Delete confirmation modal */}
                      {deleteConfirmId === inv.id && (
                        <div
                          className="absolute inset-0 bg-slate-950/95 rounded-2xl flex flex-col items-center justify-center p-4 text-center z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <AlertCircle className="w-6 h-6 text-red-400 mb-1" />
                          <p className="text-xs font-bold text-white mb-2">Delete this card?</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(inv.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-600 text-[11px] text-white font-bold"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Studio Canvas / Live Editor */}
            {activeInvitation && (
              <div className="border-t border-slate-800 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-fuchsia-400" />
                      Visual Designer — {activeInvitation.title}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Layer A (Structured Invitation Data) + Layer B (Theme & Visual Artwork). Export 2x high-resolution PNG or PDF.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl">
                  <InvitationDesigner
                    initialData={activeInvitation.data}
                    event={currentEvent}
                    speakers={eventSpeakers}
                    onSave={handleSaveDesignerUpdates}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Full-size Poster Modal */}
      {previewPosterUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="text-sm font-semibold text-white">Event Poster Visual Artwork</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDownloadPoster(previewPosterUrl)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download 2x PNG
                </Button>
                <button
                  onClick={() => setPreviewPosterUrl(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex justify-center bg-slate-950/60 rounded-xl p-2 max-h-[70vh] overflow-auto">
              <img src={previewPosterUrl} alt="Event Poster" className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
