// StageX AI — Firestore AI Conversations Data Access Layer
// Manages AIConversation CRUD in Cloud Firestore under users/{userId}/aiConversations/{conversationId}

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
import { AIConversation, AIMessage, GeneratedImageItem } from "../../types";
import { getUserAIConversationsPath, getAIConversationDocPath } from "./paths";

export function serializeAIConversation(conv: AIConversation): Record<string, unknown> {
  const data: Record<string, unknown> = {
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    messages: (conv.messages || []).map((m) => {
      const msg: Record<string, unknown> = {
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      };
      if (m.attachments && m.attachments.length > 0) {
        msg.attachments = m.attachments.map((att) => ({
          id: att.id,
          name: att.name,
          size: att.size,
          type: att.type,
          extractedText: (att.extractedText || "").slice(0, 10000), // bounded preview for metadata
        }));
      }
      if (m.plan) msg.plan = m.plan;
      if (m.action) msg.action = m.action;
      if (m.eventChoices) msg.eventChoices = m.eventChoices;
      if (m.pendingActionPrompt) msg.pendingActionPrompt = m.pendingActionPrompt;
      if (m.generatedImages) msg.generatedImages = m.generatedImages;
      if (m.actionMetadata) msg.actionMetadata = m.actionMetadata;
      return msg;
    }),
  };

  if (conv.userId) data.userId = conv.userId;
  if (conv.relatedEventIds) data.relatedEventIds = conv.relatedEventIds;
  if (conv.isSaved !== undefined) data.isSaved = conv.isSaved;

  return data;
}

export function deserializeAIConversation(data: DocumentData, id: string): AIConversation {
  return {
    id: data.id || id,
    title: data.title || "New Conversation",
    userId: data.userId || undefined,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : Date.now(),
    isSaved: Boolean(data.isSaved),
    relatedEventIds: Array.isArray(data.relatedEventIds) ? data.relatedEventIds : [],
    messages: Array.isArray(data.messages)
      ? data.messages.map((m: DocumentData) => ({
          id: m.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          role: m.role || "user",
          content: m.content || "",
          createdAt: typeof m.createdAt === "number" ? m.createdAt : Date.now(),
          attachments: Array.isArray(m.attachments)
            ? m.attachments.map((att: DocumentData) => ({
                id: att.id || `att_${Date.now()}`,
                name: att.name || "attachment",
                size: att.size || 0,
                type: att.type || "application/octet-stream",
                extractedText: att.extractedText || "",
              }))
            : undefined,
          plan: m.plan || undefined,
          action: m.action || undefined,
          eventChoices: m.eventChoices || undefined,
          pendingActionPrompt: m.pendingActionPrompt || undefined,
          generatedImages: Array.isArray(m.generatedImages) ? m.generatedImages : undefined,
          actionMetadata: m.actionMetadata || undefined,
        }))
      : [],
  };
}

function handleFirestoreError(err: unknown): string {
  const code = (err as FirestoreError)?.code || "";
  switch (code) {
    case "permission-denied":
      return "Access denied: you do not have permission for this conversation.";
    case "not-found":
      return "Conversation document not found.";
    case "unavailable":
      return "Firestore service is temporarily unavailable. Changes will sync when online.";
    case "unauthenticated":
      return "User is not authenticated. Please sign in again.";
    default:
      return (err as Error)?.message || "An unexpected error occurred.";
  }
}

export async function createAIConversationInFirestore(
  userId: string,
  conv: AIConversation,
  dbInstance?: Firestore
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = dbInstance || db;
    if (!firestore) throw new Error("Firestore instance not available");

    const docPath = getAIConversationDocPath(userId, conv.id);
    const docRef = doc(firestore, docPath);
    await setDoc(docRef, serializeAIConversation(conv));

    return { success: true };
  } catch (err: unknown) {
    console.warn(`[Firestore] Failed to create AI conversation ${conv.id}:`, err);
    return { success: false, error: handleFirestoreError(err) };
  }
}

export async function getAIConversationsFromFirestore(
  userId: string,
  dbInstance?: Firestore
): Promise<{ success: boolean; conversations?: AIConversation[]; error?: string }> {
  try {
    const firestore = dbInstance || db;
    if (!firestore) throw new Error("Firestore instance not available");

    const colPath = getUserAIConversationsPath(userId);
    const colRef = collection(firestore, colPath);
    const snapshot = await getDocs(colRef);

    const conversations: AIConversation[] = [];
    snapshot.forEach((docSnap) => {
      conversations.push(deserializeAIConversation(docSnap.data(), docSnap.id));
    });

    conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    return { success: true, conversations };
  } catch (err: unknown) {
    console.warn(`[Firestore] Failed to load AI conversations for user ${userId}:`, err);
    return { success: false, error: handleFirestoreError(err) };
  }
}

export async function updateAIConversationInFirestore(
  userId: string,
  conversationId: string,
  data: Partial<AIConversation>,
  dbInstance?: Firestore
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = dbInstance || db;
    if (!firestore) throw new Error("Firestore instance not available");

    const docPath = getAIConversationDocPath(userId, conversationId);
    const docRef = doc(firestore, docPath);

    const updatePayload: Record<string, unknown> = {
      updatedAt: data.updatedAt || Date.now(),
    };

    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.isSaved !== undefined) updatePayload.isSaved = data.isSaved;
    if (data.relatedEventIds !== undefined) updatePayload.relatedEventIds = data.relatedEventIds;
    if (data.messages !== undefined) {
      updatePayload.messages = data.messages.map((m) => {
        const msg: Record<string, unknown> = {
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        };
        if (m.plan) msg.plan = m.plan;
        if (m.action) msg.action = m.action;
        if (m.eventChoices) msg.eventChoices = m.eventChoices;
        if (m.pendingActionPrompt) msg.pendingActionPrompt = m.pendingActionPrompt;
        if (m.generatedImages) msg.generatedImages = m.generatedImages;
        if (m.actionMetadata) msg.actionMetadata = m.actionMetadata;
        return msg;
      });
    }

    await updateDoc(docRef, updatePayload);
    return { success: true };
  } catch (err: unknown) {
    console.warn(`[Firestore] Failed to update AI conversation ${conversationId}:`, err);
    return { success: false, error: handleFirestoreError(err) };
  }
}

export async function deleteAIConversationInFirestore(
  userId: string,
  conversationId: string,
  dbInstance?: Firestore
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = dbInstance || db;
    if (!firestore) throw new Error("Firestore instance not available");

    const docPath = getAIConversationDocPath(userId, conversationId);
    const docRef = doc(firestore, docPath);
    await deleteDoc(docRef);

    return { success: true };
  } catch (err: unknown) {
    console.warn(`[Firestore] Failed to delete AI conversation ${conversationId}:`, err);
    return { success: false, error: handleFirestoreError(err) };
  }
}
