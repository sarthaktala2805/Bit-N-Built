// StageX AI — Public Events Registry & Cross-Session / Cross-Device Code Resolver
// Enables attendees to discover events using a 6-character access code across different devices,
// browsers, and accounts via Cloud Firestore and local caching.

import { Event, Session, Speaker } from "@/types";
import * as fb from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

const PUBLIC_DIRECTORY_KEY = "stagex_public_events_directory";
const PUBLIC_COLLECTION = "public_events";

export interface PublicEventBundle {
  event: Event;
  sessions: Session[];
  speakers: Speaker[];
  updatedAt: number;
}

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

function isCloudReady(): boolean {
  try {
    if (typeof (fb as unknown as Record<string, unknown>).isFirebaseConfigured === "function") {
      return Boolean(((fb as unknown as Record<string, unknown>).isFirebaseConfigured as () => boolean)());
    }
    return Boolean((fb as unknown as Record<string, unknown>).db);
  } catch {
    return false;
  }
}

/**
 * Strips undefined values recursively so Firestore setDoc does not throw errors
 */
function cleanUndefined<T>(val: T): T {
  if (val === null || val === undefined) return null as unknown as T;
  if (Array.isArray(val)) {
    return val.map(cleanUndefined) as unknown as T;
  }
  if (typeof val === "object" && val !== null) {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        clean[k] = cleanUndefined(v);
      }
    }
    return clean as unknown as T;
  }
  return val;
}

/**
 * Publishes an event to both the local cache and Cloud Firestore public registry
 * so audience members on any device/account can access it instantly.
 */
export function registerPublicEvent(
  event: Event,
  sessions: Session[] = [],
  speakers: Speaker[] = []
): void {
  if (!event || !event.accessCode) return;
  const codeKey = event.accessCode.trim().toUpperCase();
  if (codeKey.length !== 6) return;

  const bundle: PublicEventBundle = {
    event,
    sessions: sessions.filter((s) => s.eventId === event.id),
    speakers: speakers.filter((s) => s.eventId === event.id),
    updatedAt: Date.now(),
  };

  // 1. Immediate local storage cache
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(PUBLIC_DIRECTORY_KEY);
      const directory: Record<string, PublicEventBundle> = raw ? JSON.parse(raw) : {};
      directory[codeKey] = bundle;
      window.localStorage.setItem(PUBLIC_DIRECTORY_KEY, JSON.stringify(directory));
    } catch (err) {
      console.warn("[Public Events Registry local save warning]", err);
    }
  }

  // 2. Asynchronously sync to Cloud Firestore public_events collection
  if (isCloudReady()) {
    try {
      const targetDb = getActiveDb();
      if (targetDb) {
        const docRef = doc(targetDb as never, PUBLIC_COLLECTION, codeKey);
        const payload = cleanUndefined({
          ...bundle,
          accessCode: codeKey,
          eventId: event.id,
        });
        setDoc(docRef, payload as never, { merge: true }).catch((err) => {
          console.warn(`[Public Events Firestore sync warning for ${codeKey}]:`, err);
        });
      }
    } catch (err) {
      console.warn(`[Public Events Firestore sync error for ${codeKey}]:`, err);
    }
  }
}

/**
 * Removes an event from the local cache and Cloud Firestore public registry
 */
