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
const mockWriteBatch = vi.fn(() => ({
  delete: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
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
  serializeEvent,
  deserializeEvent,
  createEventInFirestore,
  getEventsFromFirestore,
  getEventFromFirestore,
  updateEventInFirestore,
  deleteEventFromFirestore,
} from "../lib/firestore/events";
import { Event } from "../types";

describe("Firestore Events Data Access Layer", () => {
  const mockEvent: Event = {
    id: "ev_test_100",
    name: "AI World Summit",
    type: "Conference",
    date: "2026-10-15",
    startDate: "2026-10-15",
    endDate: "2026-10-16",
    venue: "Main Hall",
    description: "Annual AI conference",
    organizer: "NeuroX Labs",
    startTime: "09:00",
    endTime: "18:00",
    startDateTime: 1792054800000,
    endDateTime: 1792137600000,
    createdAt: 1792000000000,
    updatedAt: 1792000000000,
  };

  describe("Serialization and Deserialization", () => {
    it("should serialize an Event and clean undefined fields", () => {
      const eventWithUndefined: Event = {
        ...mockEvent,
        description: undefined,
        organizer: undefined,
      };
      const serialized = serializeEvent(eventWithUndefined);
      expect(serialized.id).toBe("ev_test_100");
      expect(serialized.name).toBe("AI World Summit");
      expect("description" in serialized).toBe(false);
      expect("organizer" in serialized).toBe(false);
    });

    it("should deserialize Firestore document data into standard Event structure", () => {
      const firestoreData = {
        name: "Cloud Fest",
        type: "Workshop",
        startDate: "2026-11-01",
        endDate: "2026-11-01",
        venue: "Room B",
        startTime: "10:00",
        endTime: "12:00",
        startDateTime: 1793440800000,
        endDateTime: 1793448000000,
        createdAt: 1793400000000,
        updatedAt: 1793400000000,
      };

      const event = deserializeEvent(firestoreData, "doc_999");
      expect(event.id).toBe("doc_999");
      expect(event.name).toBe("Cloud Fest");
      expect(event.type).toBe("Workshop");
      expect(event.description).toBe("");
      expect(event.organizer).toBe("");
    });
  });

  describe("Unauthenticated and Input Validation Guards", () => {
    it("createEventInFirestore should fail if userId is empty", async () => {
      const res = await createEventInFirestore("", mockEvent);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("getEventsFromFirestore should fail if userId is empty", async () => {
      const res = await getEventsFromFirestore("   ");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("getEventFromFirestore should fail if eventId is missing", async () => {
      const res = await getEventFromFirestore("user_123", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Event ID is required");
    });

    it("updateEventInFirestore should fail if userId is missing", async () => {
      const res = await updateEventInFirestore("", "ev_1", { name: "New" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("deleteEventFromFirestore should fail if eventId is missing", async () => {
      const res = await deleteEventFromFirestore("user_123", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Event ID is required");
    });
  });

  describe("Firestore Mocked Execution & User Isolation", () => {
    it("should write at the user's specific path users/{userId}/events/{eventId}", async () => {
      let passedPath = "";
      mockDoc.mockImplementationOnce((_db, ...segments) => {
        passedPath = segments.join("/");
        return { path: passedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await createEventInFirestore("user_alice_456", mockEvent, mockDb);

      expect(res.ok).toBe(true);
      expect(passedPath).toBe(`users/user_alice_456/events/${mockEvent.id}`);
      expect(passedPath).not.toContain("user_bob");
    });

    it("should query the user's specific collection path users/{userId}/events", async () => {
      let queriedPath = "";
      mockCollection.mockImplementationOnce((_db, ...segments) => {
        queriedPath = segments.join("/");
        return { path: queriedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await getEventsFromFirestore("user_alice_789", mockDb);

      expect(res.ok).toBe(true);
      expect(queriedPath).toBe("users/user_alice_789/events");
      expect(queriedPath).not.toContain("user_charlie");
    });
  });
});
