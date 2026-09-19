// StageX AI — Firestore Emergencies Data Access Layer
// Manages Emergency CRUD & Resolution in Cloud Firestore under users/{userId}/events/{eventId}/emergencies/{emergencyId}

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
import { Emergency, EmergencyType } from "../../types";
import {
  getEventEmergenciesPath,
  getEmergencyDocPath,
} from "./paths";

/**
 * Clean serialization: ensures complete Emergency data is stored and undefined properties are removed
 */
export function serializeEmergency(emergency: Emergency): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: emergency.id,
    eventId: emergency.eventId,
    type: emergency.type,
    timestamp: emergency.timestamp,
    resolved: !!emergency.resolved,
  };

  if (emergency.description !== undefined) {
    data.description = emergency.description;
  }
  if (emergency.resolvedAt !== undefined) {
    data.resolvedAt = emergency.resolvedAt;
  }

  return data;
}

/**
 * Deserializes Firestore DocumentData into standard StageX Emergency model
 */
export function deserializeEmergency(data: DocumentData, id: string, defaultEventId: string = ""): Emergency {
  return {
    id: data.id || id,
    eventId: data.eventId || defaultEventId,
    type: (data.type as EmergencyType) || "Custom Issue",
    description: data.description ?? undefined,
    timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now(),
    resolved: !!data.resolved,
    resolvedAt: typeof data.resolvedAt === "number" ? data.resolvedAt : (data.resolvedAt === null ? null : undefined),
  };
}

/**
 * Helper to map Firestore error codes to friendly strings
 */
function handleFirestoreError(err: unknown): string {
  const code = (err as FirestoreError)?.code || "";
  switch (code) {
    case "permission-denied":
      return "Access denied: you do not have permission for this emergency record.";
    case "unauthenticated":
      return "User is not authenticated. Please log in.";
    case "unavailable":
      return "Cloud database is temporarily unreachable.";
    case "not-found":
      return "Emergency record not found in cloud database.";
    default:
      return (err as Error)?.message || "An error occurred with Cloud Firestore.";
  }
}

/**
 * CREATE: Saves an emergency document to users/{userId}/events/{eventId}/emergencies/{emergencyId}
 */
export async function createEmergencyInFirestore(
  userId: string,
  eventId: string,
  emergency: Emergency,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to create emergency record." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to create emergency record." };
  }
  if (!emergency.id || !emergency.id.trim()) {
    return { ok: false, error: "Emergency ID is required to create emergency record." };
  }

  try {
    const targetDb = customDb || db;
    const path = getEmergencyDocPath(userId, eventId, emergency.id);
    const emergencyRef = doc(targetDb, path);
    const serialized = serializeEmergency({ ...emergency, eventId });
    await setDoc(emergencyRef, serialized);
    return { ok: true };
  } catch (err) {
    console.error(`[Firestore createEmergency error] user=${userId} event=${eventId} emergency=${emergency.id}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ALL: Fetches all emergency records for an event from users/{userId}/events/{eventId}/emergencies
 */
export async function getEmergenciesFromFirestore(
  userId: string,
  eventId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: Emergency[]; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to fetch emergency records." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to fetch emergency records." };
  }

  try {
    const targetDb = customDb || db;
    const emergenciesPath = getEventEmergenciesPath(userId, eventId);
    const emergenciesRef = collection(targetDb, emergenciesPath);
    const snapshot = await getDocs(emergenciesRef);

    const emergencies: Emergency[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        emergencies.push(deserializeEmergency(docSnap.data(), docSnap.id, eventId));
      }
    });

    // Chronological sort oldest to newest
    emergencies.sort((a, b) => a.timestamp - b.timestamp);

    return { ok: true, data: emergencies };
  } catch (err) {
    console.error(`[Firestore getEmergencies error] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ONE: Fetches a specific emergency record from users/{userId}/events/{eventId}/emergencies/{emergencyId}
 */
export async function getEmergencyFromFirestore(
  userId: string,
  eventId: string,
  emergencyId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: Emergency; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }
  if (!emergencyId || !emergencyId.trim()) {
    return { ok: false, error: "Emergency ID is required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getEmergencyDocPath(userId, eventId, emergencyId);
    const emergencyRef = doc(targetDb, path);
    const docSnap = await getDoc(emergencyRef);

    if (!docSnap.exists()) {
      return { ok: false, error: "Emergency record not found." };
    }

    return { ok: true, data: deserializeEmergency(docSnap.data(), docSnap.id, eventId) };
  } catch (err) {
    console.error(`[Firestore getEmergency error] user=${userId} event=${eventId} emergency=${emergencyId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * UPDATE: Updates specific fields on an existing emergency document (e.g. resolution)
 */
export async function updateEmergencyInFirestore(
  userId: string,
  eventId: string,
  emergencyId: string,
  data: Partial<Emergency>,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to update emergency record." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to update emergency record." };
  }
  if (!emergencyId || !emergencyId.trim()) {
    return { ok: false, error: "Emergency ID is required to update emergency record." };
  }

  try {
    const targetDb = customDb || db;
    const path = getEmergencyDocPath(userId, eventId, emergencyId);
    const emergencyRef = doc(targetDb, path);

    // Clean undefined values
    const cleanUpdate: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        cleanUpdate[k] = v;
      }
    }

    await updateDoc(emergencyRef, cleanUpdate);
    return { ok: true };
  } catch (err) {
    console.error(`[Firestore updateEmergency error] user=${userId} event=${eventId} emergency=${emergencyId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * DELETE: Deletes an emergency document
 */
export async function deleteEmergencyInFirestore(
  userId: string,
  eventId: string,
  emergencyId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to delete emergency record." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to delete emergency record." };
  }
  if (!emergencyId || !emergencyId.trim()) {
    return { ok: false, error: "Emergency ID is required to delete emergency record." };
  }

  try {
    const targetDb = customDb || db;
    const path = getEmergencyDocPath(userId, eventId, emergencyId);
    const emergencyRef = doc(targetDb, path);
    await deleteDoc(emergencyRef);
    return { ok: true };
  } catch (err) {
    console.error(`[Firestore deleteEmergency error] user=${userId} event=${eventId} emergency=${emergencyId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}
