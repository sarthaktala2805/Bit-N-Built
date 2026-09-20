// StageX AI — Unit & Integration Tests for AI Copilot Photo Reading, Event Agenda & Speaker Extraction
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock lib/firebase to avoid requiring live environment variables in offline test runner
vi.mock("@/lib/firebase", () => ({
  db: { type: "mock-firestore" },
  auth: { currentUser: null },
  app: {},
}));

import { useEventStore } from "../store/event-store";
import { processUploadFile } from "../lib/file-processor";
import { EventPlan, AIAction } from "../types";

describe("StageX AI Copilot — Photo Reading, Agenda & Speaker Auto-Extraction", () => {
  beforeEach(() => {
    useEventStore.getState().resetAll();
  });

  it("TEST 1: processUploadFile correctly parses image files and marks them multimodal ready with base64", async () => {
    // Create a mock Image File (PNG header)
    const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
    const mockFile = new File([pngBytes], "event_poster.png", { type: "image/png" });

    const result = await processUploadFile(mockFile);

    expect(result.fileName).toBe("event_poster.png");
    expect(result.mimeType).toBe("image/png");
    expect(result.isMultimodalReady).toBe(true);
    expect(result.base64).toBeDefined();
    expect(result.base64!.length).toBeGreaterThan(0);
    expect(result.fileData?.inlineData.mimeType).toBe("image/png");
  });

  it("TEST 2: createEventFromPlan creates Event, all Speakers, and all Agenda Sessions with matching speaker links", () => {
    const store = useEventStore.getState();

    const plan: EventPlan = {
      name: "AI & Cloud Conclave 2026",
      type: "Conference",
      startDate: "2026-11-20",
      endDate: "2026-11-20",
      startTime: "09:30",
      endTime: "17:30",
      venue: "Tech Innovation Hub, Bangalore",
      description: "Extracted from event brochure photo: annual flagship AI and Cloud conference.",
      organizer: "Cloud Developer Community",
      expectedAudience: "400 attendees",
      people: [
        {
          name: "Dr. Arvind Rao",
          role: "Chief Guest",
          designation: "Principal AI Scientist",
          organization: "AI Labs India",
        },
        {
          name: "Meera Krishnan",
          role: "Speaker",
          designation: "VP of Engineering",
          organization: "NextGen Cloud",
        },
        {
          name: "Kabir Mehta",
          role: "Anchor",
          designation: "Stage Anchor & Emcee",
          organization: "Bangalore Stage Crew",
        },
      ],
      sessions: [
        {
          title: "Inaugural Welcome & Stage Address",
          type: "Opening",
          speakerName: "Kabir Mehta",
          duration: 30,
          startTime: "09:30",
          endTime: "10:00",
        },
        {
          title: "Keynote: The Generative Frontier",
          type: "Keynote",
          speakerName: "Dr. Arvind Rao",
          duration: 60,
          startTime: "10:00",
          endTime: "11:00",
        },
        {
          title: "Scaling Intelligent Cloud Infrastructures",
          type: "Talk",
          speakerName: "Meera Krishnan",
          duration: 75,
          startTime: "11:15",
          endTime: "12:30",
        },
        {
          title: "Closing Remarks & Felicitation",
          type: "Closing",
          speakerName: "Kabir Mehta",
          duration: 45,
          startTime: "16:45",
          endTime: "17:30",
        },
      ],
      scripts: [
        {
          role: "Anchor",
          targetName: "Kabir Mehta",
          scriptType: "Opening",
          content: "Welcome ladies and gentlemen to AI & Cloud Conclave 2026!",
        },
      ],
      invitation: {
        title: "AI & Cloud Conclave 2026",
        subtitle: "The Future of Distributed Intelligence",
        dateText: "November 20, 2026",
        timeText: "09:30 AM – 05:30 PM",
        venueText: "Tech Innovation Hub, Bangalore",
      },
    };

    const res = store.createEventFromPlan(plan);
    expect(res.ok).toBe(true);
    expect(res.eventId).toBeDefined();

    const state = useEventStore.getState();
    const event = state.events.find((e) => e.id === res.eventId);
    expect(event).toBeDefined();
    expect(event?.name).toBe("AI & Cloud Conclave 2026");
    expect(event?.venue).toBe("Tech Innovation Hub, Bangalore");

    // Verify all 3 speakers were created
    const eventSpeakers = state.speakers.filter((s) => s.eventId === res.eventId);
    expect(eventSpeakers.length).toBe(3);
    const arvind = eventSpeakers.find((s) => s.name === "Dr. Arvind Rao");
    expect(arvind).toBeDefined();
    expect(arvind?.organization).toBe("AI Labs India");

    // Verify all 4 agenda sessions were created with correct speaker linkages
    const eventSessions = state.sessions.filter((s) => s.eventId === res.eventId);
    expect(eventSessions.length).toBe(4);

    const keynote = eventSessions.find((s) => s.title.includes("Keynote"));
    expect(keynote).toBeDefined();
    expect(keynote?.speakerId).toBe(arvind?.id);
    expect(keynote?.startTime).toBe("10:00");
    expect(keynote?.endTime).toBe("11:00");

    // Verify scripts were also generated
    const scripts = state.scripts.filter((s) => s.eventId === res.eventId);
    expect(scripts.length).toBeGreaterThanOrEqual(1);
    expect(scripts[0].content).toContain("AI & Cloud Conclave 2026");
  });

  it("TEST 3: createEventFromPlan defaults missing venue safely without throwing errors", () => {
    const store = useEventStore.getState();

    const planWithoutVenue: EventPlan = {
      name: "Global Developer Stream 2026",
      type: "Workshop",
      startDate: "2026-12-01",
      endDate: "2026-12-01",
      startTime: "14:00",
      endTime: "18:00",
      venue: "", // Omitted on photo/flyer
      description: "Online developer workshop.",
      organizer: "Dev Community",
      expectedAudience: "1000 online",
      people: [
        {
          name: "Rohit Saxena",
          role: "Speaker",
          designation: "Lead Architect",
        },
      ],
      sessions: [
        {
          title: "Hands-on Workshop",
          type: "Workshop",
          duration: 240,
          startTime: "14:00",
          endTime: "18:00",
        },
      ],
    };

    const res = store.createEventFromPlan(planWithoutVenue);
    expect(res.ok).toBe(true);
    expect(res.eventId).toBeDefined();

    const event = useEventStore.getState().events.find((e) => e.id === res.eventId);
    expect(event?.venue).toBe("Main Auditorium / Venue TBA");
  });

  it("TEST 4: executeAIAction CREATE_EVENT with nested sessions and speakers delegates seamlessly to full creation", async () => {
    const store = useEventStore.getState();

    const action: AIAction = {
      id: "act_scan_poster_1",
      type: "CREATE_EVENT",
      description: "Create National Hackathon 2026 from Scanned Poster",
      requiresConfirmation: true,
      payload: {
        name: "National Hackathon 2026",
        type: "Hackathon",
        startDate: "2026-10-15",
        endDate: "2026-10-16",
        startTime: "10:00",
        endTime: "18:00",
        venue: "IIT Delhi Campus",
        description: "36-hour national innovation challenge.",
        organizer: "Tech Innovation Cell",
        people: [
          { name: "Dr. Sunita Rao", role: "Chief Guest", designation: "Dean of Research" },
          { name: "Aditya Roy", role: "Anchor", designation: "Student Lead" },
        ],
        sessions: [
          { title: "Opening Ceremony", type: "Opening", duration: 60, startTime: "10:00", endTime: "11:00" },
          { title: "Hackathon Pitching & Judging", type: "Competition", duration: 180, startTime: "14:00", endTime: "17:00" },
        ],
      },
    };

    const res = await store.executeAIAction(action);
    expect(res.success).toBe(true);
    expect(res.message).toContain("National Hackathon 2026");
    expect(res.message).toContain("2 agenda sessions");
    expect(res.message).toContain("2 speakers");

    const created = useEventStore.getState().events.find((e) => e.name === "National Hackathon 2026");
    expect(created).toBeDefined();

    const sessions = useEventStore.getState().sessions.filter((s) => s.eventId === created?.id);
    expect(sessions.length).toBe(2);

    const speakers = useEventStore.getState().speakers.filter((s) => s.eventId === created?.id);
    expect(speakers.length).toBe(2);
  });
});
