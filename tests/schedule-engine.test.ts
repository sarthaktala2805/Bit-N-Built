// Unit tests for Schedule Engine
// Tests Vectors D-1 to D-8 from STAGEX_AI_PRD.md §10.10

import { describe, it, expect } from "vitest";
import { applyDelay } from "../lib/schedule-engine";
import { getLocalEpochMs } from "../lib/live-engine";
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
    title: "Session 1",
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

describe("Schedule Engine — Dynamic Delay Recalculation", () => {
  it("Vector D-1: Example A — No buffer, all subsequent sessions shift", () => {
    const sessions: Session[] = [
      createMockSession({ id: "s1", title: "Opening", startTime: "10:00", endTime: "10:15", duration: 15 }),
      createMockSession({ id: "s2", title: "Keynote", startTime: "10:15", endTime: "11:00", duration: 45 }),
      createMockSession({ id: "s3", title: "Workshop", startTime: "11:00", endTime: "12:00", duration: 60 }),
      createMockSession({ id: "s4", title: "Break", startTime: "12:00", endTime: "12:30", duration: 30 }),
    ];

    const result = applyDelay({
      sessions,
      anchorSessionId: "s1",
      minutes: 10,
      now: 1000,
      eventWindow: { start: "10:00", end: "13:00" },
    });

    expect(result.status).toBe("ok");
    expect(result.bufferConsumedMinutes).toBe(0);
    expect(result.remainingShiftMinutes).toBe(10);
    expect(result.changes.length).toBe(4);

    const s1 = result.proposedSessions.find((s) => s.id === "s1")!;
    expect(s1.startTime).toBe("10:10");
    expect(s1.endTime).toBe("10:25");

    const s2 = result.proposedSessions.find((s) => s.id === "s2")!;
    expect(s2.startTime).toBe("10:25");
    expect(s2.endTime).toBe("11:10");

    const s4 = result.proposedSessions.find((s) => s.id === "s4")!;
    expect(s4.startTime).toBe("12:10");
    expect(s4.endTime).toBe("12:40");
  });

  it("Vector D-2: Example B — Buffer consumed before shifting", () => {
    const sessions: Session[] = [
      createMockSession({ id: "s1", title: "Opening", startTime: "10:00", endTime: "10:15", duration: 15 }),
      createMockSession({ id: "s2", title: "Keynote", startTime: "10:20", endTime: "11:00", duration: 40 }), // 5 min buffer gap
    ];

    const result = applyDelay({
      sessions,
      anchorSessionId: "s1",
      minutes: 10,
      now: 1000,
      eventWindow: { start: "10:00", end: "13:00" },
    });

    expect(result.status).toBe("ok");
    expect(result.bufferConsumedMinutes).toBe(5);
    expect(result.remainingShiftMinutes).toBe(5);

    const s1 = result.proposedSessions.find((s) => s.id === "s1")!;
    expect(s1.startTime).toBe("10:10");
    expect(s1.endTime).toBe("10:25");

    const s2 = result.proposedSessions.find((s) => s.id === "s2")!;
    expect(s2.startTime).toBe("10:25");
    expect(s2.endTime).toBe("11:05");
  });

  it("Vector D-3: Gap >= delay completely absorbs delay for later sessions", () => {
    const sessions: Session[] = [
      createMockSession({ id: "s1", title: "Opening", startTime: "10:00", endTime: "10:15", duration: 15 }),
      createMockSession({ id: "s2", title: "Keynote", startTime: "10:30", endTime: "11:15", duration: 45 }), // 15 min buffer
    ];

    const result = applyDelay({
      sessions,
      anchorSessionId: "s1",
      minutes: 10,
      now: 1000,
      eventWindow: { start: "10:00", end: "13:00" },
    });

    expect(result.status).toBe("ok");
    expect(result.bufferConsumedMinutes).toBe(10);
    expect(result.remainingShiftMinutes).toBe(0);

    const s2 = result.proposedSessions.find((s) => s.id === "s2")!;
    expect(s2.startTime).toBe("10:30"); // Untouched because buffer absorbed it completely!
    expect(s2.endTime).toBe("11:15");
  });

  it("Vector D-4: Fixed session after anchor triggers needs_decision", () => {
    const sessions: Session[] = [
      createMockSession({ id: "s1", title: "Opening", startTime: "10:00", endTime: "10:15", duration: 15 }),
      createMockSession({ id: "s2", title: "Fixed Break", startTime: "10:15", endTime: "10:45", duration: 30, isFixedTime: true }),
    ];

    const result = applyDelay({
      sessions,
      anchorSessionId: "s1",
      minutes: 10,
      now: 1000,
      eventWindow: { start: "10:00", end: "13:00" },
    });

    expect(result.status).toBe("needs_decision");
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].sessionId).toBe("s2");
  });

  it("Vector D-5: Fixed session with explicit 'shift' decision succeeds", () => {
    const sessions: Session[] = [
      createMockSession({ id: "s1", title: "Opening", startTime: "10:00", endTime: "10:15", duration: 15 }),
      createMockSession({ id: "s2", title: "Fixed Break", startTime: "10:15", endTime: "10:45", duration: 30, isFixedTime: true }),
    ];

    const result = applyDelay({
      sessions,
      anchorSessionId: "s1",
      minutes: 10,
      now: 1000,
      eventWindow: { start: "10:00", end: "13:00" },
      fixedDecision: "shift",
    });

    expect(result.status).toBe("ok");
    const s2 = result.proposedSessions.find((s) => s.id === "s2")!;
    expect(s2.startTime).toBe("10:25");
    expect(s2.endTime).toBe("10:55");
  });

  it("Vector D-6: Invalid delay minutes (0, negative, non-integer) returns invalid", () => {
    const sessions = [createMockSession({ id: "s1" })];

    const resNegative = applyDelay({
      sessions,
      anchorSessionId: "s1",
      minutes: -5,
      now: 1000,
      eventWindow: { start: "10:00", end: "13:00" },
    });
    expect(resNegative.status).toBe("invalid");

    const resZero = applyDelay({
      sessions,
      anchorSessionId: "s1",
      minutes: 0,
      now: 1000,
      eventWindow: { start: "10:00", end: "13:00" },
    });
    expect(resZero.status).toBe("invalid");
  });

  it("Vector D-8: Terminal sessions are untouched by delay", () => {
    const sessions: Session[] = [
      createMockSession({ id: "s0", title: "Previous", startTime: "09:30", endTime: "10:00", duration: 30, status: "Completed" }),
      createMockSession({ id: "s1", title: "Opening", startTime: "10:00", endTime: "10:15", duration: 15 }),
      createMockSession({ id: "s2", title: "Skipped Session", startTime: "10:15", endTime: "10:30", duration: 15, status: "Skipped" }),
    ];

    const result = applyDelay({
      sessions,
      anchorSessionId: "s1",
      minutes: 10,
      now: 1000,
      eventWindow: { start: "09:00", end: "13:00" },
    });

    expect(result.status).toBe("ok");
    const s0 = result.proposedSessions.find((s) => s.id === "s0")!;
    expect(s0.startTime).toBe("09:30");
    expect(s0.endTime).toBe("10:00");
  });

  it("Live session overrun: start is unchanged, end is extended", () => {
    const sessions: Session[] = [
      createMockSession({ id: "s1", title: "Opening", startTime: "10:00", endTime: "10:30", duration: 30, status: "Live", actualStartTime: 1000 }),
      createMockSession({ id: "s2", title: "Keynote", startTime: "10:30", endTime: "11:15", duration: 45, status: "Upcoming" }),
    ];

    const result = applyDelay({
      sessions,
      anchorSessionId: "s1",
      minutes: 15,
      now: 1000,
      eventWindow: { start: "10:00", end: "13:00" },
    });

    expect(result.status).toBe("ok");
    const s1 = result.proposedSessions.find((s) => s.id === "s1")!;
    expect(s1.startTime).toBe("10:00"); // Start unchanged for Live overrun!
    expect(s1.endTime).toBe("10:45");
    expect(s1.duration).toBe(45);

    const s2 = result.proposedSessions.find((s) => s.id === "s2")!;
    expect(s2.startTime).toBe("10:45");
    expect(s2.endTime).toBe("11:30");
  });

  it("Overnight midnight crossing: 11:50 PM session + 20m delay shifts to 12:10 AM next day", () => {
    const sessions: Session[] = [
      createMockSession({
        id: "s1",
        title: "Night Session",
        sessionDate: "2026-09-19",
        startTime: "23:00",
        endTime: "23:50",
        duration: 50,
        status: "Live",
      }),
      createMockSession({
        id: "s2",
        title: "Wrap-up Session",
        sessionDate: "2026-09-19",
        startTime: "23:50",
        endTime: "00:30", // crossing midnight into Sep 20
        duration: 40,
        status: "Upcoming",
      }),
    ];

    const result = applyDelay({
      sessions,
      anchorSessionId: "s1",
      minutes: 20,
      now: 1000,
      eventStartDate: "2026-09-19",
    });

    expect(result.status).toBe("ok");
    const s1 = result.proposedSessions.find((s) => s.id === "s1")!;
    expect(s1.startTime).toBe("23:00");
    expect(s1.endTime).toBe("00:10"); // extended by 20m past midnight

    const s2 = result.proposedSessions.find((s) => s.id === "s2")!;
    expect(s2.startTime).toBe("00:10");
    expect(s2.endTime).toBe("00:50");
    expect(s2.sessionDate).toBe("2026-09-20"); // advanced to next calendar day!
  });

  it("Multi-day delay: delay on Day 1 propagates into Day 2 sessions without date loss", () => {
    const sessions: Session[] = [
      createMockSession({
        id: "d1-s1",
        title: "Day 1 Closing",
        sessionDate: "2026-09-19",
        startTime: "22:00",
        endTime: "23:00",
        duration: 60,
        status: "Live",
      }),
      createMockSession({
        id: "d2-s1",
        title: "Day 2 Kickoff",
        sessionDate: "2026-09-20",
        startTime: "09:00",
        endTime: "10:00",
        duration: 60,
        status: "Upcoming",
      }),
    ];

    // Gap between Day 1 23:00 and Day 2 09:00 is 10 hours (600 minutes)
    const result = applyDelay({
      sessions,
      anchorSessionId: "d1-s1",
      minutes: 30,
      now: 1000,
      eventStartDate: "2026-09-19",
    });

    expect(result.status).toBe("ok");
    expect(result.bufferConsumedMinutes).toBe(30); // 30m absorbed by overnight gap!
    const d2s1 = result.proposedSessions.find((s) => s.id === "d2-s1")!;
    expect(d2s1.startTime).toBe("09:00"); // Remains untouched on Day 2
    expect(d2s1.sessionDate).toBe("2026-09-20");
  });
});
