// StageX AI — Firestore Scripts Data Access Layer
// Manages ScriptItem CRUD in Cloud Firestore under users/{userId}/events/{eventId}/scripts/{scriptId}

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
import { ScriptItem } from "../../types";
import { getEventScriptsPath, getScriptDocPath } from "./paths";

export function serializeScript(script: ScriptItem): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: script.id,
    eventId: script.eventId,
    title: script.title,
    category: script.category,
    scriptType: script.scriptType,
    content: script.content,
    createdAt: script.createdAt,
    updatedAt: script.updatedAt,
  };

  if (script.targetName !== undefined) {
    data.targetName = script.targetName;
  }
  if (script.editedContent !== undefined) {
    data.editedContent = script.editedContent;
  }
  if (script.language !== undefined) {
    data.language = script.language;
  }

  return data;
}

export function deserializeScript(data: DocumentData, id: string, defaultEventId: string = ""): ScriptItem {
  return {
    id: data.id || id,
    eventId: data.eventId || defaultEventId,
    title: data.title || "Untitled Script",
    category: data.category || "anchor",
    scriptType: data.scriptType || "General",
    targetName: data.targetName || undefined,
    content: data.content || "",
    editedContent: data.editedContent ?? undefined,
    language: data.language || undefined,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
  };
}

function handleFirestoreError(err: unknown): string {
  const code = (err as FirestoreError)?.code || "";
  switch (code) {
    case "permission-denied":
      return "Access denied: you do not have permission for this script.";
    case "unauthenticated":
      return "User is not authenticated. Please log in.";
    case "unavailable":
      return "Cloud database is temporarily unreachable.";
    case "not-found":
      return "Script not found in cloud database.";
    default:
      return (err as Error)?.message || "An error occurred with Cloud Firestore.";
  }
}

export async function createScriptInFirestore(
  userId: string,
  eventId: string,
  script: ScriptItem,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId?.trim() || !eventId?.trim() || !script.id?.trim()) {
    return { ok: false, error: "User ID, Event ID, and Script ID are required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getScriptDocPath(userId, eventId, script.id);
    const scriptRef = doc(targetDb, path);
    const serialized = serializeScript({ ...script, eventId });
    await setDoc(scriptRef, serialized);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: handleFirestoreError(err) };
  }
}

export async function getScriptsFromFirestore(
  userId: string,
  eventId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; scripts?: ScriptItem[]; error?: string }> {
  if (!userId?.trim() || !eventId?.trim()) {
    return { ok: false, error: "User ID and Event ID are required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getEventScriptsPath(userId, eventId);
    const scriptsRef = collection(targetDb, path);
    const snapshot = await getDocs(scriptsRef);

    const scripts: ScriptItem[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        scripts.push(deserializeScript(docSnap.data(), docSnap.id, eventId));
      }
    });

    return { ok: true, scripts };
  } catch (err: unknown) {
    return { ok: false, error: handleFirestoreError(err) };
  }
}

export async function updateScriptInFirestore(
  userId: string,
  eventId: string,
  scriptId: string,
  updates: Partial<ScriptItem>,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId?.trim() || !eventId?.trim() || !scriptId?.trim()) {
    return { ok: false, error: "User ID, Event ID, and Script ID are required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getScriptDocPath(userId, eventId, scriptId);
    const scriptRef = doc(targetDb, path);

    const cleanUpdates: Record<string, unknown> = {
      ...updates,
      updatedAt: Date.now(),
    };
    delete cleanUpdates.id;
    delete cleanUpdates.eventId;

    await updateDoc(scriptRef, cleanUpdates);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: handleFirestoreError(err) };
  }
}

export async function deleteScriptInFirestore(
  userId: string,
  eventId: string,
  scriptId: string,
  customDb?: Firestore
): Promise<{ ok: boolean; error?: string }> {
  if (!userId?.trim() || !eventId?.trim() || !scriptId?.trim()) {
    return { ok: false, error: "User ID, Event ID, and Script ID are required." };
  }

  try {
    const targetDb = customDb || db;
    const path = getScriptDocPath(userId, eventId, scriptId);
    const scriptRef = doc(targetDb, path);
    await deleteDoc(scriptRef);
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: handleFirestoreError(err) };
  }
}
