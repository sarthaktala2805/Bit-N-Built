"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Settings,
  Trash2,
  HardDrive,
  Info,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import {
  getStorageUsageBytes,
  isLocalStorageAvailable,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export default function SettingsPage() {
  const router = useRouter();
  const { events, speakers, sessions, delays, emergencies, aiRecords, activityLogs, resetAll } =
    useEventStore();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [storageBytes, setStorageBytes] = useState<number>(0);
  const [isStorageAvailable, setIsStorageAvailable] = useState<boolean>(true);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    setStorageBytes(getStorageUsageBytes());
    setIsStorageAvailable(isLocalStorageAvailable());
  }, [events, speakers, sessions, delays, emergencies, aiRecords, activityLogs]);

  const handleResetConfirm = () => {
    resetAll();
    setIsResetModalOpen(false);
    setResetDone(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="border-b border-slate-800/80 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">System Settings</h1>
        <p className="text-xs text-slate-400 mt-1">
          Local storage diagnostics, data lifecycle management, and application info.
        </p>
      </div>

      {resetDone && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>All local data has been wiped. Returning to clean empty dashboard...</span>
        </div>
      )}

      {/* Storage Status Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-white">Local Storage Status</h3>
              <p className="text-xs text-slate-400">
                StageX AI operates fully client-side with zero external database dependencies.
              </p>
            </div>
          </div>

          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              isStorageAvailable
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}
          >
            {isStorageAvailable ? "Operational" : "Unavailable"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs">
            <span className="text-slate-400 block mb-1">Storage Consumed</span>
            <span className="text-base font-bold font-mono text-white">
              {formatBytes(storageBytes)}
            </span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs">
            <span className="text-slate-400 block mb-1">Events Stored</span>
            <span className="text-base font-bold font-mono text-white">{events.length}</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs">
            <span className="text-slate-400 block mb-1">Sessions Stored</span>
            <span className="text-base font-bold font-mono text-white">{sessions.length}</span>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs">
            <span className="text-slate-400 block mb-1">Activity Log Items</span>
            <span className="text-base font-bold font-mono text-white">{activityLogs.length}</span>
          </div>
        </div>
      </div>

      {/* Reset Data Section */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              Reset All Application Data
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-lg">
              Permanently wipe all events, speaker profiles, agendas, and logs from your browser. Returns StageX AI to a clean, first-time empty installation.
            </p>
          </div>

          <Button
            onClick={() => setIsResetModalOpen(true)}
            variant="danger"
            size="sm"
            className="shrink-0"
          >
            Reset All Data
          </Button>
        </div>
      </div>

      {/* About Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shrink-0 shadow-lg">
            <Image
              src="/brand/stagex-logo.png"
              alt="StageX AI"
              fill
              className="object-contain p-1"
            />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">StageX AI</h3>
            <p className="text-xs text-blue-400 font-semibold tracking-wide uppercase">
              Plan. Perform. Adapt.
            </p>
            <p className="text-xs text-slate-400 pt-1">
              Powered by <strong className="text-slate-200">NeuroX</strong> • Hackathon Problem PS-5: Smart Anchor & Stage Flow Management System.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <span>Release: v1.0.0 (Production MVP)</span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            Zero Secret Leakage Protected
          </span>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset All Data"
        description="Are you absolutely sure you want to reset all StageX AI data?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
            <p className="font-bold mb-1">Irreversible Action</p>
            <p>
              This will clear all events, speakers, agenda sessions, delay history, emergency records, and activity logs. The application will return to its initial empty state.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button onClick={() => setIsResetModalOpen(false)} variant="ghost" size="sm">
              Cancel
            </Button>
            <Button onClick={handleResetConfirm} variant="danger" size="sm">
              Confirm Complete Reset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
