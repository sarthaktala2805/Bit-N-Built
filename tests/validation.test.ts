// Unit tests for Validation Module
// Verifies validation rules for same-day, overnight (9 PM -> 1 AM next day), and multi-day timelines (Edit 2)

import { describe, it, expect } from "vitest";
import { validateEvent, validateSession } from "../lib/validation";
import { Event, Session } from "../types";
import { resolveEventTimestamps } from "../lib/date-utils";

describe("Validation Module — Flexible Timeline Rules", () => {
  it("validates normal same-day event (10:00 AM → 2:00 PM)", () => {
    const res = validateEvent({
      name: "Tech Workshop",
      type: "Workshop",
      startDate: "2026-09-19",
      venue: "Lab 3",
      startTime: "10:00",
      endTime: "14:00",
    });

    expect(res.valid).toBe(true);
    expect(Object.keys(res.errors).length).toBe(0);
  });

  it("validates overnight event crossing midnight (9:00 PM → 1:00 AM next day)", () => {
    // Bit N Build Demo Summit acceptance test case
    const res = validateEvent({
      name: "Bit N Build Demo Summit",
      type: "Hackathon",
      startDate: "2026-09-19",
      venue: "Main Stage",
      startTime: "21:00",
      endTime: "01:00", // Overnight crossing midnight!
    });

    expect(res.valid).toBe(true);
    expect(Object.keys(res.errors).length).toBe(0);
  });

  it("validates multi-day event spanning multiple calendar days", () => {
    const res = validateEvent({
      name: "Global Tech Summit",
      type: "Conference",
      startDate: "2026-09-19",
      endDate: "2026-09-20",
      venue: "Convention Center",
      startTime: "09:00",
      endTime: "13:00",
    });

    expect(res.valid).toBe(true);
    expect(Object.keys(res.errors).length).toBe(0);
  });

  it("rejects event when end date-time is before start date-time", () => {
    const res = validateEvent({
      name: "Invalid Event",
      type: "Conference",
      startDate: "2026-09-20",
      endDate: "2026-09-19", // earlier date!
      venue: "Hall A",
      startTime: "10:00",
      endTime: "12:00",
    });

    expect(res.valid).toBe(false);
    expect(res.errors.endTime).toBeDefined();
  });

  it("validates sessions scheduled across overnight event window", () => {
    const eventTimestamps = resolveEventTimestamps({
      startDate: "2026-09-19",
      startTime: "21:00",
      endTime: "01:00",
    });

    const mockEvent: Event = {
      id: "ev-overnight",
      name: "Bit N Build Demo Summit",
      type: "Hackathon",
      date: "2026-09-19",
      startDate: "2026-09-19",
      endDate: "2026-09-20",
      startTime: "21:00",
      endTime: "01:00",
      startDateTime: eventTimestamps.startDateTime,
      endDateTime: eventTimestamps.endDateTime,
      venue: "Stage A",
      createdAt: 1000,
      updatedAt: 1000,
    };

    const s1: Session = {
      id: "s1",
      eventId: "ev-overnight",
      title: "Opening Keynote",
      type: "Opening",
      speakerId: null,
      sessionDate: "2026-09-19",
      startTime: "21:00",
      endTime: "22:30",
      duration: 90,
      startDateTime: eventTimestamps.startDateTime,
      endDateTime: eventTimestamps.startDateTime + 90 * 60000,
      status: "Upcoming",
      isFixedTime: false,
      originalStartTime: "21:00",
      originalEndTime: "22:30",
      originalSessionDate: "2026-09-19",
      originalStartDateTime: eventTimestamps.startDateTime,
      originalEndDateTime: eventTimestamps.startDateTime + 90 * 60000,
      actualStartTime: null,
      actualEndTime: null,
    };

    // Session 2 is on Day 2 past midnight (00:10 to 01:00)
    const resS2 = validateSession(
      {
        title: "Midnight Wrap-up",
        type: "Closing",
        sessionDate: "2026-09-20",
        startTime: "00:10",
        endTime: "01:00",
      },
      mockEvent,
      [s1]
    );

    expect(resS2.valid).toBe(true);
  });
});
