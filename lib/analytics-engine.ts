// StageX AI — Pure Analytics Engine
// Traces to STAGEX_AI_PRD.md §17, §18 and Edit 2 Requirements

import {
  Event,
  Session,
  DelayRecord,
  Emergency,
  AIRecord,
  ActivityLog,
  AnalyticsMetrics,
} from "@/types";
import { resolveEventTimestamps, resolveSessionTimestamps } from "./date-utils";

export function computeAnalyticsMetrics(
  event: Event | null,
  sessions: Session[],
  delays: DelayRecord[],
  emergencies: Emergency[],
  aiRecords: AIRecord[],
  activityLogs: ActivityLog[]
): AnalyticsMetrics {
  if (!event) {
    return {
      totalSessions: 0,
      completedSessions: 0,
      delayedSessions: 0,
      skippedSessions: 0,
      cancelledSessions: 0,
      totalDelayMinutes: 0,
      maxDelayMinutes: 0,
      emergencyCount: 0,
      resolvedEmergencies: 0,
      unresolvedEmergencies: 0,
      aiGenerationsCount: 0,
      scheduleChangesCount: 0,
      plannedDurationMinutes: 0,
      actualDurationMinutes: null,
      deviations: [],
      healthScore: null,
      healthBand: null,
      healthPenalties: null,
    };
  }

  const eventSessions = sessions.filter((s) => s.eventId === event.id);
  const eventDelays = delays.filter((d) => d.eventId === event.id);
  const eventEmergencies = emergencies.filter((e) => e.eventId === event.id);
  const eventAIRecords = aiRecords.filter((a) => a.eventId === event.id);
  const eventLogs = activityLogs.filter((l) => l.eventId === event.id);

  const totalSessions = eventSessions.length;
  const completedSessions = eventSessions.filter((s) => s.status === "Completed").length;
  const skippedSessions = eventSessions.filter((s) => s.status === "Skipped").length;
  const cancelledSessions = eventSessions.filter((s) => s.status === "Cancelled").length;

  const delayedSessions = eventSessions.filter((s) => {
    const isShifted =
      s.startTime !== s.originalStartTime ||
      (s.sessionDate && s.originalSessionDate && s.sessionDate !== s.originalSessionDate);

    let startedLate = false;
    if (s.actualStartTime) {
      const origStartMs =
        s.originalStartDateTime ||
        resolveSessionTimestamps(
          { startTime: s.originalStartTime, endTime: s.originalEndTime, sessionDate: s.originalSessionDate || s.sessionDate },
          event.startDate || event.date
        ).startDateTime;
      startedLate = s.actualStartTime > origStartMs + 60000; // > 1 min
    }
    return isShifted || startedLate;
  }).length;

  const totalDelayMinutes = eventDelays.reduce((sum, d) => sum + d.minutes, 0);
  const maxDelayMinutes =
    eventDelays.length > 0 ? Math.max(...eventDelays.map((d) => d.minutes)) : 0;

  const emergencyCount = eventEmergencies.length;
  const resolvedEmergencies = eventEmergencies.filter((e) => e.resolved).length;
  const unresolvedEmergencies = emergencyCount - resolvedEmergencies;

  const aiGenerationsCount = eventAIRecords.length;
  const scheduleChangesCount = eventLogs.filter((l) => l.type === "schedule_change").length;

  // Planned duration calculated across midnight & multi-day using full epoch ms
  const eventTimes = resolveEventTimestamps(event);
  const plannedDurationMinutes = eventTimes.durationMinutes;

  // Actual duration calculated from earliest actual start to latest actual end
  const completedWithTimes = eventSessions.filter(
    (s) => s.status === "Completed" && s.actualStartTime && s.actualEndTime
  );
  let actualDurationMinutes: number | null = null;
  if (completedWithTimes.length > 0) {
    const minStart = Math.min(...completedWithTimes.map((s) => s.actualStartTime!));
    const maxEnd = Math.max(...completedWithTimes.map((s) => s.actualEndTime!));
    actualDurationMinutes = Math.max(0, Math.round((maxEnd - minStart) / 60000));
  }

  // Schedule deviations
  const sessionsWithActualStart = eventSessions.filter((s) => s.actualStartTime !== null);
  const deviations: AnalyticsMetrics["deviations"] = [];

  for (const s of sessionsWithActualStart) {
    const origTimes = resolveSessionTimestamps(
      {
        sessionDate: s.originalSessionDate || s.sessionDate,
        startTime: s.originalStartTime,
        endTime: s.originalEndTime,
      },
      event.startDate || event.date
    );

    const plannedStartMs = s.originalStartDateTime || origTimes.startDateTime;
    const deviationMinutes = Math.round((s.actualStartTime! - plannedStartMs) / 60000);

    let endDev: number | null = null;
    let actualEndStr: string | null = null;
    if (s.actualEndTime) {
      const plannedEndMs = s.originalEndDateTime || origTimes.endDateTime;
      endDev = Math.round((s.actualEndTime - plannedEndMs) / 60000);
      const endDate = new Date(s.actualEndTime);
      actualEndStr = `${String(endDate.getHours()).padStart(2, "0")}:${String(
        endDate.getMinutes()
      ).padStart(2, "0")}`;
    }

    const startDate = new Date(s.actualStartTime!);
    const actualStartStr = `${String(startDate.getHours()).padStart(2, "0")}:${String(
      startDate.getMinutes()
    ).padStart(2, "0")}`;

    deviations.push({
      sessionId: s.id,
      title: s.title,
      plannedStart: s.originalStartTime,
      actualStart: actualStartStr,
      deviationMinutes,
      plannedEnd: s.originalEndTime,
      actualEnd: actualEndStr,
      endDeviationMinutes: endDev,
    });
  }

  // Event Health Score Calculation (PRD §18)
  let healthScore: number | null = null;
  let healthBand: AnalyticsMetrics["healthBand"] = null;
  let healthPenalties: AnalyticsMetrics["healthPenalties"] = null;

  const hasActivity =
    completedSessions > 0 ||
    delayedSessions > 0 ||
    emergencyCount > 0 ||
    totalDelayMinutes > 0 ||
    skippedSessions > 0;

  if (totalSessions > 0 && hasActivity) {
    // 1. Deviation penalty (P_dev)
    const totalDeviation = deviations.reduce(
      (sum, dev) => sum + Math.abs(dev.deviationMinutes),
      0
    );
    const avgDeviation =
      deviations.length > 0 ? totalDeviation / deviations.length : 0;
    const pDev = Math.min(30, Math.round(avgDeviation * 2));

    // 2. Schedule drift penalty (P_drift)
    const pDrift = Math.min(20, totalDelayMinutes);

    // 3. Emergency impact penalty (P_emg)
    const pEmg = Math.min(
      25,
      resolvedEmergencies * 5 + unresolvedEmergencies * 15
    );

    // 4. Session drop penalty (P_skip)
    const pSkip = Math.min(20, skippedSessions * 10);

    const rawScore = 100 - pDev - pDrift - pEmg - pSkip;
    healthScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    if (healthScore >= 80) {
      healthBand = "On track";
    } else if (healthScore >= 60) {
      healthBand = "Minor issues";
    } else if (healthScore >= 40) {
      healthBand = "At risk";
    } else {
      healthBand = "Critical";
    }

    healthPenalties = {
      deviationPenalty: pDev,
      driftPenalty: pDrift,
      emergencyPenalty: pEmg,
      skipPenalty: pSkip,
    };
  }

  return {
    totalSessions,
    completedSessions,
    delayedSessions,
    skippedSessions,
    cancelledSessions,
    totalDelayMinutes,
    maxDelayMinutes,
    emergencyCount,
    resolvedEmergencies,
    unresolvedEmergencies,
    aiGenerationsCount,
    scheduleChangesCount,
    plannedDurationMinutes,
    actualDurationMinutes,
    deviations,
    healthScore,
    healthBand,
    healthPenalties,
  };
}
