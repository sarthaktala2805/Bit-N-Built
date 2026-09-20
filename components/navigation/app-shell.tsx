"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { useEventStore } from "@/store/event-store";
import { useAuth } from "@/contexts/auth-context";
import { AlertCircle, X } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/audience"];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hydrate, hydrated, corruptionNotice, clearCorruptionNotice } = useEventStore();
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route || pathname?.startsWith("/audience"));

  // Hydrate event store once authenticated with user-scoped persistence
  useEffect(() => {
    if (user) {
      hydrate(user.uid);
    } else {
      // For audience guest access or unauthenticated users, also allow local hydration so event access codes resolve
      hydrate(null);
    }
  }, [hydrate, user]);

  // Auth redirect logic
  useEffect(() => {
    if (authLoading) return;
    if (!user && !isPublicRoute) {
      router.replace("/login");
    } else if (user && pathname === "/login") {
      router.replace("/dashboard");
    }
  }, [user, authLoading, isPublicRoute, pathname, router]);

  // Full-screen loading spinner (auth check)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
            Checking session…
          </p>
        </div>
      </div>
    );
  }

  // Render the login page without shell chrome
  if (isPublicRoute || !user) {
    return <>{children}</>;
  }

  // Event store hydration spinner
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[#070B14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
            Loading StageX AI…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col md:flex-row">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <MobileNav />

      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-y-auto">
        {corruptionNotice && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 px-6 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{corruptionNotice}</span>
            </div>
            <button
              onClick={clearCorruptionNotice}
              className="p-1 hover:bg-amber-500/20 rounded text-amber-400 hover:text-white"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
};
