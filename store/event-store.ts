// StageX AI — Master Zustand Event Store
// Traces to STAGEX_AI_PRD.md §20, §21

import { create } from "zustand";
import {
  Event,
  Speaker,
  Session,
  DelayRecord,
  Emergency,
  AIRecord,
  ActivityLog,
  FixedDecision,
  DelayPreview,
  EmergencyType,
  AIRecordType,
  EventPlan,
  ScriptItem,
  InvitationRecord,
  AIAction,
  AIActionType,
  AIActionResult,
  AIConversation,
  AIMessage,
} from "@/types";
import {
  validateEvent,
  validateSpeaker,
  validateSession,
  timeToMinutes,
  minutesToTime,
} from "@/lib/validation";
import {
  resolveEventTimestamps,
  resolveSessionTimestamps,
} from "@/lib/date-utils";
import { applyDelay as computeDelay } from "@/lib/schedule-engine";
import {
  loadFromStorage,
  saveToStorage,
  resetAllStorage,
  setActiveStorageUserId,
} from "@/lib/storage";
import {
  createEventInFirestore,
  getEventsFromFirestore,
  updateEventInFirestore,
  deleteEventFromFirestore,
} from "@/lib/firestore/events";
import {
  createSpeakerInFirestore,
  getSpeakersFromFirestore,
  updateSpeakerInFirestore,
  deleteSpeakerInFirestore,
} from "@/lib/firestore/speakers";
import {
  createSessionInFirestore,
  getSessionsFromFirestore,
  updateSessionInFirestore,
  deleteSessionInFirestore,
  batchUpdateSessionsInFirestore,
} from "@/lib/firestore/sessions";
import {
  createDelayInFirestore,
  getDelaysFromFirestore,
} from "@/lib/firestore/delays";
import {
  createEmergencyInFirestore,
  getEmergenciesFromFirestore,
  updateEmergencyInFirestore,
} from "@/lib/firestore/emergencies";
import {
  createActivityLogInFirestore,
  getActivityLogsFromFirestore,
  batchCreateActivityLogsInFirestore,
} from "@/lib/firestore/activity-logs";
import {
  createAIRecordInFirestore,
  getAIRecordsFromFirestore,
} from "@/lib/firestore/ai-records";
import {
  createScriptInFirestore,
  getScriptsFromFirestore,
  updateScriptInFirestore,
  deleteScriptInFirestore,
} from "@/lib/firestore/scripts";
import {
  createInvitationInFirestore,
  getInvitationsFromFirestore,
  updateInvitationInFirestore,
  deleteInvitationInFirestore,
} from "@/lib/firestore/invitations";
import {
  createAIConversationInFirestore,
  getAIConversationsFromFirestore,
  updateAIConversationInFirestore,
  deleteAIConversationInFirestore,
} from "@/lib/firestore/ai-conversations";

export interface EventStoreState {
  events: Event[];
  activeEventId: string | null;
  selectedEventId: string | null;
  liveEventIds: string[];
  speakers: Speaker[];
  sessions: Session[];
  delays: DelayRecord[];
  emergencies: Emergency[];
  aiRecords: AIRecord[];
  activityLogs: ActivityLog[];
  scripts: ScriptItem[];
  invitations: InvitationRecord[];
  conversations: AIConversation[];
  activeConversationId: string | null;
  selectedScriptId: string | null;
  activeUserId: string | null;
  hydrated: boolean;
  corruptionNotice: string | null;

  // Actions
  hydrate: (userId?: string | null) => void;
  clearState: () => void;
  clearCorruptionNotice: () => void;
  setActiveEvent: (id: string | null) => void;
  setSelectedEvent: (id: string | null) => void;
  startLiveEvent: (eventId: string) => { ok: boolean; error?: string };
  stopLiveEvent: (eventId: string) => { ok: boolean; error?: string };
  isEventLive: (eventId: string) => boolean;

  // AI Conversations
  createConversation: (title?: string) => string;
  selectConversation: (id: string | null) => void;
  deleteConversation: (id: string) => { ok: boolean; error?: string };
  toggleSaveConversation: (id: string) => { ok: boolean };
  renameConversation: (id: string, title: string) => { ok: boolean };
  addMessageToConversation: (conversationId: string, message: AIMessage) => { ok: boolean };
  updateMessageInConversation: (conversationId: string, messageId: string, updates: Partial<AIMessage>) => { ok: boolean };

  // Events
  createEvent: (
    data: Omit<Event, "id" | "createdAt" | "updatedAt" | "startDateTime" | "endDateTime" | "startDate" | "endDate"> & {
      startDate?: string;
      endDate?: string;
      startDateTime?: number;
      endDateTime?: number;
    }
  ) => { ok: boolean; error?: string; eventId?: string };
  createEventFromPlan: (plan: EventPlan) => { ok: boolean; error?: string; eventId?: string };
  updateEvent: (id: string, data: Partial<Event>) => { ok: boolean; error?: string };
  deleteEvent: (id: string) => { ok: boolean; error?: string };

  // Speakers
  addSpeaker: (data: Omit<Speaker, "id" | "createdAt">) => { ok: boolean; error?: string; speakerId?: string };
  updateSpeaker: (id: string, data: Partial<Speaker>) => { ok: boolean; error?: string };
  deleteSpeaker: (id: string) => { ok: boolean; error?: string };

  // Sessions
  addSession: (
    data: Omit<
      Session,
      | "id"
      | "startDateTime"
      | "endDateTime"
      | "originalStartTime"
      | "originalEndTime"
      | "originalSessionDate"
      | "originalStartDateTime"
      | "originalEndDateTime"
      | "actualStartTime"
      | "actualEndTime"
    > & {
      startDateTime?: number;
      endDateTime?: number;
      originalStartTime?: string;
      originalEndTime?: string;
      originalSessionDate?: string;
      originalStartDateTime?: number;
      originalEndDateTime?: number;
      actualStartTime?: number | null;
      actualEndTime?: number | null;
    }
  ) => { ok: boolean; error?: string; sessionId?: string };
  updateSession: (id: string, data: Partial<Session>) => { ok: boolean; error?: string };
  deleteSession: (id: string) => { ok: boolean; error?: string };
  reorderSessions: (eventId: string, sessionIdsInOrder: string[]) => { ok: boolean; error?: string };

  // Session Operational Controls
  startSession: (id: string) => { ok: boolean; error?: string };
  completeSession: (id: string) => { ok: boolean; error?: string };
  skipSession: (id: string) => { ok: boolean; error?: string };

  // Delay Engine
  previewDelay: (anchorSessionId: string, minutes: number, fixedDecision?: FixedDecision) => DelayPreview;
  commitDelay: (anchorSessionId: string, minutes: number, reason?: string, fixedDecision?: FixedDecision) => { ok: boolean; error?: string };

  // Emergency Mode
  activateEmergency: (type: EmergencyType, description?: string, targetEventId?: string) => { ok: boolean; error?: string; emergencyId?: string };
  resolveEmergency: (id: string) => { ok: boolean; error?: string };

  // Announcements
  createAnnouncement: (title: string, message: string, priority: string, time?: string, targetEventId?: string) => { ok: boolean; error?: string };

  // AI & Scripts
  addAIRecord: (data: Omit<AIRecord, "id" | "timestamp">) => { ok: boolean; error?: string; recordId?: string };
  selectScript: (scriptId: string | null) => void;

  // Dedicated Scripts Management
  addScript: (data: Omit<ScriptItem, "id" | "createdAt" | "updatedAt">) => { ok: boolean; error?: string; scriptId?: string };
  updateScript: (id: string, data: Partial<ScriptItem>) => { ok: boolean; error?: string };
  deleteScript: (id: string) => { ok: boolean; error?: string };

  // Dedicated Invitations Management
  addInvitation: (data: Omit<InvitationRecord, "id" | "createdAt" | "updatedAt">) => { ok: boolean; error?: string; invitationId?: string };
  updateInvitation: (id: string, data: Partial<InvitationRecord>) => { ok: boolean; error?: string };
  deleteInvitation: (id: string) => { ok: boolean; error?: string };

  // Global AI Action Execution
  executeAIAction: (action: AIAction) => Promise<AIActionResult>;

  // Reset
  resetAll: () => void;
}

interface PersistedSlice {
  events: Event[];
  activeEventId: string | null;
  selectedEventId: string | null;
  liveEventIds: string[];
  speakers: Speaker[];
  sessions: Session[];
  delays: DelayRecord[];
  emergencies: Emergency[];
  aiRecords: AIRecord[];
  activityLogs: ActivityLog[];
  scripts: ScriptItem[];
  invitations: InvitationRecord[];
  conversations: AIConversation[];
  activeConversationId: string | null;
  selectedScriptId: string | null;
}

