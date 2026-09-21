import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Firebase modular SDK
vi.mock("@/lib/firebase", () => ({
  db: { _mockDb: true },
  auth: { currentUser: null },
  isFirebaseConfigured: () => true,
  getFirebaseDb: () => ({ _mockDb: true }),
}));

const mockPublicStore: Record<string, Record<string, unknown>> = {};

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, col, id) => ({ _path: `${col}/${id}`, id, col })),
  getDoc: vi.fn(async (docRef) => {
    const data = mockPublicStore[docRef.id];
    return {
      exists: () => Boolean(data),
      data: () => data || null,
    };
  }),
  setDoc: vi.fn(async (docRef, payload) => {
    mockPublicStore[docRef.id] = payload;
  }),
  deleteDoc: vi.fn(async (docRef) => {
    delete mockPublicStore[docRef.id];
  }),
  getDocs: vi.fn().mockResolvedValue({ forEach: vi.fn() }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  writeBatch: vi.fn().mockReturnValue({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  }),
  onSnapshot: vi.fn(),
  query: vi.fn(),
}));

import { useEventStore } from "@/store/event-store";
import {
  findEventByAccessCode,
  findEventByAccessCodeAsync,
  registerPublicEvent,
  unregisterPublicEvent,
} from "@/lib/events-registry";
import { normalizeEventCode } from "@/lib/event-code";

