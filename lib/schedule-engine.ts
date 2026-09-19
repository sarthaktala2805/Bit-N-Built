// StageX AI — Dynamic Delay Engine
// Traces to STAGEX_AI_PRD.md §10 and Edit 2 Requirements

import { Session, FixedDecision, DelayPreview } from "@/types";
import { validateDelay } from "./validation";
import {
  formatMsToDate,
  formatMsToTime,
  resolveSessionTimestamps,
} from "./date-utils";

export interface ApplyDelayInput {
  sessions: Session[];
  anchorSessionId: string;
  minutes: number;
  reason?: string;
  now: number; // epoch ms injected
  eventWindow?: { start: string; end: string };
  eventStartDate?: string;
  fixedDecision?: FixedDecision;
}

export function applyDelay(input: ApplyDelayInput): DelayPreview {
  const { sessions, anchorSessionId, minutes, fixedDecision, eventStartDate } = input;

  // 1. Validate delay minutes
  const delayVal = validateDelay(minutes);
  if (!delayVal.valid) {
    return {
      status: "invalid",
      proposedSessions: sessions,
      changes: [],
      bufferConsumedMinutes: 0,
      remainingShiftMinutes: 0,
      conflicts: [],
      errors: [delayVal.error || "Invalid delay minutes."],
    };
  }

  // 2. Locate anchor session
  const anchorIndex = sessions.findIndex((s) => s.id === anchorSessionId);
  if (anchorIndex === -1) {
    return {
      status: "invalid",
      proposedSessions: sessions,
      changes: [],
      bufferConsumedMinutes: 0,
      remainingShiftMinutes: 0,
      conflicts: [],
      errors: [`Anchor session "${anchorSessionId}" not found.`],
    };
  }

  const anchor = sessions[anchorIndex];
  if (anchor.status === "Completed" || anchor.status === "Skipped" || anchor.status === "Cancelled") {
    return {
      status: "invalid",
      proposedSessions: sessions,
      changes: [],
      bufferConsumedMinutes: 0,
      remainingShiftMinutes: 0,
      conflicts: [],
      errors: ["Cannot anchor delay on a finished, skipped, or cancelled session."],
    };
  }

  const baseDate = eventStartDate || anchor.sessionDate || "2026-09-19";

  // Standardize all sessions to ensure full timestamps exist
  const standardizedSessions: Session[] = sessions.map((s) => {
    const ts = resolveSessionTimestamps(s, baseDate);
    return {
      ...s,
      sessionDate: ts.sessionDate,
      startTime: ts.startTime,
      endTime: ts.endTime,
      startDateTime: ts.startDateTime,
      endDateTime: ts.endDateTime,
      duration: ts.durationMinutes,
      originalSessionDate: s.originalSessionDate || ts.sessionDate,
      originalStartDateTime: s.originalStartDateTime || ts.startDateTime,
      originalEndDateTime: s.originalEndDateTime || ts.endDateTime,
    };
  });

  // Clone sessions for immutable calculation
  const proposed: Session[] = standardizedSessions.map((s) => ({ ...s }));
  const targetAnchor = proposed[anchorIndex];

  // Track pre-delay timings for buffer & changes calculations
  const originalTimes = new Map<
    string,
    { start: string; end: string; date: string; startDateTime: number; endDateTime: number }
  >();
  standardizedSessions.forEach((s) => {
    originalTimes.set(s.id, {
      start: s.startTime,
      end: s.endTime,
      date: s.sessionDate,
      startDateTime: s.startDateTime,
      endDateTime: s.endDateTime,
    });
  });

  let carry = minutes;
  let bufferConsumed = 0;
  const shiftMs = minutes * 60000;

  // 3. Anchor shift logic
  if (targetAnchor.status === "Live") {
    // Live session overrun: start unchanged, end moves +minutes
    targetAnchor.endDateTime += shiftMs;
    targetAnchor.endTime = formatMsToTime(targetAnchor.endDateTime);
    targetAnchor.duration = Math.round((targetAnchor.endDateTime - targetAnchor.startDateTime) / 60000);
  } else {
    // Upcoming / Delayed session: both start and end move +minutes
    targetAnchor.startDateTime += shiftMs;
    targetAnchor.endDateTime += shiftMs;
    targetAnchor.sessionDate = formatMsToDate(targetAnchor.startDateTime);
    targetAnchor.startTime = formatMsToTime(targetAnchor.startDateTime);
    targetAnchor.endTime = formatMsToTime(targetAnchor.endDateTime);
    if (targetAnchor.status === "Upcoming") {
      targetAnchor.status = "Delayed";
    }
  }

  // 4. Propagate through subsequent non-terminal sessions
  const subsequentSessions = proposed
    .map((s, idx) => ({ session: s, originalIdx: idx }))
    .filter(
      ({ session, originalIdx }) =>
        originalIdx > anchorIndex &&
        session.status !== "Completed" &&
        session.status !== "Skipped" &&
        session.status !== "Cancelled"
    );

  const conflicts: { sessionId: string; sessionTitle: string; reason: string }[] = [];
  let prevOrigEndMs = originalTimes.get(targetAnchor.id)!.endDateTime; // anchor's pre-delay end

  for (const { session } of subsequentSessions) {
    if (carry <= 0) {
      break;
    }

    const orig = originalTimes.get(session.id)!;
    const sessionDurationMs = orig.endDateTime - orig.startDateTime;

    // Buffer gap = original start of this session - original end of previous session (PRD §10.4)
    const gapMs = Math.max(0, orig.startDateTime - prevOrigEndMs);
    const gapMinutes = Math.round(gapMs / 60000);

    const absorbed = Math.min(carry, gapMinutes);
    bufferConsumed += absorbed;
    carry -= absorbed;

    if (carry > 0) {
      // Check for fixed-time conflict
      if (session.isFixedTime) {
        if (!fixedDecision) {
          conflicts.push({
            sessionId: session.id,
            sessionTitle: session.title,
            reason: `Fixed-time session "${session.title}" scheduled at ${session.sessionDate} ${session.startTime} would be shifted by ${carry} minutes.`,
          });
          prevOrigEndMs = orig.endDateTime;
          continue;
        }

        if (fixedDecision === "keep") {
          // Keep fixed: current session stays fixed.
          carry = 0; // Delay absorbed by fixed anchor
          prevOrigEndMs = orig.endDateTime;
          continue;
        } else if (fixedDecision === "shift") {
          // Shift fixed session as normal
          const carryMs = carry * 60000;
          session.startDateTime = orig.startDateTime + carryMs;
          session.endDateTime = orig.endDateTime + carryMs;
          session.sessionDate = formatMsToDate(session.startDateTime);
          session.startTime = formatMsToTime(session.startDateTime);
          session.endTime = formatMsToTime(session.endDateTime);
          if (session.status === "Upcoming") {
            session.status = "Delayed";
          }
          prevOrigEndMs = orig.endDateTime;
        } else if (fixedDecision === "skip") {
          session.status = "Skipped";
          continue;
        }
      } else {
        // Normal shift (handles midnight crossing and multi-day shifts automatically)
        const carryMs = carry * 60000;
        session.startDateTime = orig.startDateTime + carryMs;
        session.endDateTime = session.startDateTime + sessionDurationMs;
        session.sessionDate = formatMsToDate(session.startDateTime);
        session.startTime = formatMsToTime(session.startDateTime);
        session.endTime = formatMsToTime(session.endDateTime);
        if (session.status === "Upcoming") {
          session.status = "Delayed";
        }
        prevOrigEndMs = orig.endDateTime;
      }
    } else {
      prevOrigEndMs = orig.endDateTime;
    }
  }

  // If conflicts detected and no decision provided, return needs_decision
  if (conflicts.length > 0) {
    return {
      status: "needs_decision",
      proposedSessions: sessions,
      changes: [],
      bufferConsumedMinutes: bufferConsumed,
      remainingShiftMinutes: carry,
      conflicts,
      errors: [],
    };
  }

  // 5. Gather list of changes
  const changes: DelayPreview["changes"] = [];
  for (const p of proposed) {
    const orig = originalTimes.get(p.id)!;
    if (
      p.startTime !== orig.start ||
      p.endTime !== orig.end ||
      p.sessionDate !== orig.date ||
      p.status !== sessions.find((s) => s.id === p.id)?.status
    ) {
      changes.push({
        sessionId: p.id,
        sessionTitle: p.title,
        from: { start: orig.start, end: orig.end, date: orig.date },
        to: { start: p.startTime, end: p.endTime, date: p.sessionDate },
      });
    }
  }

  // 6. Check for overlaps among active sessions using full epoch ms timestamps
  const activeSessions = proposed.filter(
    (s) => s.status !== "Cancelled" && s.status !== "Skipped"
  );
  for (let i = 0; i < activeSessions.length - 1; i++) {
    const s1 = activeSessions[i];
    const s2 = activeSessions[i + 1];
    if (s1.endDateTime > s2.startDateTime) {
      return {
        status: "invalid",
        proposedSessions: sessions,
        changes: [],
        bufferConsumedMinutes: 0,
        remainingShiftMinutes: 0,
        conflicts: [],
        errors: [`Schedule overlap detected between "${s1.title}" and "${s2.title}".`],
      };
    }
  }

  return {
    status: "ok",
    proposedSessions: proposed,
    changes,
    bufferConsumedMinutes: bufferConsumed,
    remainingShiftMinutes: carry,
    conflicts: [],
    errors: [],
  };
}
