// StageX AI — Context Engine for Gemini
// Traces to STAGEX_AI_PRD.md §13

import {
  Event,
  Session,
  Speaker,
  DelayRecord,
  Emergency,
  AIRecordType,
} from "@/types";
import { getCurrentSession, getNextSession, calculateLiveState } from "./live-engine";

export interface AIRequestContext {
  event: {
    name: string;
    type: string;
    date: string;
    venue: string;
    organizer?: string;
    description?: string;
  };
  now: string;
  currentSession?: {
    title: string;
    type: string;
    start: string;
    end: string;
    status: string;
    remainingSeconds: number;
    overtime: boolean;
  };
  nextSession?: {
    title: string;
    type: string;
    start: string;
    speaker?: {
      name: string;
      designation?: string;
      organization?: string;
      bio?: string;
    };
  };
  speaker?: {
    name: string;
    designation?: string;
    organization?: string;
    bio?: string;
  };
  delay: {
    cumulativeMinutes: number;
    latest?: {
      minutes: number;
      reason?: string;
    };
  };
  emergency?: {
    type: string;
    description?: string;
    activeCount: number;
  };
  schedule: {
    title: string;
    start: string;
    end: string;
    status: string;
    originalStart: string;
  }[];
  request: {
    type: AIRecordType;
    tone?: "Formal" | "Energetic" | "Warm" | "Humorous";
    length?: "Short" | "Medium" | "Long";
    userText?: string;
    durationMinutes?: number;
  };
}

export function buildAIContext(params: {
  event: Event;
  sessions: Session[];
  speakers: Speaker[];
  delays: DelayRecord[];
  emergencies: Emergency[];
  requestType: AIRecordType;
  targetSpeakerId?: string | null;
  targetSessionId?: string | null;
  tone?: "Formal" | "Energetic" | "Warm" | "Humorous";
  length?: "Short" | "Medium" | "Long";
  userText?: string;
  durationMinutes?: number;
  now?: number;
}): { context: AIRequestContext | null; error?: string } {
  const {
    event,
    sessions,
    speakers,
    delays,
    emergencies,
    requestType,
    targetSpeakerId,
    targetSessionId,
    tone = "Warm",
    length = "Medium",
    userText,
    durationMinutes,
    now = Date.now(),
  } = params;

  const eventSessions = sessions.filter((s) => s.eventId === event.id);
  const liveState = calculateLiveState(eventSessions, event.date, now);
  const current = liveState.currentSession;
  const next = liveState.nextSession;

  // Find targeted session or default to current / next
  let relevantSession: Session | null = null;
  if (targetSessionId) {
    relevantSession = eventSessions.find((s) => s.id === targetSessionId) || null;
  } else if (requestType === "speaker_intro") {
    relevantSession = next || current;
  } else {
    relevantSession = current;
  }

  // Find targeted speaker or session's speaker
  let relevantSpeaker: Speaker | null = null;
  if (targetSpeakerId) {
    relevantSpeaker = speakers.find((sp) => sp.id === targetSpeakerId) || null;
  } else if (relevantSession?.speakerId) {
    relevantSpeaker = speakers.find((sp) => sp.id === relevantSession.speakerId) || null;
  }

  // Guard for Speaker Intro (AI-008)
  if (requestType === "speaker_intro" && !relevantSpeaker) {
    return {
      context: null,
      error: "No speaker assigned. Please assign a speaker to the session first.",
    };
  }

  // Active emergencies
  const activeEmergencies = emergencies.filter((e) => e.eventId === event.id && !e.resolved);
  const latestEmergency = activeEmergencies[activeEmergencies.length - 1];

  // Delays
  const eventDelays = delays.filter((d) => d.eventId === event.id);
  const totalDelayMinutes = eventDelays.reduce((acc, d) => acc + d.minutes, 0);
  const latestDelay = eventDelays[eventDelays.length - 1];

  // Next session speaker lookup
  let nextSpeaker: Speaker | undefined;
  if (next?.speakerId) {
    nextSpeaker = speakers.find((sp) => sp.id === next.speakerId);
  }

  const context: AIRequestContext = {
    event: {
      name: event.name,
      type: event.type,
      date: event.date,
      venue: event.venue,
      organizer: event.organizer,
      description: event.description,
    },
    now: new Date(now).toISOString(),
    delay: {
      cumulativeMinutes: totalDelayMinutes,
      latest: latestDelay
        ? {
            minutes: latestDelay.minutes,
            reason: latestDelay.reason,
          }
        : undefined,
    },
    schedule: eventSessions.map((s) => ({
      title: s.title,
      start: s.startTime,
      end: s.endTime,
      status: s.status,
      originalStart: s.originalStartTime,
    })),
    request: {
      type: requestType,
      tone,
      length,
      userText,
      durationMinutes,
    },
  };

  if (current) {
    context.currentSession = {
      title: current.title,
      type: current.type,
      start: current.startTime,
      end: current.endTime,
      status: current.status,
      remainingSeconds: liveState.remainingSeconds,
      overtime: liveState.isOvertime,
    };
  }

  if (next) {
    context.nextSession = {
      title: next.title,
      type: next.type,
      start: next.startTime,
      speaker: nextSpeaker
        ? {
            name: nextSpeaker.name,
            designation: nextSpeaker.designation,
            organization: nextSpeaker.organization,
            bio: nextSpeaker.bio,
          }
        : undefined,
    };
  }

  if (relevantSpeaker) {
    context.speaker = {
      name: relevantSpeaker.name,
      designation: relevantSpeaker.designation,
      organization: relevantSpeaker.organization,
      bio: relevantSpeaker.bio,
    };
  }

  if (activeEmergencies.length > 0 && latestEmergency) {
    context.emergency = {
      type: latestEmergency.type,
      description: latestEmergency.description,
      activeCount: activeEmergencies.length,
    };
  }

  return { context };
}

