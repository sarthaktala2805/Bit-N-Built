"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Event, EventType } from "@/types";
import { VALID_EVENT_TYPES, validateEvent } from "@/lib/validation";
import {
  resolveEventTimestamps,
  addDaysToDateStr,
  formatTo12Hour,
} from "@/lib/date-utils";
import { useEventStore } from "@/store/event-store";
import { Moon, Calendar, Clock, Image as ImageIcon, Sparkles, Upload, X, Loader2 } from "lucide-react";

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: Event | null;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
}) => {
  const { createEvent, updateEvent } = useEventStore();

  const todayStr = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState({
    name: "",
    type: "Conference" as EventType,
    startDate: todayStr,
    endDate: todayStr,
    venue: "",
    description: "",
    organizer: "",
    startTime: "09:00",
    endTime: "17:00",
    posterUrl: null as string | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (eventToEdit) {
      setFormData({
        name: eventToEdit.name,
        type: eventToEdit.type,
        startDate: eventToEdit.startDate || eventToEdit.date,
        endDate: eventToEdit.endDate || eventToEdit.date,
        venue: eventToEdit.venue,
        description: eventToEdit.description || "",
        organizer: eventToEdit.organizer || "",
        startTime: eventToEdit.startTime,
        endTime: eventToEdit.endTime,
        posterUrl: eventToEdit.posterUrl || null,
      });
    } else {
      setFormData({
        name: "",
        type: "Conference",
        startDate: todayStr,
        endDate: todayStr,
        venue: "",
        description: "",
        organizer: "",
        startTime: "09:00",
        endTime: "17:00",
        posterUrl: null,
      });
    }
    setErrors({});
    setShowUrlInput(false);
  }, [eventToEdit, isOpen, todayStr]);

  const handleQuickAIPoster = async () => {
    setIsGeneratingPoster(true);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.name.trim() || "StageX Live Event",
          type: formData.type || "Conference",
          mode: "photo",
          prompt: `${formData.name.trim() || "Live Event"} ${formData.type} auditorium stage spotlight conference`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.imageUrl) {
        setFormData((prev) => ({ ...prev, posterUrl: data.imageUrl }));
      }
    } catch (err) {
      console.error("Failed to generate AI poster:", err);
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormData((prev) => ({ ...prev, posterUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle automatic overnight detection when changing end time
  const handleEndTimeChange = (newEndTime: string) => {
    const updated = { ...formData, endTime: newEndTime };
    // If end time is earlier than start time and end date was equal to start date,
    // auto-set end date to next calendar day for seamless overnight scheduling.
    const [sh, sm] = formData.startTime.split(":").map(Number);
    const [eh, em] = newEndTime.split(":").map(Number);
    if (!isNaN(sh) && !isNaN(eh)) {
      const startM = sh * 60 + sm;
      const endM = eh * 60 + em;
      if (endM <= startM && formData.endDate === formData.startDate) {
        updated.endDate = addDaysToDateStr(formData.startDate, 1);
      }
    }
    setFormData(updated);
  };

  const timestamps = useMemo(() => {
    return resolveEventTimestamps({
      startDate: formData.startDate,
      endDate: formData.endDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
    });
  }, [formData.startDate, formData.endDate, formData.startTime, formData.endTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      date: formData.startDate,
      startDateTime: timestamps.startDateTime,
      endDateTime: timestamps.endDateTime,
    };

    const val = validateEvent(payload);
    if (!val.valid) {
      setErrors(val.errors);
      return;
    }

    if (eventToEdit) {
      const res = updateEvent(eventToEdit.id, payload);
      if (!res.ok) {
        setErrors({ form: res.error || "Failed to update event." });
        return;
      }
    } else {
      const res = createEvent(payload);
      if (!res.ok) {
        setErrors({ form: res.error || "Failed to create event." });
        return;
      }
    }

    onClose();
  };

  const hours = Math.floor(timestamps.durationMinutes / 60);
  const remainingMins = timestamps.durationMinutes % 60;
  const durationLabel = `${hours}h ${remainingMins > 0 ? `${remainingMins}m` : "00m"} (${timestamps.durationMinutes} min)`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eventToEdit ? "Edit Event" : "Create New Event"}
      description="Register your event timeline. Supports same-day, overnight midnight-crossing (e.g. 9 PM → 1 AM), and multi-day events."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            {errors.form}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Event Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Bit N Build Annual Summit"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
          {errors.name && <p className="text-[11px] text-rose-400 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Event Type <span className="text-rose-400">*</span>
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white"
          >
            {VALID_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Start Timeline */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Start Date & Time
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Start Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setFormData({
                    ...formData,
                    startDate: newStart,
                    endDate: formData.endDate < newStart ? newStart : formData.endDate,
                  });
                }}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white"
              />
              {errors.date && <p className="text-[11px] text-rose-400 mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Start Time (24h) <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white"
              />
              {errors.startTime && <p className="text-[11px] text-rose-400 mt-1">{errors.startTime}</p>}
            </div>
          </div>
        </div>

        {/* End Timeline */}
        <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> End Date & Time
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                End Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white"
              />
              {errors.endDate && <p className="text-[11px] text-rose-400 mt-1">{errors.endDate}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                End Time (24h) <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white"
              />
              {errors.endTime && <p className="text-[11px] text-rose-400 mt-1">{errors.endTime}</p>}
            </div>
          </div>
        </div>

        {/* Dynamic Timeline Notice & Duration */}
        {timestamps.durationMinutes > 0 && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-blue-300">
              <span className="font-semibold flex items-center gap-1.5">
                {timestamps.isOvernight ? (
                  <>
                    <Moon className="w-4 h-4 text-amber-400" />
                    Overnight Event (Midnight Crossing)
                  </>
                ) : timestamps.isMultiDay ? (
                  <>
                    <Calendar className="w-4 h-4 text-violet-400" />
                    Multi-Day Event
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 text-blue-400" />
                    Same-Day Event
                  </>
                )}
              </span>
              <span className="font-mono bg-blue-500/20 px-2 py-0.5 rounded text-white font-medium">
                {durationLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Scheduled from{" "}
              <strong className="text-slate-200">
                {formData.startDate} at {formatTo12Hour(formData.startTime)}
              </strong>{" "}
              to{" "}
              <strong className="text-slate-200">
                {formData.endDate} at {formatTo12Hour(formData.endTime)}
              </strong>
              .
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Venue / Stage Location <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            placeholder="e.g. Main Auditorium, Hall A"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
          {errors.venue && <p className="text-[11px] text-rose-400 mt-1">{errors.venue}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Organizer / Organization (Optional)
          </label>
          <input
            type="text"
            value={formData.organizer}
            onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
            placeholder="e.g. NeuroX Team"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Description / Overview (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            placeholder="Brief event description used for contextual AI assistance..."
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
        </div>

        {/* Event Poster / Banner Selection */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <label className="text-xs font-semibold text-slate-200">
                Event Poster / Banner (Optional)
              </label>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Featured on Event Cards & Consoles
            </span>
          </div>

          {formData.posterUrl ? (
            <div className="space-y-2">
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 group">
                <img
                  src={formData.posterUrl}
                  alt="Event poster preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex items-end justify-between p-3">
                  <span className="text-[11px] font-medium text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded backdrop-blur-sm">
                    Poster Active
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleQuickAIPoster}
                      disabled={isGeneratingPoster}
                      className="text-xs h-7 px-2.5 bg-slate-900/90 text-blue-300 hover:text-white border-slate-700"
                    >
                      {isGeneratingPoster ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="w-3 h-3 mr-1 text-blue-400" />
                      )}
                      Regenerate
                    </Button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, posterUrl: null })}
                      className="p-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white transition-colors"
                      title="Remove poster"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleQuickAIPoster}
                  disabled={isGeneratingPoster}
                  className="flex items-center justify-center gap-1.5 py-2.5 border-blue-500/30 text-blue-300 hover:text-blue-200 hover:border-blue-500/50 bg-blue-500/10"
                >
                  {isGeneratingPoster ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating AI Poster...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>Quick AI Poster</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-2.5 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>Upload Poster Image</span>
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="pt-1">
                {showUrlInput ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="url"
                      placeholder="Paste image URL (https://...)"
                      value={formData.posterUrl || ""}
                      onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value.trim() || null })}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(false)}
                      className="text-slate-400 hover:text-white text-xs px-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                    <span>No poster assigned yet.</span>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(true)}
                      className="text-blue-400 hover:underline cursor-pointer"
                    >
                      Or paste an image URL
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {eventToEdit ? "Save Changes" : "Create Event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
