"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  Loader2,
  Plus,
  MessageSquare,
  Bookmark,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  Image as ImageIcon,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
  Pin,
  PinOff,
  AlertTriangle,
  ZoomIn,
  RefreshCw,
  Paperclip,
  FileText,
  Camera,
  UploadCloud,
  CheckCircle2,
  MapPin,
  Users,
} from "lucide-react";
import { useEventStore } from "@/store/event-store";
import { buildGlobalAIContext } from "@/lib/ai-context";
import { processUploadFile, ProcessedFileResult } from "@/lib/file-processor";
import {
  EventPlan,
  AIAction,
  Event,
  AIConversation,
  AIMessage,
  GeneratedImageItem,
  EventChoice,
  AttachmentItem,
} from "@/types";
import { Button } from "@/components/ui/button";
import { EventPlanPreview } from "@/components/ai/event-plan-preview";

export default function GlobalAICopilotPage() {
  const router = useRouter();
  const {
    events,
    sessions,
    speakers,
    delays,
    emergencies,
    conversations = [],
    activeConversationId,
    createConversation,
    selectConversation,
    deleteConversation,
    toggleSaveConversation,
    renameConversation,
    addMessageToConversation,
    updateMessageInConversation,
    createEventFromPlan,
    executeAIAction,
  } = useEventStore();

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // File Upload State
  const [attachedFile, setAttachedFile] = useState<ProcessedFileResult | null>(null);
  const [isFileProcessing, setIsFileProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Event Plan Preview Modal State
  const [activePlan, setActivePlan] = useState<EventPlan | null>(null);
  const [committingPlanMsgId, setCommittingPlanMsgId] = useState<string | null>(null);

  // Full-size image modal preview state
  const [previewImage, setPreviewImage] = useState<GeneratedImageItem | null>(null);

  // Executing Action State
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Get active conversation or create default if none exists
  const activeConversation: AIConversation | undefined = useMemo(() => {
    if (activeConversationId) {
      const found = conversations.find((c) => c.id === activeConversationId);
      if (found) return found;
    }
    return conversations[0];
  }, [conversations, activeConversationId]);

  // Ensure an active conversation is always selected
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      selectConversation(conversations[0].id);
    }
  }, [activeConversationId, conversations, selectConversation]);

  // Messages in current conversation
  const messages: AIMessage[] = useMemo(
    () => activeConversation?.messages || [],
    [activeConversation?.messages]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Group conversations by timeframe
  const groupedConversations = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const today: AIConversation[] = [];
    const yesterday: AIConversation[] = [];
    const lastWeek: AIConversation[] = [];
    const older: AIConversation[] = [];
    const saved: AIConversation[] = [];

    conversations.forEach((conv) => {
      if (conv.isSaved) {
        saved.push(conv);
      }
      const age = now - conv.updatedAt;
      if (age < oneDay) {
        today.push(conv);
      } else if (age < 2 * oneDay) {
        yesterday.push(conv);
      } else if (age < 7 * oneDay) {
        lastWeek.push(conv);
      } else {
        older.push(conv);
      }
    });

    return { saved, today, yesterday, lastWeek, older };
  }, [conversations]);

  // Helper to match event name in text
  const matchEvent = (text: string): { matched: Event | null; ambiguous: EventChoice[] } => {
    const clean = text.toLowerCase();
    const exact = events.find((e) => clean.includes(e.name.toLowerCase()));
    if (exact) {
      const allMatches = events.filter((e) => clean.includes(e.name.toLowerCase()));
      if (allMatches.length === 1) {
        return { matched: exact, ambiguous: [] };
      }
      return {
        matched: null,
        ambiguous: allMatches.map((m) => ({ id: m.id, name: m.name, type: m.type, venue: m.venue })),
      };
    }

    const tokenMatches = events.filter((e) => {
      const tokens = e.name.toLowerCase().split(/\s+/);
      return tokens.some((t) => t.length > 3 && clean.includes(t));
    });

    if (tokenMatches.length === 1) {
      return { matched: tokenMatches[0], ambiguous: [] };
    }
    if (tokenMatches.length > 1) {
      return {
        matched: null,
        ambiguous: tokenMatches.map((m) => ({ id: m.id, name: m.name, type: m.type, venue: m.venue })),
      };
    }

    return { matched: null, ambiguous: [] };
  };

  const handleStartNewChat = () => {
    const newId = createConversation("New Conversation");
    selectConversation(newId);
  };

  const handleRenameSubmit = (convId: string) => {
    if (editTitleInput.trim()) {
      renameConversation(convId, editTitleInput.trim());
    }
    setEditingConvId(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsFileProcessing(true);
    try {
      const result = await processUploadFile(file);
      if (result.error) {
        alert(result.error);
      } else {
        setAttachedFile(result);
      }
    } catch (err: unknown) {
      alert("Failed to read file.");
    } finally {
      setIsFileProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDirectCommitPlan = async (msgId: string, plan: EventPlan) => {
    setCommittingPlanMsgId(msgId);
    try {
      const res = createEventFromPlan(plan);
      if (res.ok && res.eventId) {
        const targetConvId = activeConversation?.id;
        if (targetConvId) {
          updateMessageInConversation(targetConvId, msgId, {
            createdEventId: res.eventId,
          });
          addMessageToConversation(targetConvId, {
            id: `sys_${Date.now()}`,
            role: "assistant",
            content: `🎉 Successfully created event **"${plan.name}"** with ${plan.sessions?.length || 0} agenda sessions and ${plan.people?.length || 0} speakers in your database!`,
            createdAt: Date.now(),
          });
        }
      } else {
        alert(res.error || "Failed to create event from plan.");
      }
    } catch (err: unknown) {
      alert((err as Error)?.message || "Failed to create event.");
    } finally {
      setCommittingPlanMsgId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setIsFileProcessing(true);
      try {
        const result = await processUploadFile(files[0]);
        if (result.error) alert(result.error);
        else setAttachedFile(result);
      } catch {
        alert("Failed to read dropped file.");
      } finally {
        setIsFileProcessing(false);
      }
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    if ((!textToSend && !attachedFile) || isLoading) return;

    // Ensure we have an active conversation
    let targetConvId = activeConversation?.id;
    if (!targetConvId) {
      targetConvId = createConversation("New Conversation");
      selectConversation(targetConvId);
    }

    const currentAttachments: AttachmentItem[] | undefined = attachedFile
      ? [
          {
            id: `att_${Date.now()}`,
            name: attachedFile.fileName,
            size: attachedFile.fileSize,
            type: attachedFile.mimeType,
            extractedText: attachedFile.extractedText,
            base64: attachedFile.base64,
          },
        ]
      : undefined;

    const isImageAttached =
      attachedFile?.mimeType?.startsWith("image/") ||
      /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(attachedFile?.fileName || "");

    const userMsgText = textToSend || (attachedFile ? `Uploaded ${isImageAttached ? "event photo" : "document"}: ${attachedFile.fileName}` : "");

    const userMsg: AIMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: userMsgText,
      createdAt: Date.now(),
      attachments: currentAttachments,
    };

    addMessageToConversation(targetConvId, userMsg);
    setInputMessage("");
    const fileDataToSend = attachedFile?.base64 && attachedFile?.isMultimodalReady
      ? { mimeType: attachedFile.mimeType, data: attachedFile.base64, name: attachedFile.fileName }
      : undefined;
    const extractedTextToSend = attachedFile?.extractedText || "";
    setAttachedFile(null);
    setIsLoading(true);

    // Build rich global application snapshot + include recent messages for context
    const recentHistory = (activeConversation?.messages || []).slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const globalContext = buildGlobalAIContext({
      events,
      sessions,
      speakers,
      delays,
      emergencies,
      userPrompt: userMsgText,
    });

    const isPhotoOrDocAttached = !!fileDataToSend || !!extractedTextToSend;

    // Pure image generation request (creating new artwork from scratch with AI, NOT reading/extracting an existing photo)
    const isExplicitImageGen =
      /\b(generate|create|make|draw|design)\b.*\b(poster|image|artwork|background|banner|visual|flyer)\b/i.test(userMsgText) &&
      !isPhotoOrDocAttached &&
      !/\b(from|read|scan|extract|parse|add|karke|se|photo|image|picture|poster|flyer)\b/i.test(userMsgText);

    // Extraction or Planning intent
    const isPlanOrExtractIntent =
      isPhotoOrDocAttached ||
      /\b(create event|plan event|organize|schedule an event|cultural night|hackathon|conference|seminar|from \d|auditorium|artists|anchors)\b/i.test(userMsgText) ||
      /\b(photo|image|poster|flyer|brochure|agenda|speaker|schedule)\b/i.test(userMsgText) ||
      /\b(read|scan|extract|add|banao|kardo|kar do|daal do)\b/i.test(userMsgText);

    const requestType = isExplicitImageGen
      ? "image_generate"
      : isPlanOrExtractIntent || (extractedTextToSend && /event|schedule|speaker/i.test(extractedTextToSend))
      ? "event_builder"
      : "copilot";

    const promptToSend = userMsgText || (isImageAttached
      ? "Please read this event photo/poster carefully. Perform OCR to extract Event Name, Type, Dates, Times, Venue, Organizer, all Speakers/Artists, and all Agenda Sessions with timings, and construct the complete event plan JSON."
      : attachedFile
      ? `Please read and extract the event details, agenda, and speakers from ${attachedFile.fileName}.`
      : "");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType,
          prompt: promptToSend,
          extractedText: extractedTextToSend,
          fileData: fileDataToSend,
          context: {
            ...globalContext,
            conversationHistory: recentHistory,
          } as unknown as Record<string, unknown>,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "AI service was unable to process this request.");
      }

      const rawText = data.text || "";
      const returnedImages: GeneratedImageItem[] | undefined = data.images;

      if (requestType === "event_builder") {
        let plan: EventPlan | null = null;
        try {
          const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || [null, rawText];
          plan = JSON.parse(jsonMatch[1] || rawText);
        } catch {
          plan = null;
        }

        if (plan && plan.name) {
          const spkCount = plan.people?.length || 0;
          const sessCount = plan.sessions?.length || 0;
          const spkPreview = (plan.people || []).slice(0, 3).map((p) => `${p.name} (${p.role || "Speaker"})`).join(", ");
          const sessPreview = (plan.sessions || []).slice(0, 3).map((s) => `${s.title} [${s.startTime || "TBD"}]`).join(", ");

          const summaryText = `📸 **Event Details Extracted Successfully from Photo!**\n\n` +
            `🎉 **Event:** **${plan.name}** (${plan.type || "Event"})\n` +
            `📅 **Date & Time:** ${plan.startDate}${plan.endDate && plan.endDate !== plan.startDate ? ` to ${plan.endDate}` : ""} | ${plan.startTime || "09:00"} – ${plan.endTime || "17:00"}\n` +
            `📍 **Venue:** ${plan.venue || "Main Auditorium / Venue TBA"}\n` +
            (plan.organizer ? `🏢 **Organizer:** ${plan.organizer}\n` : "") +
            `🎙️ **Speakers (${spkCount}):** ${spkPreview || "Detected speakers"}${spkCount > 3 ? " and more..." : ""}\n` +
            `📋 **Agenda (${sessCount} Sessions):** ${sessPreview || "Sequential schedule"}${sessCount > 3 ? " and more..." : ""}\n\n` +
            `Click **"⚡ 1-Click Add Event, Agenda & Speakers"** below to save this event and all its details immediately!`;

          addMessageToConversation(targetConvId, {
            id: `asst_${Date.now()}`,
            role: "assistant",
            content: summaryText,
            createdAt: Date.now(),
            plan,
            generatedImages: returnedImages,
          });
        } else {
          addMessageToConversation(targetConvId, {
            id: `asst_${Date.now()}`,
            role: "assistant",
            content: rawText,
            createdAt: Date.now(),
            generatedImages: returnedImages,
          });
        }
      } else {
        // Copilot / Image response
        let parsed: { reply?: string; action?: AIAction | null; plan?: EventPlan } = {};
        try {
          const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            parsed = JSON.parse(jsonMatch[1]);
          }
        } catch {
          // Plain text fallback
        }

        const replyText = parsed.reply || rawText;
        const candidateAction = parsed.action;
        const detectedPlan: EventPlan | null =
          parsed.plan?.name ? parsed.plan :
          (parsed.action?.payload?.sessions || parsed.action?.payload?.people) ? (parsed.action.payload as unknown as EventPlan) : null;

        if (detectedPlan && detectedPlan.name) {
          addMessageToConversation(targetConvId, {
            id: `asst_${Date.now()}`,
            role: "assistant",
            content: replyText,
            createdAt: Date.now(),
            plan: detectedPlan,
            action: candidateAction || undefined,
            generatedImages: returnedImages,
          });
        } else if (candidateAction && candidateAction.type) {
          const eventResolution = matchEvent(
            (candidateAction.payload?.targetEventName as string) ||
              (candidateAction.payload?.eventName as string) ||
              userMsgText
          );

          if (eventResolution.ambiguous.length > 1) {
            addMessageToConversation(targetConvId, {
              id: `asst_${Date.now()}`,
              role: "assistant",
              content: "I found multiple matching events. Which one do you mean?",
              createdAt: Date.now(),
              eventChoices: eventResolution.ambiguous,
              pendingActionPrompt: userMsgText,
              generatedImages: returnedImages,
            });
          } else {
            const resolvedTargetEvent = eventResolution.matched;
            if (resolvedTargetEvent) {
              candidateAction.payload = {
                ...candidateAction.payload,
                eventId: resolvedTargetEvent.id,
                targetEventName: resolvedTargetEvent.name,
              };
            }

            addMessageToConversation(targetConvId, {
              id: `asst_${Date.now()}`,
              role: "assistant",
              content: replyText,
              createdAt: Date.now(),
              action: candidateAction,
              generatedImages: returnedImages,
            });
          }
        } else {
          addMessageToConversation(targetConvId, {
            id: `asst_${Date.now()}`,
            role: "assistant",
            content: replyText,
            createdAt: Date.now(),
            generatedImages: returnedImages,
          });
        }
      }
    } catch (err: unknown) {
      addMessageToConversation(targetConvId, {
        id: `asst_err_${Date.now()}`,
        role: "assistant",
        content: `⚠️ ${(err as Error)?.message || "An unexpected error occurred. Please try again."}`,
        createdAt: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteAction = async (msgId: string, action: AIAction) => {
    setExecutingActionId(action.id);
    const targetConvId = activeConversation?.id;

    try {
      const result = await executeAIAction(action);
      if (targetConvId) {
        updateMessageInConversation(targetConvId, msgId, {
          actionMetadata: {
            executed: true,
            success: result.success,
            message: result.message,
            executedAt: Date.now(),
          },
        });

        if (result.success) {
          addMessageToConversation(targetConvId, {
            id: `sys_${Date.now()}`,
            role: "assistant",
            content: `✅ ${result.message}`,
            createdAt: Date.now(),
          });
        }
      }
    } catch (err: unknown) {
      if (targetConvId) {
        updateMessageInConversation(targetConvId, msgId, {
          actionMetadata: {
            executed: true,
            success: false,
            message: (err as Error)?.message || "Execution failed.",
            executedAt: Date.now(),
          },
        });
      }
    } finally {
      setExecutingActionId(null);
    }
  };

  // High-Resolution 2x PNG Download for Generated Images
  const handleDownloadImage = (img: GeneratedImageItem) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = (img.width || 1080) * scale;
      canvas.height = (img.height || 1350) * scale;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(scale, scale);
        ctx.drawImage(image, 0, 0, img.width || 1080, img.height || 1350);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `StageX_${img.theme || "Poster"}_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };
    image.src = img.url;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#070B14] text-slate-100">
      {/* ── LEFT SIDEBAR: CONVERSATION HISTORY ── */}
      <aside className="w-72 border-r border-slate-800/80 bg-slate-950/60 flex flex-col shrink-0">
        {/* New Chat Button */}
        <div className="p-3 border-b border-slate-800/60">
          <Button
            onClick={handleStartNewChat}
            className="w-full justify-start gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-md shadow-blue-600/20 rounded-xl h-10"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </Button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
          {/* Saved / Pinned Section */}
          {groupedConversations.saved.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 fill-amber-400" />
                <span>Saved Chats</span>
              </div>
              <div className="space-y-0.5 mt-1">
                {groupedConversations.saved.map((conv) => renderConversationItem(conv))}
              </div>
            </div>
          )}

          {/* Today Section */}
          {groupedConversations.today.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Today
              </div>
              <div className="space-y-0.5 mt-1">
                {groupedConversations.today.map((conv) => renderConversationItem(conv))}
              </div>
            </div>
          )}

          {/* Yesterday Section */}
          {groupedConversations.yesterday.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Yesterday
              </div>
              <div className="space-y-0.5 mt-1">
                {groupedConversations.yesterday.map((conv) => renderConversationItem(conv))}
              </div>
            </div>
          )}

          {/* Previous 7 Days Section */}
          {groupedConversations.lastWeek.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Previous 7 Days
              </div>
              <div className="space-y-0.5 mt-1">
                {groupedConversations.lastWeek.map((conv) => renderConversationItem(conv))}
              </div>
            </div>
          )}

          {/* Older Section */}
          {groupedConversations.older.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Older
              </div>
              <div className="space-y-0.5 mt-1">
                {groupedConversations.older.map((conv) => renderConversationItem(conv))}
              </div>
            </div>
          )}

          {conversations.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No chat history yet.</p>
              <p className="text-[11px] mt-1 text-slate-600">Start a new conversation to plan your live stage events.</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN CHAT AREA ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#070B14]">
        {/* Top Header Bar */}
        <header className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-950/40 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white truncate">
                {activeConversation?.title || "StageX AI Copilot"}
              </h1>
              <p className="text-[11px] text-slate-400 truncate">
                {events.length} event{events.length === 1 ? "" : "s"} loaded • Multi-event context active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeConversation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSaveConversation(activeConversation.id)}
                className={`h-8 px-2.5 text-xs rounded-lg ${
                  activeConversation.isSaved
                    ? "text-amber-400 hover:text-amber-300 bg-amber-400/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {activeConversation.isSaved ? <Pin className="w-3.5 h-3.5 mr-1" /> : <Bookmark className="w-3.5 h-3.5 mr-1" />}
                <span>{activeConversation.isSaved ? "Saved" : "Save"}</span>
              </Button>
            )}
          </div>
        </header>

        {/* Message Stream */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative flex-1 overflow-y-auto p-6 space-y-6"
        >
          {isDraggingOver && (
            <div className="absolute inset-4 z-40 bg-blue-950/90 backdrop-blur-sm border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center text-blue-200 pointer-events-none shadow-2xl">
              <UploadCloud className="w-12 h-12 mb-3 animate-bounce text-blue-400" />
              <p className="text-base font-bold text-white">Drop Event Photo or Schedule Here</p>
              <p className="text-xs text-blue-300 mt-1">AI Copilot will automatically scan & extract Event, Agenda & Speakers</p>
            </div>
          )}

          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto my-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">StageX AI Operations Copilot</h2>
              <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto">
                Upload event posters, flyers, or schedule photos to auto-extract details, ask questions, or generate stage scripts.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/40 hover:bg-blue-900/50 transition-all text-left group shadow-sm shadow-blue-500/10"
                >
                  <div className="text-xs font-semibold text-blue-400 mb-1 group-hover:text-blue-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> 📸 Scan Event Photo / Poster
                  </div>
                  <div className="text-xs text-slate-300">&ldquo;Upload poster/flyer to auto-extract event, agenda & speakers&rdquo;</div>
                </button>

                <button
                  onClick={() => handleSendMessage("Plan a college cultural night in Ahmedabad from 7 PM to 11 PM with 2 anchors")}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 transition-all text-left group"
                >
                  <div className="text-xs font-semibold text-blue-400 mb-1 group-hover:text-blue-300">🎪 Event Planning</div>
                  <div className="text-xs text-slate-300">&ldquo;Plan a college cultural night from 7 PM to 11 PM&rdquo;</div>
                </button>

                <button
                  onClick={() => handleSendMessage("Generate a cinematic stage poster for Cultural Night")}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 transition-all text-left group"
                >
                  <div className="text-xs font-semibold text-purple-400 mb-1 group-hover:text-purple-300">🎨 Image & Poster AI</div>
                  <div className="text-xs text-slate-300">&ldquo;Generate a cinematic stage poster for Cultural Night&rdquo;</div>
                </button>

                <button
                  onClick={() => handleSendMessage("Which events are live right now and what is the current delay?")}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 transition-all text-left group"
                >
                  <div className="text-xs font-semibold text-emerald-400 mb-1 group-hover:text-emerald-300">⚡ Live Status Query</div>
                  <div className="text-xs text-slate-300">&ldquo;Which events are live right now and what is the delay?&rdquo;</div>
                </button>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-800 border border-slate-700 text-blue-400"
                }`}
              >
                {msg.role === "user" ? "You" : <Sparkles className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div className="space-y-3 min-w-0">
                {/* Attachments Badge or Thumbnail if any */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {msg.attachments.map((att) => (
                      <div key={att.id}>
                        {att.type?.startsWith("image/") && att.base64 ? (
                          <div className="relative group rounded-xl overflow-hidden border border-blue-500/40 max-w-xs shadow-md bg-slate-950">
                            <img
                              src={`data:${att.type};base64,${att.base64}`}
                              alt={att.name}
                              className="w-full max-h-52 object-cover cursor-pointer hover:opacity-95 transition"
                              onClick={() =>
                                setPreviewImage({
                                  id: att.id,
                                  url: `data:${att.type};base64,${att.base64}`,
                                  prompt: att.name,
                                  createdAt: Date.now(),
                                  theme: "Uploaded Poster",
                                })
                              }
                            />
                            <div className="bg-slate-950/90 border-t border-slate-800 p-2 text-[11px] text-white flex items-center justify-between">
                              <span className="truncate max-w-[180px] font-medium flex items-center gap-1">
                                <Camera className="w-3 h-3 text-blue-400" /> {att.name}
                              </span>
                              <span className="text-[10px] text-slate-400">{Math.round(att.size / 1024)} KB</span>
                            </div>
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="font-medium truncate max-w-[200px]">{att.name}</span>
                            <span className="text-[10px] text-blue-400">({Math.round(att.size / 1024)} KB)</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/20"
                      : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>

                {/* Generated Images Carousel / Grid */}
                {msg.generatedImages && msg.generatedImages.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {msg.generatedImages.map((img) => (
                      <div
                        key={img.id}
                        className="group relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/80 shadow-xl"
                      >
                        <img
                          src={img.url}
                          alt={img.prompt}
                          className="w-full h-auto aspect-[4/5] object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                          onClick={() => setPreviewImage(img)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                          <p className="text-xs text-white font-medium truncate mb-2">{img.prompt}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setPreviewImage(img)}
                              className="h-7 text-xs bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg flex-1"
                            >
                              <ZoomIn className="w-3.5 h-3.5 mr-1" /> Preview
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDownloadImage(img)}
                              className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex-1"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" /> PNG
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Event Plan Preview Card */}
                {msg.plan && (
                  <div className="p-4 rounded-xl border border-blue-500/40 bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-950 space-y-3 shadow-lg shadow-blue-500/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="font-bold text-white text-sm truncate">{msg.plan.name}</span>
                      </div>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold shrink-0">
                        {msg.plan.type || "Event"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span>{msg.plan.startDate} | {msg.plan.startTime || "09:00"} – {msg.plan.endTime || "17:00"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{msg.plan.venue || "Main Auditorium / Venue TBA"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{msg.plan.people?.length || 0} Speakers & Guests</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>{msg.plan.sessions?.length || 0} Agenda Sessions</span>
                      </div>
                    </div>

                    {msg.plan.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 pt-1">{msg.plan.description}</p>
                    )}

                    {/* Action buttons or Creation Success Confirmation */}
                    {msg.createdEventId ? (
                      <div className="pt-2 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="font-semibold">Event, Agenda & Speakers Added!</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => router.push(`/agenda?eventId=${msg.createdEventId}`)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 rounded-lg"
                          >
                            <Clock className="w-3 h-3 mr-1" /> View Agenda
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => router.push(`/live-stage?eventId=${msg.createdEventId}`)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs h-7 rounded-lg"
                          >
                            Live Stage
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                        <Button
                          size="sm"
                          disabled={committingPlanMsgId === msg.id}
                          onClick={() => handleDirectCommitPlan(msg.id, msg.plan!)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 rounded-lg font-semibold shadow-md shadow-emerald-600/20"
                        >
                          {committingPlanMsgId === msg.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                              Adding Event & Agenda...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                              ⚡ 1-Click Add Event, Agenda & Speakers
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActivePlan(msg.plan!)}
                          className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs h-8 rounded-lg"
                        >
                          ✏️ Review & Edit Plan
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Confirmation / Status Card */}
                {msg.action && (
                  <div className="pt-1">
                    {msg.actionMetadata?.executed ? (
                      <div
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          msg.actionMetadata.success
                            ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                            : "border-red-500/30 bg-red-950/20 text-red-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {msg.actionMetadata.success ? (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span className="font-medium truncate">{msg.actionMetadata.message}</span>
                        </div>
                        {!msg.actionMetadata.success && (
                          <Button
                            size="sm"
                            disabled={executingActionId === msg.action.id}
                            onClick={() => handleExecuteAction(msg.id, msg.action!)}
                            className="h-7 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg shrink-0"
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 font-medium text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Action Confirmation Required</span>
                        </div>
                        <p className="text-sm text-slate-200 font-semibold">{msg.action.description}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={executingActionId === msg.action.id}
                            onClick={() => handleExecuteAction(msg.id, msg.action!)}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-8 rounded-lg"
                          >
                            {executingActionId === msg.action.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Confirm & Execute"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Disambiguation Event Choice Chips */}
                {msg.eventChoices && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.eventChoices.map((choice) => (
                      <Button
                        key={choice.id}
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleSendMessage(
                            `${msg.pendingActionPrompt || ""} for event "${choice.name}"`
                          )
                        }
                        className="h-7 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-lg"
                      >
                        {choice.name} ({choice.type || "Event"})
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-md mr-auto">
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>StageX AI is thinking and composing response...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          {/* File Attachment preview chip */}
          {attachedFile && (
            <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between p-2.5 px-3.5 rounded-xl bg-slate-900 border border-blue-500/40 text-xs text-slate-200 shadow-lg shadow-blue-500/5">
              <div className="flex items-center gap-3 min-w-0">
                {attachedFile.base64 && attachedFile.mimeType.startsWith("image/") ? (
                  <img
                    src={`data:${attachedFile.mimeType};base64,${attachedFile.base64}`}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                  />
                ) : (
                  <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate max-w-xs">{attachedFile.fileName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">
                      {attachedFile.mimeType.startsWith("image/") ? "📸 Event Photo / Poster" : "Document"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {attachedFile.mimeType.startsWith("image/")
                      ? "Ready to scan: AI will extract Event Title, Date, Time, Venue, Agenda & Speakers"
                      : `${Math.round(attachedFile.fileSize / 1024)} KB ready for extraction`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 max-w-4xl mx-auto"
          >
            {/* Hidden Photo Input */}
            <input
              type="file"
              ref={photoInputRef}
              onChange={handleFileSelect}
              accept="image/*,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            {/* Hidden Document File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
              className="hidden"
            />

            {/* Photo / Poster Upload Button */}
            <button
              type="button"
              disabled={isFileProcessing || isLoading}
              onClick={() => photoInputRef.current?.click()}
              title="Upload Event Photo, Poster, Flyer or Schedule Image"
              className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/60 hover:border-blue-500/80 text-blue-400 hover:text-white transition flex items-center justify-center shrink-0 shadow-sm group"
            >
              {isFileProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              ) : (
                <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
            </button>

            {/* Document Paperclip Button */}
            <button
              type="button"
              disabled={isFileProcessing || isLoading}
              onClick={() => fileInputRef.current?.click()}
              title="Upload Schedule Document (PDF, DOCX, PPTX)"
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                attachedFile?.mimeType.startsWith("image/")
                  ? "Hit Enter or click Send to scan photo & extract all event details (or add custom instructions)..."
                  : attachedFile
                  ? `Ask about ${attachedFile.fileName}...`
                  : "Ask anything, or upload a photo/poster to auto-add event, agenda & speakers..."
              }
              className="flex-1 bg-slate-900/90 border border-slate-800 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors shadow-inner"
            />
            <Button
              type="submit"
              disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl h-11 px-5 shadow-lg shadow-blue-600/20 shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </div>
      </main>

      {/* ── EVENT PLAN PREVIEW MODAL ── */}
      {activePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="relative max-w-4xl w-full my-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Event Plan Extracted by AI</h3>
              </div>
              <button
                onClick={() => setActivePlan(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <EventPlanPreview
              initialPlan={activePlan}
              onReset={() => {
                setActivePlan(null);
                if (activeConversation?.id) {
                  addMessageToConversation(activeConversation.id, {
                    id: `created_${Date.now()}`,
                    role: "assistant",
                    content: `🎉 Event created successfully! You can now view it in the Events dashboard or start Live Stage operations.`,
                    createdAt: Date.now(),
                  });
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ── FULL SIZE IMAGE PREVIEW MODAL ── */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{previewImage.prompt}</h3>
                <span className="text-[11px] text-blue-400 capitalize">{previewImage.theme || "Stage Poster"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleDownloadImage(previewImage)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download 2x PNG
                </Button>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex justify-center bg-slate-950/60 rounded-xl p-2 max-h-[70vh] overflow-auto">
              <img src={previewImage.url} alt={previewImage.prompt} className="max-h-[65vh] w-auto object-contain rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONVERSATION CONFIRMATION MODAL ── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Delete Conversation?</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will permanently delete this conversation and its chat history.
              <span className="block mt-2 text-slate-300 font-medium">
                Note: Created Events, Sessions, Speakers, and Scripts will remain safe and intact.
              </span>
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirmId(null)}
                className="text-slate-400 hover:text-white text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  deleteConversation(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="bg-red-600 hover:bg-red-500 text-white text-xs rounded-xl"
              >
                Delete Chat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function renderConversationItem(conv: AIConversation) {
    const isActive = activeConversation?.id === conv.id;
    const isEditing = editingConvId === conv.id;

    return (
      <div
        key={conv.id}
        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl transition-all cursor-pointer ${
          isActive
            ? "bg-slate-800/90 text-white font-medium shadow-sm"
            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
        }`}
        onClick={() => {
          if (!isEditing) selectConversation(conv.id);
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
          {isEditing ? (
            <input
              type="text"
              value={editTitleInput}
              autoFocus
              onChange={(e) => setEditTitleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit(conv.id);
                if (e.key === "Escape") setEditingConvId(null);
              }}
              onBlur={() => handleRenameSubmit(conv.id)}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-950 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white w-full focus:outline-none"
            />
          ) : (
            <span className="truncate text-xs">{conv.title}</span>
          )}
        </div>

        {/* Hover Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSaveConversation(conv.id);
              }}
              title={conv.isSaved ? "Unpin" : "Pin/Save"}
              className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-700/60 transition"
            >
              <Bookmark className={`w-3 h-3 ${conv.isSaved ? "fill-amber-400 text-amber-400" : ""}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingConvId(conv.id);
                setEditTitleInput(conv.title);
              }}
              title="Rename"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 transition"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(conv.id);
              }}
              title="Delete"
              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700/60 transition"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }
}
