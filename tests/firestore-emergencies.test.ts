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
  serializeEmergency,
  deserializeEmergency,
  createEmergencyInFirestore,
  getEmergenciesFromFirestore,
  getEmergencyFromFirestore,
  updateEmergencyInFirestore,
  deleteEmergencyInFirestore,
} from "../lib/firestore/emergencies";
import { Emergency } from "../types";

describe("Firestore Emergencies Data Access Layer", () => {
  const mockEmergency: Emergency = {
    id: "emg_101",
    eventId: "ev_event_456",
    type: "Projector Issue",
    description: "Main HDMI cable disconnected",
    timestamp: 1792056600000,
    resolved: false,
    resolvedAt: null,
  };

  describe("Serialization and Deserialization", () => {
    it("should serialize an Emergency and strip undefined fields", () => {
      const emgWithUndefined: Emergency = {
        id: "emg_102",
        eventId: "ev_event_456",
        type: "Microphone Issue",
        timestamp: 1792056600000,
        resolved: false,
        description: undefined,
      };

      const serialized = serializeEmergency(emgWithUndefined);
      expect(serialized.id).toBe("emg_102");
      expect(serialized.type).toBe("Microphone Issue");
      expect("description" in serialized).toBe(false);
    });

    it("should deserialize Firestore document data into standard Emergency structure", () => {
      const firestoreData = {
        type: "Technical Problem",
        timestamp: 1792060000000,
        resolved: true,
        resolvedAt: 1792061000000,
      };

      const emg = deserializeEmergency(firestoreData, "doc_emg_555", "ev_event_456");
      expect(emg.id).toBe("doc_emg_555");
      expect(emg.eventId).toBe("ev_event_456");
      expect(emg.type).toBe("Technical Problem");
      expect(emg.resolved).toBe(true);
      expect(emg.resolvedAt).toBe(1792061000000);
      expect(emg.description).toBeUndefined();
    });
  });

  describe("Unauthenticated and Input Validation Guards", () => {
    it("createEmergencyInFirestore should fail if userId is empty", async () => {
      const res = await createEmergencyInFirestore("", "ev_456", mockEmergency);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("createEmergencyInFirestore should fail if eventId is empty", async () => {
      const res = await createEmergencyInFirestore("user_123", "", mockEmergency);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Event ID is required");
    });

    it("getEmergenciesFromFirestore should fail if userId is empty", async () => {
      const res = await getEmergenciesFromFirestore("", "ev_456");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("getEmergencyFromFirestore should fail if emergencyId is missing", async () => {
      const res = await getEmergencyFromFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Emergency ID is required");
    });

    it("updateEmergencyInFirestore should fail if userId is empty", async () => {
      const res = await updateEmergencyInFirestore("", "ev_456", "emg_1", { resolved: true });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("deleteEmergencyInFirestore should fail if emergencyId is missing", async () => {
      const res = await deleteEmergencyInFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Emergency ID is required");
    });
  });

  describe("Firestore Mocked Execution & User Isolation", () => {
    it("should write at users/{userId}/events/{eventId}/emergencies/{emergencyId}", async () => {
      let passedPath = "";
      mockDoc.mockImplementationOnce((_db, ...segments) => {
        passedPath = segments.join("/");
        return { path: passedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await createEmergencyInFirestore("user_alice_456", "ev_event_789", mockEmergency, mockDb);

      expect(res.ok).toBe(true);
      expect(passedPath).toBe(`users/user_alice_456/events/ev_event_789/emergencies/${mockEmergency.id}`);
      expect(passedPath).not.toContain("user_bob");
    });

    it("should query emergencies collection at users/{userId}/events/{eventId}/emergencies", async () => {
      let queriedPath = "";
      mockCollection.mockImplementationOnce((_db, ...segments) => {
        queriedPath = segments.join("/");
        return { path: queriedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await getEmergenciesFromFirestore("user_alice_789", "ev_summit_12", mockDb);

      expect(res.ok).toBe(true);
      expect(queriedPath).toBe("users/user_alice_789/events/ev_summit_12/emergencies");
      expect(queriedPath).not.toContain("user_charlie");
    });
  });
});
