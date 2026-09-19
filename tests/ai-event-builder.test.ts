// StageX AI — Unit Tests for AI Event Builder & Real Entity Creation
// Tests Requirements §2, §3, §4, §5, §6, §10

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock lib/firebase to avoid requiring live environment variables in offline test runner
vi.mock("@/lib/firebase", () => ({
  db: { type: "mock-firestore" },
  auth: { currentUser: null },
  app: {},
}));

import { useEventStore } from "../store/event-store";
import { EventPlan } from "../types";

describe("AI Event Builder -> Real Entity Creation & Timeline Generation", () => {
  beforeEach(() => {
    useEventStore.getState().resetAll();
  });

  it("TEST D: Creates real Event, Speakers, Sessions, Scripts, and Invitation from structured EventPlan", () => {
    const store = useEventStore.getState();

    const plan: EventPlan = {
      name: "Ahmedabad Cultural Night 2026",
      type: "Cultural Event",
      startDate: "2026-10-24",
      endDate: "2026-10-24",
      startTime: "19:00",
      endTime: "23:00",
      venue: "University Convention Center, Ahmedabad",
      description: "Annual grand cultural celebration with performances and awards.",
      organizer: "Student Council",
      expectedAudience: "500 students",
      people: [
        {
          name: "RJ Rahul",
          role: "Anchor",
          designation: "Radio Host",
          organization: "Radio Mirchi",
        },
        {
          name: "Prof. Vikram Patel",
          role: "Chief Guest",
          designation: "Vice Chancellor",
          organization: "Gujarat University",
        },
        {
          name: "Sufi Beats Trio",
          role: "Artist",
          designation: "Fusion Band",
          organization: "Local Artists Guild",
        },
      ],
      sessions: [
        {
          title: "Opening & Welcome Address",
          type: "Opening",
          speakerName: "RJ Rahul",
          duration: 20,
          startTime: "19:00",
          endTime: "19:20",
        },
        {
          title: "Address by Chief Guest",
          type: "Keynote",
          speakerName: "Prof. Vikram Patel",
          duration: 30,
          startTime: "19:20",
          endTime: "19:50",
        },
        {
          title: "Live Musical Fusion",
          type: "Cultural Performance",
          speakerName: "Sufi Beats Trio",
          duration: 90,
          startTime: "19:50",
          endTime: "21:20",
        },
        {
          title: "Annual Awards Ceremony",
          type: "Competition",
          duration: 40,
          startTime: "21:20",
          endTime: "22:00",
        },
      ],
      scripts: [
        {
          role: "Anchor",
          scriptType: "Opening",
          content: "Good evening Ahmedabad! Welcome to the grand Cultural Night 2026!",
        },
      ],
      invitation: {
        title: "Ahmedabad Cultural Night 2026",
        subtitle: "A Night of Music, Dance & Excellence",
        dateText: "Saturday, October 24, 2026",
        timeText: "7:00 PM – 11:00 PM IST",
        venueText: "University Convention Center, Ahmedabad",
        theme: "modern_dark",
      },
    };

    const res = store.createEventFromPlan(plan);
    expect(res.ok).toBe(true);
    expect(res.eventId).toBeDefined();

    const state = useEventStore.getState();

    // 1. Verify Event Entity
    const createdEvent = state.events.find((e) => e.id === res.eventId);
    expect(createdEvent).toBeDefined();
    expect(createdEvent!.name).toBe("Ahmedabad Cultural Night 2026");
    expect(createdEvent!.venue).toBe("University Convention Center, Ahmedabad");
    expect(createdEvent!.startDate).toBe("2026-10-24");
    expect(createdEvent!.startTime).toBe("19:00");
    expect(createdEvent!.endTime).toBe("23:00");

    // 2. Verify Speakers / People Entities
    const createdSpeakers = state.speakers.filter((s) => s.eventId === res.eventId);
    expect(createdSpeakers.length).toBe(3);
    const rahul = createdSpeakers.find((s) => s.name === "RJ Rahul");
    expect(rahul).toBeDefined();
    expect(rahul!.designation).toContain("Anchor");

    // 3. Verify Sessions Entities
    const createdSessions = state.sessions.filter((s) => s.eventId === res.eventId);
    expect(createdSessions.length).toBe(4);
    const openingSession = createdSessions.find((s) => s.title === "Opening & Welcome Address");
    expect(openingSession).toBeDefined();
    expect(openingSession!.speakerId).toBe(rahul!.id); // Properly mapped to RJ Rahul!

    // 4. Verify AI Records (Script & Invitation)
    const records = state.aiRecords.filter((r) => r.eventId === res.eventId);
    expect(records.length).toBe(2);
    expect(records.some((r) => r.type === "role_script")).toBe(true);
    expect(records.some((r) => r.type === "invitation")).toBe(true);

    // 5. Active Event is updated to the newly created event
    expect(state.activeEventId).toBe(res.eventId);
  });

  it("TEST I: Overnight event handling: 21:00 -> 01:00 correctly computes dates and timestamps", () => {
    const store = useEventStore.getState();

    const plan: EventPlan = {
      name: "Overnight Hackathon Kickoff",
      type: "Hackathon",
      startDate: "2026-10-24",
      endDate: "2026-10-25",
      startTime: "21:00",
      endTime: "01:00",
      venue: "Tech Innovation Hub",
      people: [],
      sessions: [
        {
          title: "Late Night Ideation",
          type: "Workshop",
          duration: 120,
          startTime: "21:00",
          endTime: "23:00",
        },
      ],
    };

    const res = store.createEventFromPlan(plan);
    expect(res.ok).toBe(true);

    const createdEvent = useEventStore.getState().events.find((e) => e.id === res.eventId)!;
    expect(createdEvent.startDate).toBe("2026-10-24");
    expect(createdEvent.endDate).toBe("2026-10-25");
    expect(createdEvent.startDateTime).toBeLessThan(createdEvent.endDateTime);
  });

  it("TEST J: Multi-day event handling with arbitrary start and end dates", () => {
    const store = useEventStore.getState();

    const plan: EventPlan = {
      name: "International 3-Day Conference",
      type: "Conference",
      startDate: "2026-11-10",
      endDate: "2026-11-12",
      startTime: "09:00",
      endTime: "18:00",
      venue: "Exhibition Center",
      people: [],
      sessions: [
        {
          title: "Day 1 Inaugural",
          type: "Opening",
          duration: 60,
          sessionDate: "2026-11-10",
          startTime: "09:00",
          endTime: "10:00",
        },
        {
          title: "Day 2 Technical Track",
          type: "Talk",
          duration: 90,
          sessionDate: "2026-11-11",
          startTime: "10:00",
          endTime: "11:30",
        },
      ],
    };

    const res = store.createEventFromPlan(plan);
    expect(res.ok).toBe(true);

    const createdSessions = useEventStore.getState().sessions.filter((s) => s.eventId === res.eventId);
    expect(createdSessions.length).toBe(2);
    expect(createdSessions[0].sessionDate).toBe("2026-11-10");
    expect(createdSessions[1].sessionDate).toBe("2026-11-11");
  });
});
