// StageX AI — Public Events Registry & Cross-Session / Cross-Device Code Resolver
// Enables attendees to discover events using a globally unique, account-independent
// 6-character event code across different devices, browsers, and accounts.

import { Event, Session, Speaker, PublicEventDoc } from "@/types";
import * as fb from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { normalizeEventCode, validateEventCode } from "./event-code";

const PUBLIC_DIRECTORY_KEY = "stagex_public_events_directory";
export const PUBLIC_COLLECTION = "publicEvents";
export const LEGACY_PUBLIC_COLLECTION = "public_events";

export interface PublicEventBundle {
  event: Event;
  sessions: Session[];
  speakers: Speaker[];
  updatedAt: number;
  publicEnabled?: boolean;
  joinEnabled?: boolean;
  ownerUserId?: string;
}

export type PublicLookupResult =
  | { ok: true; bundle: PublicEventBundle }
  | { ok: false; reason: "NOT_FOUND" | "PUBLIC_DISABLED" | "JOIN_DISABLED" | "INVALID_CODE"; error: string; bundle?: PublicEventBundle };

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
 * Constructs a sanitized public document from private event data
 */
export function buildPublicEventDocument(
  event: Event,
  sessions: Session[] = [],
  speakers: Speaker[] = [],
  ownerUserId?: string
): PublicEventDoc {
  const codeKey = normalizeEventCode(event.accessCode);
  const now = Date.now();

  const publicSessions: Session[] = sessions
    .filter((s) => s.eventId === event.id)
    .map((s) => ({
      id: s.id,
      eventId: s.eventId,
      title: s.title,
      type: s.type,
      speakerId: s.speakerId,
      sessionDate: s.sessionDate,
      startTime: s.startTime,
      endTime: s.endTime,
      startDateTime: s.startDateTime,
      endDateTime: s.endDateTime,
      duration: s.duration,
      status: s.status,
      isFixedTime: s.isFixedTime,
      originalStartTime: s.originalStartTime || s.startTime,
      originalEndTime: s.originalEndTime || s.endTime,
      originalSessionDate: s.originalSessionDate || s.sessionDate,
      originalStartDateTime: s.originalStartDateTime || s.startDateTime,
      originalEndDateTime: s.originalEndDateTime || s.endDateTime,
      actualStartTime: s.actualStartTime ?? null,
      actualEndTime: s.actualEndTime ?? null,
      imageUrl: s.imageUrl ?? null,
    }));

  const publicSpeakers = speakers
    .filter((sp) => sp.eventId === event.id)
    .map((sp) => ({
      id: sp.id,
      eventId: sp.eventId,
      name: sp.name,
      designation: sp.designation,
      organization: sp.organization,
      bio: sp.bio,
      image: sp.image,
      createdAt: sp.createdAt,
    }));

  const publicResources = (event.resources || []).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    url: r.url,
    description: r.description,
    uploadedAt: r.uploadedAt,
    author: r.author,
    isLocalFile: r.isLocalFile,
    fileName: r.fileName,
    fileSize: r.fileSize,
    fileMimeType: r.fileMimeType,
    storagePath: r.storagePath || null,
  }));


  return {
    eventCode: codeKey,
    eventId: event.id,
    ownerUserId: ownerUserId || event.ownerUserId || "organizer",
    publicEnabled: event.publicEnabled !== false,
    joinEnabled: event.joinEnabled !== false,
    eventName: event.name,
    eventType: event.type,
    eventStatus: event.status || "Scheduled",
    scheduledStart: event.startDateTime || 0,
    scheduledEnd: event.endDateTime || 0,
    startDate: event.startDate || event.date || "",
    endDate: event.endDate || event.startDate || event.date || "",
    startTime: event.startTime || "09:00",
    endTime: event.endTime || "17:00",
    venue: event.venue || "",
    description: event.description || "",
    organizer: event.organizer || "",
    posterUrl: event.posterUrl || null,
    publicUpdatedAt: now,
    sessions: publicSessions,
    speakers: publicSpeakers,
    resources: publicResources,
  };
}

/**
 * Publishes an event to both the local cache and Cloud Firestore public registry
 * so audience members on any device/account can access it instantly.
 */
