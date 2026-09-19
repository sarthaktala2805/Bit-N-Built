"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Lock,
  User,
  Radio,
  Clock,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { Session } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionFormModal } from "@/components/agenda/session-form-modal";
import { Modal } from "@/components/ui/modal";
import { getDateRangeArray, dateDiffDays } from "@/lib/date-utils";

export default function AgendaPage() {
  const router = useRouter();
  const { events, activeEventId, sessions, speakers, deleteSession, reorderSessions } =
    useEventStore();

  const activeEvent = events.find((e) => e.id === activeEventId);
  const eventSessions = useMemo(() => {
    return activeEvent ? sessions.filter((s) => s.eventId === activeEvent.id) : [];
  }, [activeEvent, sessions]);
  const eventSpeakers = useMemo(() => {
    return activeEvent ? speakers.filter((s) => s.eventId === activeEvent.id) : [];
  }, [activeEvent, speakers]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("all");

  const eventStartDate = activeEvent?.startDate || activeEvent?.date || "";
  const eventEndDate = activeEvent?.endDate || eventStartDate;
  const availableDates = useMemo(() => {
    if (!eventStartDate) return [];
    return getDateRangeArray(eventStartDate, eventEndDate);
  }, [eventStartDate, eventEndDate]);

  const filteredSessions = useMemo(() => {
    if (selectedDayFilter === "all") return eventSessions;
    return eventSessions.filter((s) => (s.sessionDate || eventStartDate) === selectedDayFilter);
  }, [eventSessions, selectedDayFilter, eventStartDate]);

  const handleDeleteConfirm = () => {
    if (sessionToDelete) {
      const res = deleteSession(sessionToDelete.id);
      if (!res.ok) {
        setReorderError(res.error || "Failed to delete session.");
      }
      setSessionToDelete(null);
    }
  };

  const handleMove = (sessionIndexInAll: number, direction: "up" | "down") => {
    if (!activeEvent) return;
    setReorderError(null);

    const targetIndex = direction === "up" ? sessionIndexInAll - 1 : sessionIndexInAll + 1;
    if (targetIndex < 0 || targetIndex >= eventSessions.length) return;

    const newOrder = [...eventSessions.map((s) => s.id)];
    const temp = newOrder[sessionIndexInAll];
    newOrder[sessionIndexInAll] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    const res = reorderSessions(activeEvent.id, newOrder);
    if (!res.ok) {
      setReorderError(res.error || "Cannot reorder session.");
    }
  };

  if (!activeEvent) {
    return (
      <EmptyState
        title="No active event selected"
        description="Please select or create an event first to build its agenda."
        actionLabel="Go to Events"
        onAction={() => router.push("/events")}
        icon={<CalendarClock className="w-8 h-8" />}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Agenda Timeline</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              {activeEvent.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Build and order sessions across calendar dates. Supports same-day, overnight, and multi-day timelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/live-stage")}
            variant="secondary"
            size="md"
          >
            <Radio className="w-4 h-4 mr-1.5 text-emerald-400" />
            Live Stage
          </Button>
          <Button onClick={() => setIsModalOpen(true)} variant="primary" size="md">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Session
          </Button>
        </div>
      </div>

      {/* Multi-Day / Overnight Date Filter Tabs */}
      {availableDates.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedDayFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedDayFilter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            All Dates ({eventSessions.length})
          </button>
          {availableDates.map((dateStr) => {
            const dayNum = dateDiffDays(eventStartDate, dateStr) + 1;
            const count = eventSessions.filter((s) => (s.sessionDate || eventStartDate) === dateStr).length;
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDayFilter(dateStr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  selectedDayFilter === dateStr
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Calendar className="w-3 h-3" />
                Day {dayNum} ({dateStr})
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30 text-slate-300">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {reorderError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{reorderError}</span>
          </div>
          <button
            onClick={() => setReorderError(null)}
            className="text-xs text-rose-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {eventSessions.length === 0 ? (
        <EmptyState
          title="No sessions scheduled yet"
          description="Create your opening remarks, keynotes, breaks, and workshops to establish the master timeline."
          actionLabel="Add First Session"
          onAction={() => setIsModalOpen(true)}
          icon={<CalendarClock className="w-8 h-8" />}
        />
      ) : filteredSessions.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-400">No sessions scheduled on this date.</p>
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Session for this Day
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const index = eventSessions.findIndex((s) => s.id === session.id);
            const speaker = eventSpeakers.find((sp) => sp.id === session.speakerId);
            const isDelayed = session.startTime !== session.originalStartTime;
            const isLive = session.status === "Live";
            const sessionDate = session.sessionDate || eventStartDate;
            const dayNum = dateDiffDays(eventStartDate, sessionDate) + 1;

            return (
              <div
                key={session.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isLive
                    ? "bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700/80"
                }`}
              >
                {/* Left Time & Badges */}
                <div className="flex items-start md:items-center gap-4 min-w-[220px]">
                  <div className="flex flex-col items-start min-w-[95px]">
                    <span className="text-base font-bold text-white font-mono">
                      {session.startTime}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      to {session.endTime}
                    </span>
                    {availableDates.length > 1 && (
                      <span className="text-[10px] text-blue-400 font-semibold mt-0.5">
                        Day {dayNum} ({sessionDate.slice(5)})
                      </span>
                    )}
                    {isDelayed && (
                      <span className="text-[10px] text-amber-400 font-mono mt-0.5 line-through">
                        Orig: {session.originalStartTime}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap md:flex-col gap-1.5">
                    <Badge status={session.status} size="sm" />
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                      {session.type}
                    </span>
                    {session.isFixedTime && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 font-medium">
                        <Lock className="w-2.5 h-2.5" />
                        Fixed
                      </span>
                    )}
                  </div>
                </div>

                {/* Center Title & Speaker */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white truncate">{session.title}</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {session.duration} min
                    </span>

                    <span className="flex items-center gap-1 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {speaker ? (
                        <span className="text-slate-200 font-medium">
                          {speaker.name} {speaker.organization ? `(${speaker.organization})` : ""}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">No speaker assigned</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Right Reorder & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-2 border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
                  <div className="flex items-center gap-1">
                    <button
                      disabled={index <= 0 || isLive || session.status === "Completed" || session.isFixedTime}
                      onClick={() => handleMove(index, "up")}
                      aria-label="Move session up"
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      disabled={
                        index >= eventSessions.length - 1 ||
                        isLive ||
                        session.status === "Completed" ||
                        session.isFixedTime
                      }
                      onClick={() => handleMove(index, "down")}
                      aria-label="Move session down"
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
                    <button
                      onClick={() => {
                        setSessionToEdit(session);
                        setIsModalOpen(true);
                      }}
                      aria-label="Edit session"
                      className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSessionToDelete(session)}
                      aria-label="Delete session"
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Session Modal */}
      <SessionFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSessionToEdit(null);
        }}
        sessionToEdit={sessionToEdit}
        eventId={activeEvent.id}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        title="Delete Session"
        description="Are you sure you want to remove this session from the agenda? This action will remove it from the master timeline."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Session: <strong className="text-white">{sessionToDelete?.title}</strong>
          </p>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              onClick={() => setSessionToDelete(null)}
              variant="ghost"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteConfirm}
              variant="danger"
              size="sm"
            >
              Delete Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
