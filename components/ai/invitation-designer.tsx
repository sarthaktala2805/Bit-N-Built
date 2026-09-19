"use client";

import React, { useState, useRef } from "react";
import {
  InvitationData,
  InvitationTheme,
  Event,
  Speaker,
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  Download,
  Printer,
  Sparkles,
  Plus,
  Trash2,
  Palette,
  Check,
} from "lucide-react";
import {
  InvitationExportCard,
  InvitationExportCardRef,
  THEME_STYLES,
} from "./invitation-export-card";

interface InvitationDesignerProps {
  initialData?: Partial<InvitationData>;
  event?: Event | null;
  speakers?: Speaker[];
  onSave?: (data: InvitationData) => void;
}

export const InvitationDesigner: React.FC<InvitationDesignerProps> = ({
  initialData,
  event,
  speakers = [],
  onSave,
}) => {
  const exportCardRef = useRef<InvitationExportCardRef | null>(null);

  // Initialize invitation data from props or event defaults
  const [data, setData] = useState<InvitationData>(() => ({
    title: initialData?.title || event?.name || "StageX Showcase Event",
    subtitle: initialData?.subtitle || "An Exclusive Experience & Gathering",
    eventType: initialData?.eventType || event?.type || "Special Event",
    dateText:
      initialData?.dateText ||
      (event ? `${event.startDate || event.date}` : "October 24, 2026"),
    timeText:
      initialData?.timeText ||
      (event ? `${event.startTime} – ${event.endTime}` : "7:00 PM – 11:00 PM"),
    venueText: initialData?.venueText || event?.venue || "Grand Auditorium",
    description:
      initialData?.description ||
      event?.description ||
      "Join us for an inspiring session of live performances, keynote addresses, and groundbreaking showcases.",
    organizer: initialData?.organizer || event?.organizer || "StageX Organizing Committee",
    chiefGuest: initialData?.chiefGuest || "",
    highlightPeople:
      initialData?.highlightPeople ||
      (speakers.length > 0 ? speakers.slice(0, 3).map((s) => s.name) : []),
    highlights:
      initialData?.highlights || [
        "Keynote Addresses & Interactive Panels",
        "Live Performances & Awards Ceremony",
        "Networking Reception & High Tea",
      ],
    theme: (initialData?.theme as InvitationTheme) || "luxury_gala",
    customNotes: initialData?.customNotes || "Formal Attire • Please arrive 15 minutes early",
  }));

  const [activeTab, setActiveTab] = useState<"content" | "styling">("content");
  const [newHighlightText, setNewHighlightText] = useState("");
  const [newPersonText, setNewPersonText] = useState("");
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadPNG = () => {
    if (exportCardRef.current) {
      exportCardRef.current.downloadPNG();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
    if (onSave) {
      onSave(data);
    }
  };

  const handlePrintPDF = () => {
    if (exportCardRef.current) {
      exportCardRef.current.printCard();
    } else {
      window.print();
    }
    if (onSave) {
      onSave(data);
    }
  };

  const handleAddHighlight = () => {
    if (!newHighlightText.trim()) return;
    const updated = {
      ...data,
      highlights: [...(data.highlights || []), newHighlightText.trim()],
    };
    setData(updated);
    setNewHighlightText("");
    if (onSave) onSave(updated);
  };

  const handleRemoveHighlight = (idx: number) => {
    const updated = {
      ...data,
      highlights: (data.highlights || []).filter((_, i) => i !== idx),
    };
    setData(updated);
    if (onSave) onSave(updated);
  };

  const handleAddPerson = () => {
    if (!newPersonText.trim()) return;
    const updated = {
      ...data,
      highlightPeople: [...(data.highlightPeople || []), newPersonText.trim()],
    };
    setData(updated);
    setNewPersonText("");
    if (onSave) onSave(updated);
  };

  const handleRemovePerson = (idx: number) => {
    const updated = {
      ...data,
      highlightPeople: (data.highlightPeople || []).filter((_, i) => i !== idx),
    };
    setData(updated);
    if (onSave) onSave(updated);
  };

  const handleFieldChange = (field: keyof InvitationData, val: any) => {
    const updated = { ...data, [field]: val };
    setData(updated);
    if (onSave) onSave(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 no-print">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            AI Invitation Card Designer
          </h2>
          <p className="text-xs text-slate-400">
            Edit content, select themes, and export high-resolution PNG or print clean PDF cards.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleDownloadPNG}
            variant="primary"
            size="sm"
            className="bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download PNG
              </>
            )}
          </Button>

          <Button onClick={handlePrintPDF} variant="outline" size="sm">
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Main Designer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Controls (5 cols) - hidden during print */}
        <div className="lg:col-span-5 space-y-4 no-print">
          {/* Tabs: Content vs Styling */}
          <div className="flex p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("content")}
              className={`flex-1 py-1.5 font-medium rounded-md transition-all ${
                activeTab === "content"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Card Content
            </button>
            <button
              onClick={() => setActiveTab("styling")}
              className={`flex-1 py-1.5 font-medium rounded-md transition-all ${
                activeTab === "styling"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Theme & Styling
            </button>
          </div>

          {activeTab === "styling" && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <Palette className="w-4 h-4 text-indigo-400" />
                <span>Select Invitation Theme</span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {(Object.keys(THEME_STYLES) as InvitationTheme[]).map((themeKey) => {
                  const t = THEME_STYLES[themeKey];
                  const isSelected = data.theme === themeKey;
                  return (
                    <button
                      key={themeKey}
                      type="button"
                      onClick={() => handleFieldChange("theme", themeKey)}
                      className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-slate-800 text-white border-blue-500 shadow-md ring-1 ring-blue-500/30"
                          : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{t.name}</p>
                        <p className="text-[11px] text-slate-400">{t.description}</p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-400 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "content" && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Event Title</label>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={data.subtitle || ""}
                  onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Date Text</label>
                  <input
                    type="text"
                    value={data.dateText}
                    onChange={(e) => handleFieldChange("dateText", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Time Text</label>
                  <input
                    type="text"
                    value={data.timeText}
                    onChange={(e) => handleFieldChange("timeText", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Venue & Location</label>
                <input
                  type="text"
                  value={data.venueText}
                  onChange={(e) => handleFieldChange("venueText", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Organizer</label>
                <input
                  type="text"
                  value={data.organizer || ""}
                  onChange={(e) => handleFieldChange("organizer", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Chief Guest of Honour (Optional)</label>
                <input
                  type="text"
                  value={data.chiefGuest || ""}
                  onChange={(e) => handleFieldChange("chiefGuest", e.target.value)}
                  placeholder="e.g. Dr. Jane Smith, Director General"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Overview Description</label>
                <textarea
                  value={data.description || ""}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              {/* Highlight People List */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-slate-300 block mb-1 font-semibold">
                  Featured Speakers & Artists
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newPersonText}
                    onChange={(e) => setNewPersonText(e.target.value)}
                    placeholder="e.g. Keynote: Dr. Patel"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white"
                  />
                  <Button onClick={handleAddPerson} variant="outline" size="sm">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="space-y-1">
                  {(data.highlightPeople || []).map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300"
                    >
                      <span>{p}</span>
                      <button
                        onClick={() => handleRemovePerson(idx)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Notes / RSVP */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-slate-400 block mb-1">RSVP / Dress Code / Custom Notes</label>
                <input
                  type="text"
                  value={data.customNotes || ""}
                  onChange={(e) => handleFieldChange("customNotes", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Card Preview & Dedicated Print Target (7 cols) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <InvitationExportCard
            ref={exportCardRef}
            data={data}
            theme={data.theme}
            id="invitation-export-root"
          />
        </div>
      </div>
    </div>
  );
};