const initialData: PersistedSlice = {
  events: [],
  activeEventId: null,
  selectedEventId: null,
  liveEventIds: [],
  speakers: [],
  sessions: [],
  delays: [],
  emergencies: [],
  aiRecords: [],
  activityLogs: [],
  scripts: [],
  invitations: [],
  conversations: [],
  activeConversationId: null,
  selectedScriptId: null,
};

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export const useEventStore = create<EventStoreState>((set, get) => ({
  ...initialData,
  activeUserId: null,
  hydrated: false,
  corruptionNotice: null,

  hydrate: (userId?: string | null) => {
    const targetUserId = userId ?? null;
    // If already hydrated for this exact user, skip
    if (get().hydrated && get().activeUserId === targetUserId) return;

    setActiveStorageUserId(targetUserId);
    const { state, wasCorrupted, error } = loadFromStorage<PersistedSlice>(initialData, targetUserId);

    // Normalize and backward-migrate events with complete timestamps
    const normalizedEvents = (state.events || []).map((e) => {
      const ts = resolveEventTimestamps(e);
      return {
        ...e,
        date: e.date || ts.startDate,
        startDate: e.startDate || ts.startDate,
        endDate: e.endDate || ts.endDate,
        startDateTime: e.startDateTime || ts.startDateTime,
        endDateTime: e.endDateTime || ts.endDateTime,
      };
    });

    // Normalize and backward-migrate sessions with complete timestamps
    const normalizedSessions = (state.sessions || []).map((s) => {
      const parentEvent = normalizedEvents.find((e) => e.id === s.eventId);
      const baseDate = parentEvent?.startDate || parentEvent?.date || s.sessionDate || "2026-09-19";
      const ts = resolveSessionTimestamps(s, baseDate);
      return {
        ...s,
        sessionDate: s.sessionDate || ts.sessionDate,
        startDateTime: s.startDateTime || ts.startDateTime,
        endDateTime: s.endDateTime || ts.endDateTime,
        duration: s.duration || ts.durationMinutes,
        originalSessionDate: s.originalSessionDate || s.sessionDate || ts.sessionDate,
        originalStartDateTime: s.originalStartDateTime || s.startDateTime || ts.startDateTime,
        originalEndDateTime: s.originalEndDateTime || s.endDateTime || ts.endDateTime,
      };
    });

    const initialLiveIds = Array.isArray(state.liveEventIds) ? state.liveEventIds : [];
    const derivedLiveSet = new Set<string>(initialLiveIds);
    normalizedEvents.forEach((e) => {
      if (e.status === "Live") derivedLiveSet.add(e.id);
    });
    normalizedSessions.forEach((s) => {
      if (s.status === "Live") derivedLiveSet.add(s.eventId);
    });
    const finalLiveIds = Array.from(derivedLiveSet);
    const initialSelectedId = state.selectedEventId || state.activeEventId || normalizedEvents[0]?.id || null;

    set({
      ...state,
      events: normalizedEvents,
      activeEventId: initialSelectedId,
      selectedEventId: initialSelectedId,
      liveEventIds: finalLiveIds,
      speakers: state.speakers || [],
      sessions: normalizedSessions,
      delays: state.delays || [],
      emergencies: state.emergencies || [],
      aiRecords: state.aiRecords || [],
      activityLogs: state.activityLogs || [],
      scripts: state.scripts || [],
      invitations: state.invitations || [],
      activeUserId: targetUserId,
      hydrated: true,
      corruptionNotice: wasCorrupted && error ? error : null,
    });

    // Cloud Firestore synchronization (asynchronous)
    if (targetUserId) {
      getEventsFromFirestore(targetUserId)
        .then(async (res) => {
          if (res.ok && res.data) {
            // Ensure user hasn't switched during network roundtrip
            if (get().activeUserId !== targetUserId) return;

            const cloudEvents = res.data.map((e) => {
              const ts = resolveEventTimestamps(e);
              return {
                ...e,
                date: e.date || ts.startDate,
                startDate: e.startDate || ts.startDate,
                endDate: e.endDate || ts.endDate,
                startDateTime: e.startDateTime || ts.startDateTime,
                endDateTime: e.endDateTime || ts.endDateTime,
              };
            });

            const currentActiveId = get().activeEventId;
            const validActiveId = cloudEvents.some((e) => e.id === currentActiveId)
              ? currentActiveId
              : cloudEvents[0]?.id || null;

            // Load all subcollections for each event in parallel
            const eventDetails = await Promise.all(
              cloudEvents.map(async (ev) => {
                const [spkRes, sesRes, delRes, emgRes, logRes, aiRes, scpRes, invRes] = await Promise.all([
                  getSpeakersFromFirestore(targetUserId, ev.id),
                  getSessionsFromFirestore(targetUserId, ev.id),
                  getDelaysFromFirestore(targetUserId, ev.id),
                  getEmergenciesFromFirestore(targetUserId, ev.id),
                  getActivityLogsFromFirestore(targetUserId, ev.id),
                  getAIRecordsFromFirestore(targetUserId, ev.id),
                  getScriptsFromFirestore(targetUserId, ev.id),
                  getInvitationsFromFirestore(targetUserId, ev.id),
                ]);
                return {
                  speakers: spkRes.ok && spkRes.data ? spkRes.data : [],
                  sessions: sesRes.ok && sesRes.data ? sesRes.data : [],
                  delays: delRes.ok && delRes.data ? delRes.data : [],
                  emergencies: emgRes.ok && emgRes.data ? emgRes.data : [],
                  activityLogs: logRes.ok && logRes.data ? logRes.data : [],
                  aiRecords: aiRes.ok && aiRes.data ? aiRes.data : [],
                  scripts: scpRes.ok && scpRes.scripts ? scpRes.scripts : [],
                  invitations: invRes.ok && invRes.invitations ? invRes.invitations : [],
                };
              })
            );

            // Re-verify user after nested asynchronous fetches
            if (get().activeUserId !== targetUserId) return;

            const allCloudSpeakers = eventDetails.flatMap((d) => d.speakers);
            const allCloudSessions = eventDetails.flatMap((d) => d.sessions);
            const allCloudDelays = eventDetails.flatMap((d) => d.delays);
            const allCloudEmergencies = eventDetails.flatMap((d) => d.emergencies);
            const allCloudLogs = eventDetails.flatMap((d) => d.activityLogs);
            const allCloudAIRecords = eventDetails.flatMap((d) => d.aiRecords);
            const allCloudScripts = eventDetails.flatMap((d) => d.scripts);
            const allCloudInvitations = eventDetails.flatMap((d) => d.invitations);

            // Sort logs and AI records newest first
            allCloudLogs.sort((a, b) => b.timestamp - a.timestamp);
            allCloudAIRecords.sort((a, b) => b.timestamp - a.timestamp);
            allCloudScripts.sort((a, b) => b.createdAt - a.createdAt);
            allCloudInvitations.sort((a, b) => b.createdAt - a.createdAt);

            const normalizedCloudSessions = allCloudSessions.map((s) => {
              const parentEvent = cloudEvents.find((e) => e.id === s.eventId);
              const baseDate = parentEvent?.startDate || parentEvent?.date || s.sessionDate || "2026-09-19";
              const ts = resolveSessionTimestamps(s, baseDate);
              return {
                ...s,
                sessionDate: s.sessionDate || ts.sessionDate,
                startDateTime: s.startDateTime || ts.startDateTime,
                endDateTime: s.endDateTime || ts.endDateTime,
                duration: s.duration || ts.durationMinutes,
                originalSessionDate: s.originalSessionDate || s.sessionDate || ts.sessionDate,
                originalStartDateTime: s.originalStartDateTime || s.startDateTime || ts.startDateTime,
                originalEndDateTime: s.originalEndDateTime || s.endDateTime || ts.endDateTime,
              };
            });

            const cloudLiveSet = new Set<string>(get().liveEventIds || []);
            cloudEvents.forEach((e) => {
              if (e.status === "Live") cloudLiveSet.add(e.id);
            });
            normalizedCloudSessions.forEach((s) => {
              if (s.status === "Live") cloudLiveSet.add(s.eventId);
            });
            const cloudFinalLiveIds = Array.from(cloudLiveSet);

            const convRes = await getAIConversationsFromFirestore(targetUserId);
            const allCloudConversations = convRes.success && convRes.conversations ? convRes.conversations : [];

            set((s) => {
              const updated = {
                events: cloudEvents,
                activeEventId: validActiveId,
                selectedEventId: s.selectedEventId && cloudEvents.some((e) => e.id === s.selectedEventId) ? s.selectedEventId : validActiveId,
                liveEventIds: cloudFinalLiveIds,
                speakers: allCloudSpeakers,
                sessions: normalizedCloudSessions,
                delays: allCloudDelays,
                emergencies: allCloudEmergencies,
                activityLogs: allCloudLogs,
                aiRecords: allCloudAIRecords,
                scripts: allCloudScripts,
                invitations: allCloudInvitations,
                conversations: allCloudConversations.length > 0 ? allCloudConversations : (s.conversations || []),
                activeConversationId: s.activeConversationId || allCloudConversations[0]?.id || null,
              };
              saveToStorage({ ...s, ...updated });
              return updated;
            });
          }
        })
        .catch((err) => {
          console.warn("[Firestore hydrate warning]", err);
        });
    }
  },

  clearState: () => {
    setActiveStorageUserId(null);
    set({
      ...initialData,
      activeUserId: null,
      hydrated: false,
      corruptionNotice: null,
    });
  },

  clearCorruptionNotice: () => set({ corruptionNotice: null }),

  setActiveEvent: (id) => {
    set({ activeEventId: id, selectedEventId: id });
    const current = get();
    saveToStorage(current);
  },

  setSelectedEvent: (id) => {
    set({ selectedEventId: id, activeEventId: id });
    const current = get();
    saveToStorage(current);
  },

  // AI Conversations Actions
  createConversation: (title?: string) => {
    const id = generateId();
    const now = Date.now();
    const newConv: AIConversation = {
      id,
      title: title || "New Conversation",
      userId: get().activeUserId || undefined,
      createdAt: now,
      updatedAt: now,
      messages: [],
      relatedEventIds: [],
      isSaved: false,
    };

    set((s) => {
      const nextConversations = [newConv, ...(s.conversations || [])];
      const updated = {
        conversations: nextConversations,
        activeConversationId: id,
      };
      saveToStorage({ ...s, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      createAIConversationInFirestore(uid, newConv).catch((err) => {
        console.error("[Firestore createConversation failed]", err);
      });
    }

    return id;
  },

  selectConversation: (id) => {
    set((s) => {
      const updated = { activeConversationId: id };
      saveToStorage({ ...s, ...updated });
      return updated;
    });
  },

  deleteConversation: (id: string) => {
    const target = get().conversations.find((c) => c.id === id);
    if (!target) return { ok: false, error: "Conversation not found." };

    set((s) => {
      const nextConversations = (s.conversations || []).filter((c) => c.id !== id);
      const nextActiveId = s.activeConversationId === id ? (nextConversations[0]?.id || null) : s.activeConversationId;
      const updated = {
        conversations: nextConversations,
        activeConversationId: nextActiveId,
      };
      saveToStorage({ ...s, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      deleteAIConversationInFirestore(uid, id).catch((err) => {
        console.error("[Firestore deleteConversation failed]", err);
      });
    }

    return { ok: true };
  },

  toggleSaveConversation: (id: string) => {
    const target = get().conversations.find((c) => c.id === id);
    if (!target) return { ok: false };

    const nextSaved = !target.isSaved;
    const now = Date.now();

    set((s) => {
      const nextConversations = (s.conversations || []).map((c) =>
        c.id === id ? { ...c, isSaved: nextSaved, updatedAt: now } : c
      );
      const updated = { conversations: nextConversations };
      saveToStorage({ ...s, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      updateAIConversationInFirestore(uid, id, { isSaved: nextSaved, updatedAt: now }).catch((err) => {
        console.error("[Firestore toggleSaveConversation failed]", err);
      });
    }

    return { ok: true };
  },

  renameConversation: (id: string, title: string) => {
    const target = get().conversations.find((c) => c.id === id);
    if (!target) return { ok: false };

    const trimmed = title.trim();
    if (!trimmed) return { ok: false };
    const now = Date.now();

    set((s) => {
      const nextConversations = (s.conversations || []).map((c) =>
        c.id === id ? { ...c, title: trimmed, updatedAt: now } : c
      );
      const updated = { conversations: nextConversations };
      saveToStorage({ ...s, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      updateAIConversationInFirestore(uid, id, { title: trimmed, updatedAt: now }).catch((err) => {
        console.error("[Firestore renameConversation failed]", err);
      });
    }

    return { ok: true };
  },

  addMessageToConversation: (conversationId: string, message: AIMessage) => {
    let conv = get().conversations.find((c) => c.id === conversationId);
    const now = Date.now();

    // If conversation doesn't exist, create it on the fly
    if (!conv) {
      const newId = conversationId || generateId();
      conv = {
        id: newId,
        title: message.role === "user" ? (message.content.slice(0, 32) || "New Conversation") : "New Conversation",
        userId: get().activeUserId || undefined,
        createdAt: now,
        updatedAt: now,
        messages: [message],
        relatedEventIds: [],
        isSaved: false,
      };

      set((s) => {
        const nextConversations = [conv!, ...(s.conversations || [])];
        const updated = {
          conversations: nextConversations,
          activeConversationId: newId,
        };
        saveToStorage({ ...s, ...updated });
        return updated;
      });

      const uid = get().activeUserId;
      if (uid) {
        createAIConversationInFirestore(uid, conv).catch((err) => {
          console.error("[Firestore addMessageToConversation create failed]", err);
        });
      }

      return { ok: true };
    }

    // Auto-derive title if first user message and previous title is default
    let newTitle = conv.title;
    if (
      message.role === "user" &&
      conv.title === "New Conversation"
    ) {
      const cleanPrompt = message.content.replace(/\b(create|plan|generate|event|for|an|a)\b/gi, "").replace(/\s+/g, " ").trim();
      newTitle = (cleanPrompt.slice(0, 30) || message.content.slice(0, 30)).trim();
      if (newTitle) {
        newTitle = newTitle.charAt(0).toUpperCase() + newTitle.slice(1);
      } else {
        newTitle = "Event Planning";
      }
    }

    // Track related events
    const nextRelatedEventIds = new Set<string>(conv.relatedEventIds || []);
    if (message.plan && (message.plan as unknown as { eventId?: string }).eventId) {
      nextRelatedEventIds.add((message.plan as unknown as { eventId: string }).eventId);
    }
    if (message.action?.payload?.eventId) {
      nextRelatedEventIds.add(String(message.action.payload.eventId));
    }

    const updatedConv: AIConversation = {
      ...conv,
      title: newTitle,
      updatedAt: now,
      messages: [...(conv.messages || []), message],
      relatedEventIds: Array.from(nextRelatedEventIds),
    };

    set((s) => {
      const nextConversations = (s.conversations || []).map((c) =>
        c.id === conversationId ? updatedConv : c
      );
      // Sort conversations so most recently updated is first
      nextConversations.sort((a, b) => b.updatedAt - a.updatedAt);
      const updated = {
        conversations: nextConversations,
        activeConversationId: conversationId,
      };
      saveToStorage({ ...s, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      updateAIConversationInFirestore(uid, conversationId, {
        title: updatedConv.title,
        updatedAt: now,
        messages: updatedConv.messages,
        relatedEventIds: updatedConv.relatedEventIds,
      }).catch((err) => {
        console.error("[Firestore addMessageToConversation update failed]", err);
      });
    }

    return { ok: true };
  },

  updateMessageInConversation: (conversationId: string, messageId: string, updates: Partial<AIMessage>) => {
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!conv) return { ok: false };
    const now = Date.now();

    const nextMessages = (conv.messages || []).map((m) =>
      m.id === messageId ? { ...m, ...updates } : m
    );

    const updatedConv: AIConversation = {
      ...conv,
      updatedAt: now,
      messages: nextMessages,
    };

    set((s) => {
      const nextConversations = (s.conversations || []).map((c) =>
        c.id === conversationId ? updatedConv : c
      );
      const updated = { conversations: nextConversations };
      saveToStorage({ ...s, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      updateAIConversationInFirestore(uid, conversationId, {
        updatedAt: now,
        messages: updatedConv.messages,
      }).catch((err) => {
        console.error("[Firestore updateMessageInConversation update failed]", err);
      });
    }

    return { ok: true };
  },

  startLiveEvent: (eventId: string) => {
    const event = get().events.find((e) => e.id === eventId);
    if (!event) return { ok: false, error: "Event not found." };

    const now = Date.now();
    const updatedEvent: Event = {
      ...event,
      status: "Live",
      updatedAt: now,
    };

    const nextLiveIds = Array.from(new Set([...get().liveEventIds, eventId]));
    const newLog: ActivityLog = {
      id: generateId(),
      eventId,
      type: "event_live_started",
      message: `Event "${event.name}" is now LIVE`,
      timestamp: now,
    };

    set((state) => {
      const nextEvents = state.events.map((e) => (e.id === eventId ? updatedEvent : e));
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = {
        events: nextEvents,
        liveEventIds: nextLiveIds,
        activityLogs: nextLogs,
      };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      updateEventInFirestore(uid, eventId, { status: "Live", updatedAt: now }).catch((err) => {
        console.error("[Firestore startLiveEvent failed]", err);
      });
      createActivityLogInFirestore(uid, eventId, newLog).catch((err) => {
        console.error("[Firestore log startLiveEvent failed]", err);
      });
    }

    return { ok: true };
  },

  stopLiveEvent: (eventId: string) => {
    const event = get().events.find((e) => e.id === eventId);
    if (!event) return { ok: false, error: "Event not found." };

    const now = Date.now();
    const updatedEvent: Event = {
      ...event,
      status: "Completed",
      updatedAt: now,
    };

    const nextLiveIds = get().liveEventIds.filter((id) => id !== eventId);
    const liveSessions = get().sessions.filter((s) => s.eventId === eventId && s.status === "Live");

    const newLog: ActivityLog = {
      id: generateId(),
      eventId,
      type: "event_live_stopped",
      message: `Event "${event.name}" live operations ended`,
      timestamp: now,
    };

    set((state) => {
      const nextEvents = state.events.map((e) => (e.id === eventId ? updatedEvent : e));
      const nextSessions = state.sessions.map((s) =>
        s.eventId === eventId && s.status === "Live"
          ? { ...s, status: "Completed" as const, actualEndTime: now }
          : s
      );
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = {
        events: nextEvents,
        liveEventIds: nextLiveIds,
        sessions: nextSessions,
        activityLogs: nextLogs,
      };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      updateEventInFirestore(uid, eventId, { status: "Completed", updatedAt: now }).catch((err) => {
        console.error("[Firestore stopLiveEvent failed]", err);
      });
      createActivityLogInFirestore(uid, eventId, newLog).catch((err) => {
        console.error("[Firestore log stopLiveEvent failed]", err);
      });
      liveSessions.forEach((s) => {
        updateSessionInFirestore(uid, eventId, s.id, {
          status: "Completed",
          actualEndTime: now,
        }).catch((err) => {
          console.error("[Firestore complete live session failed]", err);
        });
      });
    }

    return { ok: true };
  },

  isEventLive: (eventId: string) => {
    const ev = get().events.find((e) => e.id === eventId);
    if (ev?.status === "Live") return true;
    if (get().liveEventIds.includes(eventId)) return true;
    return get().sessions.some((s) => s.eventId === eventId && s.status === "Live");
  },

  createEvent: (data) => {
    const val = validateEvent(data);
    if (!val.valid) {
      const msg = Object.values(val.errors)[0] || "Invalid event data.";
      return { ok: false, error: msg };
    }

    const now = Date.now();
    const id = generateId();
    const ts = resolveEventTimestamps(data);

    const newEvent: Event = {
      ...data,
      id,
      name: data.name.trim(),
      venue: data.venue.trim(),
      description: data.description?.trim(),
      organizer: data.organizer?.trim(),
      date: ts.startDate,
      startDate: ts.startDate,
      endDate: ts.endDate,
      startTime: ts.startTime,
      endTime: ts.endTime,
      startDateTime: ts.startDateTime,
      endDateTime: ts.endDateTime,
      createdAt: now,
      updatedAt: now,
    };

    const newLog: ActivityLog = {
      id: generateId(),
      eventId: id,
      type: "event_created",
      message: `Event "${newEvent.name}" was created`,
      timestamp: now,
    };

    set((state) => {
      const nextEvents = [newEvent, ...state.events];
      const nextActiveId = state.activeEventId || id;
      const nextSelectedId = state.selectedEventId || id;
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = {
        events: nextEvents,
        activeEventId: nextActiveId,
        selectedEventId: nextSelectedId,
        activityLogs: nextLogs,
      };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously write to Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      createEventInFirestore(uid, newEvent).catch((err) => {
        console.error("[Firestore createEvent failed]", err);
      });
      createActivityLogInFirestore(uid, id, newLog).catch((err) => {
        console.error("[Firestore log createEvent failed]", err);
      });
    }

    return { ok: true, eventId: id };
  },

  createEventFromPlan: (plan) => {
    if (!plan || !plan.name?.trim()) {
      return { ok: false, error: "Event name is required." };
    }
    if (!plan.venue?.trim()) {
      return { ok: false, error: "Venue is required." };
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const startDate = plan.startDate || todayStr;
    const endDate = plan.endDate || startDate;
    const startTime = plan.startTime || "09:00";
    const endTime = plan.endTime || "17:00";

    const eventRes = get().createEvent({
      name: plan.name.trim(),
      type: plan.type || "Other",
      startDate,
      endDate,
      date: startDate,
      startTime,
      endTime,
      venue: plan.venue.trim(),
      description: plan.description || "",
      organizer: plan.organizer || "",
    });

    if (!eventRes.ok || !eventRes.eventId) {
      return { ok: false, error: eventRes.error || "Failed to create event." };
    }

    const eventId = eventRes.eventId;

    // Add people / speakers
    const speakerMap: Record<string, string> = {};
    if (Array.isArray(plan.people)) {
      for (const person of plan.people) {
        if (person.name && person.name.trim()) {
          const designation = person.role
            ? `${person.role}${person.designation ? " - " + person.designation : ""}`
            : person.designation || "";

          const spkRes = get().addSpeaker({
            eventId,
            name: person.name.trim(),
            designation,
            organization: person.organization || "",
            bio: person.bio || "",
            image: null,
          });

          if (spkRes.ok && spkRes.speakerId) {
            speakerMap[person.name.trim().toLowerCase()] = spkRes.speakerId;
          }
        }
      }
    }

    // Add sessions sequentially
    if (Array.isArray(plan.sessions) && plan.sessions.length > 0) {
      let currentMinutes = timeToMinutes(startTime);

      for (const sess of plan.sessions) {
        if (sess.title && sess.title.trim()) {
          const duration = sess.duration && sess.duration > 0 ? sess.duration : 30;
          const sessStartTime = sess.startTime || minutesToTime(currentMinutes);
          const startM = timeToMinutes(sessStartTime);
          const sessEndTime = sess.endTime || minutesToTime(startM + duration);
          currentMinutes = timeToMinutes(sessEndTime);

          const matchedSpeakerId = sess.speakerName
            ? speakerMap[sess.speakerName.trim().toLowerCase()] || null
            : null;

          get().addSession({
            eventId,
            title: sess.title.trim(),
            type: sess.type || "Other",
            speakerId: matchedSpeakerId,
            sessionDate: sess.sessionDate || startDate,
            startTime: sessStartTime,
            endTime: sessEndTime,
            duration,
            status: "Upcoming",
            isFixedTime: !!sess.isFixedTime,
          });
        }
      }
    }

    // Add scripts if present
    if (Array.isArray(plan.scripts)) {
      for (const scr of plan.scripts) {
        if (scr.content && scr.content.trim()) {
          get().addAIRecord({
            eventId,
            type: "role_script",
            prompt: `Script for ${scr.role}${scr.targetName ? " - " + scr.targetName : ""} (${scr.scriptType})`,
            generatedText: scr.content.trim(),
            metadata: {
              role: scr.role,
              targetName: scr.targetName,
              scriptType: scr.scriptType,
            },
          });

          // Also populate dedicated scripts repository
          const category = scr.role.toLowerCase().includes("anchor")
            ? "anchor"
            : scr.role.toLowerCase().includes("speaker")
            ? "speaker"
            : scr.role.toLowerCase().includes("artist")
            ? "artist"
            : scr.role.toLowerCase().includes("award")
            ? "award"
            : "organizer";

          get().addScript({
            eventId,
            title: `${scr.role}: ${scr.scriptType}`,
            category,
            scriptType: scr.scriptType,
            targetName: scr.targetName,
            content: scr.content.trim(),
          });
        }
      }
    }

    // Add invitation if present
    if (plan.invitation && plan.invitation.title) {
      get().addInvitation({
        eventId,
        title: plan.invitation.title,
        theme: plan.invitation.theme || "modern_dark",
        data: {
          title: plan.invitation.title,
          subtitle: plan.invitation.subtitle,
          dateText: plan.invitation.dateText || startDate,
          timeText: plan.invitation.timeText || `${startTime} - ${endTime}`,
          venueText: plan.invitation.venueText || plan.venue,
          theme: plan.invitation.theme || "modern_dark",
          description: plan.description,
          organizer: plan.organizer,
        },
      });
    }

    // Add invitation if present
    if (plan.invitation && plan.invitation.title) {
      get().addAIRecord({
        eventId,
        type: "invitation",
        prompt: `Invitation card for ${plan.name}`,
        generatedText: JSON.stringify(plan.invitation),
        metadata: plan.invitation as Record<string, unknown>,
      });
    }

    // Set as active event
    get().setActiveEvent(eventId);

    return { ok: true, eventId };
  },

  updateEvent: (id, data) => {
    const event = get().events.find((e) => e.id === id);
    if (!event) return { ok: false, error: "Event not found." };

    const merged = { ...event, ...data };
    const val = validateEvent(merged);
    if (!val.valid) {
      const msg = Object.values(val.errors)[0] || "Invalid event data.";
      return { ok: false, error: msg };
    }

    const now = Date.now();
    const ts = resolveEventTimestamps(merged);

    const updatedEvent: Event = {
      ...merged,
      date: ts.startDate,
      startDate: ts.startDate,
      endDate: ts.endDate,
      startTime: ts.startTime,
      endTime: ts.endTime,
      startDateTime: ts.startDateTime,
      endDateTime: ts.endDateTime,
      updatedAt: now,
    };

    const newLog: ActivityLog = {
      id: generateId(),
      eventId: id,
      type: "event_updated",
      message: `Event "${updatedEvent.name}" was updated`,
      timestamp: now,
    };

    set((state) => {
      const nextEvents = state.events.map((e) => (e.id === id ? updatedEvent : e));
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { events: nextEvents, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously update Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      updateEventInFirestore(uid, id, updatedEvent).catch((err) => {
        console.error("[Firestore updateEvent failed]", err);
      });
      createActivityLogInFirestore(uid, id, newLog).catch((err) => {
        console.error("[Firestore log updateEvent failed]", err);
      });
    }

    return { ok: true };
  },

  deleteEvent: (id) => {
    const event = get().events.find((e) => e.id === id);
    if (!event) return { ok: false, error: "Event not found." };

    set((state) => {
      // Cascade delete everything related to this event
      const nextEvents = state.events.filter((e) => e.id !== id);
      const nextSpeakers = state.speakers.filter((s) => s.eventId !== id);
      const nextSessions = state.sessions.filter((s) => s.eventId !== id);
      const nextDelays = state.delays.filter((d) => d.eventId !== id);
      const nextEmergencies = state.emergencies.filter((em) => em.eventId !== id);
      const nextAIRecords = state.aiRecords.filter((a) => a.eventId !== id);
      const nextLogs = state.activityLogs.filter((l) => l.eventId !== id);
      const nextActiveId = state.activeEventId === id ? nextEvents[0]?.id || null : state.activeEventId;
      const nextSelectedId = state.selectedEventId === id ? nextEvents[0]?.id || null : state.selectedEventId;
      const nextLiveIds = state.liveEventIds.filter((lid) => lid !== id);

      const updated = {
        events: nextEvents,
        speakers: nextSpeakers,
        sessions: nextSessions,
        delays: nextDelays,
        emergencies: nextEmergencies,
        aiRecords: nextAIRecords,
        activityLogs: nextLogs,
        activeEventId: nextActiveId,
        selectedEventId: nextSelectedId,
        liveEventIds: nextLiveIds,
      };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously delete from Cloud Firestore (including subcollection documents)
    const uid = get().activeUserId;
    if (uid) {
      deleteEventFromFirestore(uid, id).catch((err) => {
        console.error("[Firestore deleteEvent failed]", err);
      });
    }

    return { ok: true };
  },

  addSpeaker: (data) => {
    const val = validateSpeaker(data);
    if (!val.valid) {
      const msg = Object.values(val.errors)[0] || "Invalid speaker data.";
      return { ok: false, error: msg };
    }

    const now = Date.now();
    const id = generateId();
    const newSpeaker: Speaker = {
      ...data,
      id,
      name: data.name.trim(),
      designation: data.designation?.trim(),
      organization: data.organization?.trim(),
      bio: data.bio?.trim(),
      createdAt: now,
    };

    const newLog: ActivityLog = {
      id: generateId(),
      eventId: data.eventId,
      type: "speaker_added",
      message: `Speaker "${newSpeaker.name}" was added`,
      timestamp: now,
    };

    set((state) => {
      const nextSpeakers = [...state.speakers, newSpeaker];
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { speakers: nextSpeakers, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously write to Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      createSpeakerInFirestore(uid, data.eventId, newSpeaker).catch((err) => {
        console.error("[Firestore addSpeaker failed]", err);
      });
      createActivityLogInFirestore(uid, data.eventId, newLog).catch((err) => {
        console.error("[Firestore log addSpeaker failed]", err);
      });
    }

    return { ok: true, speakerId: id };
  },

  updateSpeaker: (id, data) => {
    const speaker = get().speakers.find((s) => s.id === id);
    if (!speaker) return { ok: false, error: "Speaker not found." };

    const merged = { ...speaker, ...data };
    const val = validateSpeaker(merged);
    if (!val.valid) {
      const msg = Object.values(val.errors)[0] || "Invalid speaker data.";
      return { ok: false, error: msg };
    }

    const now = Date.now();
    const newLog: ActivityLog = {
      id: generateId(),
      eventId: speaker.eventId,
      type: "speaker_updated",
      message: `Speaker "${merged.name}" was updated`,
      timestamp: now,
    };

    set((state) => {
      const nextSpeakers = state.speakers.map((s) => (s.id === id ? merged : s));
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { speakers: nextSpeakers, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously update Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      updateSpeakerInFirestore(uid, speaker.eventId, id, merged).catch((err) => {
        console.error("[Firestore updateSpeaker failed]", err);
      });
      createActivityLogInFirestore(uid, speaker.eventId, newLog).catch((err) => {
        console.error("[Firestore log updateSpeaker failed]", err);
      });
    }

    return { ok: true };
  },

  deleteSpeaker: (id) => {
    const speaker = get().speakers.find((s) => s.id === id);
    if (!speaker) return { ok: false, error: "Speaker not found." };

    const now = Date.now();
    const newLog: ActivityLog = {
      id: generateId(),
      eventId: speaker.eventId,
      type: "speaker_deleted",
      message: `Speaker "${speaker.name}" was removed`,
      timestamp: now,
    };

    set((state) => {
      const nextSpeakers = state.speakers.filter((s) => s.id !== id);
      // Nullify speakerId in affected sessions
      const nextSessions = state.sessions.map((s) => (s.speakerId === id ? { ...s, speakerId: null } : s));
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { speakers: nextSpeakers, sessions: nextSessions, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously delete from Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      deleteSpeakerInFirestore(uid, speaker.eventId, id).catch((err) => {
        console.error("[Firestore deleteSpeaker failed]", err);
      });
      createActivityLogInFirestore(uid, speaker.eventId, newLog).catch((err) => {
        console.error("[Firestore log deleteSpeaker failed]", err);
      });
      // Nullify speakerId in affected sessions in Firestore
      get().sessions
        .filter((s) => s.eventId === speaker.eventId && s.speakerId === null)
        .forEach((s) => {
          updateSessionInFirestore(uid, speaker.eventId, s.id, { speakerId: null }).catch((err) => {
            console.error("[Firestore nullify speaker on session failed]", err);
          });
        });
    }

    return { ok: true };
  },

  addSession: (data) => {
    const event = get().events.find((e) => e.id === data.eventId);
    if (!event) return { ok: false, error: "Event not found." };

    const eventSessions = get().sessions.filter((s) => s.eventId === data.eventId);
    const val = validateSession(data, event, eventSessions);
    if (!val.valid) {
      const msg = Object.values(val.errors)[0] || "Invalid session data.";
      return { ok: false, error: msg };
    }

    const now = Date.now();
    const id = generateId();
    const sessionDate = data.sessionDate || event.startDate || event.date;
    const ts = resolveSessionTimestamps(
      {
        sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      event.startDate || event.date
    );

    const newSession: Session = {
      ...data,
      id,
      title: data.title.trim(),
      sessionDate: ts.sessionDate,
      startTime: ts.startTime,
      endTime: ts.endTime,
      duration: ts.durationMinutes,
      startDateTime: ts.startDateTime,
      endDateTime: ts.endDateTime,
      originalSessionDate: ts.sessionDate,
      originalStartTime: ts.startTime,
      originalEndTime: ts.endTime,
      originalStartDateTime: ts.startDateTime,
      originalEndDateTime: ts.endDateTime,
      actualStartTime: null,
      actualEndTime: null,
    };

    const newLog: ActivityLog = {
      id: generateId(),
      eventId: data.eventId,
      type: "session_added",
      message: `Session "${newSession.title}" (${newSession.sessionDate} ${newSession.startTime} - ${newSession.endTime}) was scheduled`,
      timestamp: now,
    };

    set((state) => {
      const nextSessions = [...state.sessions, newSession].sort(
        (a, b) => (a.startDateTime || 0) - (b.startDateTime || 0)
      );
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { sessions: nextSessions, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously write to Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      createSessionInFirestore(uid, data.eventId, newSession).catch((err) => {
        console.error("[Firestore addSession failed]", err);
      });
      createActivityLogInFirestore(uid, data.eventId, newLog).catch((err) => {
        console.error("[Firestore log addSession failed]", err);
      });
    }

    return { ok: true, sessionId: id };
  },

  updateSession: (id, data) => {
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return { ok: false, error: "Session not found." };

    const event = get().events.find((e) => e.id === session.eventId);
    if (!event) return { ok: false, error: "Event not found." };

    const eventSessions = get().sessions.filter((s) => s.eventId === session.eventId);
    const merged = { ...session, ...data };
    const val = validateSession(merged, event, eventSessions, id);
    if (!val.valid) {
      const msg = Object.values(val.errors)[0] || "Invalid session data.";
      return { ok: false, error: msg };
    }

    const now = Date.now();
    const sessionDate = merged.sessionDate || session.sessionDate || event.startDate || event.date;
    const ts = resolveSessionTimestamps(
      {
        sessionDate,
        startTime: merged.startTime,
        endTime: merged.endTime,
      },
      event.startDate || event.date
    );

    // If event has not started yet (no session has actualStartTime), update original times too
    const eventHasStarted = eventSessions.some((s) => s.actualStartTime !== null);
    const updatedSession: Session = {
      ...merged,
      sessionDate: ts.sessionDate,
      startTime: ts.startTime,
      endTime: ts.endTime,
      duration: ts.durationMinutes,
      startDateTime: ts.startDateTime,
      endDateTime: ts.endDateTime,
      originalSessionDate: eventHasStarted ? session.originalSessionDate || ts.sessionDate : ts.sessionDate,
      originalStartTime: eventHasStarted ? session.originalStartTime : ts.startTime,
      originalEndTime: eventHasStarted ? session.originalEndTime : ts.endTime,
      originalStartDateTime: eventHasStarted ? session.originalStartDateTime || ts.startDateTime : ts.startDateTime,
      originalEndDateTime: eventHasStarted ? session.originalEndDateTime || ts.endDateTime : ts.endDateTime,
    };

    const newLog: ActivityLog = {
      id: generateId(),
      eventId: session.eventId,
      type: "session_updated",
      message: `Session "${updatedSession.title}" was updated`,
      timestamp: now,
    };

    set((state) => {
      const nextSessions = state.sessions
        .map((s) => (s.id === id ? updatedSession : s))
        .sort((a, b) => (a.startDateTime || 0) - (b.startDateTime || 0));
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { sessions: nextSessions, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously update Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      updateSessionInFirestore(uid, session.eventId, id, updatedSession).catch((err) => {
        console.error("[Firestore updateSession failed]", err);
      });
      createActivityLogInFirestore(uid, session.eventId, newLog).catch((err) => {
        console.error("[Firestore log updateSession failed]", err);
      });
    }

    return { ok: true };
  },

  deleteSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return { ok: false, error: "Session not found." };

    if (session.status === "Live") {
      return { ok: false, error: "Cannot delete a Live session. Please complete or skip it first." };
    }

    const now = Date.now();
    const newLog: ActivityLog = {
      id: generateId(),
      eventId: session.eventId,
      type: "session_deleted",
      message: `Session "${session.title}" was deleted`,
      timestamp: now,
    };

    set((state) => {
      const nextSessions = state.sessions.filter((s) => s.id !== id);
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { sessions: nextSessions, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously delete from Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      deleteSessionInFirestore(uid, session.eventId, id).catch((err) => {
        console.error("[Firestore deleteSession failed]", err);
      });
      createActivityLogInFirestore(uid, session.eventId, newLog).catch((err) => {
        console.error("[Firestore log deleteSession failed]", err);
      });
    }

    return { ok: true };
  },

  reorderSessions: (eventId, sessionIdsInOrder) => {
    const allSessions = get().sessions;
    const eventSessions = allSessions.filter((s) => s.eventId === eventId);
    if (eventSessions.length <= 1) return { ok: true };

    // Check if any reordered session is Live, Completed, or Fixed (PRD §9.3 FR-023)
    const immovable = eventSessions.filter(
      (s) => s.status === "Live" || s.status === "Completed" || s.isFixedTime
    );
    if (immovable.length > 0) {
      return {
        ok: false,
        error: "Sessions that are Live, Completed, or Fixed cannot be reordered via slot re-flow. Edit their times directly.",
      };
    }

    // Slot re-flow: extract gaps between slots and durations
    // Keep earliest start time, pack each session preserving its duration and gaps
    const sortedOld = [...eventSessions].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    const gaps: number[] = [];
    for (let i = 0; i < sortedOld.length - 1; i++) {
      const gap = Math.max(0, timeToMinutes(sortedOld[i + 1].startTime) - timeToMinutes(sortedOld[i].endTime));
      gaps.push(gap);
    }

    const parentEvent = get().events.find((e) => e.id === eventId);
    const baseDate = parentEvent?.startDate || parentEvent?.date || sortedOld[0]?.sessionDate || "2026-09-19";

    let cursor = timeToMinutes(sortedOld[0].startTime);
    const updatedMap = new Map<string, Session>();

    for (let i = 0; i < sessionIdsInOrder.length; i++) {
      const sId = sessionIdsInOrder[i];
      const session = eventSessions.find((s) => s.id === sId)!;
      const startM = cursor;
      const endM = startM + session.duration;
      cursor = endM + (gaps[i] || 0);

      const newStartTime = minutesToTime(startM);
      const newEndTime = minutesToTime(endM);
      const ts = resolveSessionTimestamps(
        {
          sessionDate: session.sessionDate,
          startTime: newStartTime,
          endTime: newEndTime,
        },
        baseDate
      );

      updatedMap.set(sId, {
        ...session,
        startTime: ts.startTime,
        endTime: ts.endTime,
        duration: ts.durationMinutes,
        startDateTime: ts.startDateTime,
        endDateTime: ts.endDateTime,
      });
    }

    const now = Date.now();
    const newLog: ActivityLog = {
      id: generateId(),
      eventId,
      type: "session_reordered",
      message: "Agenda sessions were reordered",
      timestamp: now,
    };

    set((state) => {
      const nextSessions = state.sessions.map((s) => updatedMap.get(s.id) || s);
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { sessions: nextSessions, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously batch update Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      const affected = Array.from(updatedMap.values());
      batchUpdateSessionsInFirestore(uid, eventId, affected).catch((err) => {
        console.error("[Firestore reorderSessions failed]", err);
      });
      createActivityLogInFirestore(uid, eventId, newLog).catch((err) => {
        console.error("[Firestore log reorderSessions failed]", err);
      });
    }

    return { ok: true };
  },

  startSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return { ok: false, error: "Session not found." };

    // Check if another session is live
    const activeLive = get().sessions.find((s) => s.eventId === session.eventId && s.status === "Live");
    if (activeLive && activeLive.id !== id) {
      return {
        ok: false,
        error: `Another session is already live: "${activeLive.title}". Complete or skip it before starting a new session.`,
      };
    }

    const now = Date.now();
    const newLog: ActivityLog = {
      id: generateId(),
      eventId: session.eventId,
      type: "session_started",
      message: `Session "${session.title}" started`,
      timestamp: now,
    };

    set((state) => {
      const eventId = session.eventId;
      const nextLiveIds = Array.from(new Set([...state.liveEventIds, eventId]));
      const nextEvents = state.events.map((e) =>
        e.id === eventId && e.status !== "Live" ? { ...e, status: "Live" as const, updatedAt: now } : e
      );
      const nextSessions = state.sessions.map((s) =>
        s.id === id ? { ...s, status: "Live" as const, actualStartTime: now } : s
      );
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = {
        events: nextEvents,
        liveEventIds: nextLiveIds,
        sessions: nextSessions,
        activityLogs: nextLogs,
      };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously update Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      updateEventInFirestore(uid, session.eventId, { status: "Live", updatedAt: now }).catch((err) => {
        console.error("[Firestore updateEvent on startSession failed]", err);
      });
      updateSessionInFirestore(uid, session.eventId, id, {
        status: "Live",
        actualStartTime: now,
      }).catch((err) => {
        console.error("[Firestore startSession failed]", err);
      });
      createActivityLogInFirestore(uid, session.eventId, newLog).catch((err) => {
        console.error("[Firestore log startSession failed]", err);
      });
    }

    return { ok: true };
  },

  completeSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return { ok: false, error: "Session not found." };
    if (session.status !== "Live") {
      return { ok: false, error: "Only a live session can be completed." };
    }

    const now = Date.now();
    const newLog: ActivityLog = {
      id: generateId(),
      eventId: session.eventId,
      type: "session_completed",
      message: `Session "${session.title}" completed`,
      timestamp: now,
    };

    set((state) => {
      const nextSessions = state.sessions.map((s) =>
        s.id === id ? { ...s, status: "Completed" as const, actualEndTime: now } : s
      );
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { sessions: nextSessions, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously update Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      updateSessionInFirestore(uid, session.eventId, id, {
        status: "Completed",
        actualEndTime: now,
      }).catch((err) => {
        console.error("[Firestore completeSession failed]", err);
      });
      createActivityLogInFirestore(uid, session.eventId, newLog).catch((err) => {
        console.error("[Firestore log completeSession failed]", err);
      });
    }

    return { ok: true };
  },

  skipSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (!session) return { ok: false, error: "Session not found." };

    const now = Date.now();
    const actualEndTime = session.status === "Live" ? now : session.actualEndTime;
    const newLog: ActivityLog = {
      id: generateId(),
      eventId: session.eventId,
      type: "session_skipped",
      message: `Session "${session.title}" was skipped`,
      timestamp: now,
    };

    set((state) => {
      const nextSessions = state.sessions.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "Skipped" as const,
              actualEndTime,
            }
          : s
      );
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { sessions: nextSessions, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously update Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      updateSessionInFirestore(uid, session.eventId, id, {
        status: "Skipped",
        actualEndTime,
      }).catch((err) => {
        console.error("[Firestore skipSession failed]", err);
      });
      createActivityLogInFirestore(uid, session.eventId, newLog).catch((err) => {
        console.error("[Firestore log skipSession failed]", err);
      });
    }

    return { ok: true };
  },

  previewDelay: (anchorSessionId, minutes, fixedDecision) => {
    const session = get().sessions.find((s) => s.id === anchorSessionId);
    if (!session) {
      return {
        status: "invalid",
        proposedSessions: get().sessions,
        changes: [],
        bufferConsumedMinutes: 0,
        remainingShiftMinutes: 0,
        conflicts: [],
        errors: ["Anchor session not found."],
      };
    }

    const event = get().events.find((e) => e.id === session.eventId);
    if (!event) {
      return {
        status: "invalid",
        proposedSessions: get().sessions,
        changes: [],
        bufferConsumedMinutes: 0,
        remainingShiftMinutes: 0,
        conflicts: [],
        errors: ["Event not found."],
      };
    }

    const eventSessions = get().sessions.filter((s) => s.eventId === session.eventId);
    return computeDelay({
      sessions: eventSessions,
      anchorSessionId,
      minutes,
      now: Date.now(),
      eventStartDate: event.startDate || event.date,
      eventWindow: { start: event.startTime, end: event.endTime },
      fixedDecision,
    });
  },

  commitDelay: (anchorSessionId, minutes, reason, fixedDecision) => {
    const preview = get().previewDelay(anchorSessionId, minutes, fixedDecision);
    if (preview.status !== "ok") {
      const msg = preview.errors[0] || "Cannot commit delay. Resolve conflicts or validation errors.";
      return { ok: false, error: msg };
    }

    const anchor = get().sessions.find((s) => s.id === anchorSessionId)!;
    const now = Date.now();

    const delayRecord: DelayRecord = {
      id: generateId(),
      eventId: anchor.eventId,
      sessionId: anchorSessionId,
      minutes,
      reason,
      timestamp: now,
    };

    const newLogs: ActivityLog[] = [
      {
        id: generateId(),
        eventId: anchor.eventId,
        type: "delay_applied",
        message: `Delay of +${minutes} minutes applied (${reason || "Manual adjustment"})`,
        timestamp: now,
      },
    ];

    if (preview.bufferConsumedMinutes > 0) {
      newLogs.push({
        id: generateId(),
        eventId: anchor.eventId,
        type: "buffer_consumed",
        message: `${preview.bufferConsumedMinutes} minutes of buffer absorbed`,
        timestamp: now,
      });
    }

    preview.changes.forEach((c) => {
      const fromLabel = c.from.date ? `${c.from.date} ${c.from.start}-${c.from.end}` : `${c.from.start}-${c.from.end}`;
      const toLabel = c.to.date ? `${c.to.date} ${c.to.start}-${c.to.end}` : `${c.to.start}-${c.to.end}`;
      newLogs.push({
        id: generateId(),
        eventId: anchor.eventId,
        type: "schedule_change",
        message: `"${c.sessionTitle}" shifted from ${fromLabel} to ${toLabel}`,
        timestamp: now,
      });
    });

    if (fixedDecision) {
      newLogs.push({
        id: generateId(),
        eventId: anchor.eventId,
        type: "fixed_time_decision",
        message: `Fixed-time decision applied: ${fixedDecision.toUpperCase()}`,
        timestamp: now,
      });
    }

    set((state) => {
      const proposedMap = new Map<string, Session>(preview.proposedSessions.map((s) => [s.id, s]));
      const nextSessions = state.sessions.map((s) => proposedMap.get(s.id) || s);
      const nextDelays = [...state.delays, delayRecord];
      const nextLogs = [...newLogs, ...state.activityLogs];

      const updated = {
        sessions: nextSessions,
        delays: nextDelays,
        activityLogs: nextLogs,
      };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously write delay, affected sessions, and activity logs to Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      createDelayInFirestore(uid, anchor.eventId, delayRecord).catch((err) => {
        console.error("[Firestore createDelay failed]", err);
      });

      const affected = preview.proposedSessions.filter((ps) =>
        preview.changes.some((c) => c.sessionId === ps.id)
      );
      if (affected.length > 0) {
        batchUpdateSessionsInFirestore(uid, anchor.eventId, affected).catch((err) => {
          console.error("[Firestore commitDelay batchUpdateSessions failed]", err);
        });
      }

      batchCreateActivityLogsInFirestore(uid, anchor.eventId, newLogs).catch((err) => {
        console.error("[Firestore commitDelay batchCreateActivityLogs failed]", err);
      });
    }

    return { ok: true };
  },

  activateEmergency: (type, description, targetEventId) => {
    const activeEventId = targetEventId || get().activeEventId;
    if (!activeEventId) return { ok: false, error: "No active event selected." };

    if ((type === "Custom Issue" || type === "Venue Change") && !description?.trim()) {
      return { ok: false, error: `Description is required for ${type}.` };
    }

    const now = Date.now();
    const id = generateId();
    const emergency: Emergency = {
      id,
      eventId: activeEventId,
      type,
      description: description?.trim(),
      timestamp: now,
      resolved: false,
    };

    const newLog: ActivityLog = {
      id: generateId(),
      eventId: activeEventId,
      type: "emergency_activated",
      message: `Emergency activated: ${type}${description ? ` — ${description}` : ""}`,
      timestamp: now,
    };

    set((state) => {
      const nextEmergencies = [...state.emergencies, emergency];
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { emergencies: nextEmergencies, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously write emergency and log to Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      createEmergencyInFirestore(uid, activeEventId, emergency).catch((err) => {
        console.error("[Firestore activateEmergency failed]", err);
      });
      createActivityLogInFirestore(uid, activeEventId, newLog).catch((err) => {
        console.error("[Firestore log activateEmergency failed]", err);
      });
    }

    return { ok: true, emergencyId: id };
  },

  resolveEmergency: (id) => {
    const emg = get().emergencies.find((e) => e.id === id);
    if (!emg) return { ok: false, error: "Emergency not found." };

    const now = Date.now();
    const newLog: ActivityLog = {
      id: generateId(),
      eventId: emg.eventId,
      type: "emergency_resolved",
      message: `Emergency resolved: ${emg.type}`,
      timestamp: now,
    };

    set((state) => {
      const nextEmergencies = state.emergencies.map((e) =>
        e.id === id ? { ...e, resolved: true, resolvedAt: now } : e
      );
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { emergencies: nextEmergencies, activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously update emergency and write log to Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      updateEmergencyInFirestore(uid, emg.eventId, id, { resolved: true, resolvedAt: now }).catch((err) => {
        console.error("[Firestore resolveEmergency failed]", err);
      });
      createActivityLogInFirestore(uid, emg.eventId, newLog).catch((err) => {
        console.error("[Firestore log resolveEmergency failed]", err);
      });
    }

    return { ok: true };
  },

  createAnnouncement: (title, message, priority, time, targetEventId) => {
    const activeEventId = targetEventId || get().activeEventId;
    if (!activeEventId) return { ok: false, error: "No active event selected." };

    if (!title.trim() || !message.trim()) {
      return { ok: false, error: "Announcement title and message are required." };
    }

    const now = Date.now();
    const newLog: ActivityLog = {
      id: generateId(),
      eventId: activeEventId,
      type: "announcement_created",
      message: `Announcement: "${title.trim()}" [${priority}] — ${message.trim()}`,
      timestamp: now,
      meta: {
        title: title.trim(),
        message: message.trim(),
        priority,
        time: time || new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    };

    set((state) => {
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = { activityLogs: nextLogs };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously write announcement log to Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      createActivityLogInFirestore(uid, activeEventId, newLog).catch((err) => {
        console.error("[Firestore createAnnouncement failed]", err);
      });
    }

    return { ok: true };
  },

  addAIRecord: (data) => {
    const now = Date.now();
    const id = generateId();
    const aiRecord: AIRecord = {
      ...data,
      id,
      timestamp: now,
    };

    const newLog: ActivityLog = {
      id: generateId(),
      eventId: data.eventId,
      type: "ai_generated",
      message: `AI generated content: ${data.type.replace("_", " ")}`,
      timestamp: now,
    };

    set((state) => {
      const nextAIRecords = [aiRecord, ...state.aiRecords];
      const nextLogs = [newLog, ...state.activityLogs];
      const updated = {
        aiRecords: nextAIRecords,
        activityLogs: nextLogs,
        selectedScriptId: id,
      };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    // Asynchronously write AI record and log to Cloud Firestore
    const uid = get().activeUserId;
    if (uid) {
      createAIRecordInFirestore(uid, data.eventId, aiRecord).catch((err) => {
        console.error("[Firestore addAIRecord failed]", err);
      });
      createActivityLogInFirestore(uid, data.eventId, newLog).catch((err) => {
        console.error("[Firestore log addAIRecord failed]", err);
      });
    }

    return { ok: true, recordId: id };
  },

  selectScript: (scriptId) => {
    set({ selectedScriptId: scriptId });
    const current = get();
    saveToStorage(current);
  },

  // Dedicated Scripts Management Actions
  addScript: (data) => {
    const now = Date.now();
    const id = generateId();
    const scriptItem: ScriptItem = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const nextScripts = [scriptItem, ...state.scripts];
      const updated = { scripts: nextScripts };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      createScriptInFirestore(uid, data.eventId, scriptItem).catch((err) => {
        console.error("[Firestore addScript failed]", err);
      });
    }

    return { ok: true, scriptId: id };
  },

  updateScript: (id, updates) => {
    const script = get().scripts.find((s) => s.id === id);
    if (!script) return { ok: false, error: "Script not found." };

    const updatedScript: ScriptItem = {
      ...script,
      ...updates,
      updatedAt: Date.now(),
    };

    set((state) => {
      const nextScripts = state.scripts.map((s) => (s.id === id ? updatedScript : s));
      const updated = { scripts: nextScripts };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      updateScriptInFirestore(uid, script.eventId, id, updates).catch((err) => {
        console.error("[Firestore updateScript failed]", err);
      });
    }

    return { ok: true };
  },

  deleteScript: (id) => {
    const script = get().scripts.find((s) => s.id === id);
    if (!script) return { ok: false, error: "Script not found." };

    set((state) => {
      const nextScripts = state.scripts.filter((s) => s.id !== id);
      const updated = { scripts: nextScripts };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      deleteScriptInFirestore(uid, script.eventId, id).catch((err) => {
        console.error("[Firestore deleteScript failed]", err);
      });
    }

    return { ok: true };
  },

  // Dedicated Invitations Management Actions
  addInvitation: (data) => {
    const now = Date.now();
    const id = generateId();
    const invitationRecord: InvitationRecord = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const nextInvitations = [invitationRecord, ...state.invitations];
      const updated = { invitations: nextInvitations };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      createInvitationInFirestore(uid, data.eventId, invitationRecord).catch((err) => {
        console.error("[Firestore addInvitation failed]", err);
      });
    }

    return { ok: true, invitationId: id };
  },

  updateInvitation: (id, updates) => {
    const inv = get().invitations.find((i) => i.id === id);
    if (!inv) return { ok: false, error: "Invitation not found." };

    const updatedInvitation: InvitationRecord = {
      ...inv,
      ...updates,
      updatedAt: Date.now(),
    };

    set((state) => {
      const nextInvitations = state.invitations.map((i) => (i.id === id ? updatedInvitation : i));
      const updated = { invitations: nextInvitations };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      updateInvitationInFirestore(uid, inv.eventId, id, updates).catch((err) => {
        console.error("[Firestore updateInvitation failed]", err);
      });
    }

    return { ok: true };
  },

  deleteInvitation: (id) => {
    const inv = get().invitations.find((i) => i.id === id);
    if (!inv) return { ok: false, error: "Invitation not found." };

    set((state) => {
      const nextInvitations = state.invitations.filter((i) => i.id !== id);
      const updated = { invitations: nextInvitations };
      saveToStorage({ ...state, ...updated });
      return updated;
    });

    const uid = get().activeUserId;
    if (uid) {
      deleteInvitationInFirestore(uid, inv.eventId, id).catch((err) => {
        console.error("[Firestore deleteInvitation failed]", err);
      });
    }

    return { ok: true };
  },

  // Global AI Action Execution
  executeAIAction: async (action: AIAction): Promise<AIActionResult> => {
    const payload = (action.payload || {}) as Record<string, unknown>;
    const events = get().events;
    const actionType = ((action.type || (action as any).actionType || (action as any).name || "") as string).toUpperCase() as AIActionType;

    // Helper to resolve event by ID or by name
    const resolveEvent = (): Event | null => {
      if (payload.eventId && typeof payload.eventId === "string") {
        const found = events.find((e) => e.id === payload.eventId);
        if (found) return found;
      }
      const rawName = (payload.targetEventName || payload.eventName || payload.name || payload.title) as string | undefined;
      if (rawName && typeof rawName === "string") {
        const clean = rawName.toLowerCase().replace(/\[.*?\]/g, "").trim();
        const exact = events.find((e) => e.name.toLowerCase().trim() === clean);
        if (exact) return exact;
        const matches = events.filter((e) => e.name.toLowerCase().includes(clean) || clean.includes(e.name.toLowerCase()));
        if (matches.length >= 1) return matches[0];
      }
      return get().events[0] || null;
    };

    switch (actionType) {
      case "CREATE_EVENT": {
        const rawName = (payload.name || payload.title || payload.targetEventName || "New Stage Event") as string;
        const cleanName = rawName.replace(/\[.*?\]/g, "").trim() || "New Stage Event";
        const startDate = (payload.startDate || payload.date || new Date().toISOString().split("T")[0]) as string;
        const endDate = (payload.endDate || startDate) as string;
        const startTime = (payload.startTime || "10:00") as string;
        const endTime = (payload.endTime || "18:00") as string;
        const venue = (payload.venue || payload.location || "Main Auditorium") as string;
        const type = (payload.type || payload.eventType || payload.category || "Other") as any;
        const description = (payload.description || "") as string;
        const organizer = (payload.organizer || "StageX Operations") as string;

        const res = get().createEvent({
          name: cleanName,
          type,
          date: startDate,
          startDate,
          endDate,
          startTime,
          endTime,
          venue,
          description,
          organizer,
        });

        if (res.ok && res.eventId) {
          get().setActiveEvent(res.eventId);
          return {
            actionId: action.id,
            type: action.type,
            success: true,
            message: `Successfully created event "${cleanName}" (${startDate}, ${startTime} - ${endTime} at ${venue}).`,
            entityId: res.eventId,
          };
        }
        return {
          actionId: action.id,
          type: action.type,
          success: false,
          message: res.error || "Failed to create event.",
        };
      }

      case "APPLY_EVENT_CHANGE": {
        const existing = resolveEvent();
        if (existing && (payload.updates || payload.venue || payload.startTime || payload.endTime || payload.name)) {
          const updates = (payload.updates || payload) as Partial<Event>;
          const res = get().updateEvent(existing.id, updates);
          return {
            actionId: action.id,
            type: action.type,
            success: res.ok,
            message: res.ok ? `Updated "${existing.name}".` : res.error || "Failed to update event.",
            entityId: existing.id,
          };
        } else {
          // Fallback to CREATE_EVENT
          return get().executeAIAction({ ...action, type: "CREATE_EVENT" });
        }
      }

      case "UPDATE_EVENT": {
        const targetEvent = resolveEvent();
        if (!targetEvent) {
          return {
            actionId: action.id,
            type: action.type,
            success: false,
            message: "Target event could not be uniquely identified.",
          };
        }
        const updates = (payload.updates || payload) as Partial<Event>;
        const validUpdates: Partial<Event> = {};
        if (updates.name) validUpdates.name = String(updates.name).trim();
        if (updates.venue) validUpdates.venue = String(updates.venue).trim();
        if (updates.startTime) validUpdates.startTime = String(updates.startTime);
        if (updates.endTime) validUpdates.endTime = String(updates.endTime);
        if (updates.description) validUpdates.description = String(updates.description);
        if (updates.organizer) validUpdates.organizer = String(updates.organizer);
        if (updates.startDate) validUpdates.startDate = String(updates.startDate);
        if (updates.endDate) validUpdates.endDate = String(updates.endDate);

        const res = get().updateEvent(targetEvent.id, validUpdates);
        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? `Successfully updated "${targetEvent.name}".` : res.error || "Failed to update event.",
          entityId: targetEvent.id,
        };
      }

      case "DELETE_EVENT": {
        const targetEvent = resolveEvent();
        if (!targetEvent) {
          return {
            actionId: action.id,
            type: action.type,
            success: false,
            message: "Target event could not be found.",
          };
        }
        const res = get().deleteEvent(targetEvent.id);
        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? `Successfully deleted event "${targetEvent.name}".` : res.error || "Failed to delete event.",
          entityId: targetEvent.id,
        };
      }

      case "CREATE_SESSION": {
        const targetEvent = resolveEvent();
        if (!targetEvent) {
          return {
            actionId: action.id,
            type: action.type,
            success: false,
            message: "Target event for new session could not be found.",
          };
        }
        const title = (payload.title || payload.sessionTitle || "New Session") as string;
        const duration = Number(payload.duration) || 30;
        const type = (payload.sessionType || payload.type || "Other") as any;

        const eventSessions = get().sessions.filter((s) => s.eventId === targetEvent.id);
        let startTime = targetEvent.startTime;
        if (eventSessions.length > 0) {
          const last = eventSessions[eventSessions.length - 1];
          startTime = last.endTime;
        }
        const startM = timeToMinutes(startTime);
        const endTime = minutesToTime(startM + duration);

        const res = get().addSession({
          eventId: targetEvent.id,
          title,
          type,
          duration,
          speakerId: (payload.speakerId as string) || null,
          sessionDate: (payload.sessionDate as string) || targetEvent.startDate,
          startTime: (payload.startTime as string) || startTime,
          endTime: (payload.endTime as string) || endTime,
          status: "Upcoming",
          isFixedTime: !!payload.isFixedTime,
        });

        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? `Added session "${title}" to "${targetEvent.name}".` : res.error || "Failed to add session.",
          entityId: res.sessionId,
        };
      }

      case "UPDATE_SESSION": {
        const sessionId = (payload.sessionId || payload.id) as string;
        if (!sessionId) {
          return { actionId: action.id, type: action.type, success: false, message: "Session ID is required." };
        }
        const updates = (payload.updates || payload) as Partial<Session>;
        const res = get().updateSession(sessionId, updates);
        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? "Successfully updated session." : res.error || "Failed to update session.",
          entityId: sessionId,
        };
      }

      case "DELETE_SESSION": {
        const sessionId = (payload.sessionId || payload.id) as string;
        if (!sessionId) {
          return { actionId: action.id, type: action.type, success: false, message: "Session ID is required." };
        }
        const res = get().deleteSession(sessionId);
        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? "Successfully deleted session." : res.error || "Failed to delete session.",
          entityId: sessionId,
        };
      }

      case "CREATE_SPEAKER":
      case "ADD_SPEAKER":
      case "ADD_PERSON":
      case "ADD_ARTIST": {
        const targetEvent = resolveEvent();
        if (!targetEvent) {
          return { actionId: action.id, type: action.type, success: false, message: "Target event could not be found." };
        }
        const name = ((payload.name || payload.personName || "") as string).trim();
        if (!name) {
          return { actionId: action.id, type: action.type, success: false, message: "Person name is required." };
        }
        const res = get().addSpeaker({
          eventId: targetEvent.id,
          name,
          designation: (payload.designation as string) || (payload.role as string) || "Speaker / Artist",
          organization: (payload.organization as string) || "",
          bio: (payload.bio as string) || "",
          image: null,
        });
        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? `Added "${name}" to ${targetEvent.name}.` : res.error || "Failed to add person.",
          entityId: res.speakerId,
        };
      }

      case "UPDATE_SPEAKER": {
        const speakerId = (payload.speakerId || payload.id) as string;
        if (!speakerId) {
          return { actionId: action.id, type: action.type, success: false, message: "Speaker ID is required." };
        }
        const updates = (payload.updates || payload) as Partial<Speaker>;
        const res = get().updateSpeaker(speakerId, updates);
        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? "Successfully updated speaker." : res.error || "Failed to update speaker.",
          entityId: speakerId,
        };
      }

      case "DELETE_SPEAKER": {
        const speakerId = (payload.speakerId || payload.id) as string;
        if (!speakerId) {
          return { actionId: action.id, type: action.type, success: false, message: "Speaker ID is required." };
        }
        const res = get().deleteSpeaker(speakerId);
        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? "Successfully deleted speaker." : res.error || "Failed to delete speaker.",
          entityId: speakerId,
        };
      }

      case "CREATE_SCRIPT":
      case "GENERATE_SCRIPT": {
        const targetEvent = resolveEvent();
        if (!targetEvent) {
          return { actionId: action.id, type: action.type, success: false, message: "Target event for script could not be found." };
        }
        const title = (payload.title || "AI Stage Script") as string;
        const category = (payload.category || "anchor") as any;
        const scriptType = (payload.scriptType || "Opening Address") as string;
        const content = (payload.content || payload.text || "Spoken script content.") as string;
        const language = (payload.language || "English") as string;

        const res = get().addScript({
          eventId: targetEvent.id,
          title,
          category,
          scriptType,
          targetName: (payload.targetName as string) || undefined,
          content,
          language,
        });

        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? `Created script "${title}" (${language}) for "${targetEvent.name}".` : res.error || "Failed to create script.",
          entityId: res.scriptId,
        };
      }

      case "UPDATE_SCRIPT":
      case "TRANSLATE_SCRIPT": {
        const scriptId = (payload.scriptId || payload.id) as string;
        if (!scriptId) {
          return { actionId: action.id, type: action.type, success: false, message: "Script ID is required." };
        }
        const updates = (payload.updates || payload) as Partial<ScriptItem>;
        const res = get().updateScript(scriptId, updates);
        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? "Successfully updated script." : res.error || "Failed to update script.",
          entityId: scriptId,
        };
      }

      case "DELETE_SCRIPT": {
        const scriptId = (payload.scriptId || payload.id) as string;
        if (!scriptId) {
          return { actionId: action.id, type: action.type, success: false, message: "Script ID is required." };
        }
        const res = get().deleteScript(scriptId);
        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? "Successfully deleted script." : res.error || "Failed to delete script.",
          entityId: scriptId,
        };
      }

      case "CREATE_INVITATION":
      case "GENERATE_INVITATION": {
        const targetEvent = resolveEvent();
        if (!targetEvent) {
          return { actionId: action.id, type: action.type, success: false, message: "Target event for invitation could not be found." };
        }
        const title = (payload.title || targetEvent.name) as string;
        const theme = (payload.theme || "modern_dark") as any;
        const invData = (payload.data || payload) as any;

        // Generate a lightweight SVG artwork URL in the store (server-safe fallback)
        let artworkUrl: string | undefined = (payload.artworkUrl as string) || undefined;
        if (!artworkUrl) {
          const invTitle = title.slice(0, 40);
          const invOrg = (invData.organizer || targetEvent.organizer || "").slice(0, 30);
          const invDate = invData.dateText || targetEvent.startDate || "";
          artworkUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" style="background:#0a0705"><text x="50%" y="40%" font-family="sans-serif" font-size="48" fill="#fbbf24" text-anchor="middle">${invTitle}</text><text x="50%" y="50%" font-family="sans-serif" font-size="28" fill="#fef3c7" text-anchor="middle">${invOrg}</text><text x="50%" y="58%" font-family="sans-serif" font-size="24" fill="#d6d3d1" text-anchor="middle">${invDate}</text></svg>`)}` ;
        }

        const res = get().addInvitation({
          eventId: targetEvent.id,
          title,
          theme,
          data: {
            title,
            subtitle: invData.subtitle || "You are cordially invited",
            eventType: invData.eventType || targetEvent.type,
            dateText: invData.dateText || targetEvent.startDate,
            timeText: invData.timeText || `${targetEvent.startTime} – ${targetEvent.endTime}`,
            venueText: invData.venueText || targetEvent.venue,
            description: invData.description || targetEvent.description,
            organizer: invData.organizer || targetEvent.organizer,
            chiefGuest: invData.chiefGuest,
            theme,
            language: invData.language || "English",
            customNotes: invData.customNotes,
          },
          artworkUrl,
        });

        return {
          actionId: action.id,
          type: action.type,
          success: res.ok,
          message: res.ok ? `Created invitation "${title}" for "${targetEvent.name}".` : res.error || "Failed to create invitation.",
          entityId: res.invitationId,
        };
      }

      default:
        return {
          actionId: action.id,
          type: action.type,
          success: false,
          message: `Action type "${action.type}" is not directly supported.`,
        };
    }
  },

  resetAll: () => {
    resetAllStorage();
    set({
      ...initialData,
      hydrated: true,
      corruptionNotice: null,
    });
  },
}));
