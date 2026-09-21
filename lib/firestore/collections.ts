// StageX AI — Cloud Firestore Modular Collection References
// Connects path architecture to the initialized Firebase Firestore instance.

import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
  DocumentData,
  Firestore,
} from "firebase/firestore";
import { db, getFirebaseDb } from "@/lib/firebase";
import {
  getUserEventsPath,
  getEventDocPath,
  getEventSpeakersPath,
  getSpeakerDocPath,
  getEventSessionsPath,
  getSessionDocPath,
  getEventDelaysPath,
  getDelayDocPath,
  getEventEmergenciesPath,
  getEmergencyDocPath,
  getEventAIRecordsPath,
  getAIRecordDocPath,
  getEventActivityLogsPath,
  getActivityLogDocPath,
  getEventScriptsPath,
  getScriptDocPath,
  getEventInvitationsPath,
  getInvitationDocPath,
} from "./paths";

function getTargetDb(customDb?: Firestore): Firestore {
  if (customDb) return customDb;
  const instance = typeof getFirebaseDb === "function" ? getFirebaseDb() : null;
  return instance || db;
}

export function getUserEventsRef(userId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(getTargetDb(customDb), getUserEventsPath(userId));
}

export function getEventDocRef(userId: string, eventId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(getTargetDb(customDb), getEventDocPath(userId, eventId));
}

export function getEventSpeakersRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(getTargetDb(customDb), getEventSpeakersPath(userId, eventId));
}

export function getSpeakerDocRef(userId: string, eventId: string, speakerId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(getTargetDb(customDb), getSpeakerDocPath(userId, eventId, speakerId));
}

export function getEventSessionsRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(getTargetDb(customDb), getEventSessionsPath(userId, eventId));
}

export function getSessionDocRef(userId: string, eventId: string, sessionId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(getTargetDb(customDb), getSessionDocPath(userId, eventId, sessionId));
}

export function getEventDelaysRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(getTargetDb(customDb), getEventDelaysPath(userId, eventId));
}

export function getDelayDocRef(userId: string, eventId: string, delayId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(getTargetDb(customDb), getDelayDocPath(userId, eventId, delayId));
}

export function getEventEmergenciesRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(getTargetDb(customDb), getEventEmergenciesPath(userId, eventId));
}

export function getEmergencyDocRef(userId: string, eventId: string, emergencyId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(getTargetDb(customDb), getEmergencyDocPath(userId, eventId, emergencyId));
}

export function getEventAIRecordsRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(getTargetDb(customDb), getEventAIRecordsPath(userId, eventId));
}

export function getAIRecordDocRef(userId: string, eventId: string, aiRecordId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(getTargetDb(customDb), getAIRecordDocPath(userId, eventId, aiRecordId));
}

export function getEventActivityLogsRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(getTargetDb(customDb), getEventActivityLogsPath(userId, eventId));
}

export function getActivityLogDocRef(userId: string, eventId: string, logId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(getTargetDb(customDb), getActivityLogDocPath(userId, eventId, logId));
}

export function getEventScriptsRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(getTargetDb(customDb), getEventScriptsPath(userId, eventId));
}

export function getScriptDocRef(userId: string, eventId: string, scriptId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(getTargetDb(customDb), getScriptDocPath(userId, eventId, scriptId));
}

export function getEventInvitationsRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(getTargetDb(customDb), getEventInvitationsPath(userId, eventId));
}

export function getInvitationDocRef(userId: string, eventId: string, invitationId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(getTargetDb(customDb), getInvitationDocPath(userId, eventId, invitationId));
}

