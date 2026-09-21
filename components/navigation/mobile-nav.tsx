"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CalendarClock,
  Radio,
  Sparkles,
  BarChart3,
  LogOut,
  FileText,
  Mail,
  Image as ImageIcon,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { useAuth } from "@/contexts/auth-context";

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { events, activeEventId, sessions, liveEventIds } = useEventStore();
  const { logout } = useAuth();
  const isEventEnded = (e: { status?: string; endedAt?: number | null }) =>
    e.status === "Completed" || Boolean(e.endedAt);
  const activeEvent = events.find((e) => e.id === activeEventId && !isEventEnded(e));
  const isAnyLive = events.some((e) =>
    !isEventEnded(e) && (
      e.status === "Live" ||
      liveEventIds?.includes(e.id) ||
      sessions.some((s) => s.eventId === e.id && s.status === "Live")
    )
  );

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/events", label: "Events", icon: Calendar },
    { href: "/agenda", label: "Agenda", icon: CalendarClock },
    { href: "/live-stage", label: "Live", icon: Radio, isLive: isAnyLive },
    { href: "/ai", label: "AI", icon: Sparkles },
    { href: "/scripts", label: "Scripts", icon: FileText },
    { href: "/invitations", label: "Invites", icon: Mail },
    { href: "/image-generator", label: "Images", icon: ImageIcon },
    { href: "/analytics", label: "Stats", icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800/80 px-3.5 py-2.5 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900 shadow-md">
              <Image
                src="/brand/stagex-logo.png"
                alt="StageX AI"
                fill
                className="object-contain p-0.5"
                priority
              />
            </div>
            <span className="font-bold text-white text-sm">
              Stage<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-amber-400">X</span>
            </span>
          </Link>

          {activeEvent && (
            <Link
              href="/events"
              title={`Active Event: ${activeEvent.name}`}
              className="text-[11px] font-medium bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full text-slate-300 truncate max-w-[100px] xs:max-w-[130px] sm:max-w-[180px] hover:border-slate-700 transition"
            >
              {activeEvent.name}
            </Link>
          )}
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-red-400 transition-colors px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 hover:bg-slate-800 shrink-0 shadow-sm"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Mobile Bottom Fixed Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around backdrop-blur-md safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[50px] transition-colors relative ${
                isActive ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.isLive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-2 ring-slate-950"></span>
                )}
              </div>
              <span className="text-[10px] font-medium mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};
