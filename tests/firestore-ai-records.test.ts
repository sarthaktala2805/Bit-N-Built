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
  serializeAIRecord,
  deserializeAIRecord,
  createAIRecordInFirestore,
  getAIRecordsFromFirestore,
  getAIRecordFromFirestore,
  updateAIRecordInFirestore,
  deleteAIRecordInFirestore,
} from "../lib/firestore/ai-records";
import { AIRecord } from "../types";

describe("Firestore AI Records Data Access Layer", () => {
  const mockAIRecord: AIRecord = {
    id: "ai_rec_101",
    eventId: "ev_event_456",
    type: "speaker_intro",
    prompt: "Introduce Dr. Elena Rostova",
    generatedText: "Welcome Dr. Elena Rostova to the main stage!",
    editedText: "Please welcome Dr. Elena Rostova to the stage!",
    timestamp: 1792056600000,
  };

  describe("Serialization and Deserialization", () => {
    it("should serialize an AIRecord and strip undefined fields", () => {
      const recordWithUndefined: AIRecord = {
        id: "ai_rec_102",
        eventId: "ev_event_456",
        type: "transition",
        prompt: "Transition to lunch",
        generatedText: "It is time for lunch.",
        timestamp: 1792056600000,
        editedText: undefined,
      };

      const serialized = serializeAIRecord(recordWithUndefined);
      expect(serialized.id).toBe("ai_rec_102");
      expect(serialized.prompt).toBe("Transition to lunch");
      expect("editedText" in serialized).toBe(false);
    });

    it("should deserialize Firestore document data into standard AIRecord structure", () => {
      const firestoreData = {
        type: "announcement",
        prompt: "Parking announcement",
        generatedText: "Please park in Lot 3.",
        timestamp: 1792060000000,
      };

      const rec = deserializeAIRecord(firestoreData, "doc_ai_555", "ev_event_456");
      expect(rec.id).toBe("doc_ai_555");
      expect(rec.eventId).toBe("ev_event_456");
      expect(rec.type).toBe("announcement");
      expect(rec.generatedText).toBe("Please park in Lot 3.");
      expect(rec.editedText).toBeUndefined();
    });
  });

  describe("Unauthenticated and Input Validation Guards", () => {
    it("createAIRecordInFirestore should fail if userId is empty", async () => {
      const res = await createAIRecordInFirestore("", "ev_456", mockAIRecord);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("createAIRecordInFirestore should fail if eventId is empty", async () => {
      const res = await createAIRecordInFirestore("user_123", "", mockAIRecord);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Event ID is required");
    });

    it("getAIRecordsFromFirestore should fail if userId is empty", async () => {
      const res = await getAIRecordsFromFirestore("", "ev_456");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("getAIRecordFromFirestore should fail if aiRecordId is missing", async () => {
      const res = await getAIRecordFromFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("AI Record ID is required");
    });

    it("updateAIRecordInFirestore should fail if userId is empty", async () => {
      const res = await updateAIRecordInFirestore("", "ev_456", "ai_1", { editedText: "New text" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("deleteAIRecordInFirestore should fail if aiRecordId is missing", async () => {
      const res = await deleteAIRecordInFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("AI Record ID is required");
    });
  });

  describe("Firestore Mocked Execution & User Isolation", () => {
    it("should write at users/{userId}/events/{eventId}/aiRecords/{aiRecordId}", async () => {
      let passedPath = "";
      mockDoc.mockImplementationOnce((_db, ...segments) => {
        passedPath = segments.join("/");
        return { path: passedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await createAIRecordInFirestore("user_alice_456", "ev_event_789", mockAIRecord, mockDb);

      expect(res.ok).toBe(true);
      expect(passedPath).toBe(`users/user_alice_456/events/ev_event_789/aiRecords/${mockAIRecord.id}`);
      expect(passedPath).not.toContain("user_bob");
    });

    it("should query aiRecords collection at users/{userId}/events/{eventId}/aiRecords", async () => {
      let queriedPath = "";
      mockCollection.mockImplementationOnce((_db, ...segments) => {
        queriedPath = segments.join("/");
        return { path: queriedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await getAIRecordsFromFirestore("user_alice_789", "ev_summit_12", mockDb);

      expect(res.ok).toBe(true);
      expect(queriedPath).toBe("users/user_alice_789/events/ev_summit_12/aiRecords");
      expect(queriedPath).not.toContain("user_charlie");
    });
  });
});
