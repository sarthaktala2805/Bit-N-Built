// StageX AI — Firestore Speakers Data Access Layer
// Manages Speaker CRUD in Cloud Firestore under users/{userId}/events/{eventId}/speakers/{speakerId}

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
import { Speaker } from "../../types";
import {
  getEventSpeakersPath,
  getSpeakerDocPath,
} from "./paths";

/**
 * Clean serialization: ensures no `undefined` properties are sent to Firestore
 */
export function serializeSpeaker(speaker: Speaker): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: speaker.id,
    eventId: speaker.eventId,
    name: speaker.name,
    createdAt: speaker.createdAt,
  };

  if (speaker.designation !== undefined) {
    data.designation = speaker.designation;
  }
  if (speaker.organization !== undefined) {
    data.organization = speaker.organization;
  }
  if (speaker.bio !== undefined) {
    data.bio = speaker.bio;
  }
  if (speaker.image !== undefined) {
    data.image = speaker.image;
  }

  return data;
}

/**
 * Deserializes Firestore DocumentData into standard StageX Speaker model
 */
export function deserializeSpeaker(data: DocumentData, id: string, defaultEventId: string = ""): Speaker {
  return {
    id: data.id || id,
    eventId: data.eventId || defaultEventId,
    name: data.name || "",
    designation: data.designation ?? "",
    organization: data.organization ?? "",
    bio: data.bio ?? "",
    image: data.image ?? null,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
  };
}

/**
 * Helper to map Firestore error codes to friendly strings
 */
function handleFirestoreError(err: unknown): string {
  const code = (err as FirestoreError)?.code || "";
  switch (code) {
    case "permission-denied":
      return "Access denied: you do not have permission for this speaker record.";
    case "unauthenticated":
      return "User is not authenticated. Please log in.";
    case "unavailable":
      return "Cloud database is temporarily unreachable.";
    case "not-found":
      return "Speaker not found in cloud database.";
    default:
      return (err as Error)?.message || "An error occurred with Cloud Firestore.";
  }
}

/**
 * CREATE: Saves a speaker document to users/{userId}/events/{eventId}/speakers/{speakerId}
 */
export async function createSpeakerInFirestore(
  userId: string,
  eventId: string,
  speaker: Speaker,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to create speaker." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to create speaker." };
  }
  if (!speaker.id || !speaker.id.trim()) {
    return { ok: false, error: "Speaker ID is required to create speaker." };
  }

  try {
    const targetDb = customDb || db;
    const path = getSpeakerDocPath(userId, eventId, speaker.id);
    const speakerRef = doc(targetDb, path);
    const serialized = serializeSpeaker({ ...speaker, eventId });
    await setDoc(speakerRef, serialized);
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore createSpeaker warning] user=${userId} event=${eventId} speaker=${speaker.id}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ALL: Fetches all speakers for an event from users/{userId}/events/{eventId}/speakers
 */
export async function getSpeakersFromFirestore(
  userId: string,
  eventId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: Speaker[]; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to fetch speakers." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to fetch speakers." };
  }

  try {
    const targetDb = customDb || db;
    const speakersPath = getEventSpeakersPath(userId, eventId);
    const speakersRef = collection(targetDb, speakersPath);
    const snapshot = await getDocs(speakersRef);

    const speakers: Speaker[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        speakers.push(deserializeSpeaker(docSnap.data(), docSnap.id, eventId));
      }
    });

    // Sort oldest created first
    speakers.sort((a, b) => a.createdAt - b.createdAt);

    return { ok: true, data: speakers };
  } catch (err) {
    console.warn(`[Firestore getSpeakers warning] user=${userId} event=${eventId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * READ ONE: Fetches a specific speaker from users/{userId}/events/{eventId}/speakers/{speakerId}
 */
export async function getSpeakerFromFirestore(
  userId: string,
  eventId: string,
  speakerId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; data?: Speaker; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required." };
  }
  if (!speakerId || !speakerId.trim()) {
    return { ok: false, error: "Speaker ID is required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getSpeakerDocPath(userId, eventId, speakerId);
    const speakerRef = doc(targetDb, path);
    const docSnap = await getDoc(speakerRef);

    if (!docSnap.exists()) {
      return { ok: false, error: "Speaker not found." };
    }

    return { ok: true, data: deserializeSpeaker(docSnap.data(), docSnap.id, eventId) };
  } catch (err) {
    console.warn(`[Firestore getSpeaker warning] user=${userId} event=${eventId} speaker=${speakerId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * UPDATE: Updates specific fields on an existing speaker document
 */
export async function updateSpeakerInFirestore(
  userId: string,
  eventId: string,
  speakerId: string,
  data: Partial<Speaker>,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to update speaker." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to update speaker." };
  }
  if (!speakerId || !speakerId.trim()) {
    return { ok: false, error: "Speaker ID is required to update speaker." };
  }

  try {
    const targetDb = customDb || db;
    const path = getSpeakerDocPath(userId, eventId, speakerId);
    const speakerRef = doc(targetDb, path);

    // Clean undefined values
    const cleanUpdate: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        cleanUpdate[k] = v;
      }
    }

    await updateDoc(speakerRef, cleanUpdate);
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore updateSpeaker warning] user=${userId} event=${eventId} speaker=${speakerId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}

/**
 * DELETE: Deletes a speaker document
 */
export async function deleteSpeakerInFirestore(
  userId: string,
  eventId: string,
  speakerId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !userId.trim()) {
    return { ok: false, error: "Unauthenticated: User ID is required to delete speaker." };
  }
  if (!eventId || !eventId.trim()) {
    return { ok: false, error: "Event ID is required to delete speaker." };
  }
  if (!speakerId || !speakerId.trim()) {
    return { ok: false, error: "Speaker ID is required to delete speaker." };
  }

  try {
    const targetDb = customDb || db;
    const path = getSpeakerDocPath(userId, eventId, speakerId);
    const speakerRef = doc(targetDb, path);
    await deleteDoc(speakerRef);
    return { ok: true };
  } catch (err) {
    console.warn(`[Firestore deleteSpeaker warning] user=${userId} event=${eventId} speaker=${speakerId}:`, err);
    return { ok: false, error: handleFirestoreError(err) };
  }
}
