"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EventPlan,
  EventPlanPerson,
  EventPlanSession,
} from "@/types";
import { useEventStore } from "@/store/event-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Check,
  CalendarRange,
  Plus,
  Trash2,
  FileText,
  Mail,
  Loader2,
} from "lucide-react";

interface EventPlanPreviewProps {
  initialPlan: EventPlan;
  onReset?: () => void;
}

export const EventPlanPreview: React.FC<EventPlanPreviewProps> = ({
  initialPlan,
  onReset,
}) => {
  const router = useRouter();
  const { createEventFromPlan } = useEventStore();

  const [plan, setPlan] = useState<EventPlan>(initialPlan);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const isMultiDay = plan.startDate !== plan.endDate;

  const handleCreateRealEvent = async () => {
    setCommitError(null);
    setIsCommitting(true);

    try {
      const res = createEventFromPlan(plan);
      if (!res.ok || !res.eventId) {
        setCommitError(res.error || "Failed to create real event from plan.");
        setIsCommitting(false);
        return;
      }

      setCreatedEventId(res.eventId);
      setIsCommitting(false);
    } catch (err: unknown) {
      setCommitError(err instanceof Error ? err.message : "Unexpected error creating event.");
      setIsCommitting(false);
    }
  };

  const handleUpdateField = (field: keyof EventPlan, value: unknown) => {
    setPlan((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdatePerson = (idx: number, patch: Partial<EventPlanPerson>) => {
    setPlan((prev) => {
      const updated = [...prev.people];
      updated[idx] = { ...updated[idx], ...patch };
      return { ...prev, people: updated };
    });
  };

  const handleRemovePerson = (idx: number) => {
    setPlan((prev) => ({
      ...prev,
      people: prev.people.filter((_, i) => i !== idx),
    }));
  };

  const handleAddPerson = () => {
    setPlan((prev) => ({
      ...prev,
      people: [
        ...prev.people,
        { name: "New Person", role: "Speaker", designation: "", organization: "" },
      ],
    }));
  };

  const handleUpdateSession = (idx: number, patch: Partial<EventPlanSession>) => {
    setPlan((prev) => {
      const updated = [...prev.sessions];
      updated[idx] = { ...updated[idx], ...patch };
      return { ...prev, sessions: updated };
    });
  };

  const handleRemoveSession = (idx: number) => {
    setPlan((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((_, i) => i !== idx),
    }));
  };

  const handleAddSession = () => {
    setPlan((prev) => ({
      ...prev,
      sessions: [
        ...prev.sessions,
        {
          title: "New Session",
          type: "Talk",
          duration: 30,
          startTime: plan.startTime,
          endTime: plan.endTime,
        },
      ],
    }));
  };

  if (createdEventId) {
    return (
      <div className="p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/40 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Event Successfully Created!
          </h2>
          <p className="text-sm text-slate-300 max-w-lg mx-auto">
            &ldquo;{plan.name}&rdquo; has been created as real application data with{" "}
            <span className="text-emerald-400 font-semibold">{plan.people.length} people</span> and{" "}
            <span className="text-emerald-400 font-semibold">{plan.sessions.length} sessions</span>,
            persisted to Cloud Firestore.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Button
            onClick={() => router.push(`/agenda?eventId=${createdEventId}`)}
            variant="primary"
            size="md"
            className="shadow-lg shadow-blue-500/20"
          >
            <Clock className="w-4 h-4 mr-2" />
            View Agenda & Schedule
          </Button>

          <Button
            onClick={() => router.push(`/live-stage?eventId=${createdEventId}`)}
            variant="secondary"
            size="md"
          >
            Launch Live Stage
          </Button>

          {onReset && (
            <Button onClick={onReset} variant="ghost" size="md">
              Plan Another Event
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Plan Header & Quick Actions */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge status="Live" label="AI STRUCTURED PLAN" size="sm" />
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-medium">
              {plan.type}
            </span>
            {isMultiDay && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-blue-300 font-medium">
                Multi-Day Event
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {plan.name}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {plan.description || "Review the structured event plan below before creating real application entities."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
            size="sm"
            className="border-slate-700 hover:bg-slate-800"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" />
            {isEditing ? "Finish Editing" : "Edit Plan"}
          </Button>

          <Button
            onClick={handleCreateRealEvent}
            variant="primary"
            size="md"
            disabled={isCommitting}
            className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 font-semibold"
          >
            {isCommitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Real Event...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Event Plan
              </>
            )}
          </Button>
        </div>
      </div>

      {commitError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-sm text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{commitError}</span>
        </div>
      )}

      {/* Suggested Values Banner */}
      {plan.suggestedValues && plan.suggestedValues.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-semibold text-amber-300">
              AI Proposed Details (Confirm or Edit):
            </span>
            <p className="text-amber-200/80">
              The following fields were estimated from your description:{" "}
              {plan.suggestedValues.join(", ")}. Review and adjust before creating.
            </p>
          </div>
        </div>
      )}

      {/* Core Logistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date & Time */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Dates & Timing</span>
          </div>

          {isEditing ? (
            <div className="space-y-2 pt-1 text-xs">
              <div>
                <label className="text-slate-400 block mb-0.5">Start Date</label>
                <input
                  type="date"
                  value={plan.startDate}
                  onChange={(e) => handleUpdateField("startDate", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">End Date</label>
                <input
                  type="date"
                  value={plan.endDate}
                  onChange={(e) => handleUpdateField("endDate", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-0.5">Start Time</label>
                  <input
                    type="time"
                    value={plan.startTime}
                    onChange={(e) => handleUpdateField("startTime", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-0.5">End Time</label>
                  <input
                    type="time"
                    value={plan.endTime}
                    onChange={(e) => handleUpdateField("endTime", e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-white pt-1">
              <p className="font-semibold flex items-center gap-2">
                <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
                {plan.startDate} {isMultiDay ? `to ${plan.endDate}` : ""}
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {plan.startTime} – {plan.endTime}
              </p>
            </div>
          )}
        </div>

        {/* Venue & Organizer */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-rose-400" />
            <span>Venue & Location</span>
          </div>

          {isEditing ? (
            <div className="space-y-2 pt-1 text-xs">
              <div>
                <label className="text-slate-400 block mb-0.5">Venue</label>
                <input
                  type="text"
                  value={plan.venue}
                  onChange={(e) => handleUpdateField("venue", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Organizer</label>
                <input
                  type="text"
                  value={plan.organizer || ""}
                  onChange={(e) => handleUpdateField("organizer", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-white pt-1">
              <p className="font-semibold">{plan.venue}</p>
              <p className="text-xs text-slate-400">
                Organized by: {plan.organizer || "Not specified"}
              </p>
            </div>
          )}
        </div>

        {/* Expected Audience & Sessions Overview */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Audience & Scale</span>
          </div>

          {isEditing ? (
            <div className="space-y-2 pt-1 text-xs">
              <div>
                <label className="text-slate-400 block mb-0.5">Expected Audience</label>
                <input
                  type="text"
                  value={plan.expectedAudience || ""}
                  onChange={(e) => handleUpdateField("expectedAudience", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-0.5">Event Type</label>
                <input
                  type="text"
                  value={plan.type}
                  onChange={(e) => handleUpdateField("type", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-white pt-1">
              <p className="font-semibold">
                {plan.expectedAudience || "General Audience"}
              </p>
              <p className="text-xs text-slate-400">
                {plan.sessions.length} sessions • {plan.people.length} key individuals
              </p>
            </div>
          )}
        </div>
      </div>

      {/* People / Speakers / Artists Section */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              People, Speakers & Artists ({plan.people.length})
            </h3>
          </div>
          {isEditing && (
            <Button onClick={handleAddPerson} variant="outline" size="sm" className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Person
            </Button>
          )}
        </div>

        {plan.people.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            No specific individuals extracted.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plan.people.map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-2"
              >
                {isEditing ? (
                  <div className="space-y-1.5 w-full text-xs">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => handleUpdatePerson(idx, { name: e.target.value })}
                      placeholder="Name"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        value={p.role}
                        onChange={(e) =>
                          handleUpdatePerson(idx, { role: e.target.value as EventPlanPerson["role"] })
                        }
                        placeholder="Role"
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                      />
                      <input
                        type="text"
                        value={p.designation || ""}
                        onChange={(e) => handleUpdatePerson(idx, { designation: e.target.value })}
                        placeholder="Designation"
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium shrink-0">
                        {p.role}
                      </span>
                    </div>
                    {p.designation && (
                      <p className="text-[11px] text-slate-400 truncate">{p.designation}</p>
                    )}
                    {p.organization && (
                      <p className="text-[10px] text-slate-500 truncate">{p.organization}</p>
                    )}
                  </div>
                )}

                {isEditing && (
                  <button
                    onClick={() => handleRemovePerson(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sessions Timeline Agenda */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Proposed Schedule & Agenda ({plan.sessions.length} Sessions)
            </h3>
          </div>
          {isEditing && (
            <Button onClick={handleAddSession} variant="outline" size="sm" className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Session
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {plan.sessions.map((sess, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 w-full text-xs">
                  <input
                    type="text"
                    value={sess.title}
                    onChange={(e) => handleUpdateSession(idx, { title: e.target.value })}
                    placeholder="Session Title"
                    className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                  />
                  <input
                    type="text"
                    value={sess.speakerName || ""}
                    onChange={(e) => handleUpdateSession(idx, { speakerName: e.target.value })}
                    placeholder="Assigned Speaker"
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={sess.duration}
                      onChange={(e) =>
                        handleUpdateSession(idx, { duration: parseInt(e.target.value) || 30 })
                      }
                      placeholder="Minutes"
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                    />
                    <span className="text-slate-400">mins</span>
                    <button
                      onClick={() => handleRemoveSession(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-400 shrink-0 w-24">
                      {sess.startTime && sess.endTime
                        ? `${sess.startTime} – ${sess.endTime}`
                        : `~${sess.duration} mins`}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{sess.title}</p>
                      {sess.speakerName && (
                        <p className="text-[11px] text-indigo-400 truncate">
                          Presenter: {sess.speakerName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {sess.type}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {sess.duration}m
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Generated Scripts Preview */}
      {plan.scripts && plan.scripts.length > 0 && (
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Generated Initial Scripts ({plan.scripts.length})
            </h3>
          </div>
          <div className="space-y-2">
            {plan.scripts.map((scr, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-amber-300">{scr.role}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {scr.scriptType}
                  </span>
                </div>
                <p className="text-xs text-slate-300 italic leading-relaxed">
                  &ldquo;{scr.content}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invitation Card Note */}
      {plan.invitation && (
        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-white">
                Invitation Card Template Ready
              </p>
              <p className="text-[11px] text-slate-400">
                Theme: <span className="text-indigo-300 capitalize">{plan.invitation.theme?.replace("_", " ")}</span> • Ready to customize in the Invitation Designer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Confirm Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
        <p className="text-xs text-slate-400">
          Ready to turn this plan into live StageX operations?
        </p>
        <Button
          onClick={handleCreateRealEvent}
          variant="primary"
          size="md"
          disabled={isCommitting}
          className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 font-semibold"
        >
          {isCommitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Real Event...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Create Event Plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
