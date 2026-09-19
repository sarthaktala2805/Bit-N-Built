import { describe, it, expect, vi } from "vitest";

// Mock lib/firebase to avoid requiring live environment variables in offline test runner
vi.mock("../lib/firebase", () => ({
  db: { type: "mock-firestore" },
  auth: { currentUser: null },
  app: {},
}));

const mockDoc = vi.fn((_db, ...segments) => ({ path: segments.join("/") }));
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn();
const mockCollection = vi.fn((_db, ...segments) => ({ path: segments.join("/") }));
const mockGetDocs = vi.fn().mockResolvedValue({ forEach: () => {} });
const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockWriteBatch = vi.fn(() => ({
  update: (...args: any[]) => (mockBatchUpdate as any)(...args),
  delete: vi.fn(),
  commit: () => mockBatchCommit(),
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: any[]) => (mockDoc as any)(...args),
  setDoc: (...args: any[]) => (mockSetDoc as any)(...args),
  getDoc: (...args: any[]) => (mockGetDoc as any)(...args),
  collection: (...args: any[]) => (mockCollection as any)(...args),
  getDocs: (...args: any[]) => (mockGetDocs as any)(...args),
  updateDoc: (...args: any[]) => (mockUpdateDoc as any)(...args),
  deleteDoc: (...args: any[]) => (mockDeleteDoc as any)(...args),
  writeBatch: (...args: any[]) => (mockWriteBatch as any)(...args),
}));

import {
  serializeSession,
  deserializeSession,
  createSessionInFirestore,
  getSessionsFromFirestore,
  getSessionFromFirestore,
  updateSessionInFirestore,
  deleteSessionInFirestore,
  batchUpdateSessionsInFirestore,
} from "../lib/firestore/sessions";
import { Session } from "../types";

describe("Firestore Sessions Data Access Layer", () => {
  const mockSession: Session = {
    id: "ses_301",
    eventId: "ev_event_456",
    title: "Keynote: Future of Neural Computing",
    type: "Keynote",
    speakerId: "spk_101",
    sessionDate: "2026-10-15",
    startTime: "09:30",
    endTime: "10:30",
    startDateTime: 1792056600000,
    endDateTime: 1792060200000,
    duration: 60,
    status: "Upcoming",
    isFixedTime: true,
    originalStartTime: "09:30",
    originalEndTime: "10:30",
    originalSessionDate: "2026-10-15",
    originalStartDateTime: 1792056600000,
    originalEndDateTime: 1792060200000,
    actualStartTime: null,
    actualEndTime: null,
  };

  describe("Serialization and Deserialization", () => {
    it("should serialize a Session preserving full timestamps and properties", () => {
      const serialized = serializeSession(mockSession);
      expect(serialized.id).toBe("ses_301");
      expect(serialized.title).toBe("Keynote: Future of Neural Computing");
      expect(serialized.startDateTime).toBe(1792056600000);
      expect(serialized.endDateTime).toBe(1792060200000);
      expect(serialized.duration).toBe(60);
      expect(serialized.isFixedTime).toBe(true);
      expect(serialized.actualStartTime).toBeNull();
    });

    it("should deserialize Firestore document data into standard Session model", () => {
      const firestoreData = {
        title: "Hands-on Workshop",
        type: "Workshop",
        sessionDate: "2026-10-15",
        startTime: "11:00",
        endTime: "12:30",
        startDateTime: 1792062000000,
        endDateTime: 1792067400000,
        duration: 90,
        status: "Live",
        isFixedTime: false,
        actualStartTime: 1792062005000,
      };

      const session = deserializeSession(firestoreData, "doc_ses_999", "ev_event_456");
      expect(session.id).toBe("doc_ses_999");
      expect(session.eventId).toBe("ev_event_456");
      expect(session.title).toBe("Hands-on Workshop");
      expect(session.status).toBe("Live");
      expect(session.actualStartTime).toBe(1792062005000);
      expect(session.actualEndTime).toBeNull();
      expect(session.speakerId).toBeNull();
    });
  });

  describe("Unauthenticated and Input Validation Guards", () => {
    it("createSessionInFirestore should fail if userId is empty", async () => {
      const res = await createSessionInFirestore("", "ev_456", mockSession);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("createSessionInFirestore should fail if eventId is empty", async () => {
      const res = await createSessionInFirestore("user_123", "", mockSession);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Event ID is required");
    });

    it("getSessionsFromFirestore should fail if userId is empty", async () => {
      const res = await getSessionsFromFirestore("", "ev_456");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("getSessionFromFirestore should fail if sessionId is missing", async () => {
      const res = await getSessionFromFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Session ID is required");
    });

    it("updateSessionInFirestore should fail if userId is empty", async () => {
      const res = await updateSessionInFirestore("", "ev_456", "ses_1", { title: "New" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("deleteSessionInFirestore should fail if sessionId is missing", async () => {
      const res = await deleteSessionInFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Session ID is required");
    });
  });

  describe("Firestore Mocked Execution & User Isolation", () => {
    it("should write at users/{userId}/events/{eventId}/sessions/{sessionId}", async () => {
      let passedPath = "";
      mockDoc.mockImplementationOnce((_db, ...segments) => {
        passedPath = segments.join("/");
        return { path: passedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await createSessionInFirestore("user_alice_456", "ev_event_789", mockSession, mockDb);

      expect(res.ok).toBe(true);
      expect(passedPath).toBe(`users/user_alice_456/events/ev_event_789/sessions/${mockSession.id}`);
      expect(passedPath).not.toContain("user_bob");
    });

    it("should query sessions collection at users/{userId}/events/{eventId}/sessions", async () => {
      let queriedPath = "";
      mockCollection.mockImplementationOnce((_db, ...segments) => {
        queriedPath = segments.join("/");
        return { path: queriedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await getSessionsFromFirestore("user_alice_789", "ev_summit_12", mockDb);

      expect(res.ok).toBe(true);
      expect(queriedPath).toBe("users/user_alice_789/events/ev_summit_12/sessions");
      expect(queriedPath).not.toContain("user_charlie");
    });

    it("batchUpdateSessionsInFirestore should update reordered sessions in an atomic batch", async () => {
      const mockDb = { type: "firestore" } as any;
      const sessionsToUpdate: Session[] = [
        { ...mockSession, id: "ses_1", startTime: "10:00", endTime: "11:00" },
        { ...mockSession, id: "ses_2", startTime: "11:00", endTime: "12:00" },
      ];

      const res = await batchUpdateSessionsInFirestore("user_alice_789", "ev_summit_12", sessionsToUpdate, mockDb);
      expect(res.ok).toBe(true);
      expect(mockWriteBatch).toHaveBeenCalled();
      expect(mockBatchCommit).toHaveBeenCalled();
    });
  });
});
