"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  CalendarClock,
  Radio,
  Plus,
  ArrowRight,
  Activity,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { EventFormModal } from "@/components/events/event-form-modal";
import { getCurrentSession } from "@/lib/live-engine";

export default function DashboardPage() {
  const router = useRouter();
  const { events, activeEventId, setActiveEvent, liveEventIds, speakers, sessions, emergencies, activityLogs } = useEventStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>("all");

  const activeEvent = events.find((e) => e.id === activeEventId);
  const eventSessions = activeEvent ? sessions.filter((s) => s.eventId === activeEvent.id) : [];
  const eventSpeakers = activeEvent ? speakers.filter((s) => s.eventId === activeEvent.id) : [];
  const eventLogs = activeEvent
    ? activityLogs.filter((l) => l.eventId === activeEvent.id)
    : activityLogs;

  const currentLive = getCurrentSession(eventSessions);

  // Derived event status
  const getDerivedEventStatus = () => {
    if (!activeEvent || eventSessions.length === 0) return "Planned";
    if (eventSessions.some((s) => s.status === "Live")) return "Live";
    if (
      eventSessions.every(
        (s) => s.status === "Completed" || s.status === "Skipped" || s.status === "Cancelled"
      )
    ) {
      return "Completed";
    }
    return "Planned";
  };

  const activeEventStatus = getDerivedEventStatus();

  // All events currently live
  const liveEvents = events.filter((ev) =>
    ev.status === "Live" ||
    (liveEventIds && liveEventIds.includes(ev.id)) ||
    sessions.some((s) => s.eventId === ev.id && s.status === "Live")
  );

  // Upcoming events
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingEventsCount = events.filter((e) => e.date >= todayStr).length;

  const filteredLogs = eventLogs.filter((log) => {
    if (activityFilter === "all") return true;
    if (activityFilter === "delay") return log.type.includes("delay") || log.type.includes("schedule");
    if (activityFilter === "emergency") return log.type.includes("emergency");
    if (activityFilter === "ai") return log.type.includes("ai");
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Stage Operations Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time stage awareness, multi-event live operations, and rapid schedule adaptation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
            size="md"
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Event
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          showLogo={true}
          title="No events yet. Create your first event."
          description="StageX AI empowers anchors and organizers with real-time countdowns, automatic schedule adaptation for delays, and context-aware script assistance."
          actionLabel="Create First Event"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <>
          {/* Multiple Live Events Operations Hub */}
          {liveEvents.length > 0 && (
            <div className="space-y-3 p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 shadow-xl shadow-emerald-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Live Operations Hub — {liveEvents.length} Event{liveEvents.length > 1 ? "s" : ""} Live Now
                  </h2>
                </div>
                <span className="text-xs text-emerald-400/90 font-medium">
                  Independent Live Stage, countdowns, and delays per event
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {liveEvents.map((ev) => {
                  const evSessions = sessions.filter((s) => s.eventId === ev.id);
                  const onStageSession = evSessions.find((s) => s.status === "Live");
                  const activeEmergencies = emergencies.filter(
                    (em) => em.eventId === ev.id && !em.resolved
                  );

                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/40 hover:border-emerald-500 transition-all flex flex-col justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge status="Live" label="LIVE STAGE" size="sm" />
                            <span className="text-xs text-slate-400 font-medium">{ev.type}</span>
                          </div>
                          {activeEmergencies.length > 0 && (
                            <span className="text-[10px] font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/50 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              {activeEmergencies.length} Incident
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white tracking-tight">{ev.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                          <span>📍 {ev.venue}</span>
                          <span>•</span>
                          <span>⏰ {ev.startTime} – {ev.endTime}</span>
                        </p>

                        {onStageSession && (
                          <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
                            <div className="truncate">
                              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                                On Stage Now:
                              </span>
                              <p className="text-xs font-semibold text-white truncate">
                                {onStageSession.title}
                              </p>
                            </div>
                            <span className="text-[11px] font-mono text-slate-300 shrink-0">
                              {onStageSession.startTime} – {onStageSession.endTime}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                        <span className="text-[11px] text-slate-400">
                          {evSessions.length} sessions scheduled
                        </span>
                        <Button
                          onClick={() => {
                            setActiveEvent(ev.id);
                            router.push(`/live-stage?eventId=${ev.id}`);
                          }}
                          variant="primary"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-xs shadow-sm shadow-emerald-500/20"
                        >
                          <Radio className="w-3.5 h-3.5 mr-1 text-emerald-200" />
                          Launch Live Stage
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Total Events</span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{events.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">{upcomingEventsCount} scheduled soon</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Live Events</span>
                <Radio className={`w-4 h-4 ${liveEvents.length > 0 ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
              </div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                {liveEvents.length}
                {liveEvents.length > 0 && (
                  <Badge status="Live" label={`${liveEvents.length} LIVE`} size="sm" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {liveEvents.length > 0
                  ? `${liveEvents.map((e) => e.name).join(", ")}`
                  : activeEvent ? `${activeEvent.name} (${activeEventStatus})` : "No live events"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Speakers</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white">{eventSpeakers.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">Assigned to active event</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Sessions</span>
                <CalendarClock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">{eventSessions.length}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                {eventSessions.filter((s) => s.status === "Completed").length} completed
              </p>
            </div>
          </div>

          {/* Active Event Operational Banner */}
          {activeEvent ? (
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      Active Event
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400">{activeEvent.type}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">{activeEvent.name}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span>📅 {activeEvent.date}</span>
                    <span>⏰ {activeEvent.startTime} – {activeEvent.endTime}</span>
                    <span>📍 {activeEvent.venue}</span>
                  </div>
                  {currentLive && (
                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        Now on stage:
                      </span>
                      <span className="text-xs text-white font-semibold">{currentLive.title}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <Button
                    onClick={() => router.push("/live-stage")}
                    variant="primary"
                    size="md"
                    className="shadow-md shadow-blue-500/20"
                  >
                    <Radio className="w-4 h-4 mr-2 text-emerald-300" />
                    Open Live Stage
                  </Button>
                  <Button
                    onClick={() => router.push("/agenda")}
                    variant="secondary"
                    size="md"
                  >
                    View Agenda
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-xs text-slate-400 mb-2">No event is currently marked active.</p>
              <Link href="/events" className="text-xs text-blue-400 hover:underline">
                Go to Events to select one →
              </Link>
            </div>
          )}

          {/* Activity History Feed */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Live Operations Activity
                </h3>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                <button
                  onClick={() => setActivityFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activityFilter === "all" ? "bg-blue-600/30 text-blue-300 border border-blue-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All ({eventLogs.length})
                </button>
                <button
                  onClick={() => setActivityFilter("delay")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activityFilter === "delay" ? "bg-amber-500/30 text-amber-300 border border-amber-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Delays & Schedule
                </button>
                <button
                  onClick={() => setActivityFilter("emergency")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activityFilter === "emergency" ? "bg-rose-500/30 text-rose-300 border border-rose-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Emergencies
                </button>
                <button
                  onClick={() => setActivityFilter("ai")}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    activityFilter === "ai" ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40" : "text-slate-400 hover:text-white"
                  }`}
                >
                  AI Generated
                </button>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800/60 rounded-xl text-slate-400 text-xs">
                No activity recorded yet for this filter. Actions taken across Live Stage, Delays, and AI will appear here in real time.
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {filteredLogs.slice(0, 20).map((log) => {
                  const date = new Date(log.timestamp);
                  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start justify-between gap-3 text-xs hover:border-slate-700/60 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">
                          {log.type.includes("emergency") ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          ) : log.type.includes("delay") ? (
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                          ) : log.type.includes("ai") ? (
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">{log.message}</p>
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                            {log.type.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{timeStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Event Modal */}
      <EventFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
