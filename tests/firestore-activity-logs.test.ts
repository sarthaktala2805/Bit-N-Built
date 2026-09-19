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
const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockWriteBatch = vi.fn(() => ({
  set: (...args: any[]) => mockBatchSet(...args),
  delete: vi.fn(),
  commit: () => mockBatchCommit(),
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: any[]) => (mockDoc as any)(...args),
  setDoc: (...args: any[]) => (mockSetDoc as any)(...args),
  getDoc: (...args: any[]) => (mockGetDoc as any)(...args),
  collection: (...args: any[]) => (mockCollection as any)(...args),
  getDocs: (...args: any[]) => (mockGetDocs as any)(...args),
  deleteDoc: (...args: any[]) => (mockDeleteDoc as any)(...args),
  writeBatch: (...args: any[]) => (mockWriteBatch as any)(...args),
}));

import {
  serializeActivityLog,
  deserializeActivityLog,
  createActivityLogInFirestore,
  batchCreateActivityLogsInFirestore,
  getActivityLogsFromFirestore,
  getActivityLogFromFirestore,
  deleteActivityLogInFirestore,
} from "../lib/firestore/activity-logs";
import { ActivityLog } from "../types";

describe("Firestore Activity Logs Data Access Layer", () => {
  const mockLog: ActivityLog = {
    id: "log_101",
    eventId: "ev_event_456",
    type: "announcement_created",
    message: "Lunch is served in Hall B",
    timestamp: 1792056600000,
    meta: { priority: "High", channel: "Auditorium" },
  };

  describe("Serialization and Deserialization", () => {
    it("should serialize an ActivityLog including metadata", () => {
      const serialized = serializeActivityLog(mockLog);
      expect(serialized.id).toBe("log_101");
      expect(serialized.type).toBe("announcement_created");
      expect(serialized.message).toBe("Lunch is served in Hall B");
      expect(serialized.meta).toEqual({ priority: "High", channel: "Auditorium" });
    });

    it("should deserialize Firestore document data into standard ActivityLog structure", () => {
      const firestoreData = {
        type: "session_started",
        message: "Keynote started",
        timestamp: 1792060000000,
      };

      const log = deserializeActivityLog(firestoreData, "doc_log_555", "ev_event_456");
      expect(log.id).toBe("doc_log_555");
      expect(log.eventId).toBe("ev_event_456");
      expect(log.type).toBe("session_started");
      expect(log.message).toBe("Keynote started");
      expect(log.meta).toBeUndefined();
    });
  });

  describe("Unauthenticated and Input Validation Guards", () => {
    it("createActivityLogInFirestore should fail if userId is empty", async () => {
      const res = await createActivityLogInFirestore("", "ev_456", mockLog);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("createActivityLogInFirestore should fail if eventId is empty", async () => {
      const res = await createActivityLogInFirestore("user_123", "", mockLog);
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Event ID is required");
    });

    it("getActivityLogsFromFirestore should fail if userId is empty", async () => {
      const res = await getActivityLogsFromFirestore("", "ev_456");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Unauthenticated");
    });

    it("deleteActivityLogInFirestore should fail if logId is missing", async () => {
      const res = await deleteActivityLogInFirestore("user_123", "ev_456", "");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Log ID is required");
    });
  });

  describe("Firestore Mocked Execution & User Isolation", () => {
    it("should write at users/{userId}/events/{eventId}/activityLogs/{logId}", async () => {
      let passedPath = "";
      mockDoc.mockImplementationOnce((_db, ...segments) => {
        passedPath = segments.join("/");
        return { path: passedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await createActivityLogInFirestore("user_alice_456", "ev_event_789", mockLog, mockDb);

      expect(res.ok).toBe(true);
      expect(passedPath).toBe(`users/user_alice_456/events/ev_event_789/activityLogs/${mockLog.id}`);
      expect(passedPath).not.toContain("user_bob");
    });

    it("should batch write multiple activity logs atomically", async () => {
      const mockDb = { type: "firestore" } as any;
      const logs = [mockLog, { ...mockLog, id: "log_102" }];

      const res = await batchCreateActivityLogsInFirestore("user_alice_456", "ev_event_789", logs, mockDb);
      expect(res.ok).toBe(true);
      expect(mockWriteBatch).toHaveBeenCalled();
      expect(mockBatchCommit).toHaveBeenCalled();
    });

    it("should query logs collection at users/{userId}/events/{eventId}/activityLogs", async () => {
      let queriedPath = "";
      mockCollection.mockImplementationOnce((_db, ...segments) => {
        queriedPath = segments.join("/");
        return { path: queriedPath } as any;
      });

      const mockDb = { type: "firestore" } as any;
      const res = await getActivityLogsFromFirestore("user_alice_789", "ev_summit_12", mockDb);

      expect(res.ok).toBe(true);
      expect(queriedPath).toBe("users/user_alice_789/events/ev_summit_12/activityLogs");
      expect(queriedPath).not.toContain("user_charlie");
    });
  });
});
