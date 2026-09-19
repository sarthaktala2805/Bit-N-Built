"use client";

import React from "react";
import {
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FastForward,
  XCircle,
  ShieldAlert,
  Flame,
} from "lucide-react";
import { SessionStatus, EmergencyType } from "@/types";

export interface BadgeProps {
  status?: SessionStatus | EmergencyType | "Overtime" | "Start Overdue" | "Fixed";
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  label,
  size = "md",
  className = "",
}) => {
  const displayLabel = label || status || "";

  const getStyleAndIcon = () => {
    switch (status) {
      case "Live":
        return {
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          icon: <Radio className="w-3.5 h-3.5 animate-pulse" />,
        };
      case "Upcoming":
        return {
          bg: "bg-slate-800 text-slate-300 border-slate-700",
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      case "Completed":
        return {
          bg: "bg-blue-500/10 text-blue-400 border-blue-500/30",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case "Delayed":
        return {
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
      case "Skipped":
        return {
          bg: "bg-slate-800/80 text-slate-400 border-slate-700",
          icon: <FastForward className="w-3.5 h-3.5" />,
        };
      case "Cancelled":
        return {
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          icon: <XCircle className="w-3.5 h-3.5" />,
        };
      case "Overtime":
        return {
          bg: "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse font-semibold",
          icon: <Flame className="w-3.5 h-3.5" />,
        };
      case "Start Overdue":
        return {
          bg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
      case "Fixed":
        return {
          bg: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      default:
        return {
          bg: "bg-slate-800 text-slate-300 border-slate-700",
          icon: <ShieldAlert className="w-3.5 h-3.5" />,
        };
    }
  };

  const { bg, icon } = getStyleAndIcon();
  const sizeStyles = size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-xs px-2.5 py-1 gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${bg} ${sizeStyles} ${className}`}
    >
      {icon}
      <span>{displayLabel}</span>
    </span>
  );
};
