// StageX AI — Cloud Firestore Path Architecture
// Enforces user-isolated ownership boundaries:
// users/{userId}/events/{eventId}/...

export const FIRESTORE_COLLECTIONS = {
  USERS: "users",
  EVENTS: "events",
  SPEAKERS: "speakers",
  SESSIONS: "sessions",
  DELAYS: "delays",
  EMERGENCIES: "emergencies",
  AI_RECORDS: "aiRecords",
  ACTIVITY_LOGS: "activityLogs",
  SCRIPTS: "scripts",
  INVITATIONS: "invitations",
  AI_CONVERSATIONS: "aiConversations",
} as const;

/**
 * Returns path to a user's events collection:
 * users/{userId}/events
 */
export function getUserEventsPath(userId: string): string {
  return `users/${userId}/events`;
}

/**
 * Returns path to an event document:
 * users/{userId}/events/{eventId}
 */
export function getEventDocPath(userId: string, eventId: string): string {
  return `users/${userId}/events/${eventId}`;
}

/**
 * Returns path to an event's speakers subcollection:
 * users/{userId}/events/{eventId}/speakers
 */
export function getEventSpeakersPath(userId: string, eventId: string): string {
  return `users/${userId}/events/${eventId}/speakers`;
}

/**
 * Returns path to a specific speaker document:
 * users/{userId}/events/{eventId}/speakers/{speakerId}
 */
export function getSpeakerDocPath(userId: string, eventId: string, speakerId: string): string {
  return `users/${userId}/events/${eventId}/speakers/${speakerId}`;
}

/**
 * Returns path to an event's sessions subcollection:
 * users/{userId}/events/{eventId}/sessions
 */
export function getEventSessionsPath(userId: string, eventId: string): string {
  return `users/${userId}/events/${eventId}/sessions`;
}

/**
 * Returns path to a specific session document:
 * users/{userId}/events/{eventId}/sessions/{sessionId}
 */
export function getSessionDocPath(userId: string, eventId: string, sessionId: string): string {
  return `users/${userId}/events/${eventId}/sessions/${sessionId}`;
}

/**
 * Returns path to an event's delays subcollection:
 * users/{userId}/events/{eventId}/delays
 */
export function getEventDelaysPath(userId: string, eventId: string): string {
  return `users/${userId}/events/${eventId}/delays`;
}

/**
 * Returns path to a specific delay document:
 * users/{userId}/events/{eventId}/delays/{delayId}
 */
export function getDelayDocPath(userId: string, eventId: string, delayId: string): string {
  return `users/${userId}/events/${eventId}/delays/${delayId}`;
}

/**
 * Returns path to an event's emergencies subcollection:
 * users/{userId}/events/{eventId}/emergencies
 */
export function getEventEmergenciesPath(userId: string, eventId: string): string {
  return `users/${userId}/events/${eventId}/emergencies`;
}

/**
 * Returns path to a specific emergency document:
 * users/{userId}/events/{eventId}/emergencies/{emergencyId}
 */
export function getEmergencyDocPath(userId: string, eventId: string, emergencyId: string): string {
  return `users/${userId}/events/${eventId}/emergencies/${emergencyId}`;
}

/**
 * Returns path to an event's aiRecords subcollection:
 * users/{userId}/events/{eventId}/aiRecords
 */
export function getEventAIRecordsPath(userId: string, eventId: string): string {
  return `users/${userId}/events/${eventId}/aiRecords`;
}

/**
 * Returns path to a specific aiRecord document:
 * users/{userId}/events/{eventId}/aiRecords/{aiRecordId}
 */
export function getAIRecordDocPath(userId: string, eventId: string, aiRecordId: string): string {
  return `users/${userId}/events/${eventId}/aiRecords/${aiRecordId}`;
}

/**
 * Returns path to an event's activityLogs subcollection:
 * users/{userId}/events/{eventId}/activityLogs
 */
export function getEventActivityLogsPath(userId: string, eventId: string): string {
  return `users/${userId}/events/${eventId}/activityLogs`;
}

/**
 * Returns path to a specific activityLog document:
 * users/{userId}/events/{eventId}/activityLogs/{logId}
 */
export function getActivityLogDocPath(userId: string, eventId: string, logId: string): string {
  return `users/${userId}/events/${eventId}/activityLogs/${logId}`;
}

/**
 * Returns path to an event's scripts subcollection:
 * users/{userId}/events/{eventId}/scripts
 */
export function getEventScriptsPath(userId: string, eventId: string): string {
  return `users/${userId}/events/${eventId}/scripts`;
}

/**
 * Returns path to a specific script document:
 * users/{userId}/events/{eventId}/scripts/{scriptId}
 */
export function getScriptDocPath(userId: string, eventId: string, scriptId: string): string {
  return `users/${userId}/events/${eventId}/scripts/${scriptId}`;
}

/**
 * Returns path to an event's invitations subcollection:
 * users/{userId}/events/{eventId}/invitations
 */
export function getEventInvitationsPath(userId: string, eventId: string): string {
  return `users/${userId}/events/${eventId}/invitations`;
}

/**
 * Returns path to a specific invitation document:
 * users/{userId}/events/{eventId}/invitations/{invitationId}
 */
export function getInvitationDocPath(userId: string, eventId: string, invitationId: string): string {
  return `users/${userId}/events/${eventId}/invitations/${invitationId}`;
}

/**
 * Returns path to a user's AI conversations collection:
 * users/{userId}/aiConversations
 */
export function getUserAIConversationsPath(userId: string): string {
  return `users/${userId}/aiConversations`;
}

/**
 * Returns path to a specific AI conversation document:
 * users/{userId}/aiConversations/{conversationId}
 */
export function getAIConversationDocPath(userId: string, conversationId: string): string {
  return `users/${userId}/aiConversations/${conversationId}`;
}

