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
  serializeSpeaker,
  deserializeSpeaker,
  createSpeakerInFirestore,
  getSpeakersFromFirestore,
  getSpeakerFromFirestore,
  updateSpeakerInFirestore,
  deleteSpeakerInFirestore,
} from "../lib/firestore/speakers";
import { Speaker } from "../types";

describe("Firestore Speakers Data Access Layer", () => {
  const mockSpeaker: Speaker = {
    id: "spk_101",
    eventId: "ev_event_456",
    name: "Dr. Elena Rostova",
    designation: "Chief AI Scientist",
    organization: "DeepNeural AI",
    bio: "Pioneer in distributed neural network models.",
    image: null,
    createdAt: 1792000000000,
  };

  describe("Serialization and Deserialization", () => {
    it("should serialize a Speaker and strip undefined fields", () => {
      const speakerWithUndefined: Speaker = {
        id: "spk_102",
        eventId: "ev_event_456",
        name: "Marcus Vance",
        createdAt: 1792000000000,
        designation: undefined,
        organization: undefined,
        bio: undefined,
        image: undefined,
      };

      const serialized = serializeSpeaker(speakerWithUndefined);
      expect(serialized.id).toBe("spk_102");
      expect(serialized.name).toBe("Marcus Vance");
      expect("designation" in serialized).toBe(false);
      expect("organization" in serialized).toBe(false);
      expect("bio" in serialized).toBe(false);
      expect("image" in serialized).toBe(false);
    });

    it("should deserialize Firestore document data into standard Speaker structure", () => {
      const firestoreData = {
        name: "Sophia Turner",
        createdAt: 1793400000000,
      };

      const speaker = deserializeSpeaker(firestoreData, "doc_spk_555", "ev_event_456");
      expect(speaker.id).toBe("doc_spk_555");
      expect(speaker.eventId).toBe("ev_event_456");
      expect(speaker.name).toBe("Sophia Turner");
      expect(speaker.designation).toBe("");
      expect(speaker.organization).toBe("");
      expect(speaker.bio).toBe("");
      expect(speaker.image).toBeNull();
    });
  });

  describe("Unauthenticated and Input Validation Guards", () => {
    it("createSpeakerInFirestore should fail if userId is empty", async () => {
      const res = await createSpeakerInFirestore("", "ev_456", mockSpeaker);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("createSpeakerInFirestore should fail if eventId is empty", async () => {
      const res = await createSpeakerInFirestore("user_123", "", mockSpeaker);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Event ID is required");
    });

    it("getSpeakersFromFirestore should fail if userId is empty", async () => {
      const res = await getSpeakersFromFirestore("", "ev_456");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("getSpeakersFromFirestore should fail if eventId is empty", async () => {
      const res = await getSpeakersFromFirestore("user_123", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Event ID is required");
    });

    it("getSpeakerFromFirestore should fail if speakerId is missing", async () => {
      const res = await getSpeakerFromFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Speaker ID is required");
    });

    it("updateSpeakerInFirestore should fail if userId is empty", async () => {
      const res = await updateSpeakerInFirestore("", "ev_456", "spk_1", { name: "New" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("deleteSpeakerInFirestore should fail if speakerId is missing", async () => {
      const res = await deleteSpeakerInFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Speaker ID is required");
    });
  });

  describe("Firestore Mocked Execution & User Isolation", () => {
    it("should write at users/{userId}/events/{eventId}/speakers/{speakerId}", async () => {
      let passedPath = "";
      mockDoc.mockImplementationOnce((_db, ...segments) => {
        passedPath = segments.join("/");
        return { path: passedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await createSpeakerInFirestore("user_alice_456", "ev_event_789", mockSpeaker, mockDb);

      expect(res.ok).toBe(true);
      expect(passedPath).toBe(`users/user_alice_456/events/ev_event_789/speakers/${mockSpeaker.id}`);
      expect(passedPath).not.toContain("user_bob");
    });

    it("should query speakers collection at users/{userId}/events/{eventId}/speakers", async () => {
      let queriedPath = "";
      mockCollection.mockImplementationOnce((_db, ...segments) => {
        queriedPath = segments.join("/");
        return { path: queriedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await getSpeakersFromFirestore("user_alice_789", "ev_summit_12", mockDb);

      expect(res.ok).toBe(true);
      expect(queriedPath).toBe("users/user_alice_789/events/ev_summit_12/speakers");
      expect(queriedPath).not.toContain("user_charlie");
    });
  });
});
