// StageX AI — Firestore Invitations Data Access Layer
// Manages InvitationRecord CRUD in Cloud Firestore under users/{userId}/events/{eventId}/invitations/{invitationId}

import {
  doc,
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
import { InvitationRecord, InvitationTheme } from "../../types";
import { getEventInvitationsPath, getInvitationDocPath } from "./paths";

export function serializeInvitation(invitation: InvitationRecord): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: invitation.id,
    eventId: invitation.eventId,
    title: invitation.title,
    theme: invitation.theme,
    data: invitation.data,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
  };

  if (invitation.artworkUrl !== undefined) {
    data.artworkUrl = invitation.artworkUrl;
  }

  return data;
}

export function deserializeInvitation(data: DocumentData, id: string, defaultEventId: string = ""): InvitationRecord {
  return {
    id: data.id || id,
    eventId: data.eventId || defaultEventId,
    title: data.title || "Event Invitation",
    theme: (data.theme as InvitationTheme) || "modern_dark",
    data: data.data || {
      title: data.title || "Event Invitation",
      dateText: "",
      timeText: "",
      venueText: "",
      theme: (data.theme as InvitationTheme) || "modern_dark",
    },
    artworkUrl: data.artworkUrl || undefined,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
  };
}

function handleFirestoreError(err: unknown): string {
  const code = (err as FirestoreError)?.code || "";
  switch (code) {
    case "permission-denied":
      return "Access denied: you do not have permission for this invitation.";
    case "unauthenticated":
      return "User is not authenticated. Please log in.";
    case "unavailable":
      return "Cloud database is temporarily unreachable.";
    case "not-found":
      return "Invitation not found in cloud database.";
    default:
      return (err as Error)?.message || "An error occurred with Cloud Firestore.";
  }
}

export async function createInvitationInFirestore(
  userId: string,
  eventId: string,
  invitation: InvitationRecord,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId?.trim() || !eventId?.trim() || !invitation.id?.trim()) {
    return { ok: false, error: "User ID, Event ID, and Invitation ID are required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getInvitationDocPath(userId, eventId, invitation.id);
    const invitationRef = doc(targetDb, path);
    const serialized = serializeInvitation({ ...invitation, eventId });
    await setDoc(invitationRef, serialized);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: handleFirestoreError(err) };
  }
}

export async function getInvitationsFromFirestore(
  userId: string,
  eventId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; invitations?: InvitationRecord[]; error?: string }> {
  if (!userId?.trim() || !eventId?.trim()) {
    return { ok: false, error: "User ID and Event ID are required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getEventInvitationsPath(userId, eventId);
    const invitationsRef = collection(targetDb, path);
    const snapshot = await getDocs(invitationsRef);

    const invitations: InvitationRecord[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        invitations.push(deserializeInvitation(docSnap.data(), docSnap.id, eventId));
      }
    });

    return { ok: true, invitations };
  } catch (err: unknown) {
    return { ok: false, error: handleFirestoreError(err) };
  }
}

export async function updateInvitationInFirestore(
  userId: string,
  eventId: string,
  invitationId: string,
  updates: Partial<InvitationRecord>,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId?.trim() || !eventId?.trim() || !invitationId?.trim()) {
    return { ok: false, error: "User ID, Event ID, and Invitation ID are required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getInvitationDocPath(userId, eventId, invitationId);
    const invitationRef = doc(targetDb, path);

    const cleanUpdates: Record<string, unknown> = {
      ...updates,
      updatedAt: Date.now(),
    };
    delete cleanUpdates.id;
    delete cleanUpdates.eventId;

    await updateDoc(invitationRef, cleanUpdates);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: handleFirestoreError(err) };
  }
}

export async function deleteInvitationInFirestore(
  userId: string,
  eventId: string,
  invitationId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId?.trim() || !eventId?.trim() || !invitationId?.trim()) {
    return { ok: false, error: "User ID, Event ID, and Invitation ID are required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getInvitationDocPath(userId, eventId, invitationId);
    const invitationRef = doc(targetDb, path);
    await deleteDoc(invitationRef);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: handleFirestoreError(err) };
  }
}
