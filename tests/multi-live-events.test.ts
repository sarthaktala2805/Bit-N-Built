import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Firebase modular SDK to run unit tests in node without live credentials
vi.mock("@/lib/firebase", () => ({
  db: { _mockDb: true },
  auth: { currentUser: null },
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
  setDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  writeBatch: vi.fn().mockReturnValue({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { useEventStore } from "@/store/event-store";
import { buildGlobalAIContext } from "@/lib/ai-context";

describe("StageX AI — Multi-Live Simultaneous Events Architecture", () => {
  beforeEach(() => {
    useEventStore.getState().clearState();
  });

  it("supports multiple events in LIVE state simultaneously without deactivating each other", () => {
    const store = useEventStore.getState();

    // 1. Create three distinct events
    const resA = store.createEvent({
      name: "Tech Summit 2026",
      type: "Conference",
      date: "2026-09-20",
      venue: "Hall A",
      startTime: "09:00",
      endTime: "17:00",
    });
    const resB = store.createEvent({
      name: "AI Hackathon",
      type: "Hackathon",
      date: "2026-09-20",
      venue: "Hall B",
      startTime: "10:00",
      endTime: "18:00",
    });
    const resC = store.createEvent({
      name: "Design Workshop",
      type: "Workshop",
      date: "2026-09-20",
      venue: "Lab C",
      startTime: "11:00",
      endTime: "15:00",
    });

    const eventAId = resA.eventId!;
    const eventBId = resB.eventId!;
    const eventCId = resC.eventId!;

    expect(eventAId).toBeDefined();
    expect(eventBId).toBeDefined();
    expect(eventCId).toBeDefined();

    // Initially none are live
    expect(useEventStore.getState().isEventLive(eventAId)).toBe(false);
    expect(useEventStore.getState().isEventLive(eventBId)).toBe(false);
    expect(useEventStore.getState().isEventLive(eventCId)).toBe(false);

    // Step 1: Make Event A LIVE
    const liveResA = useEventStore.getState().startLiveEvent(eventAId);
    expect(liveResA.ok).toBe(true);

    expect(useEventStore.getState().isEventLive(eventAId)).toBe(true);
    expect(useEventStore.getState().isEventLive(eventBId)).toBe(false);
    expect(useEventStore.getState().isEventLive(eventCId)).toBe(false);

    // Step 2: Make Event B LIVE
    const liveResB = useEventStore.getState().startLiveEvent(eventBId);
    expect(liveResB.ok).toBe(true);

    // CRITICAL: Event A must STILL be LIVE when Event B becomes LIVE!
    expect(useEventStore.getState().isEventLive(eventAId)).toBe(true);
    expect(useEventStore.getState().isEventLive(eventBId)).toBe(true);
    expect(useEventStore.getState().isEventLive(eventCId)).toBe(false);

    // Step 3: Make Event C LIVE
    const liveResC = useEventStore.getState().startLiveEvent(eventCId);
    expect(liveResC.ok).toBe(true);

    // All three are now LIVE simultaneously
    expect(useEventStore.getState().isEventLive(eventAId)).toBe(true);
    expect(useEventStore.getState().isEventLive(eventBId)).toBe(true);
    expect(useEventStore.getState().isEventLive(eventCId)).toBe(true);
    expect(useEventStore.getState().liveEventIds).toContain(eventAId);
    expect(useEventStore.getState().liveEventIds).toContain(eventBId);
    expect(useEventStore.getState().liveEventIds).toContain(eventCId);

    // Step 4: Stop Event B
    const stopResB = useEventStore.getState().stopLiveEvent(eventBId);
    expect(stopResB.ok).toBe(true);

    // Only Event B stopped; Event A and Event C remain LIVE
    expect(useEventStore.getState().isEventLive(eventAId)).toBe(true);
    expect(useEventStore.getState().isEventLive(eventBId)).toBe(false);
    expect(useEventStore.getState().isEventLive(eventCId)).toBe(true);
  });

  it("changing selectedEventId in UI navigation does not affect live status", () => {
    const store = useEventStore.getState();

    const resA = store.createEvent({
      name: "Event Alpha",
      type: "Seminar",
      date: "2026-09-20",
      venue: "Auditorium",
      startTime: "09:00",
      endTime: "12:00",
    });
    const resB = store.createEvent({
      name: "Event Beta",
      type: "Workshop",
      date: "2026-09-20",
      venue: "Room 101",
      startTime: "13:00",
      endTime: "16:00",
    });

    const eventAId = resA.eventId!;
    const eventBId = resB.eventId!;

    // Make Event A live
    store.startLiveEvent(eventAId);
    expect(useEventStore.getState().isEventLive(eventAId)).toBe(true);

    // User navigates and selects Event B in dropdown/sidebar
    useEventStore.getState().setSelectedEvent(eventBId);
    expect(useEventStore.getState().selectedEventId).toBe(eventBId);

    // Event A MUST remain live!
    expect(useEventStore.getState().isEventLive(eventAId)).toBe(true);
    expect(useEventStore.getState().isEventLive(eventBId)).toBe(false);

    // User navigates back to Event A
    useEventStore.getState().setSelectedEvent(eventAId);
    expect(useEventStore.getState().selectedEventId).toBe(eventAId);
    expect(useEventStore.getState().isEventLive(eventAId)).toBe(true);
  });

  it("schedule delays in Event A do not affect Event B or Event C schedules", () => {
    const store = useEventStore.getState();

    const resA = store.createEvent({
      name: "Event A",
      type: "Conference",
      date: "2026-09-20",
      venue: "Hall 1",
      startTime: "09:00",
      endTime: "12:00",
    });
    const resB = store.createEvent({
      name: "Event B",
      type: "Conference",
      date: "2026-09-20",
      venue: "Hall 2",
      startTime: "09:00",
      endTime: "12:00",
    });

    const eventAId = resA.eventId!;
    const eventBId = resB.eventId!;

    // Add session to Event A
    const sesARes = store.addSession({
      eventId: eventAId,
      title: "Keynote A",
      sessionDate: "2026-09-20",
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      type: "Keynote",
      status: "Scheduled",
      isFixedTime: false,
    });
    const sesAId = sesARes.sessionId!;

    // Add session to Event B
    const sesBRes = store.addSession({
      eventId: eventBId,
      title: "Keynote B",
      sessionDate: "2026-09-20",
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      type: "Keynote",
      status: "Scheduled",
      isFixedTime: false,
    });
    const sesBId = sesBRes.sessionId!;

    // Commit a +15 minute delay on Event A's session
    const delayRes = store.commitDelay(sesAId, 15, "Speaker traffic delay");
    expect(delayRes.ok).toBe(true);

    const updatedSessions = useEventStore.getState().sessions;
    const sessionA = updatedSessions.find((s) => s.id === sesAId)!;
    const sessionB = updatedSessions.find((s) => s.id === sesBId)!;

    // Session A is delayed by 15 min
    expect(sessionA.startTime).toBe("09:15");
    expect(sessionA.endTime).toBe("10:15");

    // Session B is completely UNCHANGED
    expect(sessionB.startTime).toBe("09:00");
    expect(sessionB.endTime).toBe("10:00");

    // Delays are event-scoped
    const delays = useEventStore.getState().delays;
    expect(delays.filter((d) => d.eventId === eventAId)).toHaveLength(1);
    expect(delays.filter((d) => d.eventId === eventBId)).toHaveLength(0);
  });

  it("emergencies in Event A remain strictly scoped to Event A", () => {
    const store = useEventStore.getState();

    const resA = store.createEvent({
      name: "Event A",
      type: "Conference",
      date: "2026-09-20",
      venue: "Hall 1",
      startTime: "09:00",
      endTime: "12:00",
    });
    const resB = store.createEvent({
      name: "Event B",
      type: "Conference",
      date: "2026-09-20",
      venue: "Hall 2",
      startTime: "09:00",
      endTime: "12:00",
    });

    const eventAId = resA.eventId!;
    const eventBId = resB.eventId!;

    // Trigger emergency on Event A
    const emgRes = store.activateEmergency("Microphone Issue", "Main wireless mic dead", eventAId);
    expect(emgRes.ok).toBe(true);

    const emergencies = useEventStore.getState().emergencies;
    const emgA = emergencies.filter((e) => e.eventId === eventAId && !e.resolved);
    const emgB = emergencies.filter((e) => e.eventId === eventBId && !e.resolved);

    expect(emgA).toHaveLength(1);
    expect(emgB).toHaveLength(0);
  });

  it("session operational controls in Event A do not alter Event B sessions", () => {
    const store = useEventStore.getState();

    const resA = store.createEvent({
      name: "Event A",
      type: "Conference",
      date: "2026-09-20",
      venue: "Hall 1",
      startTime: "09:00",
      endTime: "12:00",
    });
    const resB = store.createEvent({
      name: "Event B",
      type: "Conference",
      date: "2026-09-20",
      venue: "Hall 2",
      startTime: "09:00",
      endTime: "12:00",
    });

    const eventAId = resA.eventId!;
    const eventBId = resB.eventId!;

    const sesARes = store.addSession({
      eventId: eventAId,
      title: "Session A1",
      sessionDate: "2026-09-20",
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      type: "Keynote",
      status: "Scheduled",
      isFixedTime: false,
    });
    const sesBRes = store.addSession({
      eventId: eventBId,
      title: "Session B1",
      sessionDate: "2026-09-20",
      startTime: "09:00",
      endTime: "10:00",
      duration: 60,
      type: "Keynote",
      status: "Scheduled",
      isFixedTime: false,
    });

    const sesAId = sesARes.sessionId!;
    const sesBId = sesBRes.sessionId!;

    // Start Session A1
    const startRes = store.startSession(sesAId);
    expect(startRes.ok).toBe(true);

    const sA = useEventStore.getState().sessions.find((s) => s.id === sesAId)!;
    const sB = useEventStore.getState().sessions.find((s) => s.id === sesBId)!;

    expect(sA.status).toBe("Live");
    expect(sB.status).toBe("Scheduled");

    // Event A is live because its session is live
    expect(useEventStore.getState().isEventLive(eventAId)).toBe(true);
    expect(useEventStore.getState().isEventLive(eventBId)).toBe(false);

    // Complete Session A1
    const compRes = store.completeSession(sesAId);
    expect(compRes.ok).toBe(true);

    const sA2 = useEventStore.getState().sessions.find((s) => s.id === sesAId)!;
    const sB2 = useEventStore.getState().sessions.find((s) => s.id === sesBId)!;

    expect(sA2.status).toBe("Completed");
    expect(sB2.status).toBe("Scheduled");
  });

  it("Global AI context accurately detects multiple simultaneous live events", () => {
    const store = useEventStore.getState();

    const resA = store.createEvent({
      name: "Global AI Summit",
      type: "Conference",
      date: "2026-09-20",
      venue: "Main Stage",
      startTime: "09:00",
      endTime: "17:00",
    });
    const resB = store.createEvent({
      name: "Hackathon Finals",
      type: "Hackathon",
      date: "2026-09-20",
      venue: "Innovation Arena",
      startTime: "09:00",
      endTime: "17:00",
    });
    const resC = store.createEvent({
      name: "Networking Evening",
      type: "Other",
      date: "2026-09-20",
      venue: "Sky Lounge",
      startTime: "18:00",
      endTime: "21:00",
    });

    const eventAId = resA.eventId!;
    const eventBId = resB.eventId!;
    const eventCId = resC.eventId!;

    // Mark Event A and Event B live
    store.startLiveEvent(eventAId);
    store.startLiveEvent(eventBId);

    const state = useEventStore.getState();
    const aiContext = buildGlobalAIContext({
      events: state.events,
      sessions: state.sessions,
      speakers: state.speakers,
      delays: state.delays,
      emergencies: state.emergencies,
      userPrompt: "Which events are live right now?",
    });

    expect(aiContext.liveEvents).toHaveLength(2);
    const liveNames = aiContext.liveEvents.map((e) => e.name);
    expect(liveNames).toContain("Global AI Summit");
    expect(liveNames).toContain("Hackathon Finals");
    expect(liveNames).not.toContain("Networking Evening");
  });
});
