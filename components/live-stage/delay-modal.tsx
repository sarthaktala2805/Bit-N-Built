"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useEventStore } from "@/store/event-store";
import { Session, FixedDecision } from "@/types";
import { Clock, ShieldAlert, ArrowRight, Check } from "lucide-react";

interface DelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  anchorSession: Session | null;
  defaultReason?: string;
}

export const DelayModal: React.FC<DelayModalProps> = ({
  isOpen,
  onClose,
  anchorSession,
  defaultReason = "",
}) => {
  const { previewDelay, commitDelay } = useEventStore();

  const [minutes, setMinutes] = useState<number>(10);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [reason, setReason] = useState<string>(defaultReason);
  const [fixedDecision, setFixedDecision] = useState<FixedDecision | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  if (!anchorSession) return null;

  const currentMinutes = customMinutes ? parseInt(customMinutes, 10) || 0 : minutes;
  const preview = previewDelay(anchorSession.id, currentMinutes, fixedDecision);

  const handleApplyQuick = (m: number) => {
    setMinutes(m);
    setCustomMinutes("");
    setFixedDecision(undefined);
    setError(null);
  };

  const handleCustomChange = (val: string) => {
    setCustomMinutes(val);
    setFixedDecision(undefined);
    setError(null);
  };

  const handleCommit = () => {
    if (currentMinutes < 1 || currentMinutes > 240) {
      setError("Please enter a delay between 1 and 240 minutes.");
      return;
    }

    if (preview.status === "needs_decision" && !fixedDecision) {
      setError("Please select how to resolve the fixed-time conflict.");
      return;
    }

    const res = commitDelay(anchorSession.id, currentMinutes, reason, fixedDecision);
    if (!res.ok) {
      setError(res.error || "Failed to commit delay.");
      return;
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dynamic Schedule Delay"
      description={`Apply delay to ${anchorSession.status === "Live" ? "overrun current session" : "shift upcoming session"}: "${anchorSession.title}".`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            {error}
          </div>
        )}

        {/* Quick Buttons */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Select Delay Duration
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleApplyQuick(m)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                  !customMinutes && minutes === m
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                    : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                }`}
              >
                +{m} min
              </button>
            ))}
            <input
              type="number"
              min="1"
              max="240"
              placeholder="Custom"
              value={customMinutes}
              onChange={(e) => handleCustomChange(e.target.value)}
              className={`py-2 px-3 rounded-lg text-xs font-bold text-center bg-slate-950 border transition-all ${
                customMinutes
                  ? "border-amber-500 text-amber-400"
                  : "border-slate-800 text-slate-300 placeholder-slate-600"
              }`}
            />
          </div>
        </div>

        {/* Reason / Trigger */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Reason / Context (Optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Q&A overrun, speaker technical setup"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
        </div>

        {/* Dynamic Recalculation Preview */}
        {preview.status === "ok" && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Dynamic Schedule Recalculation
              </span>
              {preview.bufferConsumedMinutes > 0 && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {preview.bufferConsumedMinutes}m buffer absorbed
                </span>
              )}
            </div>

            {preview.changes.length === 0 ? (
              <p className="text-xs text-slate-400">
                Delay is fully absorbed by scheduled gaps; subsequent sessions will not shift.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {preview.changes.map((c) => (
                  <div
                    key={c.sessionId}
                    className="text-xs flex items-center justify-between bg-slate-900/60 px-2.5 py-1.5 rounded border border-slate-800/40"
                  >
                    <span className="font-medium text-slate-200 truncate max-w-[160px]">
                      {c.sessionTitle}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-slate-500 line-through">
                        {c.from.date && c.to.date && c.from.date !== c.to.date ? `${c.from.date.slice(5)} ` : ""}
                        {c.from.start}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-amber-400 font-bold">
                        {c.from.date && c.to.date && c.from.date !== c.to.date ? `${c.to.date.slice(5)} ` : ""}
                        {c.to.start}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fixed-Time Conflict Dialog (PRD §10.6) */}
        {preview.status === "needs_decision" && preview.conflicts.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-300">
                  Fixed-Time Session Conflict Detected
                </p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  {preview.conflicts[0].reason}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-semibold text-slate-300">
                Choose how to handle the fixed session:
              </p>

              <button
                type="button"
                onClick={() => setFixedDecision("keep")}
                className={`w-full p-2.5 text-left rounded-lg border text-xs flex items-center justify-between transition-colors ${
                  fixedDecision === "keep"
                    ? "bg-blue-600/20 border-blue-500 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div>
                  <span className="font-bold">Keep Fixed Time</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Preceding sessions are truncated to fit. Fixed session start remains locked.
                  </p>
                </div>
                {fixedDecision === "keep" && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setFixedDecision("shift")}
                className={`w-full p-2.5 text-left rounded-lg border text-xs flex items-center justify-between transition-colors ${
                  fixedDecision === "shift"
                    ? "bg-blue-600/20 border-blue-500 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div>
                  <span className="font-bold">Shift Fixed Session</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Move the fixed session forward alongside other sessions.
                  </p>
                </div>
                {fixedDecision === "shift" && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => setFixedDecision("skip")}
                className={`w-full p-2.5 text-left rounded-lg border text-xs flex items-center justify-between transition-colors ${
                  fixedDecision === "skip"
                    ? "bg-rose-600/20 border-rose-500 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div>
                  <span className="font-bold">Skip / Cancel Session</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Remove the session from the live flow and continue subsequent shifts.
                  </p>
                </div>
                {fixedDecision === "skip" && <Check className="w-4 h-4 text-rose-400 shrink-0" />}
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button
            onClick={handleCommit}
            variant="primary"
            size="sm"
            disabled={preview.status === "invalid"}
          >
            Apply Delay ({currentMinutes}m)
          </Button>
        </div>
      </div>
    </Modal>
  );
};
