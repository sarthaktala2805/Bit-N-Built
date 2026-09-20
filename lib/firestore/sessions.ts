// StageX AI — Firestore Sessions Data Access Layer
// Manages Session CRUD & Batch Reordering in Cloud Firestore under users/{userId}/events/{eventId}/sessions/{sessionId}

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  collection,
  DocumentData,
  Firestore,
  FirestoreError,
} from "firebase/firestore";
import { db } from "../firebase";
import { Session, SessionStatus, SessionType } from "../../types";
import {
  getEventSessionsPath,
  getSessionDocPath,
} from "./paths";

/**
 * Clean serialization: ensures complete Session data is stored and undefined properties are removed
 */
export function serializeSession(session: Session): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: session.id,
    eventId: session.eventId,
    title: session.title,
    type: session.type,
    speakerId: session.speakerId ?? null,
    sessionDate: session.sessionDate,
    startTime: session.startTime,
    endTime: session.endTime,
    startDateTime: session.startDateTime,
    endDateTime: session.endDateTime,
    duration: session.duration,
    status: session.status,
    isFixedTime: !!session.isFixedTime,
    originalStartTime: session.originalStartTime,
    originalEndTime: session.originalEndTime,
    originalSessionDate: session.originalSessionDate,
    originalStartDateTime: session.originalStartDateTime,
    originalEndDateTime: session.originalEndDateTime,
    actualStartTime: session.actualStartTime ?? null,
    actualEndTime: session.actualEndTime ?? null,
    imageUrl: session.imageUrl ?? null,
  };

  return data;
}

/**
 * Deserializes Firestore DocumentData into standard StageX Session model
 */
export function deserializeSession(data: DocumentData, id: string, defaultEventId: string = ""): Session {
  const startTime = data.startTime || "09:00";
  const endTime = data.endTime || "09:30";
  const sessionDate = data.sessionDate || "2026-09-19";

  return {
    id: data.id || id,
    eventId: data.eventId || defaultEventId,
    title: data.title || "",
    type: (data.type as SessionType) || "Talk",
    speakerId: data.speakerId ?? null,
    sessionDate,
    startTime,
    endTime,
    startDateTime: typeof data.startDateTime === "number" ? data.startDateTime : 0,
    endDateTime: typeof data.endDateTime === "number" ? data.endDateTime : 0,
    duration: typeof data.duration === "number" ? data.duration : 30,
    status: (data.status as SessionStatus) || "Upcoming",
    isFixedTime: !!data.isFixedTime,
    originalStartTime: data.originalStartTime || startTime,
    originalEndTime: data.originalEndTime || endTime,
    originalSessionDate: data.originalSessionDate || sessionDate,
    originalStartDateTime: typeof data.originalStartDateTime === "number" ? data.originalStartDateTime : (data.startDateTime || 0),
    originalEndDateTime: typeof data.originalEndDateTime === "number" ? data.originalEndDateTime : (data.endDateTime || 0),
    actualStartTime: typeof data.actualStartTime === "number" ? data.actualStartTime : null,
    actualEndTime: typeof data.actualEndTime === "number" ? data.actualEndTime : null,
    imageUrl: data.imageUrl ?? null,
  };
}

/**
 * Helper to map Firestore error codes to friendly strings
 */
function handleFirestoreError(err: unknown): string {
  const code = (err as FirestoreError)?.code || "";
  switch (code) {
    case "permission-denied":
      return "Access denied: you do not have permission for this session record.";
    case "unauthenticated":
      return "User is not authenticated. Please log in.";
    case "unavailable":
      return "Cloud database is temporarily unreachable.";
    case "not-found":
      return "Session not found in cloud database.";
    default:
      return (err as Error)?.message || "An error occurred with Cloud Firestore.";
  }
}

/**
 * CREATE: Saves a session document to users/{userId}/events/{eventId}/sessions/{sessionId}
 */
