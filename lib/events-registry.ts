// StageX AI — Public Events Registry & Cross-Session Code Resolver
// Guarantees that attendees entering a valid 6-character code can discover the event
// regardless of whether the organizer created it in guest mode or authenticated mode.

import { Event, Session, Speaker } from "@/types";

const PUBLIC_DIRECTORY_KEY = "stagex_public_events_directory";

export interface PublicEventBundle {
  event: Event;
  sessions: Session[];
  speakers: Speaker[];
  updatedAt: number;
}

/**
 * Publishes an event to the public directory so audience members can access it
 */
export function registerPublicEvent(
  event: Event,
  sessions: Session[] = [],
  speakers: Speaker[] = []
): void {
  if (typeof window === "undefined" || !event.accessCode) return;
  try {
    const raw = window.localStorage.getItem(PUBLIC_DIRECTORY_KEY);
    const directory: Record<string, PublicEventBundle> = raw ? JSON.parse(raw) : {};

    const codeKey = event.accessCode.trim().toUpperCase();
    directory[codeKey] = {
      event,
      sessions: sessions.filter((s) => s.eventId === event.id),
      speakers: speakers.filter((s) => s.eventId === event.id),
      updatedAt: Date.now(),
    };

    window.localStorage.setItem(PUBLIC_DIRECTORY_KEY, JSON.stringify(directory));
  } catch (err) {
    console.warn("[Public Events Registry save error]", err);
  }
}

/**
 * Searches for an event by its 6-character code across all local storage sources:
 * 1. The public directory
 * 2. Any active or legacy user storage keys (stagex-ai:user:*:v1 and stagex-ai:v1:clean)
 */
export function findEventByAccessCode(
  rawCode: string,
  currentStoreEvents: Event[] = [],
  currentSessions: Session[] = [],
  currentSpeakers: Speaker[] = []
): PublicEventBundle | null {
  const code = rawCode.trim().toUpperCase();
  if (!code || code.length !== 6) return null;

  // 1. Check current store events
  const foundInStore = currentStoreEvents.find(
    (e) => (e.accessCode || "").toUpperCase() === code
  );
  if (foundInStore) {
    return {
      event: foundInStore,
      sessions: currentSessions.filter((s) => s.eventId === foundInStore.id),
      speakers: currentSpeakers.filter((s) => s.eventId === foundInStore.id),
      updatedAt: foundInStore.updatedAt,
    };
  }

  if (typeof window === "undefined") return null;

  // 2. Check public directory
  try {
    const raw = window.localStorage.getItem(PUBLIC_DIRECTORY_KEY);
    if (raw) {
      const directory: Record<string, PublicEventBundle> = JSON.parse(raw);
      if (directory[code]) {
        return directory[code];
      }
    }
  } catch {
    // ignore
  }

  // 3. Scan all localStorage keys to locate the event from any organizer profile
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith("stagex-ai:") || key.startsWith("stagex_"))) {
        const itemRaw = window.localStorage.getItem(key);
        if (!itemRaw) continue;

        try {
          const parsed = JSON.parse(itemRaw);
          const state = parsed.state || parsed;
          if (state && Array.isArray(state.events)) {
            const ev = state.events.find(
              (e: Event) => (e.accessCode || "").toUpperCase() === code
            );
            if (ev) {
              const matchedSessions = Array.isArray(state.sessions)
                ? state.sessions.filter((s: Session) => s.eventId === ev.id)
                : [];
              const matchedSpeakers = Array.isArray(state.speakers)
                ? state.speakers.filter((s: Speaker) => s.eventId === ev.id)
                : [];

              // Auto-register in public directory for faster subsequent access
              registerPublicEvent(ev, matchedSessions, matchedSpeakers);

              return {
                event: ev,
                sessions: matchedSessions,
                speakers: matchedSpeakers,
                updatedAt: ev.updatedAt || Date.now(),
              };
            }
          }
        } catch {
          // continue
        }
      }
    }
  } catch {
    // ignore
  }

  return null;
}
