"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Session, SessionType } from "@/types";
import { VALID_SESSION_TYPES, validateSession } from "@/lib/validation";
import {
  getDateRangeArray,
  resolveSessionTimestamps,
  formatTo12Hour,
  dateDiffDays,
  timeToMinutes,
  minutesToTime,
  isValidTimeStr,
} from "@/lib/date-utils";
import { useEventStore } from "@/store/event-store";
import { Calendar, Clock, User, Tag, Lock } from "lucide-react";

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: Session | null;
  eventId: string;
}

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  sessionToEdit,
  eventId,
}) => {
  const { events, sessions, speakers, addSession, updateSession } = useEventStore();
  const event = events.find((e) => e.id === eventId);
  const eventSpeakers = useMemo(() => speakers.filter((s) => s.eventId === eventId), [speakers, eventId]);
  const eventSessions = useMemo(() => sessions.filter((s) => s.eventId === eventId), [sessions, eventId]);

  const eventStartDate = event?.startDate || event?.date || new Date().toISOString().split("T")[0];
  const eventEndDate = event?.endDate || eventStartDate;
  const availableDates = useMemo(() => getDateRangeArray(eventStartDate, eventEndDate), [eventStartDate, eventEndDate]);

  const [formData, setFormData] = useState({
    title: "",
    type: "Talk" as SessionType,
    speakerId: "" as string,
    sessionDate: eventStartDate,
    startTime: "10:00",
    endTime: "10:45",
    isFixedTime: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    if (sessionToEdit) {
      setFormData({
        title: sessionToEdit.title,
        type: sessionToEdit.type,
        speakerId: sessionToEdit.speakerId || "",
        sessionDate: sessionToEdit.sessionDate || eventStartDate,
        startTime: sessionToEdit.startTime,
        endTime: sessionToEdit.endTime,
        isFixedTime: sessionToEdit.isFixedTime,
      });
    } else {
      // Suggest next available time slot
      let nextStart = event?.startTime || "10:00";
      let nextDate = eventStartDate;

      if (eventSessions.length > 0) {
        const lastSession = eventSessions[eventSessions.length - 1];
        nextStart = lastSession.endTime;
        nextDate = lastSession.sessionDate || eventStartDate;
      }

      // Default duration: 45 minutes
      const startMin = timeToMinutes(nextStart);
      const endMin = (startMin + 45) % 1440;
      const nextEnd = minutesToTime(endMin);

      setFormData({
        title: "",
        type: "Talk",
        speakerId: "",
        sessionDate: nextDate,
        startTime: nextStart,
        endTime: nextEnd,
        isFixedTime: false,
      });
    }
    setErrors({});
  }, [isOpen, sessionToEdit]);

  const sessionTimestamps = useMemo(() => {
    return resolveSessionTimestamps(
      {
        sessionDate: formData.sessionDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
      },
      eventStartDate
    );
  }, [formData.sessionDate, formData.startTime, formData.endTime, eventStartDate]);

  const handleStartTimeChange = (newStart: string) => {
    setFormData((prev) => {
      if (!isValidTimeStr(newStart)) {
        return { ...prev, startTime: newStart };
      }
      const prevDuration = sessionTimestamps.durationMinutes > 0 ? sessionTimestamps.durationMinutes : 45;
      const startMin = timeToMinutes(newStart);
      const newEnd = minutesToTime((startMin + prevDuration) % 1440);
      return {
        ...prev,
        startTime: newStart,
        endTime: newEnd,
      };
    });
  };

  const handleDurationPreset = (minutes: number) => {
    if (!isValidTimeStr(formData.startTime)) return;
    const startMin = timeToMinutes(formData.startTime);
    const newEnd = minutesToTime((startMin + minutes) % 1440);
    setFormData((prev) => ({
      ...prev,
      endTime: newEnd,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    const payload = {
      ...formData,
      eventId,
      speakerId: formData.speakerId ? formData.speakerId : null,
      status: sessionToEdit ? sessionToEdit.status : ("Upcoming" as const),
      duration: sessionTimestamps.durationMinutes,
      startDateTime: sessionTimestamps.startDateTime,
      endDateTime: sessionTimestamps.endDateTime,
    };

    const val = validateSession(payload, event, eventSessions, sessionToEdit?.id);
    if (!val.valid) {
      setErrors(val.errors);
      return;
    }

    if (sessionToEdit) {
      const res = updateSession(sessionToEdit.id, payload);
      if (!res.ok) {
        setErrors({ form: res.error || "Failed to update session." });
        return;
      }
    } else {
      const res = addSession(payload);
      if (!res.ok) {
        setErrors({ form: res.error || "Failed to add session." });
        return;
      }
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={sessionToEdit ? "Edit Agenda Session" : "Schedule New Session"}
      description="Define the session schedule, associate a calendar date, assign a speaker, or mark as a fixed-time anchor."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            {errors.form}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Session Title <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={formData.title}
            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="e.g. Opening & Keynote"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
          {errors.title && <p className="text-[11px] text-rose-400 mt-1">{errors.title}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Session Type <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as SessionType })}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white pl-8"
              >
                {VALID_SESSION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Tag className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Speaker (Optional)
            </label>
            <div className="relative">
              <select
                value={formData.speakerId}
                onChange={(e) => setFormData({ ...formData, speakerId: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white pl-8"
              >
                <option value="">No Speaker Assigned</option>
                {eventSpeakers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.organization ? `(${s.organization})` : ""}
                  </option>
                ))}
              </select>
              <User className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Date Selector (shows day tabs/options if multi-day or overnight) */}
        {availableDates.length > 1 ? (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Calendar Date <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.sessionDate}
                onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white pl-8"
              >
                {availableDates.map((d) => {
                  const dayNum = dateDiffDays(eventStartDate, d) + 1;
                  return (
                    <option key={d} value={d}>
                      Day {dayNum} ({d})
                    </option>
                  );
                })}
              </select>
              <Calendar className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        ) : null}

        {/* Start & End Times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                Start Time <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] font-mono text-blue-400">
                {formatTo12Hour(formData.startTime)}
              </span>
            </div>
            <div className="relative">
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white pl-8 font-mono"
              />
              <Clock className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
            {errors.startTime && <p className="text-[11px] text-rose-400 mt-1">{errors.startTime}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                End Time <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] font-mono text-blue-400">
                {formatTo12Hour(formData.endTime)}
              </span>
            </div>
            <div className="relative">
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white pl-8 font-mono"
              />
              <Clock className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
            {errors.endTime && <p className="text-[11px] text-rose-400 mt-1">{errors.endTime}</p>}
          </div>
        </div>

        {/* Quick Duration Preset Chips */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1.5">
            Quick Duration Presets
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[15, 30, 45, 60, 90, 120].map((mins) => (
              <button
                type="button"
                key={mins}
                onClick={() => handleDurationPreset(mins)}
                className={`px-2.5 py-1 text-xs rounded-md border font-mono transition-colors ${
                  sessionTimestamps.durationMinutes === mins
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Live Duration and Timing Summary */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Timing:{" "}
            <strong className="text-slate-200">
              {formatTo12Hour(formData.startTime)} → {formatTo12Hour(formData.endTime)}
            </strong>
          </span>
          <span className="font-medium text-blue-400 font-mono">
            {sessionTimestamps.durationMinutes} minutes
          </span>
        </div>

        {/* Fixed Time Toggle */}
        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex items-start gap-3">
          <input
            type="checkbox"
            id="isFixedTime"
            checked={formData.isFixedTime}
            onChange={(e) => setFormData({ ...formData, isFixedTime: e.target.checked })}
            className="mt-1 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isFixedTime" className="text-xs cursor-pointer">
            <span className="font-semibold text-white flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              Fixed-Time Session Anchor
            </span>
            <p className="text-slate-400 mt-0.5 text-[11px]">
              If preceding sessions are delayed, StageX will pause to request an organizer decision before moving this session.
            </p>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {sessionToEdit ? "Save Changes" : "Schedule Session"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
