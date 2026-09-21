// StageX AI — Data Models
// Traces to STAGEX_AI_PRD.md §19

export type EventType =
  | "Hackathon"
  | "Workshop"
  | "Seminar"
  | "Competition"
  | "Cultural Event"
  | "Conference"
  | "College Event"
  | "Other";

export type EventStatus = "Scheduled" | "Live" | "Completed" | "Cancelled";

export type EventResourceType = "video" | "ppt" | "script" | "document";

export interface EventResource {
  id: string;
  type: EventResourceType;
  title: string;
  url: string; // URL link, embed link, or file key / data URL
  description?: string;
  uploadedAt: number; // epoch ms
  author?: string;
  isLocalFile?: boolean;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
}

export interface Event {
  id: string;
  name: string;
  type: EventType;
  status?: EventStatus; // Event runtime status: Scheduled, Live, Completed, Cancelled
  date: string; // YYYY-MM-DD (legacy / primary start date)
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD (may differ for overnight and multi-day events)
  venue: string;
  description?: string;
  organizer?: string;
  startTime: string; // HH:mm (24h)
  endTime: string;   // HH:mm (24h)
  startDateTime: number; // epoch ms
  endDateTime: number;   // epoch ms
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
  posterUrl?: string | null; // Event banner / poster artwork URL
  accessCode?: string; // 6-character alphanumeric code for audience access (e.g. ST8X9B)
  resources?: EventResource[]; // Past meeting resources (video, ppt, script)
  endedAt?: number | null; // epoch ms when meeting ended
  joinEnabled?: boolean; // Controls whether public attendees can join (default: true)
  publicEnabled?: boolean; // Controls public directory visibility (default: true)
  ownerUserId?: string; // UID of the organizer account that owns the event
}

export interface PublicEventDoc {
  eventCode: string;
  eventId: string;
  ownerUserId: string;
  publicEnabled: boolean;
  joinEnabled: boolean;
  eventName: string;
  eventType: EventType;
  eventStatus: EventStatus;
  scheduledStart: number;
  scheduledEnd: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  description?: string;
  organizer?: string;
  posterUrl?: string | null;
  publicUpdatedAt: number;
  sessions?: Session[];
  speakers?: Speaker[];
  resources?: EventResource[];
}

export interface AudiencePresenceSession {
  sessionId: string;
  eventCode: string;
  userUid: string;
  joinedAt: number;
  lastSeenAt: number;
  status: "active" | "left";
  leftAt?: number | null;
}

export interface Speaker {
  id: string;
  eventId: string;
  name: string;
  designation?: string;
  organization?: string;
  bio?: string;
  image?: string | null; // Data URL, downscaled
  createdAt: number;
}

export type SessionType =
  | "Opening"
  | "Keynote"
  | "Talk"
  | "Workshop"
  | "Competition"
  | "Break"
  | "Announcement"
  | "Panel"
  | "Cultural Performance"
  | "Closing"
  | "Other";

export type SessionStatus =
  | "Upcoming"
  | "Live"
  | "Completed"
  | "Delayed"
  | "Skipped"
  | "Cancelled";

export interface Session {
  id: string;
  eventId: string;
  title: string;
  type: SessionType;
  speakerId: string | null;
  sessionDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  startDateTime: number; // epoch ms
  endDateTime: number;   // epoch ms
  duration: number;  // integer minutes
  status: SessionStatus;
  isFixedTime: boolean;
  originalStartTime: string;
  originalEndTime: string;
  originalSessionDate: string;
  originalStartDateTime: number; // epoch ms
  originalEndDateTime: number;   // epoch ms
  actualStartTime: number | null;
  actualEndTime: number | null;
  imageUrl?: string | null;
}

export interface DelayRecord {
  id: string;
  eventId: string;
  sessionId: string;
  minutes: number;
  reason?: string;
  timestamp: number;
}

export type EmergencyType =
  | "Speaker Delayed"
  | "Microphone Issue"
  | "Projector Issue"
  | "Technical Problem"
  | "Unexpected Break"
  | "Venue Change"
  | "Custom Issue";

