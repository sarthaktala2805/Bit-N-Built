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
import { db } from "@/lib/firebase";
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

export function getUserEventsRef(userId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(customDb || db, getUserEventsPath(userId));
}

export function getEventDocRef(userId: string, eventId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(customDb || db, getEventDocPath(userId, eventId));
}

export function getEventSpeakersRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(customDb || db, getEventSpeakersPath(userId, eventId));
}

export function getSpeakerDocRef(userId: string, eventId: string, speakerId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(customDb || db, getSpeakerDocPath(userId, eventId, speakerId));
}

export function getEventSessionsRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(customDb || db, getEventSessionsPath(userId, eventId));
}

export function getSessionDocRef(userId: string, eventId: string, sessionId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(customDb || db, getSessionDocPath(userId, eventId, sessionId));
}

export function getEventDelaysRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(customDb || db, getEventDelaysPath(userId, eventId));
}

export function getDelayDocRef(userId: string, eventId: string, delayId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(customDb || db, getDelayDocPath(userId, eventId, delayId));
}

export function getEventEmergenciesRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(customDb || db, getEventEmergenciesPath(userId, eventId));
}

export function getEmergencyDocRef(userId: string, eventId: string, emergencyId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(customDb || db, getEmergencyDocPath(userId, eventId, emergencyId));
}

export function getEventAIRecordsRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(customDb || db, getEventAIRecordsPath(userId, eventId));
}

export function getAIRecordDocRef(userId: string, eventId: string, aiRecordId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(customDb || db, getAIRecordDocPath(userId, eventId, aiRecordId));
}

export function getEventActivityLogsRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(customDb || db, getEventActivityLogsPath(userId, eventId));
}

export function getActivityLogDocRef(userId: string, eventId: string, logId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(customDb || db, getActivityLogDocPath(userId, eventId, logId));
}

export function getEventScriptsRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(customDb || db, getEventScriptsPath(userId, eventId));
}

export function getScriptDocRef(userId: string, eventId: string, scriptId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(customDb || db, getScriptDocPath(userId, eventId, scriptId));
}

export function getEventInvitationsRef(userId: string, eventId: string, customDb?: Firestore): CollectionReference<DocumentData> {
  return collection(customDb || db, getEventInvitationsPath(userId, eventId));
}

export function getInvitationDocRef(userId: string, eventId: string, invitationId: string, customDb?: Firestore): DocumentReference<DocumentData> {
  return doc(customDb || db, getInvitationDocPath(userId, eventId, invitationId));
}

