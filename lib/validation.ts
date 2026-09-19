// StageX AI — Validation Module
// Traces to STAGEX_AI_PRD.md §9, §19, §34 and Edit 2 Requirements

import { Event, Session, Speaker, EventType, SessionType, EmergencyType } from "@/types";
import {
  timeToMinutes,
  minutesToTime,
  isValidDateStr,
  isValidTimeStr,
  resolveEventTimestamps,
  resolveSessionTimestamps,
} from "./date-utils";

export { timeToMinutes, minutesToTime };

export const VALID_EVENT_TYPES: EventType[] = [
  "Hackathon",
  "Workshop",
  "Seminar",
  "Competition",
  "Cultural Event",
  "Conference",
  "College Event",
  "Other",
];

export const VALID_SESSION_TYPES: SessionType[] = [
  "Opening",
  "Keynote",
  "Talk",
  "Workshop",
  "Competition",
  "Break",
  "Announcement",
  "Panel",
  "Cultural Performance",
  "Closing",
  "Other",
];

export const VALID_EMERGENCY_TYPES: EmergencyType[] = [
  "Speaker Delayed",
  "Microphone Issue",
  "Projector Issue",
  "Technical Problem",
  "Unexpected Break",
  "Venue Change",
  "Custom Issue",
];

export function validateEvent(data: Partial<Event>): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const name = data.name?.trim();
  if (!name || name.length < 2 || name.length > 120) {
    errors.name = "Event name must be between 2 and 120 characters.";
  }

  if (!data.type || !VALID_EVENT_TYPES.includes(data.type)) {
    errors.type = "Please select a valid event type.";
  }

  const startDate = data.startDate?.trim() || data.date?.trim() || "";
  if (!startDate || !isValidDateStr(startDate)) {
    errors.date = "Please enter a valid start date (YYYY-MM-DD).";
  }

  if (data.endDate && !isValidDateStr(data.endDate)) {
    errors.endDate = "End date must be in valid format (YYYY-MM-DD).";
  }

  const venue = data.venue?.trim();
  if (!venue || venue.length > 160) {
    errors.venue = "Venue is required and must not exceed 160 characters.";
  }

  if (!data.startTime || !isValidTimeStr(data.startTime)) {
    errors.startTime = "Valid start time (HH:mm) is required.";
  }

  if (!data.endTime || !isValidTimeStr(data.endTime)) {
    errors.endTime = "Valid end time (HH:mm) is required.";
  }

  // Full timestamp validation across midnight & multi-day
  if (startDate && isValidDateStr(startDate) && data.startTime && data.endTime && !errors.startTime && !errors.endTime) {
    const timestamps = resolveEventTimestamps({
      startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    if (timestamps.endDateTime <= timestamps.startDateTime) {
      errors.endTime = "End date and time must be strictly after start date and time.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateSpeaker(data: Partial<Speaker>): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const name = data.name?.trim();
  if (!name || name.length < 2 || name.length > 100) {
    errors.name = "Speaker name must be between 2 and 100 characters.";
  }

  if (data.designation && data.designation.length > 120) {
    errors.designation = "Designation must not exceed 120 characters.";
  }

  if (data.organization && data.organization.length > 120) {
    errors.organization = "Organization must not exceed 120 characters.";
  }

  if (data.bio && data.bio.length > 800) {
    errors.bio = "Bio must not exceed 800 characters.";
  }

  if (data.image && data.image.length > 300000) {
    errors.image = "Image size too large. Please use an image under 200KB.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateSession(
  data: Partial<Session>,
  event: Event,
  existingSessions: Session[],
  excludeSessionId?: string
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const title = data.title?.trim();
  if (!title || title.length < 2 || title.length > 140) {
    errors.title = "Session title must be between 2 and 140 characters.";
  }

  if (!data.type || !VALID_SESSION_TYPES.includes(data.type)) {
    errors.type = "Please select a valid session type.";
  }

  if (!data.startTime || !isValidTimeStr(data.startTime)) {
    errors.startTime = "Valid start time (HH:mm) is required.";
  }

  if (!data.endTime || !isValidTimeStr(data.endTime)) {
    errors.endTime = "Valid end time (HH:mm) is required.";
  }

  if (data.startTime && data.endTime && !errors.startTime && !errors.endTime) {
    const sessionDate = data.sessionDate || event.startDate || event.date;
    const sessionTimes = resolveSessionTimestamps(
      {
        sessionDate,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      event.startDate || event.date
    );

    if (sessionTimes.endDateTime <= sessionTimes.startDateTime) {
      errors.endTime = "Session end time must be after start time.";
    } else {
      // Check event window using epoch ms timestamps (handles same-day, overnight, multi-day)
      const evStartMs = event.startDateTime || resolveEventTimestamps(event).startDateTime;
      const evEndMs = event.endDateTime || resolveEventTimestamps(event).endDateTime;

      if (sessionTimes.startDateTime < evStartMs || sessionTimes.endDateTime > evEndMs) {
        errors.startTime = `Session falls outside event schedule window (${event.startDate || event.date} ${event.startTime} - ${event.endDate || event.date} ${event.endTime}).`;
      }

      // Check interval overlaps with other active sessions in the event
      const otherSessions = existingSessions.filter(
        (s) => s.id !== excludeSessionId && s.status !== "Cancelled" && s.status !== "Skipped"
      );

      for (const s of otherSessions) {
        const otherTimes = resolveSessionTimestamps(s, event.startDate || event.date);

        // Overlap in continuous time exists if max(start1, start2) < min(end1, end2)
        if (
          Math.max(sessionTimes.startDateTime, otherTimes.startDateTime) <
          Math.min(sessionTimes.endDateTime, otherTimes.endDateTime)
        ) {
          errors.startTime = `Session time overlaps with existing session: "${s.title}" (${s.sessionDate || event.startDate} ${s.startTime} - ${s.endTime}).`;
          break;
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateDelay(minutes: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) {
    return {
      valid: false,
      error: "Enter a whole number of minutes between 1 and 240.",
    };
  }
  return { valid: true };
}
