// StageX AI — Date & Time Utility Engine
// Traces to STAGEX_AI_PRD.md §10, §11, §19, and Edit 2 Requirements

/**
 * Validates HH:mm 24-hour time format.
 */
export function isValidTimeStr(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/**
 * Validates YYYY-MM-DD date format.
 */
export function isValidDateStr(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

/**
 * Converts "HH:mm" (24h) to minutes from midnight (0 to 1439).
 */
export function timeToMinutes(time: string): number {
  if (!isValidTimeStr(time)) {
    throw new Error(`Invalid time format: "${time}". Expected "HH:mm" in 24h.`);
  }
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight (modulo 1440) to "HH:mm".
 */
export function minutesToTime(minutes: number): string {
  const normalized = Math.floor(minutes);
  const positiveMin = ((normalized % 1440) + 1440) % 1440;
  const h = Math.floor(positiveMin / 60);
  const m = positiveMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Adds an integer number of days to a "YYYY-MM-DD" string.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dt = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dt}`;
}

/**
 * Calculates calendar day difference between two "YYYY-MM-DD" strings (end - start).
 */
export function dateDiffDays(startDateStr: string, endDateStr: string): number {
  const [y1, m1, d1] = startDateStr.split("-").map(Number);
  const [y2, m2, d2] = endDateStr.split("-").map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Parses "YYYY-MM-DD" and "HH:mm" into epoch milliseconds in local time.
 */
export function parseDateTimeToMs(dateStr: string, timeStr: string): number {
  if (!isValidDateStr(dateStr)) {
    throw new Error(`Invalid date string: "${dateStr}". Expected YYYY-MM-DD.`);
  }
  if (!isValidTimeStr(timeStr)) {
    throw new Error(`Invalid time string: "${timeStr}". Expected HH:mm.`);
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return date.getTime();
}

/**
 * Formats epoch ms to local "YYYY-MM-DD".
 */
export function formatMsToDate(epochMs: number): string {
  const d = new Date(epochMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats epoch ms to local "HH:mm" (24h).
 */
export function formatMsToTime(epochMs: number): string {
  const d = new Date(epochMs);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Formats epoch ms or "HH:mm" to user-friendly 12h time (e.g. "9:00 PM").
 */
export function formatTo12Hour(timeOrMs: string | number): string {
  let hours = 0;
  let minutes = 0;
  if (typeof timeOrMs === "number") {
    const d = new Date(timeOrMs);
    hours = d.getHours();
    minutes = d.getMinutes();
  } else if (isValidTimeStr(timeOrMs)) {
    const [h, m] = timeOrMs.split(":").map(Number);
    hours = h;
    minutes = m;
  } else {
    return timeOrMs;
  }
  const period = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Formats date and time into a concise label (e.g., "Day 1 (Sep 19) • 9:00 PM").
 */
export function formatSessionBadge(sessionDate: string, startTime: string, eventStartDate?: string): string {
  let dayPrefix = "";
  if (eventStartDate && isValidDateStr(eventStartDate) && isValidDateStr(sessionDate)) {
    const dayDiff = dateDiffDays(eventStartDate, sessionDate);
    dayPrefix = `Day ${dayDiff + 1} • `;
  }
  return `${dayPrefix}${formatTo12Hour(startTime)}`;
}

/**
 * Generates an array of all calendar date strings (YYYY-MM-DD) between start and end date inclusive.
 */
export function getDateRangeArray(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  let current = startDateStr;
  while (current <= endDateStr) {
    dates.push(current);
    current = addDaysToDateStr(current, 1);
    if (dates.length > 365) break; // safety cap
  }
  return dates;
}

export interface CanonicalEventTimestamps {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  startDateTime: number;
  endDateTime: number;
  durationMinutes: number;
  isOvernight: boolean;
  isMultiDay: boolean;
}

/**
 * Computes canonical dates and epoch ms timestamps for an event.
 * Correctly detects overnight midnight crossings (e.g. 21:00 -> 01:00 = 4 hours)
 * and multi-day spans (e.g. Day 1: 09:00 -> Day 2: 13:00).
 */
export function resolveEventTimestamps(input: {
  date?: string;
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
}): CanonicalEventTimestamps {
  const startDate = input.startDate?.trim() || input.date?.trim() || "";
  let endDate = input.endDate?.trim() || "";
  const startTime = input.startTime?.trim() || "";
  const endTime = input.endTime?.trim() || "";

  if (!isValidDateStr(startDate) || !isValidTimeStr(startTime) || !isValidTimeStr(endTime)) {
    return {
      startDate,
      endDate: endDate || startDate,
      startTime,
      endTime,
      startDateTime: 0,
      endDateTime: 0,
      durationMinutes: 0,
      isOvernight: false,
      isMultiDay: false,
    };
  }

  const startM = timeToMinutes(startTime);
  const endM = timeToMinutes(endTime);

  // If endDate is not specified or same as startDate:
  if (!endDate || endDate === startDate) {
    if (endM <= startM) {
      // Midnight crossing event! (e.g. 21:00 to 01:00)
      endDate = addDaysToDateStr(startDate, 1);
    } else {
      endDate = startDate;
    }
  }

  const startDateTime = parseDateTimeToMs(startDate, startTime);
  const endDateTime = parseDateTimeToMs(endDate, endTime);
  const durationMinutes = Math.max(0, Math.round((endDateTime - startDateTime) / 60000));
  const isOvernight = dateDiffDays(startDate, endDate) === 1 && endM <= startM;
  const isMultiDay = dateDiffDays(startDate, endDate) > 0;

  return {
    startDate,
    endDate,
    startTime,
    endTime,
    startDateTime,
    endDateTime,
    durationMinutes,
    isOvernight,
    isMultiDay,
  };
}

export interface CanonicalSessionTimestamps {
  sessionDate: string;
  startTime: string;
  endTime: string;
  startDateTime: number;
  endDateTime: number;
  durationMinutes: number;
}

/**
 * Computes canonical dates and epoch ms timestamps for a session given its event context.
 */
export function resolveSessionTimestamps(
  session: {
    sessionDate?: string;
    startTime: string;
    endTime: string;
    startDateTime?: number;
    endDateTime?: number;
    duration?: number;
  },
  eventStartDate: string
): CanonicalSessionTimestamps {
  let sessionDate = session.sessionDate?.trim() || eventStartDate;
  if (!isValidDateStr(sessionDate)) {
    sessionDate = eventStartDate;
  }

  const startTime = session.startTime;
  const endTime = session.endTime;

  if (session.startDateTime && session.endDateTime && session.endDateTime > session.startDateTime) {
    return {
      sessionDate: formatMsToDate(session.startDateTime),
      startTime: formatMsToTime(session.startDateTime),
      endTime: formatMsToTime(session.endDateTime),
      startDateTime: session.startDateTime,
      endDateTime: session.endDateTime,
      durationMinutes: Math.round((session.endDateTime - session.startDateTime) / 60000),
    };
  }

  const startDateTime = parseDateTimeToMs(sessionDate, startTime);
  let endDateTime: number;

  const startM = timeToMinutes(startTime);
  const endM = timeToMinutes(endTime);

  if (endM < startM) {
    // Session itself spans midnight into the next day (e.g. 23:30 -> 00:30)
    const nextDate = addDaysToDateStr(sessionDate, 1);
    endDateTime = parseDateTimeToMs(nextDate, endTime);
  } else {
    endDateTime = parseDateTimeToMs(sessionDate, endTime);
  }

  const durationMinutes = Math.max(0, Math.round((endDateTime - startDateTime) / 60000));

  return {
    sessionDate,
    startTime,
    endTime,
    startDateTime,
    endDateTime,
    durationMinutes,
  };
}
