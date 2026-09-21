// StageX AI — Real-time Audience Presence & Active Attendee Counter
// Implements secure server-side HMAC session ownership, anti-inflation controls,
// and privacy-preserving aggregate counting (no individual attendee session metadata exposed).

import * as fb from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { validateEventCode } from "./event-code";
import { PUBLIC_COLLECTION } from "./events-registry";

const SESSION_TOKEN_KEY = "stagex_presence_session_token";
const SESSION_ID_KEY = "stagex_presence_session_id";
const HEARTBEAT_INTERVAL_MS = 20000; // 20 seconds
const COUNT_POLL_INTERVAL_MS = 10000; // 10 seconds

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

function getActiveAuthUid(): string | null {
  try {
    const authInstance =
      typeof (fb as unknown as Record<string, unknown>).getFirebaseAuth === "function"
        ? ((fb as unknown as Record<string, unknown>).getFirebaseAuth as () => { currentUser?: { uid?: string } })()
        : ((fb as unknown as Record<string, unknown>).auth as { currentUser?: { uid?: string } } | undefined);
    return authInstance?.currentUser?.uid || null;
  } catch {
    return null;
  }
}

/**
 * Starts an audience presence session for a given event code.
 * Uses secure server-side HMAC signed token to prove session ownership
 * and prevent anonymous session hijacking or artificial count inflation.
 * Returns cleanup function to be called on unmount.
 */
export function startAudiencePresence(
  rawEventCode: string,
  userUid?: string | null
): () => void {
  const val = validateEventCode(rawEventCode);
  if (!val.valid) return () => {};

  const eventCode = val.code;
  const currentAuthUid = getActiveAuthUid();
  const effectiveUid = userUid || currentAuthUid || "anonymous";

  let currentSessionId: string | null = null;
  let currentSessionToken: string | null = null;
  let isMounted = true;

  // 1. Join presence session via secure server-side API
  if (typeof window !== "undefined") {
    fetch("/api/events/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "join",
        eventCode,
        userUid: effectiveUid,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !data.ok) return;
        currentSessionId = data.sessionId;
        currentSessionToken = data.sessionToken;
        try {
          window.sessionStorage.setItem(SESSION_ID_KEY, data.sessionId);
          window.sessionStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        console.warn("[Presence Join API Warning]:", err);
      });
  }

  // 2. If user is authenticated, also sync to Firestore rules boundary
  // Under hardened firestore.rules: authenticated user can ONLY create their own doc where sessionId == auth.uid
  if (currentAuthUid) {
    const targetDb = getActiveDb();
    if (targetDb) {
      const now = Date.now();
      const authDocRef = doc(targetDb as never, PUBLIC_COLLECTION, eventCode, "presence", currentAuthUid);
      setDoc(
        authDocRef,
        {
          sessionId: currentAuthUid,
          eventCode,
          userUid: currentAuthUid,
          joinedAt: now,
          lastSeenAt: now,
          status: "active",
        },
        { merge: true }
      ).catch(() => {});
    }
  }

  // 3. Periodic heartbeat (every 20s)
  const heartbeatInterval = setInterval(() => {
    if (!currentSessionToken || !currentSessionId) return;

    if (typeof window !== "undefined") {
      fetch("/api/events/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "heartbeat",
          eventCode,
          sessionId: currentSessionId,
          sessionToken: currentSessionToken,
        }),
      }).catch(() => {});
    }

    if (currentAuthUid) {
      const targetDb = getActiveDb();
      if (targetDb) {
        const authDocRef = doc(targetDb as never, PUBLIC_COLLECTION, eventCode, "presence", currentAuthUid);
        setDoc(
          authDocRef,
          {
            lastSeenAt: Date.now(),
            status: "active",
          },
          { merge: true }
        ).catch(() => {});
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  // 4. Leave handler (on unmount or page exit)
  const markLeft = () => {
    if (!currentSessionToken || !currentSessionId) return;

    const payload = JSON.stringify({
      action: "leave",
      eventCode,
      sessionId: currentSessionId,
      sessionToken: currentSessionToken,
    });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/events/presence", blob);
    } else if (typeof window !== "undefined") {
      fetch("/api/events/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }

    if (currentAuthUid) {
      const targetDb = getActiveDb();
      if (targetDb) {
        const authDocRef = doc(targetDb as never, PUBLIC_COLLECTION, eventCode, "presence", currentAuthUid);
        setDoc(
          authDocRef,
          {
            status: "left",
            leftAt: Date.now(),
          },
          { merge: true }
        ).catch(() => {});
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", markLeft);
    window.addEventListener("pagehide", markLeft);
  }

  // Cleanup on unmount
  return () => {
    isMounted = false;
    clearInterval(heartbeatInterval);
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", markLeft);
      window.removeEventListener("pagehide", markLeft);
    }
    markLeft();
  };
}

/**
 * Subscribes to the privacy-preserving active attendee count for an event code.
 * Queries the derived count from the server without exposing individual attendee
 * session documents or sensitive user information to the public.
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
  let isMounted = true;

  const fetchCount = async () => {
    try {
      const res = await fetch(`/api/events/presence?code=${encodeURIComponent(eventCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (isMounted && data && typeof data.activeCount === "number") {
          onUpdate(data.activeCount);
        }
      }
    } catch {
      // ignore
    }
  };

  // Immediate initial count
  fetchCount();

  // Periodic count polling (every 10s)
  const intervalId = setInterval(fetchCount, COUNT_POLL_INTERVAL_MS);

  return () => {
    isMounted = false;
    clearInterval(intervalId);
  };
}