export function registerPublicEvent(
  event: Event,
  sessions: Session[] = [],
  speakers: Speaker[] = [],
  ownerUserId?: string
): void {
  if (!event || !event.accessCode) return;
  let codeKey: string;
  try {
    codeKey = normalizeEventCode(event.accessCode);
  } catch {
    return;
  }

  let authUid: string | undefined;
  try {
    const authInstance =
      typeof (fb as Record<string, unknown>).getFirebaseAuth === "function"
        ? ((fb as Record<string, unknown>).getFirebaseAuth as () => { currentUser?: { uid?: string } })()
        : ((fb as Record<string, unknown>).auth as { currentUser?: { uid?: string } } | undefined);
    authUid = authInstance?.currentUser?.uid;
  } catch {
    // ignore
  }

  const effectiveOwner = ownerUserId || event.ownerUserId || authUid || "organizer";
  const publicDoc = buildPublicEventDocument(event, sessions, speakers, effectiveOwner);

  const bundle: PublicEventBundle = {
    event: {
      ...event,
      accessCode: codeKey,
      publicEnabled: publicDoc.publicEnabled,
      joinEnabled: publicDoc.joinEnabled,
      ownerUserId: effectiveOwner,
    },
    sessions: publicDoc.sessions || [],
    speakers: publicDoc.speakers || [],
    updatedAt: publicDoc.publicUpdatedAt,
    publicEnabled: publicDoc.publicEnabled,
    joinEnabled: publicDoc.joinEnabled,
    ownerUserId: effectiveOwner,
  };

  // 1. Immediate local storage cache
  saveToLocalDirectory(codeKey, bundle);

  // 2. Asynchronously sync to Cloud Firestore publicEvents collection
  if (isCloudReady()) {
    try {
      const targetDb = getActiveDb();
      if (targetDb) {
        const payload = cleanUndefined({
          ...publicDoc,
          event: bundle.event,
          updatedAt: bundle.updatedAt,
        });

        // Primary: publicEvents/{code}
        const docRef = doc(targetDb as never, PUBLIC_COLLECTION, codeKey);
        setDoc(docRef, payload as never, { merge: true }).catch((err) => {
          console.warn(`[Public Events Firestore sync warning for ${codeKey}]:`, err);
        });

        // Backward compatibility: public_events/{code}
        const legacyRef = doc(targetDb as never, LEGACY_PUBLIC_COLLECTION, codeKey);
        setDoc(legacyRef, payload as never, { merge: true }).catch(() => {});
      }
    } catch (err) {
      console.warn(`[Public Events Firestore sync error for ${codeKey}]:`, err);
    }
  }
}

/**
 * Saves a verified public event bundle into client localStorage
 */
function saveToLocalDirectory(codeKey: string, bundle: PublicEventBundle): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(PUBLIC_DIRECTORY_KEY);
    const directory: Record<string, PublicEventBundle> = raw ? JSON.parse(raw) : {};
    directory[codeKey] = bundle;
    window.localStorage.setItem(PUBLIC_DIRECTORY_KEY, JSON.stringify(directory));
  } catch (err) {
    console.warn("[Public Events Registry local save warning]", err);
  }
}

/**
 * Removes an event from the local cache and Cloud Firestore public registry.
 * Also records a tombstone in deletedCodes to prevent immediate code reuse.
 */
