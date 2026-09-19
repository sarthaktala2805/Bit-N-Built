// StageX AI — Firestore AI Records Data Access Layer
// Manages AIRecord CRUD in Cloud Firestore under users/{userId}/events/{eventId}/aiRecords/{aiRecordId}

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
import { AIRecord, AIRecordType } from "../../types";
import {
  getEventAIRecordsPath,
  getAIRecordDocPath,
} from "./paths";

/**
 * Clean serialization: ensures complete AIRecord data is stored and undefined properties are removed
 */
export function serializeAIRecord(record: AIRecord): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: record.id,
    eventId: record.eventId,
    type: record.type,
    prompt: record.prompt,
    generatedText: record.generatedText,
    timestamp: record.timestamp,
  };

  if (record.editedText !== undefined) {
    data.editedText = record.editedText;
  }

  return data;
}

/**
 * Deserializes Firestore DocumentData into standard StageX AIRecord model
 */
export function deserializeAIRecord(data: DocumentData, id: string, defaultEventId: string = ""): AIRecord {
  return {
    id: data.id || id,
    eventId: data.eventId || defaultEventId,
    type: (data.type as AIRecordType) || "copilot",
    prompt: data.prompt || "",
    generatedText: data.generatedText || "",
    editedText: data.editedText ?? undefined,
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
      return "Access denied: you do not have permission for this AI record.";
    case "unauthenticated":
      return "User is not authenticated. Please log in.";
    case "unavailable":
      return "Cloud database is temporarily unreachable.";
    case "not-found":
      return "AI record not found in cloud database.";
    default:
      return (err as Error)?.message || "An error occurred with Cloud Firestore.";
  }
}

/**
 * CREATE: Saves an AI record document to users/{userId}/events/{eventId}/aiRecords/{aiRecordId}
 */
export async function createAIRecordInFirestore(
  userId: string,
  eventId: string,
  aiRecord: AIRecord,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to create AI record." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to create AI record." };
  }
  if (!aiRecord.id || !aiRecord.id.trim()) {
    return { ok: false, error: "AI Record ID is required to create AI record." };
  }

  try {
    const targetDb = customDb || db;
    const path = getAIRecordDocPath(userId, eventId, aiRecord.id);
    const recordRef = doc(targetDb, path);
    const serialized = serializeAIRecord({ ...aiRecord, eventId });
    await setDoc(recordRef, serialized);
    return { ok: true };
  } catch (err) {
    console.error(`[Firestore createAIRecord error] user=${userId} event=${eventId} record=${aiRecord.id}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ALL: Fetches all AI records for an event from users/{userId}/events/{eventId}/aiRecords
 */
export async function getAIRecordsFromFirestore(
  userId: string,
  eventId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: AIRecord[]; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to fetch AI records." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to fetch AI records." };
  }

  try {
    const targetDb = customDb || db;
    const recordsPath = getEventAIRecordsPath(userId, eventId);
    const recordsRef = collection(targetDb, recordsPath);
    const snapshot = await getDocs(recordsRef);

    const records: AIRecord[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        records.push(deserializeAIRecord(docSnap.data(), docSnap.id, eventId));
      }
    });

    // Sort newest first
    records.sort((a, b) => b.timestamp - a.timestamp);

    return { ok: true, data: records };
  } catch (err) {
    console.error(`[Firestore getAIRecords error] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ONE: Fetches a specific AI record from users/{userId}/events/{eventId}/aiRecords/{aiRecordId}
 */
export async function getAIRecordFromFirestore(
  userId: string,
  eventId: string,
  aiRecordId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: AIRecord; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }
  if (!aiRecordId || !aiRecordId.trim()) {
    return { ok: false, error: "AI Record ID is required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getAIRecordDocPath(userId, eventId, aiRecordId);
    const recordRef = doc(targetDb, path);
    const docSnap = await getDoc(recordRef);

    if (!docSnap.exists()) {
      return { ok: false, error: "AI record not found." };
    }

    return { ok: true, data: deserializeAIRecord(docSnap.data(), docSnap.id, eventId) };
  } catch (err) {
    console.error(`[Firestore getAIRecord error] user=${userId} event=${eventId} record=${aiRecordId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * UPDATE: Updates specific fields on an existing AI record document
 */
export async function updateAIRecordInFirestore(
  userId: string,
  eventId: string,
  aiRecordId: string,
  data: Partial<AIRecord>,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to update AI record." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to update AI record." };
  }
  if (!aiRecordId || !aiRecordId.trim()) {
    return { ok: false, error: "AI Record ID is required to update AI record." };
  }

  try {
    const targetDb = customDb || db;
    const path = getAIRecordDocPath(userId, eventId, aiRecordId);
    const recordRef = doc(targetDb, path);

    // Clean undefined values
    const cleanUpdate: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        cleanUpdate[k] = v;
      }
    }

    await updateDoc(recordRef, cleanUpdate);
    return { ok: true };
  } catch (err) {
    console.error(`[Firestore updateAIRecord error] user=${userId} event=${eventId} record=${aiRecordId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * DELETE: Deletes an AI record document
 */
export async function deleteAIRecordInFirestore(
  userId: string,
  eventId: string,
  aiRecordId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to delete AI record." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to delete AI record." };
  }
  if (!aiRecordId || !aiRecordId.trim()) {
    return { ok: false, error: "AI Record ID is required to delete AI record." };
  }

  try {
    const targetDb = customDb || db;
    const path = getAIRecordDocPath(userId, eventId, aiRecordId);
    const recordRef = doc(targetDb, path);
    await deleteDoc(recordRef);
    return { ok: true };
  } catch (err) {
    console.error(`[Firestore deleteAIRecord error] user=${userId} event=${eventId} record=${aiRecordId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}
