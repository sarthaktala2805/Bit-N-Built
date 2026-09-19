// Unit tests for Analytics Engine and Deterministic Health Score
// Traces to STAGEX_AI_PRD.md §17, §18

import { describe, it, expect } from "vitest";
import { computeAnalyticsMetrics } from "../lib/analytics-engine";
import { Event, Session, DelayRecord, Emergency, AIRecord, ActivityLog } from "../types";
import { getLocalEpochMs } from "../lib/live-engine";

const mockEvent: Event = {
  id: "ev1",
  name: "Summit 2026",
  type: "Conference",
  date: "2026-09-19",
  startDate: "2026-09-19",
  endDate: "2026-09-19",
  startDateTime: 1758256800000,
  endDateTime: 1758271200000,
  venue: "Grand Hall",
  startTime: "10:00",
  endTime: "14:00",
  createdAt: 1000,
  updatedAt: 1000,
};

describe("Analytics Engine & Deterministic Health Score", () => {
  it("returns clean empty state when no activity recorded", () => {
    const metrics = computeAnalyticsMetrics(mockEvent, [], [], [], [], []);
    expect(metrics.totalSessions).toBe(0);
    expect(metrics.completedSessions).toBe(0);
    expect(metrics.totalDelayMinutes).toBe(0);
    expect(metrics.healthScore).toBe(null);
  });

  it("calculates deviations and deterministic health score correctly", () => {
    const startMs = getLocalEpochMs(mockEvent.date, "10:00");
    const actualStart = startMs + 10 * 60 * 1000; // 10 min late
    const actualEnd = actualStart + 30 * 60 * 1000;

    const session: Session = {
      id: "s1",
      eventId: "ev1",
      title: "Opening",
      type: "Opening",
      speakerId: null,
      sessionDate: "2026-09-19",
      startTime: "10:10",
      endTime: "10:40",
      duration: 30,
      startDateTime: startMs + 10 * 60 * 1000,
      endDateTime: startMs + 40 * 60 * 1000,
      status: "Completed",
      isFixedTime: false,
      originalStartTime: "10:00",
      originalEndTime: "10:30",
      originalSessionDate: "2026-09-19",
      originalStartDateTime: startMs,
      originalEndDateTime: startMs + 30 * 60 * 1000,
      actualStartTime: actualStart,
      actualEndTime: actualEnd,
    };

    const delay: DelayRecord = {
      id: "d1",
      eventId: "ev1",
      sessionId: "s1",
      minutes: 10,
      reason: "Audio check",
      timestamp: startMs,
    };

    const metrics = computeAnalyticsMetrics(mockEvent, [session], [delay], [], [], []);
    expect(metrics.totalSessions).toBe(1);
    expect(metrics.completedSessions).toBe(1);
    expect(metrics.totalDelayMinutes).toBe(10);
    expect(metrics.deviations.length).toBe(1);
    expect(metrics.deviations[0].deviationMinutes).toBe(10);

    // Health score determinism:
    // P_dev = min(30, 2 * 10) = 20
    // P_drift = min(20, 10) = 10
    // P_emg = 0
    // P_skip = 0
    // score = 100 - 20 - 10 = 70 ("Minor issues")
    expect(metrics.healthScore).toBe(70);
    expect(metrics.healthBand).toBe("Minor issues");
  });

  it("health score produces identical output for identical inputs (pure determinism)", () => {
    const startMs = getLocalEpochMs(mockEvent.date, "10:00");
    const session: Session = {
      id: "s1",
      eventId: "ev1",
      title: "Talk",
      type: "Talk",
      speakerId: null,
      sessionDate: "2026-09-19",
      startTime: "10:00",
      endTime: "10:30",
      duration: 30,
      startDateTime: startMs,
      endDateTime: startMs + 30 * 60 * 1000,
      status: "Completed",
      isFixedTime: false,
      originalStartTime: "10:00",
      originalEndTime: "10:30",
      originalSessionDate: "2026-09-19",
      originalStartDateTime: startMs,
      originalEndDateTime: startMs + 30 * 60 * 1000,
      actualStartTime: startMs, // on time
      actualEndTime: startMs + 30 * 60 * 1000,
    };

    const res1 = computeAnalyticsMetrics(mockEvent, [session], [], [], [], []);
    const res2 = computeAnalyticsMetrics(mockEvent, [session], [], [], [], []);

    expect(res1.healthScore).toBe(100);
    expect(res1.healthBand).toBe("On track");
    expect(res1.healthScore).toBe(res2.healthScore);
  });
});
