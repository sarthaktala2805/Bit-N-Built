// StageX AI — Firestore Delays Data Access Layer
// Manages DelayRecord CRUD in Cloud Firestore under users/{userId}/events/{eventId}/delays/{delayId}

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  DocumentData,
  Firestore,
  FirestoreError,
} from "firebase/firestore";
import { db } from "../firebase";
import { DelayRecord } from "../../types";
import {
  getEventDelaysPath,
  getDelayDocPath,
} from "./paths";

/**
 * Clean serialization: ensures complete DelayRecord data is stored and undefined properties are removed
 */
export function serializeDelay(delay: DelayRecord): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: delay.id,
    eventId: delay.eventId,
    sessionId: delay.sessionId,
    minutes: delay.minutes,
    timestamp: delay.timestamp,
  };

  if (delay.reason !== undefined) {
    data.reason = delay.reason;
  }

  return data;
}

/**
 * Deserializes Firestore DocumentData into standard StageX DelayRecord model
 */
export function deserializeDelay(data: DocumentData, id: string, defaultEventId: string = ""): DelayRecord {
  return {
    id: data.id || id,
    eventId: data.eventId || defaultEventId,
    sessionId: data.sessionId || "",
    minutes: typeof data.minutes === "number" ? data.minutes : 0,
    reason: data.reason ?? undefined,
    timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now(),
  };
}

/**
 * Helper to map Firestore error codes to friendly strings
 */
function handleFirestoreError(err: unknown): string {
  const code = (err as FirestoreError)?.code || "";
  switch (code) {
    case "permission-denied":
      return "Access denied: you do not have permission for this delay record.";
    case "unauthenticated":
      return "User is not authenticated. Please log in.";
    case "unavailable":
      return "Cloud database is temporarily unreachable.";
    case "not-found":
      return "Delay record not found in cloud database.";
    default:
      return (err as Error)?.message || "An error occurred with Cloud Firestore.";
  }
}

/**
 * CREATE: Saves a delay document to users/{userId}/events/{eventId}/delays/{delayId}
 */
export async function createDelayInFirestore(
  userId: string,
  eventId: string,
  delay: DelayRecord,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to create delay record." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to create delay record." };
  }
  if (!delay.id || !delay.id.trim()) {
    return { ok: false, error: "Delay ID is required to create delay record." };
  }

  try {
    const targetDb = customDb || db;
    const path = getDelayDocPath(userId, eventId, delay.id);
    const delayRef = doc(targetDb, path);
    const serialized = serializeDelay({ ...delay, eventId });
    await setDoc(delayRef, serialized);
    return { ok: true };
  } catch (err) {
    console.error(`[Firestore createDelay error] user=${userId} event=${eventId} delay=${delay.id}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ALL: Fetches all delay records for an event from users/{userId}/events/{eventId}/delays
 */
export async function getDelaysFromFirestore(
  userId: string,
  eventId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: DelayRecord[]; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to fetch delay records." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to fetch delay records." };
  }

  try {
    const targetDb = customDb || db;
    const delaysPath = getEventDelaysPath(userId, eventId);
    const delaysRef = collection(targetDb, delaysPath);
    const snapshot = await getDocs(delaysRef);

    const delays: DelayRecord[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        delays.push(deserializeDelay(docSnap.data(), docSnap.id, eventId));
      }
    });

    // Chronological sort oldest to newest
    delays.sort((a, b) => a.timestamp - b.timestamp);

    return { ok: true, data: delays };
  } catch (err) {
    console.error(`[Firestore getDelays error] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ONE: Fetches a specific delay record from users/{userId}/events/{eventId}/delays/{delayId}
 */
export async function getDelayFromFirestore(
  userId: string,
  eventId: string,
  delayId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: DelayRecord; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }
  if (!delayId || !delayId.trim()) {
    return { ok: false, error: "Delay ID is required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getDelayDocPath(userId, eventId, delayId);
    const delayRef = doc(targetDb, path);
    const docSnap = await getDoc(delayRef);

    if (!docSnap.exists()) {
      return { ok: false, error: "Delay record not found." };
    }

    return { ok: true, data: deserializeDelay(docSnap.data(), docSnap.id, eventId) };
  } catch (err) {
    console.error(`[Firestore getDelay error] user=${userId} event=${eventId} delay=${delayId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * UPDATE: Updates specific fields on an existing delay document
 */
export async function updateDelayInFirestore(
  userId: string,
  eventId: string,
  delayId: string,
  data: Partial<DelayRecord>,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to update delay record." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to update delay record." };
  }
  if (!delayId || !delayId.trim()) {
    return { ok: false, error: "Delay ID is required to update delay record." };
  }

  try {
    const targetDb = customDb || db;
    const path = getDelayDocPath(userId, eventId, delayId);
    const delayRef = doc(targetDb, path);

    // Clean undefined values
    const cleanUpdate: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        cleanUpdate[k] = v;
      }
    }

    await updateDoc(delayRef, cleanUpdate);
    return { ok: true };
  } catch (err) {
    console.error(`[Firestore updateDelay error] user=${userId} event=${eventId} delay=${delayId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * DELETE: Deletes a delay document
 */
export async function deleteDelayInFirestore(
  userId: string,
  eventId: string,
  delayId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to delete delay record." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to delete delay record." };
  }
  if (!delayId || !delayId.trim()) {
    return { ok: false, error: "Delay ID is required to delete delay record." };
  }

  try {
    const targetDb = customDb || db;
    const path = getDelayDocPath(userId, eventId, delayId);
    const delayRef = doc(targetDb, path);
    await deleteDoc(delayRef);
    return { ok: true };
  } catch (err) {
    console.error(`[Firestore deleteDelay error] user=${userId} event=${eventId} delay=${delayId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}
