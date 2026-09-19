import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Firebase modular SDK to run tests in node without live credentials
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
import { EventPlan, AIAction, ScriptItem, InvitationRecord } from "@/types";

describe("StageX AI — Final AI Architecture Restructure Test Suite", () => {
  beforeEach(() => {
    const store = useEventStore.getState();
    store.resetAll();
    useEventStore.setState({ activeUserId: "test-user-123" });
  });

  it("TEST A: Global AI Copilot creates event from structured plan without prior event selected", () => {
    const store = useEventStore.getState();
    expect(store.events.length).toBe(0);
    expect(store.activeEventId).toBeNull();

    const plan: EventPlan = {
      name: "Ahmedabad Cultural Gala 2026",
      type: "Cultural Event",
      startDate: "2026-10-15",
      endDate: "2026-10-15",
      startTime: "19:00",
      endTime: "23:00",
      venue: "Gujarat University Convention Centre",
      description: "Grand annual student cultural celebration",
      organizer: "Cultural Council",
      expectedAudience: "500 attendees",
      people: [
        { name: "Rahul Dave", role: "Anchor", designation: "Lead Anchor" },
        { name: "Priya Patel", role: "Anchor", designation: "Co-Anchor" },
        { name: "Dr. B. K. Joshi", role: "Chief Guest", designation: "Principal" },
      ],
      sessions: [
        { title: "Inauguration & Lamp Lighting", type: "Opening", duration: 30, startTime: "19:00", endTime: "19:30" },
        { title: "Folk Dance Extravaganza", type: "Cultural Performance", duration: 45, startTime: "19:30", endTime: "20:15" },
        { title: "Awards & Vote of Thanks", type: "Closing", duration: 30, startTime: "20:15", endTime: "20:45" },
      ],
      scripts: [
        { role: "Anchor", scriptType: "Opening", content: "Welcome everyone to Ahmedabad Cultural Gala 2026!" },
      ],
      invitation: {
        title: "Ahmedabad Cultural Gala 2026",
        subtitle: "A Night of Music, Dance & Culture",
        theme: "luxury_gala",
      },
    };

    const res = store.createEventFromPlan(plan);
    expect(res.ok).toBe(true);
    expect(res.eventId).toBeDefined();

    const updatedState = useEventStore.getState();
    expect(updatedState.events.length).toBe(1);
    expect(updatedState.events[0].name).toBe("Ahmedabad Cultural Gala 2026");
    expect(updatedState.speakers.length).toBe(3);
    expect(updatedState.sessions.length).toBe(3);
    expect(updatedState.scripts.length).toBe(1);
    expect(updatedState.invitations.length).toBe(1);
  });

  it("TEST B: Global Copilot edits event by name via executeAIAction", async () => {
    const store = useEventStore.getState();
    const eventRes = store.createEvent({
      name: "Cultural Night 2026",
      type: "Cultural Event",
      venue: "Old Hall",
      startTime: "18:00",
      endTime: "22:00",
      date: "2026-11-20",
    });
    expect(eventRes.ok).toBe(true);
    const eventId = eventRes.eventId!;

    const action: AIAction = {
      id: "act_101",
      type: "UPDATE_EVENT",
      description: "Change venue to College Auditorium and start time to 20:00",
      requiresConfirmation: true,
      payload: {
        targetEventName: "Cultural Night 2026",
        updates: {
          venue: "College Auditorium",
          startTime: "20:00",
        },
      },
    };

    const actionRes = await store.executeAIAction(action);
    expect(actionRes.success).toBe(true);

    const updatedEvent = useEventStore.getState().events.find((e) => e.id === eventId);
    expect(updatedEvent?.venue).toBe("College Auditorium");
    expect(updatedEvent?.startTime).toBe("20:00");
  });

  it("TEST C: Global Copilot adds session via executeAIAction", async () => {
    const store = useEventStore.getState();
    const eventRes = store.createEvent({
      name: "TechFest 2026",
      type: "Hackathon",
      venue: "LDCE Campus",
      startTime: "09:00",
      endTime: "18:00",
      date: "2026-12-05",
    });
    const eventId = eventRes.eventId!;

    const action: AIAction = {
      id: "act_102",
      type: "CREATE_SESSION",
      description: "Add 30-minute DJ Session to TechFest 2026",
      requiresConfirmation: true,
      payload: {
        targetEventName: "TechFest 2026",
        title: "DJ Celebration Session",
        duration: 30,
        type: "Cultural Performance",
      },
    };

    const actionRes = await store.executeAIAction(action);
    expect(actionRes.success).toBe(true);

    const addedSession = useEventStore.getState().sessions.find((s) => s.title === "DJ Celebration Session");
    expect(addedSession).toBeDefined();
    expect(addedSession?.eventId).toBe(eventId);
    expect(addedSession?.duration).toBe(30);
  });

  it("TEST D: Scripts CRUD and categorization work independently per event", () => {
    const store = useEventStore.getState();
    const evA = store.createEvent({ name: "Event A", type: "Conference", venue: "Hall A", startTime: "10:00", endTime: "12:00", date: "2026-09-01" }).eventId!;
    const evB = store.createEvent({ name: "Event B", type: "Seminar", venue: "Hall B", startTime: "14:00", endTime: "16:00", date: "2026-09-02" }).eventId!;

    const scpRes = store.addScript({
      eventId: evA,
      title: "Anchor Opening Address",
      category: "anchor",
      scriptType: "Opening Address",
      content: "Ladies and gentlemen, welcome to Event A!",
    });
    expect(scpRes.ok).toBe(true);
    const scriptId = scpRes.scriptId!;

    let currentScripts = useEventStore.getState().scripts;
    expect(currentScripts.filter((s) => s.eventId === evA).length).toBe(1);
    expect(currentScripts.filter((s) => s.eventId === evB).length).toBe(0);

    // Update
    store.updateScript(scriptId, { editedContent: "Welcome to Event A, esteemed guests!" });
    const updated = useEventStore.getState().scripts.find((s) => s.id === scriptId);
    expect(updated?.editedContent).toBe("Welcome to Event A, esteemed guests!");

    // Delete
    store.deleteScript(scriptId);
    expect(useEventStore.getState().scripts.filter((s) => s.eventId === evA).length).toBe(0);
  });

  it("TEST E: Invitations CRUD works independently per event with rich themes", () => {
    const store = useEventStore.getState();
    const evA = store.createEvent({ name: "Gala Event", type: "Cultural Event", venue: "Grand Ballroom", startTime: "18:00", endTime: "22:00", date: "2026-10-10" }).eventId!;

    const invRes = store.addInvitation({
      eventId: evA,
      title: "Annual Grand Gala Invitation",
      theme: "luxury_gala",
      data: {
        title: "Annual Grand Gala Invitation",
        subtitle: "Honoring Excellence",
        dateText: "Saturday, October 10, 2026",
        timeText: "6:00 PM – 10:00 PM",
        venueText: "Grand Ballroom, Ahmedabad",
        theme: "luxury_gala",
      },
    });
    expect(invRes.ok).toBe(true);
    const invId = invRes.invitationId!;

    let currentInvs = useEventStore.getState().invitations;
    expect(currentInvs.length).toBe(1);
    expect(currentInvs[0].theme).toBe("luxury_gala");

    // Update
    store.updateInvitation(invId, { theme: "bold_modern" });
    expect(useEventStore.getState().invitations.find((i) => i.id === invId)?.theme).toBe("bold_modern");

    // Delete
    store.deleteInvitation(invId);
    expect(useEventStore.getState().invitations.length).toBe(0);
  });

  it("TEST F: Multiple live events coexist independently without state interference", () => {
    const store = useEventStore.getState();
    const ev1 = store.createEvent({ name: "Live Event 1", type: "Conference", venue: "Hall 1", startTime: "10:00", endTime: "12:00", date: "2026-09-19" }).eventId!;
    const ev2 = store.createEvent({ name: "Live Event 2", type: "Workshop", venue: "Hall 2", startTime: "10:00", endTime: "12:00", date: "2026-09-19" }).eventId!;

    const s1 = store.addSession({ eventId: ev1, title: "Session 1A", type: "Talk", duration: 30, startTime: "10:00", endTime: "10:30", sessionDate: "2026-09-19", status: "Upcoming", isFixedTime: false, speakerId: null }).sessionId!;
    const s2 = store.addSession({ eventId: ev2, title: "Session 2A", type: "Workshop", duration: 30, startTime: "10:00", endTime: "10:30", sessionDate: "2026-09-19", status: "Upcoming", isFixedTime: false, speakerId: null }).sessionId!;

    // Make both sessions Live
    store.startSession(s1);
    store.startSession(s2);

    const activeSessions = useEventStore.getState().sessions.filter((s) => s.status === "Live");
    expect(activeSessions.length).toBe(2);

    // Apply delay to Event 1
    store.commitDelay(s1, 15, "Speaker late");

    // Event 2 remains unmodified
    const stateAfterDelay = useEventStore.getState();
    const delaysEv2 = stateAfterDelay.delays.filter((d) => d.eventId === ev2);
    expect(delaysEv2.length).toBe(0);
  });
});
