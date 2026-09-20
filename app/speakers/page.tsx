"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { Speaker } from "@/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { SpeakerFormModal } from "@/components/speakers/speaker-form-modal";

export default function SpeakersPage() {
  const router = useRouter();
  const { events, activeEventId, speakers, sessions, deleteSpeaker } = useEventStore();

  const isEventEnded = (e: { status?: string; endedAt?: number | null }) =>
    e.status === "Completed" || Boolean(e.endedAt);
  const activeEvents = events.filter((e) => !isEventEnded(e));
  const activeEvent = activeEvents.find((e) => e.id === activeEventId) || activeEvents[0] || null;
  const eventSpeakers = activeEvent ? speakers.filter((s) => s.eventId === activeEvent.id) : [];
  const eventSessions = activeEvent ? sessions.filter((s) => s.eventId === activeEvent.id) : [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [speakerToEdit, setSpeakerToEdit] = useState<Speaker | null>(null);
  const [speakerToDelete, setSpeakerToDelete] = useState<Speaker | null>(null);

  const handleDeleteConfirm = () => {
    if (speakerToDelete) {
      deleteSpeaker(speakerToDelete.id);
      setSpeakerToDelete(null);
    }
  };

  if (!activeEvent) {
    return (
      <EmptyState
        title="No active event selected"
        description="Please select or create an event first to manage its speakers."
        actionLabel="Go to Events"
        onAction={() => router.push("/events")}
        icon={<Users className="w-8 h-8" />}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Speaker Management</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              {activeEvent.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Maintain speaker bios and profiles used for accurate stage announcements and AI introductions.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} variant="primary" size="md">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Speaker
        </Button>
      </div>

      {eventSpeakers.length === 0 ? (
        <EmptyState
          title="No speakers added yet"
          description="Add keynotes, panelists, and workshop hosts to assign them to sessions and power context-aware AI scripts."
          actionLabel="Add First Speaker"
          onAction={() => setIsModalOpen(true)}
          icon={<Users className="w-8 h-8" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {eventSpeakers.map((speaker) => {
            const assignedSessions = eventSessions.filter((s) => s.speakerId === speaker.id);

            return (
              <div
                key={speaker.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Speaker Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-800 border border-slate-700 shrink-0 flex items-center justify-center relative shadow-md">
                      {speaker.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={speaker.image}
                          alt={speaker.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-base font-bold text-slate-300">
                          {speaker.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white truncate">{speaker.name}</h3>
                      {speaker.designation && (
                        <p className="text-xs text-blue-400 font-medium truncate">
                          {speaker.designation}
                        </p>
                      )}
                      {speaker.organization && (
                        <p className="text-xs text-slate-400 truncate">{speaker.organization}</p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {speaker.bio ? (
                    <p className="text-xs text-slate-300 mb-4 line-clamp-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                      {speaker.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-4">No bio provided.</p>
                  )}

                  {/* Assigned Sessions */}
                  <div className="space-y-1.5 border-t border-slate-800/80 pt-3 mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5" />
                      Assigned Sessions ({assignedSessions.length})
                    </span>
                    {assignedSessions.length > 0 ? (
                      <div className="space-y-1">
                        {assignedSessions.map((s) => (
                          <div
                            key={s.id}
                            className="text-xs text-slate-300 flex items-center justify-between bg-slate-950/30 px-2 py-1 rounded"
                          >
                            <span className="truncate max-w-[170px] font-medium">{s.title}</span>
                            <span className="text-[11px] font-mono text-slate-400">{s.startTime}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Not assigned to any session yet.</p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => router.push(`/ai?speakerId=${speaker.id}`)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Intro
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSpeakerToEdit(speaker)}
                      aria-label="Edit speaker"
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSpeakerToDelete(speaker)}
                      aria-label="Delete speaker"
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

      {/* Speaker Modal */}
      <SpeakerFormModal
        isOpen={isModalOpen || !!speakerToEdit}
        onClose={() => {
          setIsModalOpen(false);
          setSpeakerToEdit(null);
        }}
        speakerToEdit={speakerToEdit}
        eventId={activeEvent.id}
      />

      {/* Delete Speaker Confirmation Modal (FR-012) */}
      <Modal
        isOpen={!!speakerToDelete}
        onClose={() => setSpeakerToDelete(null)}
        title="Remove Speaker"
        description="Are you sure you want to remove this speaker?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <p className="font-semibold mb-1">Session Unassignment Notice</p>
            <p>
              Removing <strong>{speakerToDelete?.name}</strong> will unassign them from all scheduled
              sessions. The sessions will remain in the agenda marked as &quot;No speaker assigned&quot;.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button onClick={() => setSpeakerToDelete(null)} variant="ghost" size="sm">
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} variant="danger" size="sm">
              Confirm Removal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
