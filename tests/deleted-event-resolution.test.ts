import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock Firebase modular SDK
vi.mock("@/lib/firebase", () => ({
  db: { _mockDb: true },
  auth: { currentUser: null },
  isFirebaseConfigured: () => true,
  getFirebaseDb: () => ({ _mockDb: true }),
}));

const mockPublicStore: Record<string, Record<string, unknown>> = {};
const mockDeletedCodes: Record<string, Record<string, unknown>> = {};

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  doc: vi.fn((_db, col, id) => ({ _path: `${col}/${id}`, id, col })),
  getDoc: vi.fn(async (docRef) => {
    if (docRef.col === "deletedCodes") {
      const data = mockDeletedCodes[docRef.id];
      return {
        exists: () => Boolean(data),
        data: () => data || null,
      };
    }
    const data = mockPublicStore[docRef.id];
    return {
      exists: () => Boolean(data),
      data: () => data || null,
    };
  }),
  setDoc: vi.fn(async (docRef, payload) => {
    if (docRef.col === "deletedCodes") {
      mockDeletedCodes[docRef.id] = payload;
    } else {
      mockPublicStore[docRef.id] = payload;
    }
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
import { checkEventCodeExistsInFirestore, normalizeEventCode } from "@/lib/event-code";
import { GET as audienceRoute } from "@/app/api/events/audience/route";
import { POST as joinByCodeRoute } from "@/app/api/events/join-by-code/route";
import { GET as downloadRoute } from "@/app/api/events/resources/download/route";

describe("StageX AI — Deleted Event Code Lifecycle & Resolution Invalidation", () => {
  beforeEach(() => {
    useEventStore.getState().clearState();
    for (const key of Object.keys(mockPublicStore)) {
      delete mockPublicStore[key];
    }
    for (const key of Object.keys(mockDeletedCodes)) {
      delete mockDeletedCodes[key];
    }
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  // 1. DELETE ACTION REMOVES PUBLICEVENTS & PREVENTS RESOLUTION
  it("1. Organizer deletes event -> publicEvents entry removed and lookup returns null", async () => {
    useEventStore.setState({ activeUserId: "organizer-acc-a" });

    const createRes = useEventStore.getState().createEvent({
      name: "Tech Meetup 2026",
      type: "Conference",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      date: "2026-11-01",
      startTime: "10:00",
      endTime: "16:00",
      venue: "Tech Park",
      accessCode: "TECH26",
    });
    expect(createRes.ok).toBe(true);
    expect(mockPublicStore["TECH26"]).toBeDefined();

    // Verify audience can resolve before deletion
    const beforeDel = await findEventByAccessCodeAsync("TECH26");
    expect(beforeDel).not.toBeNull();
    expect(beforeDel?.event.name).toBe("Tech Meetup 2026");

    // Organizer deletes event
    useEventStore.getState().deleteEvent(createRes.eventId!);

    // publicEvents document must be removed
    expect(mockPublicStore["TECH26"]).toBeUndefined();

    // Lookup after deletion must return null
    const afterDel = await findEventByAccessCodeAsync("TECH26");
    expect(afterDel).toBeNull();
  });

  // 2. AUDIENCE API RETURNS 404 EVENT_NOT_FOUND WITH NO-CACHE HEADERS
  it("2. GET /api/events/audience?code=CODE returns 404 EVENT_NOT_FOUND and no-cache headers", async () => {
    // Attempt lookup on deleted/non-existent code
    const req = new NextRequest("http://localhost:3000/api/events/audience?code=TECH26");
    const res = await audienceRoute(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.success).toBe(false);
    expect(json.error).toBe("EVENT_NOT_FOUND");

    // Cache-Control must prevent any edge/browser stale caching
    const cacheControl = res.headers.get("Cache-Control");
    expect(cacheControl).toContain("no-store");
    expect(cacheControl).toContain("no-cache");
  });

  // 3. JOIN-BY-CODE API RETURNS 404 EVENT_NOT_FOUND FOR DELETED CODE
  it("3. POST /api/events/join-by-code returns 404 EVENT_NOT_FOUND for deleted event", async () => {
    const req = new NextRequest("http://localhost:3000/api/events/join-by-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventCode: "TECH26" }),
    });
    const res = await joinByCodeRoute(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.error).toBe("EVENT_NOT_FOUND");
  });

  // 4. STALE CLIENT CACHE CANNOT RESURRECT DELETED EVENT
  it("4. Stale client localStorage is bypassed and purged upon server EVENT_NOT_FOUND", async () => {
    const code = "CACHED";
    // Simulate an audience client that previously cached the bundle in localStorage
    const staleBundle = {
      event: {
        id: "evt_cached",
        name: "Old Stale Event",
        type: "Conference" as const,
        status: "Scheduled" as const,
        date: "2026-11-01",
        startDate: "2026-11-01",
        endDate: "2026-11-01",
        startTime: "09:00",
        endTime: "17:00",
        startDateTime: 0,
        endDateTime: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        venue: "Hall",
        description: "",
        organizer: "Host",
        posterUrl: null,
        accessCode: code,
        resources: [],
        endedAt: null,
        publicEnabled: true,
        joinEnabled: true,
        ownerUserId: "other_user",
      },
      sessions: [],
      speakers: [],
      updatedAt: Date.now(),
      publicEnabled: true,
      joinEnabled: true,
      ownerUserId: "other_user",
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "stagex_public_events_directory",
        JSON.stringify({ [code]: staleBundle })
      );
    }

    // findEventByAccessCode (synchronous) must NOT return stale localStorage
    const syncResult = findEventByAccessCode(code);
    expect(syncResult).toBeNull();

    // findEventByAccessCodeAsync must verify with server/Firestore and purge localStorage
    const asyncResult = await findEventByAccessCodeAsync(code);
    expect(asyncResult).toBeNull();

    // Verify client localStorage was cleaned up
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("stagex_public_events_directory");
      const parsed = stored ? JSON.parse(stored) : {};
      expect(parsed[code]).toBeUndefined();
    }
  });

  // 5. EXACT CODE MATCHING ENFORCEMENT
  it("5. Requires exact code matching; rejects partial codes, fuzzy matches, or fallback", async () => {
    useEventStore.setState({ activeUserId: "organizer-acc-a" });
    useEventStore.getState().createEvent({
      name: "Exact Match Summit",
      type: "Conference",
      startDate: "2026-11-02",
      endDate: "2026-11-02",
      date: "2026-11-02",
      startTime: "10:00",
      endTime: "18:00",
      venue: "Auditorium",
      accessCode: "EXACT1",
    });

    // Normalized input works
    const matchUpper = await findEventByAccessCodeAsync("exact1");
    expect(matchUpper).not.toBeNull();

    const matchTrimmed = await findEventByAccessCodeAsync("  EXACT1  ");
    expect(matchTrimmed).not.toBeNull();

    // Partial codes or fuzzy matches must fail
    expect(await findEventByAccessCodeAsync("EXACT")).toBeNull();
    expect(await findEventByAccessCodeAsync("EXACT12")).toBeNull();
    expect(await findEventByAccessCodeAsync("")).toBeNull();
  });

  // 6. MULTI-ACCOUNT CROSS-ACCOUNT ISOLATION TEST
  it("6. Multi-account test: Account A deletes Event A; Account B and Anonymous get 404, while Event B continues working", async () => {
    // 1. Account A creates Event A
    useEventStore.setState({ activeUserId: "account-A-uid" });
    const resA = useEventStore.getState().createEvent({
      name: "Event Alpha",
      type: "Conference",
      startDate: "2026-11-15",
      endDate: "2026-11-15",
      date: "2026-11-15",
      startTime: "09:00",
      endTime: "17:00",
      venue: "Hall Alpha",
      accessCode: "ALPH01",
    });
    expect(resA.ok).toBe(true);

    // 2. Account B creates Event B
    useEventStore.setState({ activeUserId: "account-B-uid" });
    const resB = useEventStore.getState().createEvent({
      name: "Event Beta",
      type: "Seminar",
      startDate: "2026-11-16",
      endDate: "2026-11-16",
      date: "2026-11-16",
      startTime: "10:00",
      endTime: "18:00",
      venue: "Hall Beta",
      accessCode: "BETA02",
    });
    expect(resB.ok).toBe(true);

    // Both codes resolve before deletion
    expect(await findEventByAccessCodeAsync("ALPH01")).not.toBeNull();
    expect(await findEventByAccessCodeAsync("BETA02")).not.toBeNull();

    // 3. Account A deletes Event A
    useEventStore.setState({ activeUserId: "account-A-uid" });
    useEventStore.getState().deleteEvent(resA.eventId!);

    // 4. Test lookups for deleted Event A:
    // Account B entering Code A -> null
    useEventStore.setState({ activeUserId: "account-B-uid" });
    expect(await findEventByAccessCodeAsync("ALPH01")).toBeNull();

    // Account A entering Code A -> null
    useEventStore.setState({ activeUserId: "account-A-uid" });
    expect(await findEventByAccessCodeAsync("ALPH01")).toBeNull();

    // Anonymous user entering Code A -> null
    useEventStore.setState({ activeUserId: null });
    expect(await findEventByAccessCodeAsync("ALPH01")).toBeNull();

    // 5. Active Event B must STILL resolve normally
    const eventB = await findEventByAccessCodeAsync("BETA02");
    expect(eventB).not.toBeNull();
    expect(eventB?.event.name).toBe("Event Beta");
  });

  // 7. COMPLETED EVENT VS DELETED EVENT DISTINCTION
  it("7. Completed/archived event remains in Past Events and is not deleted", () => {
    useEventStore.setState({ activeUserId: "organizer-completed-test" });

    const createRes = useEventStore.getState().createEvent({
      name: "Past Symposium 2026",
      type: "Seminar",
      startDate: "2026-10-01",
      endDate: "2026-10-01",
      date: "2026-10-01",
      startTime: "09:00",
      endTime: "17:00",
      venue: "Main Hall",
      accessCode: "PAST01",
    });
    const eventId = createRes.eventId!;

    // Complete/archive the event
    const archRes = useEventStore.getState().endEventAndArchive(eventId);
    expect(archRes.ok).toBe(true);

    // Event must still exist in the organizer's store with status Completed
    const ev = useEventStore.getState().events.find((e) => e.id === eventId);
    expect(ev).toBeDefined();
    expect(ev?.status).toBe("Completed");
    expect(ev?.endedAt).toBeTypeOf("number");

    // It is NOT a deleted event: it remains in organizer history
    expect(useEventStore.getState().events.length).toBe(1);
  });

  // 8. EVENT CODE REUSE PREVENTED
  it("8. Deleted event code is tombstoned and cannot be immediately reused by another event", async () => {
    useEventStore.setState({ activeUserId: "organizer-reuse-test" });

    const createRes = useEventStore.getState().createEvent({
      name: "Temporary Showcase",
      type: "Workshop",
      startDate: "2026-12-01",
      endDate: "2026-12-01",
      date: "2026-12-01",
      startTime: "10:00",
      endTime: "16:00",
      venue: "Pavilion",
      accessCode: "TEMP99",
    });
    expect(createRes.ok).toBe(true);

    // Delete the event and ensure unregister completes
    useEventStore.getState().deleteEvent(createRes.eventId!);
    await unregisterPublicEvent("TEMP99");

    // checkEventCodeExistsInFirestore must detect the deletedCode tombstone
    const codeExists = await checkEventCodeExistsInFirestore("TEMP99");
    expect(codeExists).toBe(true);
  });

  // 9. SUPABASE STORAGE RESOURCES INACCESSIBLE FOR DELETED EVENT
  it("9. Resources from deleted event return 404 and cannot be downloaded", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/events/resources/download?code=TECH26&id=res_nonexistent"
    );
    const res = await downloadRoute(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("EVENT_NOT_FOUND");
  });
});
