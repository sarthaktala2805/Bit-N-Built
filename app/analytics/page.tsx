"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Sparkles,
  Calendar,
  Activity,
  HeartPulse,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { useEventStore } from "@/store/event-store";
import { computeAnalyticsMetrics } from "@/lib/analytics-engine";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AnalyticsPage() {
  const router = useRouter();
  const { events, activeEventId, sessions, delays, emergencies, aiRecords, activityLogs } =
    useEventStore();

  const activeEvent = events.find((e) => e.id === activeEventId);
  const metrics = computeAnalyticsMetrics(
    activeEvent || null,
    sessions,
    delays,
    emergencies,
    aiRecords,
    activityLogs
  );

  if (!activeEvent) {
    return (
      <EmptyState
        title="No active event selected"
        description="Please select or create an event to review operational analytics and stage health."
        actionLabel="Go to Events"
        onAction={() => router.push("/events")}
        icon={<BarChart3 className="w-8 h-8" />}
      />
    );
  }

  const hasActivity =
    metrics.completedSessions > 0 ||
    metrics.delayedSessions > 0 ||
    metrics.emergencyCount > 0 ||
    metrics.totalDelayMinutes > 0 ||
    metrics.aiGenerationsCount > 0;

  // Chart data 1: Sessions by status
  const sessionStatusData = [
    { name: "Completed", count: metrics.completedSessions, color: "#3B82F6" },
    { name: "Delayed", count: metrics.delayedSessions, color: "#F59E0B" },
    { name: "Skipped", count: metrics.skippedSessions, color: "#94A3B8" },
    { name: "Cancelled", count: metrics.cancelledSessions, color: "#EF4444" },
  ].filter((d) => d.count > 0);

  // Chart data 2: Delays by record
  const eventDelays = delays.filter((d) => d.eventId === activeEvent.id);
  const delayChartData = eventDelays.map((d, idx) => ({
    name: `#${idx + 1} (${d.reason || "Delay"})`,
    minutes: d.minutes,
  }));

  // Chart data 3: AI generations by type
  const eventAIRecords = aiRecords.filter((a) => a.eventId === activeEvent.id);
  const aiTypeCounts: Record<string, number> = {};
  eventAIRecords.forEach((r) => {
    const key = r.type.replace("_", " ");
    aiTypeCounts[key] = (aiTypeCounts[key] || 0) + 1;
  });
  const aiChartData = Object.entries(aiTypeCounts).map(([type, count]) => ({
    name: type,
    count,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Event Analytics</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
              {activeEvent.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Ground-truth operational metrics derived strictly from live actions, delays, and deviations.
          </p>
        </div>

        <Button onClick={() => router.push("/live-stage")} variant="secondary" size="md">
          Return to Live Stage
        </Button>
      </div>

      {!hasActivity ? (
        <EmptyState
          title="Analytics will appear after event activity is recorded"
          description="Start sessions on the Live Stage, apply delays, or resolve incidents to view real-time timing deviations and stage health."
          actionLabel="Open Live Stage"
          onAction={() => router.push("/live-stage")}
          icon={<BarChart3 className="w-8 h-8" />}
        />
      ) : (
        <>
          {/* Top Health Score Banner (PRD §18) */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Deterministic Event Health Score
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold text-white font-mono">
                    {metrics.healthScore !== null ? `${metrics.healthScore}/100` : "N/A"}
                  </span>
                  {metrics.healthBand && (
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        metrics.healthBand === "On track"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : metrics.healthBand === "Minor issues"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {metrics.healthBand}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 max-w-lg">
                  Deterministic formula grounded in mean schedule deviation, timing drift, emergency counts, and skipped sessions.
                </p>
              </div>

              {/* Penalty Breakdown */}
              {metrics.healthPenalties && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Deviation Penalty</span>
                    <span className="font-bold text-slate-200">-{metrics.healthPenalties.deviationPenalty} pts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Drift Penalty</span>
                    <span className="font-bold text-slate-200">-{metrics.healthPenalties.driftPenalty} pts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Incident Penalty</span>
                    <span className="font-bold text-slate-200">-{metrics.healthPenalties.emergencyPenalty} pts</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Skip/Cancel Penalty</span>
                    <span className="font-bold text-slate-200">-{metrics.healthPenalties.skipPenalty} pts</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Operational Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">Total Delay Accumulated</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                +{metrics.totalDelayMinutes}m
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Max single delay: +{metrics.maxDelayMinutes}m
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">Completed Sessions</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {metrics.completedSessions} / {metrics.totalSessions}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {metrics.delayedSessions} affected by delays
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">Emergency Incidents</span>
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {metrics.emergencyCount}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {metrics.resolvedEmergencies} resolved, {metrics.unresolvedEmergencies} active
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">AI Script Assists</span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {metrics.aiGenerationsCount}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {metrics.scheduleChangesCount} schedule adjustments logged
              </p>
            </div>
          </div>

          {/* Schedule Deviation Table (PRD §17.3, FR-073) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Session Schedule Deviations (Planned vs Actual)
              </h3>
            </div>

            {metrics.deviations.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4 bg-slate-900/40 rounded-xl border border-slate-800">
                Deviations will appear once sessions start on stage.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold">
                    <tr>
                      <th className="p-3">Session Title</th>
                      <th className="p-3">Planned Start</th>
                      <th className="p-3">Actual Start</th>
                      <th className="p-3">Start Deviation</th>
                      <th className="p-3">Planned End</th>
                      <th className="p-3">Actual End</th>
                      <th className="p-3">End Deviation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {metrics.deviations.map((d) => (
                      <tr key={d.sessionId} className="hover:bg-slate-800/30">
                        <td className="p-3 font-medium text-white">{d.title}</td>
                        <td className="p-3 font-mono text-slate-400">{d.plannedStart}</td>
                        <td className="p-3 font-mono text-slate-200">{d.actualStart}</td>
                        <td className="p-3 font-mono font-bold">
                          {d.deviationMinutes > 0 ? (
                            <span className="text-amber-400">+{d.deviationMinutes}m late</span>
                          ) : d.deviationMinutes < 0 ? (
                            <span className="text-emerald-400">{d.deviationMinutes}m early</span>
                          ) : (
                            <span className="text-blue-400">On time</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-400">{d.plannedEnd}</td>
                        <td className="p-3 font-mono text-slate-200">{d.actualEnd || "—"}</td>
                        <td className="p-3 font-mono">
                          {d.endDeviationMinutes !== null ? (
                            d.endDeviationMinutes > 0 ? (
                              <span className="text-rose-400 font-bold">+{d.endDeviationMinutes}m</span>
                            ) : (
                              <span className="text-emerald-400 font-bold">{d.endDeviationMinutes}m</span>
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Real Charts Grid (PRD §17.2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Delays Breakdown */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Applied Delay Increments (Minutes)
              </h4>
              {delayChartData.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-12 text-center">No delays recorded.</p>
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={delayChartData}>
                      <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderColor: "#334155",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="minutes" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Chart 2: Sessions by Status */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Sessions by Operational Status
              </h4>
              {sessionStatusData.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-12 text-center">No sessions active.</p>
              ) : (
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sessionStatusData}>
                      <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          borderColor: "#334155",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {sessionStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
