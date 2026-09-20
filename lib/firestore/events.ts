// StageX AI — Firestore Events Data Access Layer
// Manages Event CRUD in Cloud Firestore under users/{userId}/events/{eventId}

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  collection,
  DocumentData,
  Firestore,
  FirestoreError,
} from "firebase/firestore";
import { db } from "../firebase";
import { Event } from "../../types";
import {
  getUserEventsPath,
  getEventDocPath,
} from "./paths";

/**
 * Clean serialization: ensures no `undefined` properties are sent to Firestore
 */
export function serializeEvent(event: Event): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: event.id,
    name: event.name,
    type: event.type,
    date: event.date,
    startDate: event.startDate,
    endDate: event.endDate,
    venue: event.venue,
    startTime: event.startTime,
    endTime: event.endTime,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };

  if (event.description !== undefined) {
    data.description = event.description;
  }
  if (event.organizer !== undefined) {
    data.organizer = event.organizer;
  }
  if (event.status !== undefined) {
    data.status = event.status;
  }
  if (event.posterUrl !== undefined) {
    data.posterUrl = event.posterUrl;
  }
  if (event.accessCode !== undefined) {
    data.accessCode = event.accessCode;
  }
  if (event.resources !== undefined) {
    data.resources = event.resources;
  }
  if (event.endedAt !== undefined) {
    data.endedAt = event.endedAt;
  }

  return data;
}

/**
 * Deserializes Firestore DocumentData into standard StageX Event model
 */
export function deserializeEvent(data: DocumentData, id: string): Event {
  return {
    id: data.id || id,
    name: data.name || "",
    type: data.type || "Other",
    status: data.status || "Scheduled",
    date: data.date || data.startDate || "",
    startDate: data.startDate || data.date || "",
    endDate: data.endDate || data.startDate || data.date || "",
    venue: data.venue || "",
    description: data.description ?? "",
    organizer: data.organizer ?? "",
    startTime: data.startTime || "09:00",
    endTime: data.endTime || "17:00",
    startDateTime: typeof data.startDateTime === "number" ? data.startDateTime : 0,
    endDateTime: typeof data.endDateTime === "number" ? data.endDateTime : 0,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
    posterUrl: data.posterUrl ?? null,
    accessCode: data.accessCode || undefined,
    resources: Array.isArray(data.resources) ? data.resources : [],
    endedAt: typeof data.endedAt === "number" ? data.endedAt : null,
  };
}

/**
 * Helper to map Firestore error codes to friendly strings
 */
function handleFirestoreError(err: unknown): string {
  const code = (err as FirestoreError)?.code || "";
  switch (code) {
    case "permission-denied":
      return "Access denied: you do not have permission for this record.";
    case "unauthenticated":
      return "User is not authenticated. Please log in.";
    case "unavailable":
      return "Cloud database is temporarily unreachable.";
    case "not-found":
      return "Event not found in cloud database.";
    default:
      return (err as Error)?.message || "An error occurred with Cloud Firestore.";
  }
}

/**
 * CREATE: Saves an event document to users/{userId}/events/{eventId}
 */
export async function createEventInFirestore(
  userId: string,
  event: Event,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to create event." };
  }

  try {
    const targetDb = customDb || db;
    const path = getEventDocPath(userId, event.id);
    const eventRef = doc(targetDb, path);
    const serialized = serializeEvent(event);
    await setDoc(eventRef, serialized);
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore createEvent warning] user=${userId} event=${event.id}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ALL: Fetches all events owned by the user from users/{userId}/events
 */
export async function getEventsFromFirestore(
  userId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: Event[]; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to fetch events." };
  }

  try {
    const targetDb = customDb || db;
    const eventsPath = getUserEventsPath(userId);
    const eventsRef = collection(targetDb, eventsPath);
    const snapshot = await getDocs(eventsRef);

    const events: Event[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        events.push(deserializeEvent(docSnap.data(), docSnap.id));
      }
    });

    // Sort newest created first
    events.sort((a, b) => b.createdAt - a.createdAt);

    return { ok: true, data: events };
  } catch (err) {
    console.warn(`[Firestore getEvents warning] user=${userId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ONE: Fetches a specific event document by ID from users/{userId}/events/{eventId}
 */
export async function getEventFromFirestore(
  userId: string,
  eventId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: Event; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getEventDocPath(userId, eventId);
    const eventRef = doc(targetDb, path);
    const docSnap = await getDoc(eventRef);

    if (!docSnap.exists()) {
      return { ok: false, error: "Event not found." };
    }

    return { ok: true, data: deserializeEvent(docSnap.data(), docSnap.id) };
  } catch (err) {
    console.warn(`[Firestore getEvent warning] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * UPDATE: Updates specific fields on an existing event document
 */
export async function updateEventInFirestore(
  userId: string,
  eventId: string,
  data: Partial<Event>,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to update event." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getEventDocPath(userId, eventId);
    const eventRef = doc(targetDb, path);

    // Clean undefined values
    const cleanUpdate: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        cleanUpdate[k] = v;
      }
    }
    cleanUpdate.updatedAt = Date.now();

    await updateDoc(eventRef, cleanUpdate);
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore updateEvent warning] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * DELETE: Deletes an event and cascades to its subcollections using a batch
 */
export async function deleteEventFromFirestore(
  userId: string,
  eventId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to delete event." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }

  try {
    const targetDb = customDb || db;
    const batch = writeBatch(targetDb);

    // Query and cascade delete documents in each subcollection for this event
    const subcollections = [
      "speakers",
      "sessions",
      "delays",
      "emergencies",
      "aiRecords",
      "activityLogs",
    ];

    for (const sub of subcollections) {
      const subRef = collection(targetDb, "users", userId, "events", eventId, sub);
      const snap = await getDocs(subRef);
      snap.forEach((d) => batch.delete(d.ref));
    }

    // Delete the event document itself
    const eventRef = doc(targetDb, getEventDocPath(userId, eventId));
    batch.delete(eventRef);

    await batch.commit();
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore deleteEvent warning] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}
