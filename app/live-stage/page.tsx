"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Radio,
  Clock,
  User,
  AlertTriangle,
  Play,
  CheckCircle2,
  FastForward,
  Sparkles,
  Tv,
  Megaphone,
  Flame,
  ChevronRight,
  ShieldAlert,
  Check,
  Square,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { calculateLiveState, formatTimer } from "@/lib/live-engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DelayModal } from "@/components/live-stage/delay-modal";
import { EmergencyDialog } from "@/components/live-stage/emergency-dialog";
import { AnnouncementModal } from "@/components/live-stage/announcement-modal";
import { TeleprompterView } from "@/components/teleprompter/teleprompter-view";
import { EmergencyType, Session } from "@/types";
import { dateDiffDays } from "@/lib/date-utils";

export default function LiveStagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedEventId = searchParams.get("eventId");

  const {
    events,
    activeEventId,
    setSelectedEvent,
    startLiveEvent,
    stopLiveEvent,
    isEventLive,
    sessions,
    speakers,
    emergencies,
    aiRecords,
    selectedScriptId,
    startSession,
    completeSession,
    skipSession,
    resolveEmergency,
    selectScript,
  } = useEventStore();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    requestedEventId || activeEventId
  );

  useEffect(() => {
    if (requestedEventId) {
      setSelectedEventId(requestedEventId);
    } else if (activeEventId && !selectedEventId) {
      setSelectedEventId(activeEventId);
    }
  }, [requestedEventId, activeEventId, selectedEventId]);

  const activeEvent =
    events.find((e) => e.id === selectedEventId) ||
    events.find((e) => e.id === activeEventId) ||
    events[0] ||
    null;

  const eventSessions = activeEvent ? sessions.filter((s) => s.eventId === activeEvent.id) : [];
  const eventSpeakers = activeEvent ? speakers.filter((s) => s.eventId === activeEvent.id) : [];
  const eventEmergencies = activeEvent ? emergencies.filter((e) => e.eventId === activeEvent.id && !e.resolved) : [];

  // Ticking system clock (1 Hz, recomputed from Date.now() per PRD §11.2)
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live stage state dynamically using complete date timestamps
  const eventStartDate = activeEvent?.startDate || activeEvent?.date || "";
  const liveState = activeEvent
    ? calculateLiveState(eventSessions, eventStartDate, now)
    : null;

  // Modals state
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [delayAnchor, setDelayAnchor] = useState<Session | null>(null);
  const [delayReason, setDelayReason] = useState<string>("");

  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [teleprompterContent, setTeleprompterContent] = useState<string>("");
  const [teleprompterTitle, setTeleprompterTitle] = useState<string>("Stage Script");
  const [actionError, setActionError] = useState<string | null>(null);

  const currentSession = liveState?.currentSession || null;
  const nextSession = liveState?.nextSession || null;
  const currentSpeaker = currentSession
    ? eventSpeakers.find((sp) => sp.id === currentSession.speakerId)
    : null;
  const nextSpeaker = nextSession
    ? eventSpeakers.find((sp) => sp.id === nextSession.speakerId)
    : null;

  // Handle Delay triggers
  const handleOpenDelay = (anchor: Session | null, reason = "") => {
    if (!anchor) return;
    setDelayAnchor(anchor);
    setDelayReason(reason);
    setIsDelayModalOpen(true);
  };

  // Session Action handlers
  const handleStart = (id: string) => {
    setActionError(null);
    const res = startSession(id);
    if (!res.ok) {
      setActionError(res.error || "Cannot start session.");
    }
  };

  const handleComplete = (id: string) => {
    setActionError(null);
    const res = completeSession(id);
    if (!res.ok) {
      setActionError(res.error || "Cannot complete session.");
    }
  };

  const handleSkip = (id: string) => {
    setActionError(null);
    const res = skipSession(id);
    if (!res.ok) {
      setActionError(res.error || "Cannot skip session.");
    }
  };

  const handleOpenTeleprompter = (text?: string, title?: string) => {
    if (text) {
      setTeleprompterContent(text);
      setTeleprompterTitle(title || "Announcement");
      setIsTeleprompterOpen(true);
      return;
    }

    // Lookup selected script from store
    const selectedRecord = aiRecords.find((r) => r.id === selectedScriptId);
    if (selectedRecord) {
      setTeleprompterContent(selectedRecord.editedText || selectedRecord.generatedText);
      setTeleprompterTitle(`AI ${selectedRecord.type.replace("_", " ")}`);
      setIsTeleprompterOpen(true);
    } else {
      // Prompt user to AI page
      router.push("/ai");
    }
  };

  if (!activeEvent) {
    return (
      <EmptyState
        title="No active event selected"
        description="Please select or create an event to access the live stage control console."
        actionLabel="Go to Events"
        onAction={() => router.push("/events")}
        icon={<Radio className="w-8 h-8" />}
      />
    );
  }

  if (eventSessions.length === 0) {
    return (
      <EmptyState
        title="No sessions scheduled"
        description="Build your event agenda first before launching live operations."
        actionLabel="Go to Agenda"
        onAction={() => router.push("/agenda")}
        icon={<Clock className="w-8 h-8" />}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Multi-Live Event Switcher Bar */}
      {events.length > 1 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>LIVE OPERATIONS HUB</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Switching events maintains independent countdowns, delays, and emergencies
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {events.map((ev) => {
              const isThisLive = isEventLive(ev.id);
              const isSelected = activeEvent?.id === ev.id;
              const hasEmergencies = emergencies.some(
                (em) => em.eventId === ev.id && !em.resolved
              );

              return (
                <button
                  key={ev.id}
                  onClick={() => {
                    setSelectedEventId(ev.id);
                    setSelectedEvent(ev.id);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
                    isSelected
                      ? "bg-slate-800 text-white border-blue-500/60 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30"
                      : "bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {isThisLive ? (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span>
                  )}
                  <span className="truncate max-w-[140px] font-medium">{ev.name}</span>
                  {isThisLive && (
                    <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-800/50">
                      LIVE
                    </span>
                  )}
                  {hasEmergencies && (
                    <span className="text-[9px] uppercase font-bold text-rose-400 bg-rose-950/80 px-1 py-0.5 rounded border border-rose-800/50">
                      ALERT
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Event Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800/90 p-4 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl font-bold text-white tracking-tight">{activeEvent.name}</h1>
            {isEventLive(activeEvent.id) ? (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                LIVE STAGE
              </span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Scheduled
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <span>📍 {activeEvent.venue}</span>
            <span>•</span>
            <span>⏰ {activeEvent.startTime} – {activeEvent.endTime}</span>
            {activeEvent.startDate && (
              <>
                <span>•</span>
                <span>📅 {activeEvent.startDate}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEventLive(activeEvent.id) ? (
            <Button
              onClick={() => stopLiveEvent(activeEvent.id)}
              variant="danger"
              size="sm"
              className="border-rose-500/40 text-rose-300 hover:bg-rose-950/60"
              title="Stop live stage operations for this event"
            >
              <Square className="w-3.5 h-3.5 mr-1 fill-current" />
              End Event Live
            </Button>
          ) : (
            <Button
              onClick={() => startLiveEvent(activeEvent.id)}
              variant="secondary"
              size="sm"
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/60"
              title="Start live stage operations for this event"
            >
              <Radio className="w-3.5 h-3.5 mr-1 text-emerald-400 animate-pulse" />
              Make Event Live
            </Button>
          )}
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs text-rose-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Emergencies Banner (PRD §12) */}
      {eventEmergencies.length > 0 && (
        <div className="space-y-2">
          {eventEmergencies.map((emg) => (
            <div
              key={emg.id}
              className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 shadow-lg shadow-rose-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                      Active Emergency: {emg.type}
                    </span>
                  </div>
                  {emg.description && (
                    <p className="text-xs text-rose-200/90 mt-0.5">{emg.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  onClick={() =>
                    router.push(
                      `/ai?emergencyType=${encodeURIComponent(emg.type)}&emergencyDesc=${encodeURIComponent(
                        emg.description || ""
                      )}`
                    )
                  }
                  variant="outline"
                  size="sm"
                  className="bg-rose-950/60 border-rose-700 text-rose-200 hover:bg-rose-900"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-rose-300" />
                  Generate AI Filler
                </Button>

                <Button
                  onClick={() => resolveEmergency(emg.id)}
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Resolve Incident
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Primary Stage Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dominant Current Session Card (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col justify-between relative overflow-hidden shadow-2xl">
          {currentSession ? (
            <div>
              {/* Header Status & Timing */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Badge status="Live" label="CURRENTLY LIVE" />
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    {currentSession.type}
                  </span>
                </div>

                <div className="text-right flex flex-col items-end">
                  {currentSession.sessionDate && activeEvent && (
                    <span className="text-[11px] text-blue-400 font-medium">
                      Day {dateDiffDays(eventStartDate, currentSession.sessionDate) + 1} ({currentSession.sessionDate.slice(5)})
                    </span>
                  )}
                  <span className="text-xs font-mono text-slate-400">
                    Scheduled: {currentSession.startTime} – {currentSession.endTime}
                  </span>
                </div>
              </div>

              {/* Title & Speaker */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
                  {currentSession.title}
                </h2>

                {currentSpeaker ? (
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {currentSpeaker.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentSpeaker.image}
                          alt={currentSpeaker.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-white">{currentSpeaker.name}</span>
                      {currentSpeaker.designation && (
                        <span className="text-slate-400 text-xs ml-1.5">
                          ({currentSpeaker.designation})
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No speaker assigned.</p>
                )}
              </div>

              {/* Real Clock Countdown & Overtime (PRD §11.1) */}
              <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    {liveState?.isOvertime ? "Session Overrun" : "Remaining Time"}
                  </span>
                  <div className="flex items-center gap-3">
                    {liveState?.isOvertime ? (
                      <div className="flex items-center gap-2">
                        <Flame className="w-8 h-8 text-rose-500 animate-pulse" />
                        <span className="text-3xl sm:text-4xl font-extrabold text-rose-400 font-mono tracking-tight">
                          OVERTIME +{formatTimer(liveState.overtimeSeconds)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                        {formatTimer(liveState?.remainingSeconds || 0)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                  <span className="text-xs text-slate-400 block mb-0.5">Elapsed On Stage</span>
                  <span className="text-lg font-bold font-mono text-slate-200">
                    {formatTimer(liveState?.elapsedSeconds || 0)}
                  </span>
                </div>
              </div>

              {/* Operational Controls for Live Session */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={() => handleComplete(currentSession.id)}
                  variant="primary"
                  size="md"
                  className="bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Session
                </Button>

                <Button
                  onClick={() => handleOpenDelay(currentSession, "Live overrun")}
                  variant="secondary"
                  size="md"
                  className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                >
                  <Clock className="w-4 h-4 mr-1.5 text-amber-400" />
                  Apply Delay (+10m)
                </Button>

                <Button
                  onClick={() => handleSkip(currentSession.id)}
                  variant="ghost"
                  size="md"
                  className="text-slate-400 hover:text-white"
                >
                  <FastForward className="w-4 h-4 mr-1.5" />
                  Skip Session
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center my-auto">
              <div className="p-4 rounded-2xl bg-slate-800/40 text-slate-400 mb-4 border border-slate-700/40">
                <Radio className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No session is currently live</h2>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                Start the upcoming session to begin the real countdown and stage tracking.
              </p>

              {nextSession && (
                <Button
                  onClick={() => handleStart(nextSession.id)}
                  variant="primary"
                  size="lg"
                  className="shadow-lg shadow-blue-500/20"
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Start &quot;{nextSession.title}&quot;
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Next Session Card (1 col) */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Next Up
              </span>
              {liveState?.isNextOverdue && (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse">
                  Start Overdue +{formatTimer(liveState.nextOverdueSeconds)}
                </span>
              )}
            </div>

            {nextSession ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-white line-clamp-2">
                    {nextSession.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Scheduled start:{" "}
                    {nextSession.sessionDate && activeEvent && (
                      <span className="text-blue-400 font-medium mr-1">
                        [Day {dateDiffDays(eventStartDate, nextSession.sessionDate) + 1}]
                      </span>
                    )}
                    <span className="font-mono text-white font-medium">{nextSession.startTime}</span> ({nextSession.duration} min)
                  </p>
                </div>

                {nextSpeaker && (
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-300">
                    <User className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="truncate">
                      <p className="font-semibold text-white truncate">{nextSpeaker.name}</p>
                      {nextSpeaker.designation && (
                        <p className="text-[11px] text-slate-400 truncate">{nextSpeaker.designation}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[11px] text-slate-400 block mb-1">
                    {liveState?.isNextOverdue ? "Overdue time" : "Countdown to start"}
                  </span>
                  <span
                    className={`text-2xl font-bold font-mono ${
                      liveState?.isNextOverdue ? "text-amber-400" : "text-slate-200"
                    }`}
                  >
                    {liveState?.isNextOverdue
                      ? `+${formatTimer(liveState.nextOverdueSeconds)}`
                      : formatTimer(liveState?.nextCountdownSeconds || 0)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No further sessions scheduled.</p>
            )}
          </div>

          {nextSession && (
            <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
              <Button
                onClick={() => handleStart(nextSession.id)}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                <Play className="w-3.5 h-3.5 mr-1 fill-current" />
                Start Now
              </Button>

              <Button
                onClick={() => handleOpenDelay(nextSession, "Speaker late")}
                variant="outline"
                size="sm"
              >
                <Clock className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Operational Action Bar (PRD UI-009) */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => handleOpenDelay(currentSession || nextSession, "Manual live delay")}
            variant="secondary"
            size="sm"
            className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            Apply Delay (+5/+10/+15)
          </Button>

          <Button
            onClick={() => setIsEmergencyModalOpen(true)}
            variant="danger"
            size="sm"
          >
            <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
            Emergency Protocol
          </Button>

          <Button
            onClick={() => setIsAnnouncementModalOpen(true)}
            variant="secondary"
            size="sm"
          >
            <Megaphone className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            Announce
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push("/ai")}
            variant="secondary"
            size="sm"
            className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
            AI Script Copilot
          </Button>

          <Button
            onClick={() => handleOpenTeleprompter()}
            variant="primary"
            size="sm"
          >
            <Tv className="w-3.5 h-3.5 mr-1.5" />
            Open Teleprompter
          </Button>
        </div>
      </div>

      {/* Upcoming Agenda Timeline in Live Stage */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Upcoming Stage Flow
        </h3>

        {liveState?.upcomingSessions.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-4 bg-slate-900/40 rounded-xl border border-slate-800/60">
            No further sessions in queue.
          </p>
        ) : (
          <div className="space-y-2">
            {liveState?.upcomingSessions.map((session) => {
              const speaker = eventSpeakers.find((sp) => sp.id === session.speakerId);
              const isDelayed = session.startTime !== session.originalStartTime;

              return (
                <div
                  key={session.id}
                  className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="font-mono min-w-[95px]">
                      {session.sessionDate && activeEvent && (
                        <span className="text-[10px] text-blue-400 font-medium block">
                          Day {dateDiffDays(eventStartDate, session.sessionDate) + 1}
                        </span>
                      )}
                      <span className="font-bold text-white">{session.startTime}</span>
                      {isDelayed && (
                        <span className="text-[10px] text-amber-400 ml-1.5 line-through">
                          {session.originalStartTime}
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-slate-200">{session.title}</span>
                    <Badge status={session.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">
                      {speaker ? speaker.name : "No speaker"}
                    </span>
                    <button
                      onClick={() => handleStart(session.id)}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      Start <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delay Modal */}
      <DelayModal
        isOpen={isDelayModalOpen}
        onClose={() => setIsDelayModalOpen(false)}
        anchorSession={delayAnchor}
        defaultReason={delayReason}
      />

      {/* Emergency Dialog */}
      <EmergencyDialog
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        eventId={activeEvent?.id}
        onSelectAiFiller={(type, desc) =>
          router.push(
            `/ai?emergencyType=${encodeURIComponent(type)}&emergencyDesc=${encodeURIComponent(desc || "")}`
          )
        }
        onSelectDelay={(type, defaultMinutes) =>
          handleOpenDelay(currentSession || nextSession, `Emergency: ${type}`)
        }
      />

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        eventId={activeEvent?.id}
        onOpenInTeleprompter={(text) => handleOpenTeleprompter(text, "Live Announcement")}
      />

      {/* Teleprompter View */}
      <TeleprompterView
        isOpen={isTeleprompterOpen}
        onClose={() => setIsTeleprompterOpen(false)}
        scriptText={teleprompterContent}
        scriptTitle={teleprompterTitle}
      />
    </div>
  );
}
