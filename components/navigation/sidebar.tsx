"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CalendarClock,
  Radio,
  Sparkles,
  BarChart3,
  Settings,
  ChevronRight,
  LogOut,
  FileText,
  Mail,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEventStore } from "@/store/event-store";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { events, activeEventId, sessions, liveEventIds } = useEventStore();
  const { user, logout } = useAuth();

  const isEventEnded = (e: { status?: string; endedAt?: number | null }) =>
    e.status === "Completed" || Boolean(e.endedAt);
  const activeEvent = events.find((e) => e.id === activeEventId && !isEventEnded(e));
  const liveCount = events.filter((e) =>
    !isEventEnded(e) && (
      e.status === "Live" ||
      liveEventIds?.includes(e.id) ||
      sessions.some((s) => s.eventId === e.id && s.status === "Live")
    )
  ).length;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/events", label: "Events", icon: Calendar },
    { href: "/speakers", label: "Speakers", icon: Users },
    { href: "/agenda", label: "Agenda", icon: CalendarClock },
    {
      href: "/live-stage",
      label: "Live Stage",
      icon: Radio,
      badge: liveCount > 1 ? `${liveCount} LIVE` : liveCount === 1 ? "LIVE" : undefined,
    },
    { href: "/ai", label: "AI Copilot", icon: Sparkles },
    { href: "/scripts", label: "Scripts", icon: FileText },
    { href: "/invitations", label: "Invitations", icon: Mail },
    { href: "/image-generator", label: "Image Generator", icon: ImageIcon, badge: "Free" },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950/80 border-r border-slate-800/80 flex flex-col shrink-0 h-screen sticky top-0 backdrop-blur-md">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-700/60 bg-slate-900 shadow-md">
          <Image
            src="/brand/stagex-logo.png"
            alt="StageX AI"
            fill
            className="object-contain p-0.5"
            priority
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-base tracking-tight">
              Stage<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-amber-400">X</span> AI
            </span>
          </div>
          <p className="text-[10px] text-slate-400 tracking-wide uppercase font-medium">
            Plan. Perform. Adapt.
          </p>
        </div>
      </div>

      {/* Active Event Card */}
      <div className="p-3">
        <Link
          href="/events"
          className="group block p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 transition-all"
        >
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-slate-400">Active Event</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p className="text-xs font-medium text-white truncate">
            {activeEvent ? activeEvent.name : "No event selected"}
          </p>
          {activeEvent && (
            <p className="text-[10px] text-slate-400 mt-0.5">
              {activeEvent.date} • {activeEvent.startTime}
            </p>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer — User Info + Logout */}
      <div className="p-3 border-t border-slate-800/80 space-y-2">
        {user && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-900/60">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {(user.displayName || user.email || "U")[0].toUpperCase()}
            </div>
            <p className="text-[10px] text-slate-400 truncate flex-1">
              {user.displayName || user.email}
            </p>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <p className="text-[10px] text-slate-500 text-center">
          Powered by <span className="text-slate-400 font-medium">NeuroX</span>
        </p>
      </div>
    </aside>
  );
};