export interface GlobalAIContext {
  now: string;
  totalEvents: number;
  liveEvents: {
    id: string;
    name: string;
    venue: string;
    currentSessionTitle?: string;
    currentSessionStatus?: string;
    delayMinutes: number;
    hasEmergency: boolean;
  }[];
  allEvents: {
    id: string;
    name: string;
    type: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    venue: string;
    organizer?: string;
    description?: string;
    speakers: { id: string; name: string; designation?: string }[];
    sessions: { id: string; title: string; startTime: string; endTime: string; status: string; duration: number }[];
    totalDelayMinutes: number;
    isLive: boolean;
  }[];
  userPrompt?: string;
}

export function buildGlobalAIContext(params: {
  events: Event[];
  sessions: Session[];
  speakers: Speaker[];
  delays: DelayRecord[];
  emergencies: Emergency[];
  userPrompt?: string;
}): GlobalAIContext {
  const { events, sessions, speakers, delays, emergencies, userPrompt } = params;

  const allEvents = events.map((e) => {
    const eventSessions = sessions.filter((s) => s.eventId === e.id);
    const eventSpeakers = speakers.filter((sp) => sp.eventId === e.id);
    const eventDelays = delays.filter((d) => d.eventId === e.id);
    const totalDelayMinutes = eventDelays.reduce((acc, d) => acc + d.minutes, 0);
    const isLive = e.status === "Live" || eventSessions.some((s) => s.status === "Live");

    return {
      id: e.id,
      name: e.name,
      type: e.type,
      startDate: e.startDate || e.date,
      endDate: e.endDate || e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      venue: e.venue,
      organizer: e.organizer,
      description: e.description,
      speakers: eventSpeakers.map((sp) => ({ id: sp.id, name: sp.name, designation: sp.designation })),
      sessions: eventSessions.map((s) => ({
        id: s.id,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        duration: s.duration,
      })),
      totalDelayMinutes,
      isLive,
    };
  });

  const liveEvents = allEvents
    .filter((e) => e.isLive)
    .map((e) => {
      const liveSession = sessions.find((s) => s.eventId === e.id && s.status === "Live");
      const hasEmergency = emergencies.some((em) => em.eventId === e.id && !em.resolved);
      return {
        id: e.id,
        name: e.name,
        venue: e.venue,
        currentSessionTitle: liveSession?.title,
        currentSessionStatus: liveSession?.status,
        delayMinutes: e.totalDelayMinutes,
        hasEmergency,
      };
    });

  return {
    now: new Date().toISOString(),
    totalEvents: events.length,
    liveEvents,
    allEvents,
    userPrompt,
  };
}

