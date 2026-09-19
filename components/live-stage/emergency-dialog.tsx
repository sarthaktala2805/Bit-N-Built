"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useEventStore } from "@/store/event-store";
import { EmergencyType } from "@/types";
import { VALID_EMERGENCY_TYPES } from "@/lib/validation";
import {
  AlertTriangle,
  MicOff,
  Tv2,
  Clock,
  MapPin,
  HelpCircle,
  Sparkles,
  ArrowRight,
  UserX,
} from "lucide-react";

interface EmergencyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAiFiller: (type: EmergencyType, desc?: string) => void;
  onSelectDelay: (type: EmergencyType, defaultMinutes: number) => void;
  eventId?: string;
}

const DETERMINISTIC_GUIDANCE: Record<
  EmergencyType,
  {
    icon: React.ReactNode;
    guidance: string;
    suggestedDelay: number;
    actionNote: string;
  }
> = {
  "Speaker Delayed": {
    icon: <UserX className="w-5 h-5 text-amber-400" />,
    guidance: "Keep the audience engaged with an anchor filler. Verify speaker arrival time with backstage crew.",
    suggestedDelay: 10,
    actionNote: "Suggest applying a +10 min delay to the speaker's session.",
  },
  "Microphone Issue": {
    icon: <MicOff className="w-5 h-5 text-rose-400" />,
    guidance: "Switch to backup wireless handheld mic. Anchor provides a brief holding statement.",
    suggestedDelay: 5,
    actionNote: "Suggest applying a +5 min holding delay.",
  },
  "Projector Issue": {
    icon: <Tv2 className="w-5 h-5 text-indigo-400" />,
    guidance: "Advise presenter to begin verbal remarks without slides while AV technician resets display connection.",
    suggestedDelay: 5,
    actionNote: "Generate a slide-free holding script.",
  },
  "Technical Problem": {
    icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    guidance: "Acknowledge brief pause transparently. Notify stage technical coordinator immediately.",
    suggestedDelay: 10,
    actionNote: "Short neutral holding script for anchor.",
  },
  "Unexpected Break": {
    icon: <Clock className="w-5 h-5 text-blue-400" />,
    guidance: "Announce unexpected break clearly. State the estimated reconvene time.",
    suggestedDelay: 15,
    actionNote: "Suggest adding a 15-minute break session.",
  },
  "Venue Change": {
    icon: <MapPin className="w-5 h-5 text-rose-400" />,
    guidance: "Announce relocation clearly. Direct audience flow with stage coordinators.",
    suggestedDelay: 15,
    actionNote: "Description must specify the new location.",
  },
  "Custom Issue": {
    icon: <HelpCircle className="w-5 h-5 text-slate-400" />,
    guidance: "Assess operational impact, inform anchor, and maintain audience rapport.",
    suggestedDelay: 10,
    actionNote: "Provide description to generate custom filler.",
  },
};

export const EmergencyDialog: React.FC<EmergencyDialogProps> = ({
  isOpen,
  onClose,
  onSelectAiFiller,
  onSelectDelay,
  eventId,
}) => {
  const { activateEmergency } = useEventStore();
  const [selectedType, setSelectedType] = useState<EmergencyType>("Speaker Delayed");
  const [description, setDescription] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const selectedInfo = DETERMINISTIC_GUIDANCE[selectedType];

  const handleActivate = () => {
    setError(null);
    if ((selectedType === "Custom Issue" || selectedType === "Venue Change") && !description.trim()) {
      setError(`Description is required for ${selectedType}.`);
      return;
    }

    const res = activateEmergency(selectedType, description, eventId);
    if (!res.ok) {
      setError(res.error || "Failed to activate emergency.");
      return;
    }

    onClose();
  };

  const handleFillerDirect = () => {
    onSelectAiFiller(selectedType, description);
    handleActivate();
  };

  const handleDelayDirect = () => {
    onSelectDelay(selectedType, selectedInfo.suggestedDelay);
    handleActivate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stage Emergency Protocol"
      description="Activate incident management to display stage guidance, generate holding scripts, or adapt timings."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            {error}
          </div>
        )}

        {/* Emergency Type Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Select Incident Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {VALID_EMERGENCY_TYPES.map((type) => {
              const info = DETERMINISTIC_GUIDANCE[type];
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    isSelected
                      ? "bg-rose-500/15 border-rose-500/50 text-white shadow-md shadow-rose-500/10"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{info.icon}</div>
                  <span className="text-xs font-bold leading-tight">{type}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Deterministic Suggested Next Steps (PRD §12.2) */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <span className="text-rose-400">●</span>
            <span>Deterministic Operational Guidance</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{selectedInfo.guidance}</p>

          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleFillerDirect}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 flex items-center gap-1.5 font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate AI Filler
            </button>

            <button
              type="button"
              onClick={handleDelayDirect}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 flex items-center gap-1.5 font-medium transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
              Apply +{selectedInfo.suggestedDelay}m Delay
            </button>
          </div>
        </div>

        {/* Optional Description */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Incident Description {selectedType === "Custom Issue" || selectedType === "Venue Change" ? "(Required)" : "(Optional)"}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              selectedType === "Venue Change"
                ? "e.g. Relocating to Hall B due to HVAC maintenance"
                : "e.g. Handheld wireless microphone battery replaced"
            }
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button onClick={handleActivate} variant="danger" size="sm">
            Activate Incident Banner
          </Button>
        </div>
      </div>
    </Modal>
  );
};
