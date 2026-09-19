import { describe, it, expect } from "vitest";
import {
  getUserEventsPath,
  getEventDocPath,
  getEventSpeakersPath,
  getEventSessionsPath,
  getEventDelaysPath,
  getEventEmergenciesPath,
  getEventAIRecordsPath,
  getEventActivityLogsPath,
  FIRESTORE_COLLECTIONS,
} from "../lib/firestore/paths";

describe("Firestore User Isolation Paths", () => {
  const userId = "test_user_123";
  const eventId = "test_event_456";

  it("should have correct collection constants", () => {
    expect(FIRESTORE_COLLECTIONS.USERS).toBe("users");
    expect(FIRESTORE_COLLECTIONS.EVENTS).toBe("events");
    expect(FIRESTORE_COLLECTIONS.SPEAKERS).toBe("speakers");
    expect(FIRESTORE_COLLECTIONS.SESSIONS).toBe("sessions");
    expect(FIRESTORE_COLLECTIONS.DELAYS).toBe("delays");
    expect(FIRESTORE_COLLECTIONS.EMERGENCIES).toBe("emergencies");
    expect(FIRESTORE_COLLECTIONS.AI_RECORDS).toBe("aiRecords");
    expect(FIRESTORE_COLLECTIONS.ACTIVITY_LOGS).toBe("activityLogs");
  });

  it("should generate proper events collection path", () => {
    const path = getUserEventsPath(userId);
    expect(path).toBe(`users/${userId}/events`);
  });

  it("should generate proper event document path", () => {
    const path = getEventDocPath(userId, eventId);
    expect(path).toBe(`users/${userId}/events/${eventId}`);
  });

  it("should generate proper subcollection paths under event", () => {
    expect(getEventSpeakersPath(userId, eventId)).toBe(
      `users/${userId}/events/${eventId}/speakers`
    );
    expect(getEventSessionsPath(userId, eventId)).toBe(
      `users/${userId}/events/${eventId}/sessions`
    );
    expect(getEventDelaysPath(userId, eventId)).toBe(
      `users/${userId}/events/${eventId}/delays`
    );
    expect(getEventEmergenciesPath(userId, eventId)).toBe(
      `users/${userId}/events/${eventId}/emergencies`
    );
    expect(getEventAIRecordsPath(userId, eventId)).toBe(
      `users/${userId}/events/${eventId}/aiRecords`
    );
    expect(getEventActivityLogsPath(userId, eventId)).toBe(
      `users/${userId}/events/${eventId}/activityLogs`
    );
  });

  it("should ensure user isolation in path boundaries", () => {
    const userA = "uid_alice";
    const userB = "uid_bob";
    const pathA = getUserEventsPath(userA);
    const pathB = getUserEventsPath(userB);

    expect(pathA).not.toBe(pathB);
    expect(pathA.startsWith(`users/${userA}/`)).toBe(true);
    expect(pathB.startsWith(`users/${userB}/`)).toBe(true);
  });
});