export interface Emergency {
  id: string;
  eventId: string;
  type: EmergencyType;
  description?: string;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number | null;
}

export type AIRecordType =
  | "speaker_intro"
  | "transition"
  | "filler"
  | "announcement"
  | "closing"
  | "copilot"
  | "role_script"
  | "invitation"
  | "event_plan";

export interface AIRecord {
  id: string;
  eventId: string;
  type: AIRecordType;
  prompt: string;
  generatedText: string;
  editedText?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type PersonRole =
  | "Anchor"
  | "Host"
  | "Chief Guest"
  | "Speaker"
  | "Artist"
  | "Performer"
  | "Judge"
  | "Organizer"
  | "Other";

export interface EventPlanPerson {
  name: string;
  role: PersonRole;
  designation?: string;
  organization?: string;
  bio?: string;
}

export interface EventPlanSession {
  title: string;
  type: SessionType;
  speakerName?: string;
  duration: number; // minutes
  sessionDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isFixedTime?: boolean;
}

export interface EventPlan {
  name: string;
  type: EventType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  venue: string;
  description?: string;
  organizer?: string;
  expectedAudience?: string;
  people: EventPlanPerson[];
  sessions: EventPlanSession[];
  scripts?: {
    role: string;
    targetName?: string;
    scriptType: string;
    content: string;
  }[];
  invitation?: Partial<InvitationData>;
  notes?: string[];
  suggestedValues?: string[]; // list of fields that were AI-suggested requiring confirmation
}

export type InvitationTheme =
  | "modern_dark"
  | "executive_gold"
  | "neon_tech"
  | "clean_minimal"
  | "cultural_warm"
  | "premium_dark"
  | "luxury_gala"
  | "college_event"
  | "cultural_festival"
  | "tech_conference"
  | "music_event"
  | "minimal_professional"
  | "bold_modern";

export interface InvitationData {
  id?: string;
  eventId?: string;
  title: string;
  subtitle?: string;
  eventType?: string;
  dateText: string;
  timeText: string;
  venueText: string;
  description?: string;
  organizer?: string;
  chiefGuest?: string;
  highlightPeople?: string[];
  highlights?: string[];
  theme: InvitationTheme;
  language?: string; // "English" | "Hindi" | "Gujarati" | "Bilingual" | custom
  logoUrl?: string;
  customNotes?: string;
}

export interface InvitationRecord {
  id: string;
  eventId: string;
  title: string;
  theme: InvitationTheme;
  data: InvitationData;
  artworkUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScriptItem {
  id: string;
  eventId: string;
  title: string;
  category: "anchor" | "organizer" | "speaker" | "artist" | "award";
  scriptType: string;
  targetName?: string;
  content: string;
  editedContent?: string;
  language?: string; // "English" | "Hindi" | "Gujarati" | "Bilingual" | custom
  createdAt: number;
  updatedAt: number;
}

export type AIActionType =
  | "CREATE_EVENT"
  | "UPDATE_EVENT"
  | "DELETE_EVENT"
  | "CREATE_SPEAKER"
  | "ADD_SPEAKER"
  | "ADD_PERSON"
  | "ADD_ARTIST"
  | "UPDATE_SPEAKER"
  | "DELETE_SPEAKER"
  | "CREATE_SESSION"
  | "UPDATE_SESSION"
  | "DELETE_SESSION"
  | "REORDER_AGENDA"
  | "CREATE_SCRIPT"
  | "UPDATE_SCRIPT"
  | "DELETE_SCRIPT"
  | "GENERATE_SCRIPT"
  | "TRANSLATE_SCRIPT"
  | "CREATE_INVITATION"
  | "UPDATE_INVITATION"
  | "DELETE_INVITATION"
  | "GENERATE_INVITATION"
  | "TRANSLATE_INVITATION"
  | "APPLY_EVENT_CHANGE"
  | "GENERATE_IMAGE"
  | "REGENERATE_IMAGE"
  | "SAVE_GENERATED_IMAGE"
  | "IMPORT_FILE"
  | "EXTRACT_FILE_CONTENT"
  | "GET_EVENT_INFO"
  | "GET_EVENTS"
  | "GET_LIVE_EVENTS"
  | "GET_EVENT_STATUS";

export interface AIAction {
  id: string;
  type: AIActionType;
  description: string;
  requiresConfirmation: boolean;
  payload: Record<string, unknown>;
}

export interface AIActionResult {
  actionId: string;
  type: AIActionType;
  success: boolean;
  message: string;
  entityId?: string;
}

export type ActivityLogType =
  | "event_created"
  | "event_updated"
  | "event_live_started"
  | "event_live_stopped"
  | "event_archived"
  | "resource_added"
  | "resource_deleted"
  | "speaker_added"
  | "speaker_updated"
  | "speaker_deleted"
  | "session_added"
  | "session_updated"
  | "session_deleted"
  | "session_reordered"
  | "session_started"
  | "session_completed"
  | "session_skipped"
  | "delay_applied"
  | "schedule_change"
  | "buffer_consumed"
  | "fixed_time_decision"
  | "emergency_activated"
  | "emergency_resolved"
  | "ai_generated"
  | "announcement_created";

export interface ActivityLog {
  id: string;
  eventId: string;
  type: ActivityLogType;
  message: string;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export type FixedDecision = "keep" | "shift" | "skip";

export interface DelayPreview {
  status: "ok" | "needs_decision" | "invalid";
  proposedSessions: Session[];
  changes: {
    sessionId: string;
    sessionTitle: string;
    from: { start: string; end: string; date?: string };
    to: { start: string; end: string; date?: string };
  }[];
  bufferConsumedMinutes: number;
  remainingShiftMinutes: number;
  conflicts: {
    sessionId: string;
    sessionTitle: string;
    reason: string;
  }[];
  errors: string[];
}

export interface LiveStageState {
  currentSession: Session | null;
  nextSession: Session | null;
  upcomingSessions: Session[];
  elapsedSeconds: number;
  remainingSeconds: number;
  isOvertime: boolean;
  overtimeSeconds: number;
  nextCountdownSeconds: number;
  isNextOverdue: boolean;
  nextOverdueSeconds: number;
}

export interface AnalyticsMetrics {
  totalSessions: number;
  completedSessions: number;
  delayedSessions: number;
  skippedSessions: number;
  cancelledSessions: number;
  totalDelayMinutes: number;
  maxDelayMinutes: number;
  emergencyCount: number;
  resolvedEmergencies: number;
  unresolvedEmergencies: number;
  aiGenerationsCount: number;
  scheduleChangesCount: number;
  plannedDurationMinutes: number;
  actualDurationMinutes: number | null;
  deviations: {
    sessionId: string;
    title: string;
    plannedStart: string;
    actualStart: string;
    deviationMinutes: number;
    plannedEnd: string;
    actualEnd: string | null;
    endDeviationMinutes: number | null;
  }[];
  healthScore: number | null;
  healthBand: "On track" | "Minor issues" | "At risk" | "Critical" | null;
  healthPenalties: {
    deviationPenalty: number;
    driftPenalty: number;
    emergencyPenalty: number;
    skipPenalty: number;
  } | null;
}

export interface GeneratedImageItem {
  id: string;
  url: string; // Data URL or storage URL
  prompt: string;
  createdAt: number;
  width?: number;
  height?: number;
  theme?: string;
  category?: string;
}

export interface EventChoice {
  id: string;
  name: string;
  type?: string;
  venue?: string;
}

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: string;
  extractedText?: string;
  url?: string;
  base64?: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  attachments?: AttachmentItem[];
  plan?: EventPlan;
  createdEventId?: string;
  action?: AIAction;
  eventChoices?: EventChoice[];
  pendingActionPrompt?: string;
  generatedImages?: GeneratedImageItem[];
  actionMetadata?: {
    executed?: boolean;
    success?: boolean;
    message?: string;
    executedAt?: number;
    [key: string]: unknown;
  };
}

export interface AIConversation {
  id: string;
  title: string;
  userId?: string;
  createdAt: number;
  updatedAt: number;
  messages: AIMessage[];
  relatedEventIds?: string[];
  isSaved?: boolean;
}

