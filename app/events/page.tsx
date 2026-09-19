"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  CalendarClock,
  Edit2,
  Trash2,
  CheckCircle2,
  Radio,
  Square,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { Event } from "@/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { EventFormModal } from "@/components/events/event-form-modal";

export default function EventsPage() {
  const router = useRouter();
  const {
    events,
    activeEventId,
    selectedEventId,
    setSelectedEvent,
    startLiveEvent,
    stopLiveEvent,
    isEventLive,
    deleteEvent,
    speakers,
    sessions,
  } = useEventStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const handleDeleteConfirm = () => {
    if (eventToDelete) {
      deleteEvent(eventToDelete.id);
      setEventToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Event Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, configure, and switch between stage events.
          </p>
        </div>

        <Button onClick={() => setIsCreateModalOpen(true)} variant="primary" size="md">
          <Plus className="w-4 h-4 mr-1.5" />
          Create Event
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No events yet. Create your first event."
          description="Register an event to start assigning speakers and creating time-blocked agendas."
          actionLabel="Create Event"
          onAction={() => setIsCreateModalOpen(true)}
          icon={<Calendar className="w-8 h-8" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => {
            const isSelected = event.id === (selectedEventId || activeEventId);
            const eventSpeakers = speakers.filter((s) => s.eventId === event.id);
            const eventSessions = sessions.filter((s) => s.eventId === event.id);
            const isLive = isEventLive(event.id);

            return (
              <div
                key={event.id}
                className={`p-5 rounded-2xl bg-slate-900/60 border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-blue-500/50 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30"
                    : isLive
                    ? "border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {event.type}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isLive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          LIVE
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-blue-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selected
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{event.name}</h3>

                  {event.description && (
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2">{event.description}</p>
                  )}

                  {/* Metadata */}
                  <div className="space-y-1.5 text-xs text-slate-300 border-t border-slate-800/80 pt-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {event.startDate || event.date}
                        {event.endDate && event.endDate !== (event.startDate || event.date) ? ` → ${event.endDate}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {event.startTime} – {event.endTime}
                        {event.endDate && event.endDate !== (event.startDate || event.date) ? " (overnight/multi-day)" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  </div>

                  {/* Counts */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{eventSpeakers.length} Speakers</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{eventSessions.length} Sessions</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEventToEdit(event)}
                      aria-label="Edit event"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEventToDelete(event)}
                      aria-label="Delete event"
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isSelected && (
                      <button
                        onClick={() => setSelectedEvent(event.id)}
                        className="text-xs text-slate-400 hover:text-blue-400 font-medium px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                        title="Select for editing Agenda and Speakers"
                      >
                        Select
                      </button>
                    )}

                    {isLive ? (
                      <Button
                        onClick={() => stopLiveEvent(event.id)}
                        variant="danger"
                        size="sm"
                        className="border-rose-500/40 text-rose-300 hover:bg-rose-950/60"
                        title="Stop live stage operations for this event"
                      >
                        <Square className="w-3 h-3 mr-1 fill-current" />
                        End Live
                      </Button>
                    ) : (
                      <Button
                        onClick={() => startLiveEvent(event.id)}
                        variant="secondary"
                        size="sm"
                        className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/60 hover:text-emerald-300"
                        title="Start live stage operations for this event"
                      >
                        <Radio className="w-3 h-3 mr-1 text-emerald-400 animate-pulse" />
                        Go Live
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        setSelectedEvent(event.id);
                        router.push(`/live-stage?eventId=${event.id}`);
                      }}
                      variant={isLive ? "primary" : "secondary"}
                      size="sm"
                      title="Open Live Stage console for this event"
                    >
                      <Radio className="w-3.5 h-3.5 mr-1" />
                      Live Stage
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Event Modal */}
      <EventFormModal
        isOpen={!!eventToEdit}
        onClose={() => setEventToEdit(null)}
        eventToEdit={eventToEdit}
      />

      {/* Cascade Delete Confirmation Modal (FR-003) */}
      <Modal
        isOpen={!!eventToDelete}
        onClose={() => setEventToDelete(null)}
        title="Delete Event"
        description="Are you sure you want to delete this event?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            <p className="font-semibold mb-1">Cascade Deletion Warning</p>
            <p>
              Deleting <strong>{eventToDelete?.name}</strong> will also permanently remove all its
              associated speakers, agenda sessions, delay records, emergencies, AI scripts, and
              activity logs.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button onClick={() => setEventToDelete(null)} variant="ghost" size="sm">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} variant="danger" size="sm">
              Delete Event & Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
