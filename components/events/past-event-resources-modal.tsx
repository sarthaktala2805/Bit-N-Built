"use client";

import React, { useState, useRef } from "react";
import {
  X,
  Video,
  FileText,
  Presentation,
  FileCode,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Share2,
  Sparkles,
  Lock,
  Upload,
  Link as LinkIcon,
  Laptop,
  Smartphone,
  HardDrive,
  FileUp,
} from "lucide-react";
import { Event, EventResource, EventResourceType } from "@/types";
import { useEventStore } from "@/store/event-store";
import { saveMediaFile, deleteMediaFile } from "@/lib/media-storage";

interface PastEventResourcesModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

export const PastEventResourcesModal: React.FC<PastEventResourcesModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  const { addEventResource, deleteEventResource } = useEventStore();

  const [activeTab, setActiveTab] = useState<EventResourceType | "all">("all");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadMode, setUploadMode] = useState<"device" | "link">("device");
  const [type, setType] = useState<EventResourceType>("video");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const accessCode = event.accessCode || "";
  const audienceUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/audience?code=${accessCode}`
      : `/audience?code=${accessCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(audienceUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFormError(null);
      // Auto-suggest title from file name
      if (!title.trim()) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Please enter a title for the resource.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (uploadMode === "device") {
        if (!selectedFile) {
          setFormError("Please select a file from your phone or laptop.");
          setIsSubmitting(false);
          return;
        }

        const resId = "file_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

        // Save heavy media into IndexedDB so localStorage quota is not exceeded
        await saveMediaFile(resId, selectedFile);

        const res = addEventResource(event.id, {
          type,
          title: title.trim(),
          url: resId, // points to stored IndexedDB key
          description: description.trim() || undefined,
          author: author.trim() || undefined,
          isLocalFile: true,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileMimeType: selectedFile.type,
        });

        if (!res.ok) {
          throw new Error(res.error || "Failed to attach resource.");
        }
      } else {
        // Link Mode
        if (!url.trim()) {
          setFormError("Please provide a valid URL link, YouTube embed, or script text.");
          setIsSubmitting(false);
          return;
        }

        const res = addEventResource(event.id, {
          type,
          title: title.trim(),
          url: url.trim(),
          description: description.trim() || undefined,
          author: author.trim() || undefined,
          isLocalFile: false,
        });

        if (!res.ok) {
          throw new Error(res.error || "Failed to attach resource.");
        }
      }

      // Reset Form
      setTitle("");
      setUrl("");
      setSelectedFile(null);
      setDescription("");
      setAuthor("");
      setShowAddForm(false);
    } catch (err: unknown) {
      setFormError((err as Error)?.message || "Failed to attach resource.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteResource = async (resource: EventResource) => {
    if (resource.isLocalFile) {
      await deleteMediaFile(resource.url);
    }
    deleteEventResource(event.id, resource.id);
  };

  const resources = event.resources || [];
  const filteredResources =
    activeTab === "all"
      ? resources
      : resources.filter((r) => r.type === activeTab);

  const getResourceIcon = (resType: EventResourceType) => {
    switch (resType) {
      case "video":
        return <Video className="w-4 h-4 text-rose-400" />;
      case "ppt":
        return <Presentation className="w-4 h-4 text-amber-400" />;
      case "script":
        return <FileCode className="w-4 h-4 text-emerald-400" />;
      default:
        return <FileText className="w-4 h-4 text-blue-400" />;
    }
  };

  const getResourceBadge = (resType: EventResourceType) => {
    switch (resType) {
      case "video":
        return "bg-rose-500/10 text-rose-300 border-rose-500/30";
      case "ppt":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "script":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-blue-500/10 text-blue-300 border-blue-500/30";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileAcceptType = () => {
    switch (type) {
      case "video":
        return "video/*,.mp4,.mov,.webm,.mkv";
      case "ppt":
        return ".ppt,.pptx,.pdf,.key,.odp";
      case "script":
        return ".txt,.pdf,.doc,.docx,.md";
      default:
        return "*/*";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Past Event Resources & Audience Code
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full">
                  Organizer Only
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {event.name} · {event.startDate || event.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audience 6-Character Code Banner */}
        <div className="p-5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-purple-500/10 border-b border-amber-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
                <Lock className="w-3.5 h-3.5" />
                Audience Access Code (6 Characters)
              </div>
              <p className="text-xs text-slate-300 max-w-lg">
                Share this code with your audience. Only correct code entries can view these videos, slides, and scripts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-slate-950/80 border-2 border-amber-500/40 rounded-xl font-mono text-xl font-bold tracking-[0.25em] text-amber-300 select-all shadow-inner">
                {accessCode}
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copy 6-character code"
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 rounded-xl text-xs font-medium transition"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                title="Copy direct audience URL"
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-medium transition"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                {copiedLink ? "Link Copied" : "Share Link"}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs">
              {(
                [
                  { id: "all", label: `All (${resources.length})` },
                  { id: "video", label: `Videos (${resources.filter((r) => r.type === "video").length})` },
                  { id: "ppt", label: `PPT & Slides (${resources.filter((r) => r.type === "ppt").length})` },
                  { id: "script", label: `Scripts (${resources.filter((r) => r.type === "script").length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setFormError(null);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-900/30 transition"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? "Cancel" : "Add Resource"}
            </button>
          </div>

          {/* Add Resource Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddResource}
              className="p-5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-amber-400" />
                  Add Video, PPT Presentation, or Script
                </span>
                <span className="text-[11px] text-slate-400">Laptop / Phone upload supported</span>
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {formError}
                </div>
              )}

              {/* Upload Method Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/80 border border-slate-700/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUploadMode("device")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                    uploadMode === "device"
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Laptop className="w-4 h-4" />
                  <Smartphone className="w-4 h-4 -ml-1" />
                  Upload from Laptop / Phone
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("link")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                    uploadMode === "link"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  Add Web Link / YouTube URL
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Type Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Resource Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as EventResourceType);
                      setSelectedFile(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="video">🎥 Video Recording</option>
                    <option value="ppt">📊 Presentation / PPT Slides</option>
                    <option value="script">📜 Event Script / Notes</option>
                    <option value="document">📄 Document / PDF</option>
                  </select>
                </div>

                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      type === "video"
                        ? "e.g. Final Stage Recording & Demo"
                        : type === "ppt"
                        ? "e.g. Keynote Presentation Deck"
                        : "e.g. Anchor Opening & Closing Remarks"
                    }
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Upload Input Area */}
              {uploadMode === "device" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Select File from Device (Laptop / Phone) *
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept={getFileAcceptType()}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-4 text-center bg-slate-900/50 hover:bg-slate-900/80 transition group"
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-white truncate max-w-sm">
                            {selectedFile.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatFileSize(selectedFile.size)} · Ready to attach
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 transition mb-1.5" />
                        <p className="text-xs font-semibold text-slate-300">
                          Tap or click to browse files from your device
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {type === "video"
                            ? "MP4, MOV, WebM, etc."
                            : type === "ppt"
                            ? "PPT, PPTX, PDF, Keynote, etc."
                            : "TXT, PDF, Word Document, etc."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Link Input Area */
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {type === "video"
                      ? "Video URL / YouTube Link *"
                      : type === "ppt"
                      ? "Google Slides Link / PPT URL *"
                      : "Script Web Link or Content URL *"}
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... or https://docs.google.com/presentation/..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Description / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Official slides including demo questions"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Author / Speaker */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Presenter / Speaker (Optional)
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Dr. Jane Doe"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {isSubmitting ? "Saving..." : "Attach Resource"}
                </button>
              </div>
            </form>
          )}

          {/* Resources List */}
          {filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No resources attached yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                Attach video recordings, PPT slide decks, or scripts from your laptop or phone.
              </p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium rounded-xl transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Resource
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredResources.map((res) => (
                <div
                  key={res.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 transition group"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700/60 mt-0.5">
                      {getResourceIcon(res.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">
                          {res.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border rounded-md ${getResourceBadge(
                            res.type
                          )}`}
                        >
                          {res.type}
                        </span>
                        {res.isLocalFile && (
                          <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md">
                            Device Upload {res.fileSize ? `(${formatFileSize(res.fileSize)})` : ""}
                          </span>
                        )}
                        {res.author && (
                          <span className="text-[11px] text-slate-400">by {res.author}</span>
                        )}
                      </div>

                      {res.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {res.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                        <span>Added {new Date(res.uploadedAt).toLocaleDateString()}</span>
                        {res.isLocalFile ? (
                          <span className="text-emerald-400 truncate max-w-xs">
                            Stored on device: {res.fileName}
                          </span>
                        ) : (
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition truncate max-w-xs"
                          >
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{res.url}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteResource(res)}
                    title="Delete resource"
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition opacity-80 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60">
          <p className="text-[11px] text-slate-500">
            Total {resources.length} resources available to audience via code{" "}
            <span className="font-mono text-amber-300 font-bold">{accessCode}</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
