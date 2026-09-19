"use client";

import React, { Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEventStore } from "@/store/event-store";
import { TeleprompterView } from "@/components/teleprompter/teleprompter-view";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Tv, ArrowLeft, Loader2 } from "lucide-react";

function TeleprompterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scriptId = searchParams.get("scriptId");

  const { scripts, events } = useEventStore();

  const activeScript = useMemo(() => {
    if (!scriptId) return null;
    return scripts.find((s) => s.id === scriptId) || null;
  }, [scripts, scriptId]);

  const activeEvent = useMemo(() => {
    if (!activeScript) return null;
    return events.find((e) => e.id === activeScript.eventId) || null;
  }, [events, activeScript]);

  if (!scriptId || !activeScript) {
    return (
      <div className="min-h-screen bg-[#03060d] text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10">
            <Tv className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Script not found</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The requested script could not be located in your StageX workspace. It may have been deleted or the link is invalid.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => router.push("/scripts")}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-xl inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Scripts</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const scriptContent = activeScript.editedContent || activeScript.content;

  return (
    <TeleprompterView
      scriptText={scriptContent}
      scriptTitle={activeScript.title}
      language={activeScript.language || "English"}
      eventTitle={activeEvent?.name}
      isOpen={true}
      onClose={() => router.push("/scripts")}
    />
  );
}

export default function TeleprompterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#03060d] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Loading Teleprompter…</p>
          </div>
        </div>
      }
    >
      <TeleprompterContent />
    </Suspense>
  );
}
