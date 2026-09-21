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

import { useEventStore, generateAccessCode } from "@/store/event-store";
import { findEventByAccessCode, findEventByAccessCodeAsync, registerPublicEvent, unregisterPublicEvent } from "@/lib/events-registry";

describe("Past Events, Resources & Audience Access Code System", () => {
  beforeEach(() => {
    useEventStore.getState().clearState();
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("generates a valid 6-character uppercase alphanumeric access code", () => {
    const code = generateAccessCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("automatically assigns a 6-character accessCode when creating an event", () => {
    const res = useEventStore.getState().createEvent({
      name: "Global Tech Summit 2026",
      type: "Conference",
      startDate: "2026-10-15",
      endDate: "2026-10-15",
      date: "2026-10-15",
      startTime: "09:00",
      endTime: "18:00",
      venue: "Grand Convention Center",
    });

    expect(res.ok).toBe(true);
    expect(res.eventId).toBeDefined();

    const ev = useEventStore.getState().events.find((e) => e.id === res.eventId);
    expect(ev).toBeDefined();
    expect(ev?.accessCode).toBeDefined();
    expect(ev?.accessCode).toHaveLength(6);
    expect(ev?.resources).toEqual([]);
  });

  it("creates a new event with status Scheduled and appears in active events list", () => {
    const res = useEventStore.getState().createEvent({
      name: "New Tech Summit",
      type: "Conference",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      date: "2026-11-01",
      startTime: "09:00",
      endTime: "17:00",
      venue: "Grand Hall",
    });

    expect(res.ok).toBe(true);
    const ev = useEventStore.getState().events.find((e) => e.id === res.eventId);
    expect(ev?.status).toBe("Scheduled");
    expect(ev?.endedAt).toBeUndefined();

    // Verify it is in active events filter
    const isEventEnded = (e: { status?: string; endedAt?: number | null }) => e.status === "Completed" || Boolean(e.endedAt);
    const activeEvents = useEventStore.getState().events.filter((e) => !isEventEnded(e));
    expect(activeEvents.some((e) => e.id === res.eventId)).toBe(true);
  });

  it("endEventAndArchive sets status to Completed and marks endedAt", () => {
    const res = useEventStore.getState().createEvent({
      name: "AI Hackathon Finale",
      type: "Hackathon",
      startDate: "2026-10-16",
      endDate: "2026-10-16",
      date: "2026-10-16",
      startTime: "10:00",
      endTime: "20:00",
      venue: "Tech Park Auditorium",
    });
    const eventId = res.eventId!;

    // Start live
    useEventStore.getState().startLiveEvent(eventId);
    expect(useEventStore.getState().liveEventIds).toContain(eventId);

    // End and Archive
    const archiveRes = useEventStore.getState().endEventAndArchive(eventId);
    expect(archiveRes.ok).toBe(true);

    const updated = useEventStore.getState().events.find((e) => e.id === eventId);
    expect(updated?.status).toBe("Completed");
    expect(updated?.endedAt).toBeTypeOf("number");
    expect(useEventStore.getState().liveEventIds).not.toContain(eventId);
  });

  it("attaches video, PPT, and script resources including device upload metadata", () => {
    const res = useEventStore.getState().createEvent({
      name: "Design Workshop",
      type: "Workshop",
      startDate: "2026-10-17",
      endDate: "2026-10-17",
      date: "2026-10-17",
      startTime: "11:00",
      endTime: "13:00",
      venue: "Studio B",
    });
    const eventId = res.eventId!;

    // Add Video from device
    const vidRes = useEventStore.getState().addEventResource(eventId, {
      type: "video",
      title: "Keynote Recording",
      url: "file_stored_id_123",
      isLocalFile: true,
      fileName: "keynote.mp4",
      fileSize: 10485760,
      fileMimeType: "video/mp4",
      author: "Sarah Connor",
    });
    expect(vidRes.ok).toBe(true);

    // Add PPT
    const pptRes = useEventStore.getState().addEventResource(eventId, {
      type: "ppt",
      title: "Master Deck",
      url: "https://docs.google.com/presentation/d/xyz",
      description: "Includes Q&A slides",
    });
    expect(pptRes.ok).toBe(true);

    // Add Script
    const scrRes = useEventStore.getState().addEventResource(eventId, {
      type: "script",
      title: "Emcee Opening Script",
      url: "Welcome everyone to StageX Workshop!",
      author: "Host",
    });
    expect(scrRes.ok).toBe(true);

    const ev = useEventStore.getState().events.find((e) => e.id === eventId);
    expect(ev?.resources).toHaveLength(3);
    expect(ev?.resources?.[0].type).toBe("video");
    expect(ev?.resources?.[0].isLocalFile).toBe(true);
    expect(ev?.resources?.[0].fileName).toBe("keynote.mp4");
    expect(ev?.resources?.[1].type).toBe("ppt");
    expect(ev?.resources?.[2].type).toBe("script");
  });

  it("deletes resources cleanly from event", () => {
    const res = useEventStore.getState().createEvent({
      name: "Music Fest",
      type: "Cultural Event",
      startDate: "2026-10-18",
      endDate: "2026-10-18",
      date: "2026-10-18",
      startTime: "18:00",
      endTime: "22:00",
      venue: "Main Amphitheater",
    });
    const eventId = res.eventId!;

    const addRes = useEventStore.getState().addEventResource(eventId, {
      type: "video",
      title: "Opening Song",
      url: "https://youtube.com/watch?v=sample",
    });
    const resourceId = addRes.resourceId!;

    expect(useEventStore.getState().events.find((e) => e.id === eventId)?.resources).toHaveLength(1);

    const delRes = useEventStore.getState().deleteEventResource(eventId, resourceId);
    expect(delRes.ok).toBe(true);
    expect(useEventStore.getState().events.find((e) => e.id === eventId)?.resources).toHaveLength(0);
  });

  it("findEventByAccessCode resolves valid code and returns null for wrong code", () => {
    const res = useEventStore.getState().createEvent({
      name: "Startup Pitch Day",
      type: "Competition",
      startDate: "2026-10-19",
      endDate: "2026-10-19",
      date: "2026-10-19",
      startTime: "14:00",
      endTime: "18:00",
      venue: "Incubator Hub",
    });
    const ev = useEventStore.getState().events.find((e) => e.id === res.eventId)!;
    const correctCode = ev.accessCode!;

    // Register in public registry
    registerPublicEvent(ev);

    // 1. Sahi code -> returns event bundle
    const found = findEventByAccessCode(correctCode, useEventStore.getState().events);
    expect(found).not.toBeNull();
    expect(found?.event.name).toBe("Startup Pitch Day");
    expect(found?.event.id).toBe(ev.id);

    // 2. Case-insensitivity test
    const foundLower = findEventByAccessCode(correctCode.toLowerCase(), useEventStore.getState().events);
    expect(foundLower).not.toBeNull();
    expect(foundLower?.event.id).toBe(ev.id);

    // 3. Wrong code -> returns null (not found)
    const wrong = findEventByAccessCode("WRONG9", useEventStore.getState().events);
    expect(wrong).toBeNull();

    const shortCode = findEventByAccessCode("ABC", useEventStore.getState().events);
    expect(shortCode).toBeNull();
  });

  it("findEventByAccessCodeAsync resolves valid code asynchronously and unregisters on delete", async () => {
    const res = useEventStore.getState().createEvent({
      name: "Global Tech Summit",
      type: "Conference",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
      date: "2026-11-01",
      startTime: "10:00",
      endTime: "18:00",
      venue: "Convention Center",
    });
    const ev = useEventStore.getState().events.find((e) => e.id === res.eventId)!;
    const code = ev.accessCode!;

    // 1. Resolves asynchronously across sessions
    const asyncFound = await findEventByAccessCodeAsync(code, useEventStore.getState().events);
    expect(asyncFound).not.toBeNull();
    expect(asyncFound?.event.name).toBe("Global Tech Summit");

    // 2. Unregister public event
    unregisterPublicEvent(code);
    useEventStore.getState().clearState();

    const afterUnregister = await findEventByAccessCodeAsync(code, []);
    expect(afterUnregister).toBeNull();
  });

  it("strictly prevents restarting an archived event via startLiveEvent", () => {
    const res = useEventStore.getState().createEvent({
      name: "Past Conference 2026",
      type: "Conference",
      startDate: "2026-10-20",
      endDate: "2026-10-20",
      date: "2026-10-20",
      startTime: "09:00",
      endTime: "17:00",
      venue: "Hall A",
    });
    const eventId = res.eventId!;

    // Archive the event
    const arch = useEventStore.getState().endEventAndArchive(eventId);
    expect(arch.ok).toBe(true);

    // Attempt to start live
    const restartRes = useEventStore.getState().startLiveEvent(eventId);
    expect(restartRes.ok).toBe(false);
    expect(restartRes.error).toBe("Archived past events cannot be restarted.");
    expect(useEventStore.getState().isEventLive(eventId)).toBe(false);
  });

  it("strictly prevents reactivating an archived event via updateEvent status change", () => {
    const res = useEventStore.getState().createEvent({
      name: "Concluded Seminar",
      type: "Seminar",
      startDate: "2026-10-21",
      endDate: "2026-10-21",
      date: "2026-10-21",
      startTime: "10:00",
      endTime: "12:00",
      venue: "Room 101",
    });
    const eventId = res.eventId!;
    useEventStore.getState().endEventAndArchive(eventId);

    // Attempt to set status back to Live or Scheduled
    const updateLive = useEventStore.getState().updateEvent(eventId, { status: "Live" });
    expect(updateLive.ok).toBe(false);
    expect(updateLive.error).toContain("Archived past events cannot be restarted");

    const updateSched = useEventStore.getState().updateEvent(eventId, { status: "Scheduled" });
    expect(updateSched.ok).toBe(false);
    expect(updateSched.error).toContain("Archived past events cannot be restarted");

    const ev = useEventStore.getState().events.find((e) => e.id === eventId);
    expect(ev?.status).toBe("Completed");
  });

  it("strictly prevents starting sessions belonging to an archived event", () => {
    const res = useEventStore.getState().createEvent({
      name: "Annual Gala",
      type: "Cultural Event",
      startDate: "2026-10-22",
      endDate: "2026-10-22",
      date: "2026-10-22",
      startTime: "18:00",
      endTime: "21:00",
      venue: "Grand Ballroom",
    });
    const eventId = res.eventId!;

    const sesRes = useEventStore.getState().addSession({
      eventId,
      title: "Closing Dinner",
      startTime: "19:00",
      endTime: "20:00",
      duration: 60,
      type: "Closing",
      status: "Upcoming",
      speakerId: null,
      sessionDate: "2026-10-22",
      isFixedTime: false,
    });
    const sessionId = sesRes.sessionId!;

    // Archive the event
    useEventStore.getState().endEventAndArchive(eventId);

    // Attempt to start session
    const startRes = useEventStore.getState().startSession(sessionId);
    expect(startRes.ok).toBe(false);
    expect(startRes.error).toBe("Cannot start sessions for an archived past event.");
  });

  it("automatically reassigns activeEventId and rejects selecting ended events", () => {
    const res1 = useEventStore.getState().createEvent({
      name: "Event Alpha",
      type: "Conference",
      startDate: "2026-10-23",
      endDate: "2026-10-23",
      date: "2026-10-23",
      startTime: "09:00",
      endTime: "12:00",
      venue: "Hall 1",
    });
    const res2 = useEventStore.getState().createEvent({
      name: "Event Beta",
      type: "Workshop",
      startDate: "2026-10-23",
      endDate: "2026-10-23",
      date: "2026-10-23",
      startTime: "13:00",
      endTime: "17:00",
      venue: "Hall 2",
    });

    const id1 = res1.eventId!;
    const id2 = res2.eventId!;

    // Set active event to Event Alpha
    useEventStore.getState().setActiveEvent(id1);
    expect(useEventStore.getState().activeEventId).toBe(id1);

    // End Event Alpha -> activeEventId should cleanly switch to Event Beta
    useEventStore.getState().endEventAndArchive(id1);
    expect(useEventStore.getState().activeEventId).toBe(id2);

    // Attempt to manually select ended Event Alpha
    useEventStore.getState().setActiveEvent(id1);
    expect(useEventStore.getState().activeEventId).toBe(id2); // Still id2, not id1!

    useEventStore.getState().setSelectedEvent(id1);
    expect(useEventStore.getState().selectedEventId).toBe(id2); // Still id2, not id1!
  });
});