export async function unregisterPublicEvent(accessCode?: string): Promise<void> {
  if (!accessCode) return;
  let codeKey: string;
  try {
    codeKey = normalizeEventCode(accessCode);
  } catch {
    return;
  }

  // 1. Invalidate client localStorage
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

  // 2. Invalidate Cloud Firestore documents
  if (isCloudReady()) {
    try {
      const targetDb = getActiveDb();
      if (targetDb) {
        // A. Remove public directory entry
        const docRef = doc(targetDb as never, PUBLIC_COLLECTION, codeKey);
        await deleteDoc(docRef).catch(() => {});

        // B. Remove legacy directory entry
        const legacyRef = doc(targetDb as never, LEGACY_PUBLIC_COLLECTION, codeKey);
        await deleteDoc(legacyRef).catch(() => {});

        // C. Record reserved/tombstone in deletedCodes to prevent immediate code reuse
        const deletedRef = doc(targetDb as never, "deletedCodes", codeKey);
        await setDoc(deletedRef, {
          eventCode: codeKey,
          isDeleted: true,
          deletedAt: Date.now(),
        } as never, { merge: true }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Parses raw Firestore document data into PublicEventBundle
 */
function parsePublicDocumentData(code: string, data: Record<string, unknown>): PublicEventBundle | null {
  if (!data) return null;

  // Check deleted status: if explicitly deleted, conceal event
  if (data.isDeleted === true) {
    return null;
  }

  // Check publicEnabled flag: if explicitly false, conceal event (prevent leak)
  if (data.publicEnabled === false) {
    return null;
  }

  // Exact code matching check
  if (data.eventCode && String(data.eventCode).trim().toUpperCase() !== code) {
    return null;
  }

  const rawEvent = (data.event as Partial<Event>) || {};

  const event: Event = {
    id: (data.eventId as string) || rawEvent.id || "event_" + code,
    name: (data.eventName as string) || rawEvent.name || "Event",
    type: (data.eventType as Event["type"]) || rawEvent.type || "Conference",
    status: (data.eventStatus as Event["status"]) || rawEvent.status || "Scheduled",
    date: (data.startDate as string) || rawEvent.date || rawEvent.startDate || "",
    startDate: (data.startDate as string) || rawEvent.startDate || "",
    endDate: (data.endDate as string) || rawEvent.endDate || (data.startDate as string) || "",
    venue: (data.venue as string) || rawEvent.venue || "",
    description: (data.description as string) ?? rawEvent.description ?? "",
    organizer: (data.organizer as string) ?? rawEvent.organizer ?? "",
    startTime: (data.startTime as string) || rawEvent.startTime || "09:00",
    endTime: (data.endTime as string) || rawEvent.endTime || "17:00",
    startDateTime: typeof data.scheduledStart === "number" ? data.scheduledStart : (rawEvent.startDateTime || 0),
    endDateTime: typeof data.scheduledEnd === "number" ? data.scheduledEnd : (rawEvent.endDateTime || 0),
    createdAt: typeof rawEvent.createdAt === "number" ? rawEvent.createdAt : Date.now(),
    updatedAt: typeof data.publicUpdatedAt === "number" ? data.publicUpdatedAt : (rawEvent.updatedAt || Date.now()),
    posterUrl: (data.posterUrl as string | null) ?? rawEvent.posterUrl ?? null,
    accessCode: code,
    resources: Array.isArray(data.resources)
      ? (data.resources as Event["resources"])
      : Array.isArray(rawEvent.resources)
      ? rawEvent.resources
      : [],
    endedAt: typeof rawEvent.endedAt === "number" ? rawEvent.endedAt : null,
    publicEnabled: data.publicEnabled !== false,
    joinEnabled: data.joinEnabled !== false,
    ownerUserId: (data.ownerUserId as string) || rawEvent.ownerUserId || "organizer",
  };

  const sessions = Array.isArray(data.sessions)
    ? (data.sessions as Session[])
    : Array.isArray(rawEvent)
    ? []
    : [];

  const speakers = Array.isArray(data.speakers)
    ? (data.speakers as Speaker[])
    : [];

  return {
    event,
    sessions,
    speakers,
    updatedAt: typeof data.publicUpdatedAt === "number" ? data.publicUpdatedAt : Date.now(),
    publicEnabled: event.publicEnabled,
    joinEnabled: event.joinEnabled,
    ownerUserId: event.ownerUserId,
  };
}

/**
 * Synchronously searches for an active event by 6-character code in current in-memory store.
 * Note: Never returns unverified stale localStorage to prevent resurrecting deleted events.
 */
export function findEventByAccessCode(
  rawCode: string,
  currentStoreEvents: Event[] = [],
  currentSessions: Session[] = [],
  currentSpeakers: Speaker[] = []
): PublicEventBundle | null {
  const validation = validateEventCode(rawCode);
  if (!validation.valid) return null;
  const code = validation.code;

  // Check current store events (only live, non-deleted events)
  const foundInStore = currentStoreEvents.find(
    (e) => (e.accessCode || "").trim().toUpperCase() === code
  );
  if (foundInStore) {
    if (foundInStore.publicEnabled === false || (foundInStore as unknown as Record<string, unknown>).isDeleted) {
      return null;
    }
    return {
      event: foundInStore,
      sessions: currentSessions.filter((s) => s.eventId === foundInStore.id),
      speakers: currentSpeakers.filter((s) => s.eventId === foundInStore.id),
      updatedAt: foundInStore.updatedAt,
      publicEnabled: true,
      joinEnabled: foundInStore.joinEnabled !== false,
      ownerUserId: foundInStore.ownerUserId,
    };
  }

  return null;
}

/**
 * Asynchronously searches for an event by 6-character code globally:
 * 1. Checks in-memory store for active organizer events.
 * 2. Fetches authoritative status from Cloud Firestore publicEvents/{code}.
 * 3. Falls back to server API endpoint (/api/events/audience?code=...).
 * 4. If not found or deleted on the server, purges local cache and returns null.
 */
export async function findEventByAccessCodeAsync(
  rawCode: string,
  currentStoreEvents: Event[] = [],
  currentSessions: Session[] = [],
  currentSpeakers: Speaker[] = []
): Promise<PublicEventBundle | null> {
  const validation = validateEventCode(rawCode);
  if (!validation.valid) return null;
  const code = validation.code;

  // Step 1: Check in-memory store (active organizer session)
  const storeMatch = currentStoreEvents.find(
    (e) => (e.accessCode || "").trim().toUpperCase() === code
  );
  if (storeMatch) {
    if (storeMatch.publicEnabled === false || (storeMatch as unknown as Record<string, unknown>).isDeleted) {
      return null;
    }
    return {
      event: storeMatch,
      sessions: currentSessions.filter((s) => s.eventId === storeMatch.id),
      speakers: currentSpeakers.filter((s) => s.eventId === storeMatch.id),
      updatedAt: storeMatch.updatedAt,
      publicEnabled: true,
      joinEnabled: storeMatch.joinEnabled !== false,
      ownerUserId: storeMatch.ownerUserId,
    };
  }

  // Step 2: Attempt authoritative Firestore direct client read from publicEvents/{code}
  if (isCloudReady()) {
    try {
      const targetDb = getActiveDb();
      if (targetDb) {
        // Try preferred publicEvents collection first
        let docRef = doc(targetDb as never, PUBLIC_COLLECTION, code);
        let snapshot = await getDoc(docRef);

        // If not found, check legacy public_events collection
        if (!snapshot || !snapshot.exists || !snapshot.exists()) {
          docRef = doc(targetDb as never, LEGACY_PUBLIC_COLLECTION, code);
          snapshot = await getDoc(docRef);
        }

        if (snapshot && typeof snapshot.exists === "function" && snapshot.exists()) {
          const data = snapshot.data() as Record<string, unknown>;
          if (data && data.isDeleted !== true && data.publicEnabled !== false) {
            const bundle = parsePublicDocumentData(code, data);
            if (bundle) {
              saveToLocalDirectory(code, bundle);
              return bundle;
            }
          }
        }
      }
    } catch (err) {
      console.warn(`[Firestore publicEvents lookup failed for ${code}]:`, err);
    }
  }

  // Step 3: Authoritative fallback to server API endpoint (/api/events/audience?code=...)
  if (typeof window !== "undefined") {
    try {
      const response = await fetch(`/api/events/audience?code=${encodeURIComponent(code)}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (response.ok) {
        const json = await response.json();
        if (json.ok && json.data && json.data.event) {
          const bundle = json.data as PublicEventBundle;
          if (
            bundle.publicEnabled !== false &&
            bundle.event.publicEnabled !== false &&
            (bundle.event as unknown as Record<string, unknown>).isDeleted !== true
          ) {
            saveToLocalDirectory(code, bundle);
            return bundle;
          }
        }
      }
    } catch (err) {
      console.warn(`[API publicEvents fallback failed for ${code}]:`, err);
    }
  }

  // Step 4: Event is deleted or not found on the server/Firestore.
  // Purge any stale entry from client localStorage so it never resurrects!
  await unregisterPublicEvent(code);
  return null;
}
