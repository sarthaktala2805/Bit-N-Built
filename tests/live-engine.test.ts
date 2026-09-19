// Unit tests for Live Stage Engine
// Traces to STAGEX_AI_PRD.md §11

import { describe, it, expect } from "vitest";
import {
  getCurrentSession,
  getNextSession,
  getUpcomingSessions,
  calculateLiveState,
  formatTimer,
  getLocalEpochMs,
} from "../lib/live-engine";
import { Session } from "../types";

function createMockSession(overrides: Partial<Session>): Session {
  const sessionDate = overrides.sessionDate || "2026-09-19";
  const startTime = overrides.startTime || "10:00";
  const endTime = overrides.endTime || "10:30";
  const startDateTime = overrides.startDateTime ?? getLocalEpochMs(sessionDate, startTime);
  const endDateTime = overrides.endDateTime ?? getLocalEpochMs(sessionDate, endTime);

  return {
    id: "s1",
    eventId: "ev1",
    title: "Session",
    type: "Talk",
    speakerId: null,
    sessionDate,
    startTime,
    endTime,
    duration: overrides.duration ?? 30,
    startDateTime,
    endDateTime,
    status: "Upcoming",
    isFixedTime: false,
    originalStartTime: startTime,
    originalEndTime: endTime,
    originalSessionDate: sessionDate,
    originalStartDateTime: startDateTime,
    originalEndDateTime: endDateTime,
    actualStartTime: null,
    actualEndTime: null,
    ...overrides,
  };
}

describe("Live Engine", () => {
  it("determines current live session and next session", () => {
    const s1 = createMockSession({ id: "s1", title: "Live Talk", status: "Live", actualStartTime: 1000 });
    const s2 = createMockSession({ id: "s2", title: "Next Talk", status: "Upcoming", startTime: "10:30", endTime: "11:00" });
    const s3 = createMockSession({ id: "s3", title: "Later Talk", status: "Upcoming", startTime: "11:00", endTime: "11:30" });

    const sessions = [s1, s2, s3];
    const current = getCurrentSession(sessions);
    expect(current?.id).toBe("s1");

    const next = getNextSession(sessions, current);
    expect(next?.id).toBe("s2");

    const upcoming = getUpcomingSessions(sessions, current, next);
    expect(upcoming.length).toBe(1);
    expect(upcoming[0].id).toBe("s3");
  });

  it("calculates remaining time and overtime correctly", () => {
    const eventDate = "2026-09-19";
    const endMs = getLocalEpochMs(eventDate, "10:30");

    const liveSession = createMockSession({
      id: "s1",
      startTime: "10:00",
      endTime: "10:30",
      status: "Live",
      actualStartTime: getLocalEpochMs(eventDate, "10:00"),
    });

    // 5 minutes before end
    const nowBefore = endMs - 300 * 1000;
    const stateBefore = calculateLiveState([liveSession], eventDate, nowBefore);
    expect(stateBefore.isOvertime).toBe(false);
    expect(stateBefore.remainingSeconds).toBe(300);

    // 2 minutes after end (overtime)
    const nowAfter = endMs + 120 * 1000;
    const stateAfter = calculateLiveState([liveSession], eventDate, nowAfter);
    expect(stateAfter.isOvertime).toBe(true);
    expect(stateAfter.overtimeSeconds).toBe(120);
    expect(stateAfter.remainingSeconds).toBe(0);
  });

  it("formats timer seconds to mm:ss and hh:mm:ss", () => {
    expect(formatTimer(45)).toBe("00:45");
    expect(formatTimer(125)).toBe("02:05");
    expect(formatTimer(3665)).toBe("01:01:05");
  });
});