export function unregisterPublicEvent(accessCode?: string): void {
  if (!accessCode) return;
  const codeKey = accessCode.trim().toUpperCase();
  if (codeKey.length !== 6) return;

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(PUBLIC_DIRECTORY_KEY);
      if (raw) {
        const directory: Record<string, PublicEventBundle> = JSON.parse(raw);
        delete directory[codeKey];
        window.localStorage.setItem(PUBLIC_DIRECTORY_KEY, JSON.stringify(directory));
      }
    } catch {
      // ignore
    }
  }

  if (isCloudReady()) {
    try {
      const targetDb = getActiveDb();
      if (targetDb) {
        const docRef = doc(targetDb as never, PUBLIC_COLLECTION, codeKey);
        deleteDoc(docRef).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Synchronously searches for an event by 6-character code in current in-memory store and local storage.
 * Maintained for backwards-compatibility and instant rendering when cached.
 */
export function findEventByAccessCode(
  rawCode: string,
  currentStoreEvents: Event[] = [],
  currentSessions: Session[] = [],
  currentSpeakers: Speaker[] = []
): PublicEventBundle | null {
  const code = rawCode.trim().toUpperCase();
  if (!code || code.length !== 6) return null;

  // 1. Check current store events
  const foundInStore = currentStoreEvents.find(
    (e) => (e.accessCode || "").toUpperCase() === code
  );
  if (foundInStore) {
    return {
      event: foundInStore,
      sessions: currentSessions.filter((s) => s.eventId === foundInStore.id),
      speakers: currentSpeakers.filter((s) => s.eventId === foundInStore.id),
      updatedAt: foundInStore.updatedAt,
    };
  }

  if (typeof window === "undefined") return null;

  // 2. Check public directory in localStorage
  try {
    const raw = window.localStorage.getItem(PUBLIC_DIRECTORY_KEY);
    if (raw) {
      const directory: Record<string, PublicEventBundle> = JSON.parse(raw);
      if (directory[code]) {
        return directory[code];
      }
    }
  } catch {
    // ignore
  }

  // 3. Scan all localStorage keys to locate the event from any organizer profile
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith("stagex-ai:") || key.startsWith("stagex_"))) {
        const itemRaw = window.localStorage.getItem(key);
        if (!itemRaw) continue;

        try {
          const parsed = JSON.parse(itemRaw);
          const state = parsed.state || parsed;
          if (state && Array.isArray(state.events)) {
            const ev = state.events.find(
              (e: Event) => (e.accessCode || "").toUpperCase() === code
            );
            if (ev) {
              const matchedSessions = Array.isArray(state.sessions)
                ? state.sessions.filter((s: Session) => s.eventId === ev.id)
                : [];
              const matchedSpeakers = Array.isArray(state.speakers)
                ? state.speakers.filter((s: Speaker) => s.eventId === ev.id)
                : [];

              registerPublicEvent(ev, matchedSessions, matchedSpeakers);

              return {
                event: ev,
                sessions: matchedSessions,
                speakers: matchedSpeakers,
                updatedAt: ev.updatedAt || Date.now(),
              };
            }
          }
        } catch {
          // continue
        }
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Asynchronously searches for an event by 6-character code:
 * 1. Checks local cache / memory first (synchronous instant match).
 * 2. If not found, fetches from Cloud Firestore public_events/{code} across accounts/devices.
 * 3. Falls back to /api/events/audience?code={code} if Firestore client fails or is blocked.
 * 4. Saves found event bundle to local cache for offline/instant reload.
 */
export async function findEventByAccessCodeAsync(
  rawCode: string,
  currentStoreEvents: Event[] = [],
  currentSessions: Session[] = [],
  currentSpeakers: Speaker[] = []
): Promise<PublicEventBundle | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code || code.length !== 6) return null;

  // Step 1: Check synchronous local store & localStorage
  const localMatch = findEventByAccessCode(code, currentStoreEvents, currentSessions, currentSpeakers);
  if (localMatch) {
    return localMatch;
  }

  // Step 2: Attempt Firestore direct client read
  if (isCloudReady()) {
    try {
      const targetDb = getActiveDb();
      if (targetDb) {
        const docRef = doc(targetDb as never, PUBLIC_COLLECTION, code);
        const snapshot = await getDoc(docRef);
        if (snapshot && typeof snapshot.exists === "function" && snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.event) {
            const bundle: PublicEventBundle = {
              event: data.event as Event,
              sessions: Array.isArray(data.sessions) ? (data.sessions as Session[]) : [],
              speakers: Array.isArray(data.speakers) ? (data.speakers as Speaker[]) : [],
              updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
            };
            registerPublicEvent(bundle.event, bundle.sessions, bundle.speakers);
            return bundle;
          }
        }
      }
    } catch (err) {
      console.warn(`[Firestore public_events lookup failed for ${code}]:`, err);
    }
  }

  // Step 3: Fallback to server API endpoint (/api/events/audience?code=...)
  if (typeof window !== "undefined") {
    try {
      const response = await fetch(`/api/events/audience?code=${encodeURIComponent(code)}`);
      if (response.ok) {
        const json = await response.json();
        if (json.ok && json.data && json.data.event) {
          const bundle = json.data as PublicEventBundle;
          registerPublicEvent(bundle.event, bundle.sessions, bundle.speakers);
          return bundle;
        }
      }
    } catch (err) {
      console.warn(`[API public_events fallback failed for ${code}]:`, err);
    }
  }

  return null;
}
