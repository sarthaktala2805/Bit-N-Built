"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useEventStore } from "@/store/event-store";
import { Sparkles, Loader2, Send } from "lucide-react";
import { buildAIContext } from "@/lib/ai-context";

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInTeleprompter?: (text: string) => void;
  eventId?: string;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isOpen,
  onClose,
  onOpenInTeleprompter,
  eventId,
}) => {
  const { events, activeEventId, sessions, speakers, delays, emergencies, createAnnouncement, addAIRecord } =
    useEventStore();
  const activeEvent = events.find((e) => e.id === (eventId || activeEventId));

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"Low" | "Normal" | "High" | "Urgent">("Normal");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAiAssist = async () => {
    if (!activeEvent) return;
    if (!message.trim()) {
      setError("Please enter a rough message draft for the AI to polish.");
      return;
    }

    setError(null);
    setIsAiLoading(true);

    const { context, error: contextErr } = buildAIContext({
      event: activeEvent,
      sessions,
      speakers,
      delays,
      emergencies,
      requestType: "announcement",
      userText: `${title ? title + ": " : ""}${message}`,
    });

    if (contextErr || !context) {
      setError(contextErr || "Failed to package event context.");
      setIsAiLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "announcement", context }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "AI assist failed. Please try again.");
      } else {
        setMessage(data.text);
        addAIRecord({
          eventId: activeEvent.id,
          type: "announcement",
          prompt: `Announcement polish: ${title}`,
          generatedText: data.text,
        });
      }
    } catch {
      setError("Network error contacting AI service.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSave = () => {
    if (!title.trim() || !message.trim()) {
      setError("Title and announcement message are required.");
      return;
    }

    const res = createAnnouncement(title, message, priority, undefined, activeEvent?.id);
    if (!res.ok) {
      setError(res.error || "Failed to save announcement.");
      return;
    }

    onClose();
    setTitle("");
    setMessage("");
  };

  const handleSaveAndTeleprompt = () => {
    if (!title.trim() || !message.trim()) {
      setError("Title and announcement message are required.");
      return;
    }

    createAnnouncement(title, message, priority, undefined, activeEvent?.id);
    if (onOpenInTeleprompter) {
      onOpenInTeleprompter(message);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stage Announcement"
      description="Broadcast quick unplanned updates to the activity history and send scripts to the teleprompter."
      maxWidth="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Announcement Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Lunch Service Opened / Lost Device Found"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Priority Level
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["Low", "Normal", "High", "Urgent"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors ${
                  priority === p
                    ? p === "Urgent"
                      ? "bg-rose-500 text-white border-rose-400"
                      : p === "High"
                      ? "bg-amber-500 text-slate-950 border-amber-400"
                      : "bg-blue-600 text-white border-blue-400"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-medium text-slate-300">
              Message Content <span className="text-rose-400">*</span>
            </label>
            <button
              type="button"
              disabled={isAiLoading}
              onClick={handleAiAssist}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
            >
              {isAiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              Improve with AI
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Enter the announcement text to be read by the stage anchor..."
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <Button
            type="button"
            onClick={handleSaveAndTeleprompt}
            variant="secondary"
            size="sm"
          >
            Send to Teleprompter
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" onClick={onClose} variant="ghost" size="sm">
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} variant="primary" size="sm">
              <Send className="w-3.5 h-3.5 mr-1" />
              Save Announcement
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
