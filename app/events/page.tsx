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
  Image as ImageIcon,
  KeyRound,
  Archive,
  FolderPlus,
  Video,
  Presentation,
  FileCode,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { Event } from "@/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { EventFormModal } from "@/components/events/event-form-modal";
import { PastEventResourcesModal } from "@/components/events/past-event-resources-modal";

export default function EventsPage() {
  const router = useRouter();
  const {
    events,
    activeEventId,
    selectedEventId,
    setSelectedEvent,
    startLiveEvent,
    stopLiveEvent,
    endEventAndArchive,
    isEventLive,
    deleteEvent,
    speakers,
    sessions,
  } = useEventStore();

  const [activeTab, setActiveTab] = useState<"active" | "past">("active");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [eventForResources, setEventForResources] = useState<Event | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteConfirm = () => {
    if (eventToDelete) {
      deleteEvent(eventToDelete.id);
      setEventToDelete(null);
    }
  };

  const isEventEnded = (e: Event) => e.status === "Completed" || Boolean(e.endedAt);
  const activeEvents = events.filter((e) => !isEventEnded(e));
  const pastEvents = events.filter((e) => isEventEnded(e));
  const displayedEvents = activeTab === "active" ? activeEvents : pastEvents;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Event Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create, configure, switch between active events, or manage past meeting resources.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setIsCreateModalOpen(true)} variant="primary" size="md">
            <Plus className="w-4 h-4 mr-1.5" />
            Create Event
          </Button>
        </div>
      </div>

      {/* Tabs Switcher: Active & Upcoming vs Past Events */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "active"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Active & Upcoming ({activeEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("past")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "past"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-900/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Archive className="w-4 h-4" />
            Past Events & Archive ({pastEvents.length})
          </button>
        </div>

        {activeTab === "past" && (
          <p className="text-xs text-amber-300/90 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Organizers can attach videos, PPT slides, and scripts to past events for audience access.
          </p>
        )}
      </div>

      {displayedEvents.length === 0 ? (
        <EmptyState
          title={
            activeTab === "active"
              ? "No active or upcoming events."
              : "No past events archived yet."
          }
          description={
            activeTab === "active"
              ? "Register an event to start assigning speakers and creating time-blocked agendas."
              : "When an event concludes or when you click 'End & Archive', it will appear here with scripts, videos, and PPT attachments."
          }
          actionLabel={activeTab === "active" ? "Create Event" : undefined}
          onAction={activeTab === "active" ? () => setIsCreateModalOpen(true) : undefined}
          icon={activeTab === "active" ? <Calendar className="w-8 h-8" /> : <Archive className="w-8 h-8 text-amber-400" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedEvents.map((event) => {
            const isSelected = event.id === (selectedEventId || activeEventId);
            const eventSpeakers = speakers.filter((s) => s.eventId === event.id);
            const eventSessions = sessions.filter((s) => s.eventId === event.id);
            const isLive = isEventLive(event.id);
            const isPast = isEventEnded(event);
            const resourceCount = event.resources?.length || 0;

            return (
              <div
                key={event.id}
                className={`p-5 rounded-2xl bg-slate-900/60 border overflow-hidden transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-blue-500/50 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30"
                    : isLive
                    ? "border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                    : isPast
                    ? "border-amber-500/30 bg-slate-900/40"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Event Poster Banner if set */}
                  {event.posterUrl ? (
                    <div className="relative w-full h-36 -mt-5 -mx-5 mb-4 overflow-hidden border-b border-slate-800 bg-slate-950 group">
                      <img
                        src={event.posterUrl}
                        alt={event.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-black/40" />
                      <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-200 border border-slate-700/80 shadow">
                          {event.type}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isLive && (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-md text-white border border-emerald-400/50 shadow animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              LIVE
                            </span>
                          )}
                          {isPast && (
                            <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/40 shadow">
                              Concluded
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] font-semibold text-blue-300 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-blue-500/40 flex items-center gap-1 shadow">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                              Selected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Default Card Header without poster */
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
                        {isPast && (
                          <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            Concluded
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
                  )}

                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{event.name}</h3>

                  {event.description && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{event.description}</p>
                  )}

                  {/* 6-Character Audience Code Badge */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border border-amber-500/30 rounded-xl mb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] text-slate-400">Audience Code:</span>
                      <span className="font-mono font-bold text-amber-300 tracking-wider text-xs">
                        {event.accessCode || "STAGE1"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyCode(event.accessCode || "STAGE1")}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition"
                        title="Copy 6-character code"
                      >
                        {copiedCode === event.accessCode ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copiedCode === event.accessCode ? "Copied" : "Copy"}
                      </button>
                      <a
                        href={`/audience?code=${event.accessCode || "STAGE1"}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-400 transition"
                        title="Open Audience Viewer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Resources pill button */}
                  <button
                    type="button"
                    onClick={() => setEventForResources(event)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/60 border border-purple-500/20 hover:border-purple-500/40 transition text-xs text-slate-300 mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-purple-500/10 text-purple-400">
                        <FolderPlus className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-slate-200">Scripts, Videos & PPTs</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {resourceCount} attached
                    </span>
                  </button>

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
                      aria-label="Set poster"
                      className={`p-1.5 rounded-lg transition-colors ${
                        event.posterUrl
                          ? "text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                      title={event.posterUrl ? "Edit event poster" : "Add event poster"}
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
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
                    {!isSelected && !isPast && (
                      <button
                        onClick={() => setSelectedEvent(event.id)}
                        className="text-xs text-slate-400 hover:text-blue-400 font-medium px-2 py-1 rounded hover:bg-slate-800 transition-colors"
                        title="Select for editing Agenda and Speakers"
                      >
                        Select
                      </button>
                    )}

                    {isPast ? (
                      /* Past Event Actions */
                      <>
                        <Button
                          onClick={() => setEventForResources(event)}
                          variant="secondary"
                          size="sm"
                          className="border-purple-500/40 text-purple-300 hover:bg-purple-950/60"
                          title="Manage scripts, video recordings, and slides"
                        >
                          <FolderPlus className="w-3.5 h-3.5 mr-1" />
                          Resources
                        </Button>
                        <Button
                          onClick={() => {
                            router.push(`/audience?code=${event.accessCode || "STAGE1"}`);
                          }}
                          variant="primary"
                          size="sm"
                          title="Preview audience portal"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Audience View
                        </Button>
                      </>
                    ) : (
                      /* Active Event Actions */
                      <>
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
                          <>
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
                            <Button
                              onClick={() => endEventAndArchive(event.id)}
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 border border-slate-700/60 text-xs"
                              title="Mark event completed and move to Past Events Archive"
                            >
                              <Archive className="w-3 h-3 mr-1 text-amber-400" />
                              End & Archive
                            </Button>
                          </>
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event Modal */}
      <EventFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Edit Event Modal */}
      <EventFormModal
        isOpen={!!eventToEdit}
        onClose={() => setEventToEdit(null)}
        eventToEdit={eventToEdit}
      />

      {/* Organizer-only Past Event Resources Modal */}
      {eventForResources && (
        <PastEventResourcesModal
          event={events.find((e) => e.id === eventForResources.id) || eventForResources}
          isOpen={!!eventForResources}
          onClose={() => setEventForResources(null)}
        />
      )}

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
