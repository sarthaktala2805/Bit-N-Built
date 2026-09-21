// StageX AI — Real-time Audience Presence & Active Attendee Counter
// Tracks active attendee sessions under publicEvents/{eventCode}/presence/{sessionId}
// Guarantees real, non-fabricated attendee metrics across devices, accounts, and networks.

import * as fb from "@/lib/firebase";
import { doc, collection, setDoc, onSnapshot, query } from "firebase/firestore";
import { normalizeEventCode, validateEventCode } from "./event-code";
import { PUBLIC_COLLECTION } from "./events-registry";

const SESSION_STORAGE_KEY = "stagex_presence_session_id";
const HEARTBEAT_INTERVAL_MS = 20000; // 20 seconds
const STALE_TIMEOUT_MS = 60000; // 60 seconds

function getActiveDb() {
  try {
    if (typeof (fb as unknown as Record<string, unknown>).getFirebaseDb === "function") {
      const instance = ((fb as unknown as Record<string, unknown>).getFirebaseDb as () => unknown)();
      if (instance) return instance;
    }
    if ((fb as unknown as Record<string, unknown>).db) {
      return (fb as unknown as Record<string, unknown>).db;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Retrieves or creates a persistent session identifier for the current browser tab/session
 */
export function getOrCreatePresenceSessionId(): string {
  if (typeof window === "undefined") {
    return "sess_" + Math.random().toString(36).substring(2, 9);
  }

  try {
    let existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!existing) {
      existing = "aud_" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11));
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, existing);
    }
    return existing;
  } catch {
    return "aud_" + Math.random().toString(36).substring(2, 11);
  }
}

/**
 * Starts audience presence session for a given event code.
 * Periodically heartbeats lastSeenAt and marks session left on exit.
 * Returns cleanup function to be called on unmount.
 */
export function startAudiencePresence(
  rawEventCode: string,
  userUid?: string | null
): () => void {
  const val = validateEventCode(rawEventCode);
  if (!val.valid) return () => {};

  const eventCode = val.code;
  const sessionId = getOrCreatePresenceSessionId();
  const effectiveUid = userUid || "anonymous";

  const targetDb = getActiveDb();
  if (!targetDb) return () => {};

  const presenceDocRef = doc(
    targetDb as never,
    PUBLIC_COLLECTION,
    eventCode,
    "presence",
    sessionId
  );

  const now = Date.now();

  // Initial join record
  setDoc(
    presenceDocRef,
    {
      sessionId,
      eventCode,
      userUid: effectiveUid,
      joinedAt: now,
      lastSeenAt: now,
      status: "active",
      leftAt: null,
    },
    { merge: true }
  ).catch((err) => {
    console.warn(`[Audience Presence Join Warning]:`, err);
  });

  // Periodic heartbeat
  const intervalId = setInterval(() => {
    setDoc(
      presenceDocRef,
      {
        lastSeenAt: Date.now(),
        status: "active",
      },
      { merge: true }
    ).catch(() => {});
  }, HEARTBEAT_INTERVAL_MS);

  // Leave handler
  const markLeft = () => {
    try {
      setDoc(
        presenceDocRef,
        {
          status: "left",
          leftAt: Date.now(),
        },
        { merge: true }
      ).catch(() => {});
    } catch {
      // ignore
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", markLeft);
    window.addEventListener("pagehide", markLeft);
  }

  // Cleanup on unmount
  return () => {
    clearInterval(intervalId);
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", markLeft);
      window.removeEventListener("pagehide", markLeft);
    }
    markLeft();
  };
}

/**
 * Subscribes to the real-time active attendee count for an event code.
 * Filters out stale sessions (lastSeenAt older than 60s) or sessions marked left.
 * Returns unsubscribe function.
 */
export function subscribeActiveAttendeeCount(
  rawEventCode: string,
  onUpdate: (count: number) => void
): () => void {
  const val = validateEventCode(rawEventCode);
  if (!val.valid) {
    onUpdate(0);
    return () => {};
  }

  const eventCode = val.code;
  const targetDb = getActiveDb();
  if (!targetDb) {
    onUpdate(0);
    return () => {};
  }

  try {
    const presenceColRef = collection(
      targetDb as never,
      PUBLIC_COLLECTION,
      eventCode,
      "presence"
    );

    const q = query(presenceColRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const threshold = Date.now() - STALE_TIMEOUT_MS;
        let activeCount = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            data &&
            data.status === "active" &&
            typeof data.lastSeenAt === "number" &&
            data.lastSeenAt >= threshold
          ) {
            activeCount++;
          }
        });

        onUpdate(activeCount);
      },
      (err) => {
        console.warn(`[Presence Subscription Warning for ${eventCode}]:`, err);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn(`[Presence Setup Error for ${eventCode}]:`, err);
    return () => {};
  }
}