export async function createSessionInFirestore(
  userId: string,
  eventId: string,
  session: Session,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to create session." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to create session." };
  }
  if (!session.id || !session.id.trim()) {
    return { ok: false, error: "Session ID is required to create session." };
  }

  try {
    const targetDb = customDb || db;
    const path = getSessionDocPath(userId, eventId, session.id);
    const sessionRef = doc(targetDb, path);
    const serialized = serializeSession({ ...session, eventId });
    await setDoc(sessionRef, serialized);
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore createSession warning] user=${userId} event=${eventId} session=${session.id}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ALL: Fetches all sessions for an event from users/{userId}/events/{eventId}/sessions
 */
export async function getSessionsFromFirestore(
  userId: string,
  eventId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: Session[]; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to fetch sessions." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to fetch sessions." };
  }

  try {
    const targetDb = customDb || db;
    const sessionsPath = getEventSessionsPath(userId, eventId);
    const sessionsRef = collection(targetDb, sessionsPath);
    const snapshot = await getDocs(sessionsRef);

    const sessions: Session[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        sessions.push(deserializeSession(docSnap.data(), docSnap.id, eventId));
      }
    });

    // Sort chronologically by startDateTime, then by startTime
    sessions.sort((a, b) => (a.startDateTime || 0) - (b.startDateTime || 0));

    return { ok: true, data: sessions };
  } catch (err) {
    console.warn(`[Firestore getSessions warning] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ONE: Fetches a specific session from users/{userId}/events/{eventId}/sessions/{sessionId}
 */
export async function getSessionFromFirestore(
  userId: string,
  eventId: string,
  sessionId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: Session; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }
  if (!sessionId || !sessionId.trim()) {
    return { ok: false, error: "Session ID is required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getSessionDocPath(userId, eventId, sessionId);
    const sessionRef = doc(targetDb, path);
    const docSnap = await getDoc(sessionRef);

    if (!docSnap.exists()) {
      return { ok: false, error: "Session not found." };
    }

    return { ok: true, data: deserializeSession(docSnap.data(), docSnap.id, eventId) };
  } catch (err) {
    console.warn(`[Firestore getSession warning] user=${userId} event=${eventId} session=${sessionId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * UPDATE: Updates specific fields on an existing session document
 */
export async function updateSessionInFirestore(
  userId: string,
  eventId: string,
  sessionId: string,
  data: Partial<Session>,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to update session." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to update session." };
  }
  if (!sessionId || !sessionId.trim()) {
    return { ok: false, error: "Session ID is required to update session." };
  }

  try {
    const targetDb = customDb || db;
    const path = getSessionDocPath(userId, eventId, sessionId);
    const sessionRef = doc(targetDb, path);

    // Clean undefined values
    const cleanUpdate: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        cleanUpdate[k] = v;
      }
    }

    await updateDoc(sessionRef, cleanUpdate);
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore updateSession warning] user=${userId} event=${eventId} session=${sessionId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * DELETE: Deletes a session document
 */
export async function deleteSessionInFirestore(
  userId: string,
  eventId: string,
  sessionId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to delete session." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to delete session." };
  }
  if (!sessionId || !sessionId.trim()) {
    return { ok: false, error: "Session ID is required to delete session." };
  }

  try {
    const targetDb = customDb || db;
    const path = getSessionDocPath(userId, eventId, sessionId);
    const sessionRef = doc(targetDb, path);
    await deleteDoc(sessionRef);
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore deleteSession warning] user=${userId} event=${eventId} session=${sessionId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * BATCH UPDATE: Atomically updates multiple sessions (e.g. after reordering or slot re-flow)
 */
export async function batchUpdateSessionsInFirestore(
  userId: string,
  eventId: string,
  sessions: Session[],
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }
  if (!sessions || sessions.length === 0) {
    return { ok: true };
  }

  try {
    const targetDb = customDb || db;
    const batch = writeBatch(targetDb);

    for (const s of sessions) {
      const path = getSessionDocPath(userId, eventId, s.id);
      const sessionRef = doc(targetDb, path);
      batch.update(sessionRef, {
        startTime: s.startTime,
        endTime: s.endTime,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        duration: s.duration,
        sessionDate: s.sessionDate,
      });
    }

    await batch.commit();
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore batchUpdateSessions warning] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}