describe("StageX AI — Cross-Account / Global Event Code Join System", () => {
  beforeEach(() => {
    useEventStore.getState().clearState();
    for (const key of Object.keys(mockPublicStore)) {
      delete mockPublicStore[key];
    }
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("ORGANIZER A creates an event; AUDIENCE B resolves it by global code (ownerUid != audienceUid)", async () => {
    // 1. Organizer Account A logs in
    useEventStore.setState({ activeUserId: "organizer-uid-account-a" });

    const createRes = useEventStore.getState().createEvent({
      name: "Global AI Summit 2026",
      type: "Conference",
      startDate: "2026-10-15",
      endDate: "2026-10-15",
      date: "2026-10-15",
      startTime: "09:00",
      endTime: "18:00",
      venue: "Grand Convention Hall",
      accessCode: "SUMM26",
    });

    expect(createRes.ok).toBe(true);
    const eventA = useEventStore.getState().events.find((e) => e.id === createRes.eventId)!;
    expect(eventA).toBeDefined();
    expect(eventA.accessCode).toBe("SUMM26");
    expect(eventA.ownerUserId).toBe("organizer-uid-account-a");

    // 2. Add agenda and speakers as Organizer A
    const spkRes = useEventStore.getState().addSpeaker({
      eventId: eventA.id,
      name: "Dr. Elena Rostova",
      designation: "Chief AI Scientist",
      organization: "Neural Core Labs",
    });
    expect(spkRes.ok).toBe(true);

    const sesRes = useEventStore.getState().addSession({
      eventId: eventA.id,
      title: "Opening Keynote: Next-Gen Autonomous Systems",
      type: "Keynote",
      speakerId: spkRes.speakerId!,
      sessionDate: "2026-10-15",
      startTime: "09:30",
      endTime: "10:30",
      isFixedTime: true,
    });
    expect(sesRes.ok).toBe(true);

    // 3. Organizer copies the generated event code and share link
    const persistedCode = eventA.accessCode!;
    const shareLink = `/audience?code=${persistedCode}`;
    expect(shareLink).toBe("/audience?code=SUMM26");

    // 4. Completely switch session to AUDIENCE B (different account, different events in store)
    useEventStore.getState().clearState();
    useEventStore.setState({ activeUserId: "audience-uid-account-b", events: [] });
    expect(useEventStore.getState().events).toHaveLength(0);

    // 5. Audience B enters the event code (case-insensitive with whitespace)
    const audienceInput = "  summ26  ";
    const normalizedInput = normalizeEventCode(audienceInput);
    expect(normalizedInput).toBe("SUMM26");

    // 6. Global event code lookup resolves Organizer A's event
    const resolvedBundle = await findEventByAccessCodeAsync(normalizedInput);
    expect(resolvedBundle).not.toBeNull();
    expect(resolvedBundle?.event.name).toBe("Global AI Summit 2026");
    expect(resolvedBundle?.event.id).toBe(eventA.id);
    expect(resolvedBundle?.ownerUserId).toBe("organizer-uid-account-a");
    expect(resolvedBundle?.speakers.some((s) => s.name === "Dr. Elena Rostova")).toBe(true);
    expect(resolvedBundle?.sessions.some((s) => s.title.includes("Opening Keynote"))).toBe(true);
  });

  it("Multiple Organizers & Events Isolation: Code A resolves ONLY Event A, Code B resolves ONLY Event B", async () => {
    // Organizer A creates Event A
    useEventStore.setState({ activeUserId: "organizer-alpha" });
    const resA = useEventStore.getState().createEvent({
      name: "DevOps World 2026",
      type: "Workshop",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      date: "2026-11-01",
      startTime: "10:00",
      endTime: "16:00",
      venue: "Tech Center Alpha",
      accessCode: "DEVOP1",
    });

    // Organizer B creates Event B
    useEventStore.setState({ activeUserId: "organizer-beta" });
    const resB = useEventStore.getState().createEvent({
      name: "FinTech Expo 2026",
      type: "Conference",
      startDate: "2026-11-05",
      endDate: "2026-11-05",
      date: "2026-11-05",
      startTime: "09:00",
      endTime: "17:00",
      venue: "Financial Plaza Beta",
      accessCode: "FINEX2",
    });

    // Switch to anonymous guest attendee
    useEventStore.getState().clearState();
    useEventStore.setState({ activeUserId: null, events: [] });

    // Lookup Code A -> Only Event A
    const foundA = await findEventByAccessCodeAsync("DEVOP1");
    expect(foundA?.event.id).toBe(resA.eventId);
    expect(foundA?.event.name).toBe("DevOps World 2026");

    // Lookup Code B -> Only Event B
    const foundB = await findEventByAccessCodeAsync("FINEX2");
    expect(foundB?.event.id).toBe(resB.eventId);
    expect(foundB?.event.name).toBe("FinTech Expo 2026");

    // Invalid Code -> Returns null (No fallback to first or active event)
    const invalid = await findEventByAccessCodeAsync("NOCODE");
    expect(invalid).toBeNull();
  });

  it("Public Directory Security: Private organizer logs, emergency alerts, and AI notes are not in public document", async () => {
    useEventStore.setState({ activeUserId: "organizer-security-test" });

    const createRes = useEventStore.getState().createEvent({
      name: "Cybersecurity Symposium",
      type: "Seminar",
      startDate: "2026-12-01",
      endDate: "2026-12-01",
      date: "2026-12-01",
      startTime: "09:00",
      endTime: "17:00",
      venue: "Security Dome",
      accessCode: "CYBER9",
    });

    // Add private emergency and private activity log in store
    useEventStore.setState({
      emergencies: [
        {
          id: "emg-1",
          eventId: createRes.eventId!,
          type: "Medical Emergency",
          severity: "High",
          status: "Active",
          actionTaken: "Paramedics called to backstage",
          timestamp: Date.now(),
        },
      ],
      activityLogs: [
        {
          id: "log-1",
          eventId: createRes.eventId!,
          type: "event_created",
          message: "Internal organizer log with confidential staff notes",
          timestamp: Date.now(),
        },
      ],
    });

    const publicDoc = mockPublicStore["CYBER9"];
    expect(publicDoc).toBeDefined();

    // Verify private collections/fields are absent from public directory
    expect(publicDoc.emergencies).toBeUndefined();
    expect(publicDoc.activityLogs).toBeUndefined();
    expect(publicDoc.aiRecords).toBeUndefined();
    expect(publicDoc.scripts).toBeUndefined(); // Private organizer scripts are never exposed in public directory
    expect(publicDoc.resources).toBeDefined(); // Only published public resources are exposed
  });

  it("Conceals event when publicEnabled is false (does not leak private event existence)", async () => {
    useEventStore.setState({ activeUserId: "organizer-private" });

    useEventStore.getState().createEvent({
      name: "Private Board Meeting",
      type: "Other",
      startDate: "2026-10-25",
      endDate: "2026-10-25",
      date: "2026-10-25",
      startTime: "11:00",
      endTime: "13:00",
      venue: "Executive Suite",
      accessCode: "BOARD1",
      publicEnabled: false,
    });

    // Set publicEnabled = false in public directory record
    if (mockPublicStore["BOARD1"]) {
      mockPublicStore["BOARD1"].publicEnabled = false;
    }

    // Switch to external audience user
    useEventStore.getState().clearState();

    const lookupResult = await findEventByAccessCodeAsync("BOARD1");
    expect(lookupResult).toBeNull();
  });

  it("Correctly indicates when joinEnabled is false", async () => {
    useEventStore.setState({ activeUserId: "organizer-nojoin" });

    useEventStore.getState().createEvent({
      name: "Capacity Full Keynote",
      type: "Conference",
      startDate: "2026-10-30",
      endDate: "2026-10-30",
      date: "2026-10-30",
      startTime: "10:00",
      endTime: "12:00",
      venue: "Main Hall",
      accessCode: "FULL01",
      joinEnabled: false,
    });

    // Switch to attendee
    useEventStore.getState().clearState();

    const lookupResult = await findEventByAccessCodeAsync("FULL01");
    expect(lookupResult).not.toBeNull();
    expect(lookupResult?.joinEnabled).toBe(false);
  });

  it("Unregisters public event when event is deleted", async () => {
    useEventStore.setState({ activeUserId: "organizer-del" });

    const res = useEventStore.getState().createEvent({
      name: "Temporary Pop-up",
      type: "Cultural Event",
      startDate: "2026-11-10",
      endDate: "2026-11-10",
      date: "2026-11-10",
      startTime: "12:00",
      endTime: "18:00",
      venue: "Open Grounds",
      accessCode: "POPUP1",
    });

    expect(mockPublicStore["POPUP1"]).toBeDefined();

    // Delete event
    useEventStore.getState().deleteEvent(res.eventId!);
    expect(mockPublicStore["POPUP1"]).toBeUndefined();

    // Query after deletion
    const afterDelete = await findEventByAccessCodeAsync("POPUP1");
    expect(afterDelete).toBeNull();
  });
});
