import { describe, it, expect, vi } from "vitest";

// Mock lib/firebase
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

vi.mock("firebase/firestore", () => ({
  doc: (...args: any[]) => (mockDoc as any)(...args),
  setDoc: (...args: any[]) => (mockSetDoc as any)(...args),
  getDoc: (...args: any[]) => (mockGetDoc as any)(...args),
  collection: (...args: any[]) => (mockCollection as any)(...args),
  getDocs: (...args: any[]) => (mockGetDocs as any)(...args),
  updateDoc: (...args: any[]) => (mockUpdateDoc as any)(...args),
  deleteDoc: (...args: any[]) => (mockDeleteDoc as any)(...args),
}));

import {
  serializeDelay,
  deserializeDelay,
  createDelayInFirestore,
  getDelaysFromFirestore,
  getDelayFromFirestore,
  updateDelayInFirestore,
  deleteDelayInFirestore,
} from "../lib/firestore/delays";
import { DelayRecord } from "../types";

describe("Firestore Delays Data Access Layer", () => {
  const mockDelay: DelayRecord = {
    id: "del_101",
    eventId: "ev_event_456",
    sessionId: "ses_301",
    minutes: 15,
    reason: "VIP Speaker running late",
    timestamp: 1792056600000,
  };

  describe("Serialization and Deserialization", () => {
    it("should serialize a DelayRecord and strip undefined fields", () => {
      const delayWithUndefined: DelayRecord = {
        id: "del_102",
        eventId: "ev_event_456",
        sessionId: "ses_302",
        minutes: 10,
        timestamp: 1792056600000,
        reason: undefined,
      };

      const serialized = serializeDelay(delayWithUndefined);
      expect(serialized.id).toBe("del_102");
      expect(serialized.minutes).toBe(10);
      expect("reason" in serialized).toBe(false);
    });

    it("should deserialize Firestore document data into standard DelayRecord structure", () => {
      const firestoreData = {
        sessionId: "ses_305",
        minutes: 20,
        timestamp: 1792060000000,
      };

      const delay = deserializeDelay(firestoreData, "doc_del_555", "ev_event_456");
      expect(delay.id).toBe("doc_del_555");
      expect(delay.eventId).toBe("ev_event_456");
      expect(delay.sessionId).toBe("ses_305");
      expect(delay.minutes).toBe(20);
      expect(delay.reason).toBeUndefined();
    });
  });

  describe("Unauthenticated and Input Validation Guards", () => {
    it("createDelayInFirestore should fail if userId is empty", async () => {
      const res = await createDelayInFirestore("", "ev_456", mockDelay);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("createDelayInFirestore should fail if eventId is empty", async () => {
      const res = await createDelayInFirestore("user_123", "", mockDelay);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Event ID is required");
    });

    it("getDelaysFromFirestore should fail if userId is empty", async () => {
      const res = await getDelaysFromFirestore("", "ev_456");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("getDelayFromFirestore should fail if delayId is missing", async () => {
      const res = await getDelayFromFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Delay ID is required");
    });

    it("updateDelayInFirestore should fail if userId is empty", async () => {
      const res = await updateDelayInFirestore("", "ev_456", "del_1", { minutes: 25 });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("deleteDelayInFirestore should fail if delayId is missing", async () => {
      const res = await deleteDelayInFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Delay ID is required");
    });
  });

  describe("Firestore Mocked Execution & User Isolation", () => {
    it("should write at users/{userId}/events/{eventId}/delays/{delayId}", async () => {
      let passedPath = "";
      mockDoc.mockImplementationOnce((_db, ...segments) => {
        passedPath = segments.join("/");
        return { path: passedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await createDelayInFirestore("user_alice_456", "ev_event_789", mockDelay, mockDb);

      expect(res.ok).toBe(true);
      expect(passedPath).toBe(`users/user_alice_456/events/ev_event_789/delays/${mockDelay.id}`);
      expect(passedPath).not.toContain("user_bob");
    });

    it("should query delays collection at users/{userId}/events/{eventId}/delays", async () => {
      let queriedPath = "";
      mockCollection.mockImplementationOnce((_db, ...segments) => {
        queriedPath = segments.join("/");
        return { path: queriedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await getDelaysFromFirestore("user_alice_789", "ev_summit_12", mockDb);

      expect(res.ok).toBe(true);
      expect(queriedPath).toBe("users/user_alice_789/events/ev_summit_12/delays");
      expect(queriedPath).not.toContain("user_charlie");
    });
  });
});
