// Unit tests for Date-Utils Engine
// Verifies same-day, overnight midnight-crossing, and multi-day calculations (Edit 2)

import { describe, it, expect } from "vitest";
import {
  resolveEventTimestamps,
  resolveSessionTimestamps,
  getDateRangeArray,
  dateDiffDays,
  timeToMinutes,
  minutesToTime,
} from "../lib/date-utils";

describe("Date Utils — Flexible Event Timeline & Overnight Support", () => {
  it("computes same-day event duration accurately (10:00 AM → 2:00 PM = 4 hours)", () => {
    const result = resolveEventTimestamps({
      date: "2026-09-19",
      startTime: "10:00",
      endTime: "14:00",
    });

    expect(result.durationMinutes).toBe(240); // 4 hours
    expect(result.startDate).toBe("2026-09-19");
    expect(result.endDate).toBe("2026-09-19");
    expect(result.isOvernight).toBe(false);
    expect(result.isMultiDay).toBe(false);
    expect(result.endDateTime).toBeGreaterThan(result.startDateTime);
  });

  it("computes overnight event duration across midnight (9:00 PM → 1:00 AM next day = 4 hours)", () => {
    const result = resolveEventTimestamps({
      date: "2026-09-19",
      startTime: "21:00",
      endTime: "01:00",
    });

    expect(result.durationMinutes).toBe(240); // 4 hours, NOT negative or zero!
    expect(result.startDate).toBe("2026-09-19");
    expect(result.endDate).toBe("2026-09-20"); // automatically next day
    expect(result.isOvernight).toBe(true);
    expect(result.endDateTime).toBeGreaterThan(result.startDateTime);
  });

  it("computes explicit multi-day event duration (Day 1 9:00 AM → Day 2 1:00 PM)", () => {
    const result = resolveEventTimestamps({
      startDate: "2026-09-19",
      endDate: "2026-09-20",
      startTime: "09:00",
      endTime: "13:00",
    });

    // 24 hours + 4 hours = 28 hours = 1680 minutes
    expect(result.durationMinutes).toBe(1680);
    expect(result.isMultiDay).toBe(true);
    expect(result.endDateTime).toBeGreaterThan(result.startDateTime);
  });

  it("generates date range arrays for multi-day events", () => {
    const range = getDateRangeArray("2026-09-19", "2026-09-21");
    expect(range).toEqual(["2026-09-19", "2026-09-20", "2026-09-21"]);
    expect(range.length).toBe(3);
  });

  it("calculates session timestamps crossing midnight accurately", () => {
    const sessionTimes = resolveSessionTimestamps(
      {
        sessionDate: "2026-09-19",
        startTime: "23:30",
        endTime: "00:30", // 1 hour crossing midnight
      },
      "2026-09-19"
    );

    expect(sessionTimes.durationMinutes).toBe(60);
    expect(sessionTimes.endDateTime).toBeGreaterThan(sessionTimes.startDateTime);
  });

  it("converts between minutes and HH:mm with 24h wrap-around", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("23:59")).toBe(1439);
    expect(minutesToTime(1440)).toBe("00:00");
    expect(minutesToTime(1450)).toBe("00:10");
  });
});
