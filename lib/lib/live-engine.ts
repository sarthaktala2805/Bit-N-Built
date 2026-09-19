// StageX AI — Live Stage Engine
// Traces to STAGEX_AI_PRD.md §11 and Edit 2 Requirements

import { Session, LiveStageState } from "@/types";
import { resolveSessionTimestamps } from "./date-utils";

/**
 * Ensures session has startDateTime and endDateTime populated.
 */
function ensureSessionTimestamps(s: Session, defaultDate: string): Session {
  if (s.startDateTime && s.endDateTime && s.endDateTime > s.startDateTime) {
    return s;
  }
  const ts = resolveSessionTimestamps(s, s.sessionDate || defaultDate);
  return {
    ...s,
    sessionDate: ts.sessionDate,
    startTime: ts.startTime,
    endTime: ts.endTime,
    startDateTime: ts.startDateTime,
    endDateTime: ts.endDateTime,
    duration: ts.durationMinutes,
  };
}

/**
 * Returns the currently live session, if any.
 * If multiple are live (anomaly), returns the one with the latest actualStartTime.
 */
export function getCurrentSession(sessions: Session[]): Session | null {
  const liveSessions = sessions.filter((s) => s.status === "Live");
  if (liveSessions.length === 0) return null;
  if (liveSessions.length === 1) return liveSessions[0];

  return liveSessions.reduce((latest, s) => {
    const sStart = s.actualStartTime || s.startDateTime || 0;
    const latestStart = latest.actualStartTime || latest.startDateTime || 0;
    return sStart >= latestStart ? s : latest;
  }, liveSessions[0]);
}

/**
 * Returns the next upcoming/delayed session chronologically across all calendar dates.
 */
export function getNextSession(sessions: Session[], current: Session | null): Session | null {
  const candidateSessions = sessions.filter(
    (s) => (s.status === "Upcoming" || s.status === "Delayed") && s.id !== current?.id
  );

  if (candidateSessions.length === 0) return null;

  // Sort chronologically across calendar dates using complete startDateTime
  candidateSessions.sort((a, b) => (a.startDateTime || 0) - (b.startDateTime || 0));

  if (!current) {
    return candidateSessions[0];
  }

  const currentAnchorTime = current.endDateTime || current.startDateTime || 0;
  const afterCurrent = candidateSessions.filter((s) => (s.startDateTime || 0) >= currentAnchorTime);

  return afterCurrent.length > 0 ? afterCurrent[0] : candidateSessions[0];
}

/**
 * Returns list of upcoming sessions after the current and next sessions, sorted across all calendar dates.
 */
export function getUpcomingSessions(
  sessions: Session[],
  current: Session | null,
  next: Session | null
): Session[] {
  return sessions
    .filter(
      (s) =>
        (s.status === "Upcoming" || s.status === "Delayed") &&
        s.id !== current?.id &&
        s.id !== next?.id
    )
    .sort((a, b) => (a.startDateTime || 0) - (b.startDateTime || 0));
}

/**
 * Evaluates live stage state dynamically based on real system clock `now`
 * using complete epoch ms timestamps to support midnight continuity and multi-day events.
 */
export function calculateLiveState(
  sessions: Session[],
  eventDate: string,
  now: number
): LiveStageState {
  // Normalize all sessions to ensure startDateTime and endDateTime exist
  const standardizedSessions = sessions.map((s) => ensureSessionTimestamps(s, eventDate));

  const current = getCurrentSession(standardizedSessions);
  const next = getNextSession(standardizedSessions, current);
  const upcoming = getUpcomingSessions(standardizedSessions, current, next);

  let elapsedSeconds = 0;
  let remainingSeconds = 0;
  let isOvertime = false;
  let overtimeSeconds = 0;

  if (current) {
    if (current.actualStartTime) {
      elapsedSeconds = Math.max(0, Math.floor((now - current.actualStartTime) / 1000));
    } else {
      elapsedSeconds = Math.max(0, Math.floor((now - current.startDateTime) / 1000));
    }

    // Scheduled countdown math using complete epoch ms
    const diffMs = current.endDateTime - now;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 0) {
      isOvertime = true;
      overtimeSeconds = Math.abs(diffSec);
      remainingSeconds = 0;
    } else {
      isOvertime = false;
      remainingSeconds = diffSec;
      overtimeSeconds = 0;
    }
  }

  let nextCountdownSeconds = 0;
  let isNextOverdue = false;
  let nextOverdueSeconds = 0;

  if (next) {
    const diffNextSec = Math.floor((next.startDateTime - now) / 1000);

    if (diffNextSec < 0) {
      isNextOverdue = true;
      nextOverdueSeconds = Math.abs(diffNextSec);
      nextCountdownSeconds = 0;
    } else {
      isNextOverdue = false;
      nextCountdownSeconds = diffNextSec;
      nextOverdueSeconds = 0;
    }
  }

  return {
    currentSession: current,
    nextSession: next,
    upcomingSessions: upcoming,
    elapsedSeconds,
    remainingSeconds,
    isOvertime,
    overtimeSeconds,
    nextCountdownSeconds,
    isNextOverdue,
    nextOverdueSeconds,
  };
}

/**
 * Formats seconds into "mm:ss" or "hh:mm:ss"
 */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Parses eventDate ("YYYY-MM-DD") and time ("HH:mm") into epoch milliseconds in local time.
 */
export function getLocalEpochMs(eventDate: string, time: string): number {
  const [year, month, day] = eventDate.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return date.getTime();
}
