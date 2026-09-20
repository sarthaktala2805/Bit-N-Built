// StageX AI — Firestore Activity Logs Data Access Layer
// Manages ActivityLog CRUD in Cloud Firestore under users/{userId}/events/{eventId}/activityLogs/{logId}

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  collection,
  DocumentData,
  Firestore,
  FirestoreError,
} from "firebase/firestore";
import { db } from "../firebase";
import { ActivityLog, ActivityLogType } from "../../types";
import {
  getEventActivityLogsPath,
  getActivityLogDocPath,
} from "./paths";

/**
 * Clean serialization: ensures complete ActivityLog data is stored and undefined properties are removed
 */
export function serializeActivityLog(log: ActivityLog): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: log.id,
    eventId: log.eventId,
    type: log.type,
    message: log.message,
    timestamp: log.timestamp,
  };

  if (log.meta !== undefined) {
    data.meta = log.meta;
  }

  return data;
}

/**
 * Deserializes Firestore DocumentData into standard StageX ActivityLog model
 */
export function deserializeActivityLog(data: DocumentData, id: string, defaultEventId: string = ""): ActivityLog {
  return {
    id: data.id || id,
    eventId: data.eventId || defaultEventId,
    type: (data.type as ActivityLogType) || "event_updated",
    message: data.message || "",
    timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now(),
    meta: data.meta ? (data.meta as Record<string, unknown>) : undefined,
  };
}

/**
 * Helper to map Firestore error codes to friendly strings
 */
function handleFirestoreError(err: unknown): string {
  const code = (err as FirestoreError)?.code || "";
  switch (code) {
    case "permission-denied":
      return "Access denied: you do not have permission for this activity log record.";
    case "unauthenticated":
      return "User is not authenticated. Please log in.";
    case "unavailable":
      return "Cloud database is temporarily unreachable.";
    case "not-found":
      return "Activity log record not found in cloud database.";
    default:
      return (err as Error)?.message || "An error occurred with Cloud Firestore.";
  }
}

/**
 * CREATE: Saves an activity log document to users/{userId}/events/{eventId}/activityLogs/{logId}
 */
export async function createActivityLogInFirestore(
  userId: string,
  eventId: string,
  activityLog: ActivityLog,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to create activity log." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to create activity log." };
  }
  if (!activityLog.id || !activityLog.id.trim()) {
    return { ok: false, error: "Log ID is required to create activity log." };
  }

  try {
    const targetDb = customDb || db;
    const path = getActivityLogDocPath(userId, eventId, activityLog.id);
    const logRef = doc(targetDb, path);
    const serialized = serializeActivityLog({ ...activityLog, eventId });
    await setDoc(logRef, serialized);
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore createActivityLog warning] user=${userId} event=${eventId} log=${activityLog.id}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * BATCH CREATE: Atomically writes multiple activity logs
 */
export async function batchCreateActivityLogsInFirestore(
  userId: string,
  eventId: string,
  logs: ActivityLog[],
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }
  if (!logs || logs.length === 0) {
    return { ok: true };
  }

  try {
    const targetDb = customDb || db;
    const batch = writeBatch(targetDb);

    for (const log of logs) {
      const path = getActivityLogDocPath(userId, eventId, log.id);
      const logRef = doc(targetDb, path);
      batch.set(logRef, serializeActivityLog({ ...log, eventId }));
    }

    await batch.commit();
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore batchCreateActivityLogs warning] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ALL: Fetches all activity logs for an event from users/{userId}/events/{eventId}/activityLogs
 */
export async function getActivityLogsFromFirestore(
  userId: string,
  eventId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: ActivityLog[]; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to fetch activity logs." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to fetch activity logs." };
  }

  try {
    const targetDb = customDb || db;
    const logsPath = getEventActivityLogsPath(userId, eventId);
    const logsRef = collection(targetDb, logsPath);
    const snapshot = await getDocs(logsRef);

    const logs: ActivityLog[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        logs.push(deserializeActivityLog(docSnap.data(), docSnap.id, eventId));
      }
    });

    // Sort newest first
    logs.sort((a, b) => b.timestamp - a.timestamp);

    return { ok: true, data: logs };
  } catch (err) {
    console.warn(`[Firestore getActivityLogs warning] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ONE: Fetches a specific activity log record from users/{userId}/events/{eventId}/activityLogs/{logId}
 */
export async function getActivityLogFromFirestore(
  userId: string,
  eventId: string,
  logId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: ActivityLog; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }
  if (!logId || !logId.trim()) {
    return { ok: false, error: "Log ID is required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getActivityLogDocPath(userId, eventId, logId);
    const logRef = doc(targetDb, path);
    const docSnap = await getDoc(logRef);

    if (!docSnap.exists()) {
      return { ok: false, error: "Activity log record not found." };
    }

    return { ok: true, data: deserializeActivityLog(docSnap.data(), docSnap.id, eventId) };
  } catch (err) {
    console.warn(`[Firestore getActivityLog warning] user=${userId} event=${eventId} log=${logId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * DELETE: Deletes an activity log document
 */
export async function deleteActivityLogInFirestore(
  userId: string,
  eventId: string,
  logId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to delete activity log." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to delete activity log." };
  }
  if (!logId || !logId.trim()) {
    return { ok: false, error: "Log ID is required to delete activity log." };
  }

  try {
    const targetDb = customDb || db;
    const path = getActivityLogDocPath(userId, eventId, logId);
    const logRef = doc(targetDb, path);
    await deleteDoc(logRef);
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore deleteActivityLog warning] user=${userId} event=${eventId} log=${logId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}
