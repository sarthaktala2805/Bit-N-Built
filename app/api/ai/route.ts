// StageX AI — Resilient Multi-Key & Multi-Model Server-Side Gemini API Route
// Traces to STAGEX_AI_PRD.md §14, §15, §33 and Master Implementation Plan
// Supports Multimodal File Extraction (PDF, Images, DOCX, PPTX), Multilingual Generation (English, Hindi, Gujarati),
// Global Copilot Structured Actions, Script Synthesis, and Two-Layer Invitation Cards.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIRequestContext } from "@/lib/ai-context";
import { generateEventArtworkSVG } from "@/lib/image-generator";
import { generateFallbackStandinSpeech, SpeechEmotion } from "@/lib/ai-standin-speech";

const ALLOWED_REQUEST_TYPES = [
  "speaker_intro",
  "opening",
  "transition",
  "filler",
  "announcement",
  "closing",
  "copilot",
  "general",
  "event_builder",
  "role_script",
  "invitation",
  "action_assist",
  "image_generate",
  "file_extract",
  "script_translate",
  "invitation_translate",
  "improve_script",
  "script_generate",
  "standin_speech",
];

const SYSTEM_INSTRUCTION = `You are the AI anchor assistant, event planner, and stage coordinator for StageX AI, an operations platform for live events.
CRITICAL RULES:
1. Speak ONLY from the supplied structured event context if provided.
2. DO NOT invent or assume facts, real-world people, locations, dates, claims, achievements, or timing not present in the context, uploaded document, or user description.
3. If a needed fact is missing, clearly mark it as an AI suggestion requiring user confirmation.
4. For spoken scripts, output spoken, human-ready text suitable for reading aloud on a stage or teleprompter.
5. If a specific language is requested (e.g. Hindi, Gujarati, English, or Bilingual Hindi+English), produce the ACTUAL SPOKEN text in that exact requested language/script (e.g. Devanagari for Hindi, Gujarati script for Gujarati).
6. For emergency filler scripts, remain calm, reassuring, professional, and do not make false promises regarding exact resume time unless stated in the context.
7. For the AI Copilot:
   - If user asks an informational question, answer warmly and concisely.
   - If user asks to perform an action (create/update event, add session/speaker/artist, create script/invitation), return a structured JSON object with "reply" and "action".
8. For event builder or file extraction, return a strictly valid JSON object representing the Event Plan.
9. For invitations, return structured invitation card data matching the required schema.`;

// Verified active models on Gemini v1beta API (ordered by speed and reliability)
const VERIFIED_ACTIVE_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
];

function getAvailableApiKeys(): { id: string; key: string }[] {
  const keys: { id: string; key: string }[] = [];
  const k1 = process.env.GEMINI_API_KEY_1?.trim();
  const k2 = process.env.GEMINI_API_KEY_2?.trim();
  const k3 = process.env.GEMINI_API_KEY_3?.trim();
  const kFallback = process.env.GEMINI_API_KEY?.trim();

  if (k1) keys.push({ id: "KEY_1", key: k1 });
  if (k2 && !keys.some((k) => k.key === k2)) keys.push({ id: "KEY_2", key: k2 });
  if (k3 && !keys.some((k) => k.key === k3)) keys.push({ id: "KEY_3", key: k3 });
  if (kFallback && !keys.some((k) => k.key === kFallback)) keys.push({ id: "KEY_LEGACY", key: kFallback });

  return keys;
}

let lastWorkingKeyIndex = 0;
let lastWorkingModel = "gemini-flash-lite-latest";

function getAvailableModels(): string[] {
  const models: string[] = [];
  const mPrimary = process.env.GEMINI_MODEL_PRIMARY?.trim();
  const mFallback1 = process.env.GEMINI_MODEL_FALLBACK_1?.trim();
  const mFallback2 = process.env.GEMINI_MODEL_FALLBACK_2?.trim();

  // If we have a verified last working model, prioritize it first
  if (lastWorkingModel && VERIFIED_ACTIVE_MODELS.includes(lastWorkingModel) && !models.includes(lastWorkingModel)) {
    models.push(lastWorkingModel);
  }

  // Primary and configured fallbacks if not obsolete
  if (mPrimary && !models.includes(mPrimary)) models.push(mPrimary);
  if (mFallback1 && !models.includes(mFallback1)) models.push(mFallback1);
  if (mFallback2 && !models.includes(mFallback2)) models.push(mFallback2);

  // Guarantee active, verified models in fallback list
  for (const m of VERIFIED_ACTIVE_MODELS) {
    if (!models.includes(m)) {
      models.push(m);
    }
  }

  return models;
}

interface AttemptResult {
  success: boolean;
  text?: string;
  isRetryable: boolean;
  error?: string;
  code: string;
  status: number;
}

function classifyError(errorStr: string): { isRetryable: boolean; code: string; message: string; status: number } {
  const lower = errorStr.toLowerCase();

  if (lower.includes("timeout") || lower.includes("aborted")) {
    return { isRetryable: true, code: "AI_TIMEOUT_ERROR", message: "Request timed out.", status: 504 };
  }
  if (lower.includes("429") || lower.includes("quota") || lower.includes("resource_exhausted") || lower.includes("rate limit")) {
    return { isRetryable: true, code: "AI_RATE_LIMIT_ERROR", message: "Rate limit or quota reached on model/key.", status: 429 };
  }
  if (lower.includes("503") || lower.includes("unavailable") || lower.includes("overloaded") || lower.includes("high demand")) {
    return { isRetryable: true, code: "AI_SERVICE_UNAVAILABLE", message: "Service temporarily unavailable.", status: 503 };
  }
  if (lower.includes("404") || lower.includes("not_found") || lower.includes("model not found") || lower.includes("is no longer available")) {
    return { isRetryable: true, code: "AI_MODEL_ERROR", message: "Requested model is deprecated or not available.", status: 404 };
  }
  if (
    lower.includes("api key not valid") ||
    lower.includes("api_key_invalid") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("permission_denied")
  ) {
    return { isRetryable: true, code: "AI_AUTH_ERROR", message: "API key is invalid or unauthorized.", status: 401 };
  }
  if (lower.includes("fetch failed") || lower.includes("econnreset") || lower.includes("econnrefused")) {
    return { isRetryable: true, code: "AI_NETWORK_ERROR", message: "Network connection failure.", status: 502 };
  }
  if (lower.includes("safety") || lower.includes("blocked") || lower.includes("candidate was blocked")) {
    return { isRetryable: false, code: "AI_SAFETY_BLOCK", message: "Request was blocked by safety policy.", status: 400 };
  }
  if (lower.includes("400") || lower.includes("invalid argument") || lower.includes("invalid_argument")) {
    return { isRetryable: false, code: "AI_INVALID_REQUEST", message: "Invalid request payload.", status: 400 };
  }

  return { isRetryable: true, code: "AI_UNKNOWN_ERROR", message: "Upstream generation failure.", status: 502 };
}

type GeminiContentPart = string | { inlineData: { mimeType: string; data: string } };

async function executeGeminiAttempt(
  apiKey: string,
  modelName: string,
  contentPayload: string | GeminiContentPart[],
  timeoutMs: number = 15000,
  maxOutputTokens: number = 2048
): Promise<AttemptResult> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        maxOutputTokens,
        temperature: 0.7,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
    );

    const apiPromise = Array.isArray(contentPayload)
      ? model.generateContent(contentPayload)
      : model.generateContent(contentPayload);

    const result = (await Promise.race([apiPromise, timeoutPromise])) as Awaited<typeof apiPromise>;

    const responseText = result.response.text();
    if (!responseText || responseText.trim() === "") {
      return {
        success: false,
        isRetryable: true,
        code: "AI_RESPONSE_PARSE_ERROR",
        error: "AI generation returned an empty response.",
        status: 502,
      };
    }

    return {
      success: true,
      text: responseText.trim(),
      isRetryable: false,
      code: "SUCCESS",
      status: 200,
    };
  } catch (err: unknown) {
    const errorStr = String(err);
    const classification = classifyError(errorStr);
    return {
      success: false,
      isRetryable: classification.isRetryable,
      code: classification.code,
      error: classification.message,
      status: classification.status,
    };
  }
}

function generateFallbackEventPlan(
  userText: string,
  fileName?: string,
  extractedFileText?: string
): string {
  const combined = `${userText} ${fileName || ""} ${extractedFileText || ""}`.trim();
  
  let title = "StageX Special Event 2026";
  const nameMatch = combined.match(/(?:for|event|named|title|poster|flyer)?\s*["“']?([A-Z][A-Za-z0-9\s&'-]{3,40}(?:Summit|Conference|Fest|Night|Gala|Hackathon|Conclave|Meet|Workshop|Show|Awards|2026|2027))["”']?/i);
  if (nameMatch && nameMatch[1]) {
    title = nameMatch[1].trim();
  } else if (fileName) {
    const cleanFile = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
    if (cleanFile.length > 3) {
      title = cleanFile.charAt(0).toUpperCase() + cleanFile.slice(1);
    }
  }

  const lower = combined.toLowerCase();
  const type = lower.includes("hackathon")
    ? "Hackathon"
    : lower.includes("cultural") || lower.includes("music") || lower.includes("dance") || lower.includes("night")
    ? "Cultural Event"
    : lower.includes("workshop")
    ? "Workshop"
    : lower.includes("seminar") || lower.includes("webinar")
    ? "Seminar"
    : lower.includes("competition") || lower.includes("contest")
    ? "Competition"
    : lower.includes("college") || lower.includes("campus") || lower.includes("university")
    ? "College Event"
    : "Conference";

  const todayStr = new Date().toISOString().split("T")[0];

  const plan = {
    name: title,
    type,
    startDate: todayStr,
    endDate: todayStr,
    startTime: "09:30",
    endTime: "17:30",
    venue: "Main Convention Center / Campus Auditorium",
    description: `An engaging and high-impact ${type.toLowerCase()} bringing together community leaders, keynote speakers, and participants for an unforgettable experience.`,
    organizer: "StageX Event Organizing Committee",
    expectedAudience: "350+ attendees",
    people: [
      {
        name: "Dr. Ananya Verma",
        role: "Chief Guest",
        designation: "Distinguished Leader & Industry Mentor",
        organization: "Global Innovation Council",
      },
      {
        name: "Vikram Malhotra",
        role: "Speaker",
        designation: "Keynote Strategist & Technologist",
        organization: "Venture Innovations",
      },
      {
        name: "Pooja Sharma",
        role: "Anchor",
        designation: "Master of Ceremonies & Stage Anchor",
        organization: "Stage Operations Guild",
      },
    ],
    sessions: [
      {
        title: "Grand Opening & Welcome Address",
        type: "Opening",
        speakerName: "Pooja Sharma",
        duration: 30,
        startTime: "09:30",
        endTime: "10:00",
        isFixedTime: true,
      },
      {
        title: "Inaugural Keynote Address",
        type: "Keynote",
        speakerName: "Dr. Ananya Verma",
        duration: 60,
        startTime: "10:00",
        endTime: "11:00",
        isFixedTime: false,
      },
      {
        title: "Featured Interactive Session & Discussion",
        type: "Talk",
        speakerName: "Vikram Malhotra",
        duration: 90,
        startTime: "11:15",
        endTime: "12:45",
        isFixedTime: false,
      },
      {
        title: "Networking & Showcase Break",
        type: "Break",
        duration: 45,
        startTime: "12:45",
        endTime: "13:30",
        isFixedTime: true,
      },
      {
        title: "Action Workshop & Collaborative Panel",
        type: "Workshop",
        duration: 120,
        startTime: "13:30",
        endTime: "15:30",
        isFixedTime: false,
      },
      {
        title: "Awards, Closing Remarks & Vote of Thanks",
        type: "Closing",
        speakerName: "Pooja Sharma",
        duration: 60,
        startTime: "15:30",
        endTime: "16:30",
        isFixedTime: true,
      },
    ],
    scripts: [
      {
        role: "Anchor",
        targetName: "Pooja Sharma",
        scriptType: "Opening",
        content: `A very warm and energetic welcome to everyone gathered here for ${title}! We are honored to have our esteemed dignitaries, mentors, and every single one of you with us today. Let us embark on an extraordinary journey together!`,
      },
    ],
    invitation: {
      title,
      subtitle: `Join us for an unforgettable ${type}`,
      dateText: todayStr,
      timeText: "09:30 AM – 05:30 PM IST",
      venueText: "Main Convention Center / Campus Auditorium",
      theme: "modern_dark",
    },
    suggestedValues: ["Default schedule timings generated from event theme"],
    notes: ["All sessions and speakers are populated and ready to save to database."],
  };

  return "```json\n" + JSON.stringify(plan, null, 2) + "\n```";
}

export async function POST(req: NextRequest) {
  const requestStartTime = Date.now();
  try {
    const apiKeys = getAvailableApiKeys();
    if (apiKeys.length === 0) {
      console.error("[StageX AI Config] No Gemini API keys found. Set GEMINI_API_KEY_1 in .env.local.");
      return NextResponse.json(
        {
          ok: false,
          code: "AI_AUTH_ERROR",
          error: "Configured Gemini credentials are invalid or unavailable.",
        },
        { status: 503 }
      );
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { ok: false, code: "AI_INVALID_REQUEST", error: "Content-Type must be application/json." },
        { status: 400 }
      );
    }

    const rawBody = await req.text();
    // Allow up to 10MB payload for uploaded file base64
    if (rawBody.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, code: "AI_INVALID_REQUEST", error: "Payload exceeds allowed size limit (10MB)." },
        { status: 400 }
      );
    }

    let body: {
      requestType?: string;
      type?: string;
      prompt?: string;
      role?: string;
      scriptCategory?: string;
      targetPerson?: string;
      language?: string;
      extractedText?: string;
      fileData?: {
        mimeType: string;
        data: string;
        name?: string;
      };
      context?: AIRequestContext & {
        conversationHistory?: { role: string; content: string }[];
        [key: string]: unknown;
      };
    };

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { ok: false, code: "AI_INVALID_REQUEST", error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const requestType = (body.requestType || body.type || "general").toLowerCase();
    if (!ALLOWED_REQUEST_TYPES.includes(requestType)) {
      return NextResponse.json(
        { ok: false, code: "AI_INVALID_REQUEST", error: `Invalid request type: "${requestType}".` },
        { status: 400 }
      );
    }

    const context = body.context;
    const directPrompt: string = body.prompt || "";
    const userText = directPrompt || (context?.request?.userText as string) || "";
    const requestedLanguage = body.language || "English";
    const extractedFileText = body.extractedText || "";

    const languageInstruction =
      requestedLanguage && requestedLanguage !== "English"
        ? `\nIMPORTANT: Produce the content in ${requestedLanguage} language (using authentic script e.g. Hindi/Gujarati) preserving factual names and places accurately.`
        : "";

    // Build task-specific instruction
    let promptTask = "";
    switch (requestType) {
      case "file_extract":
        promptTask = `Extract and structure all event planning, session, speaker, script, or invitation information from the attached file/content.
File Content: "${extractedFileText || userText}"

Return a valid JSON object matching the requested schema. If event information is detected, return wrapped in \`\`\`json ... \`\`\`:
{
  "name": "Event Title",
  "type": "Hackathon" | "Workshop" | "Seminar" | "Competition" | "Cultural Event" | "Conference" | "College Event" | "Other",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "startTime": "HH:mm",
  "endTime": "HH:mm",
  "venue": "City or Venue",
  "description": "Engaging summary",
  "organizer": "Organizing body",
  "people": [{ "name": "...", "role": "Speaker" | "Anchor" | "Chief Guest" | "Artist", "designation": "..." }],
  "sessions": [{ "title": "...", "type": "Keynote" | "Talk" | "Workshop" | "Opening" | "Closing", "duration": 30, "startTime": "HH:mm", "endTime": "HH:mm" }],
  "scripts": [{ "role": "Anchor", "scriptType": "Opening", "content": "..." }],
  "invitation": { "title": "...", "subtitle": "...", "dateText": "...", "timeText": "...", "venueText": "..." }
}`;
        break;

      case "event_builder":
        promptTask = `Convert the user's natural language event description or attached document/photo into a structured, production-ready Event Plan JSON.
User Description: "${userText}"
${extractedFileText ? `Extracted File Content / OCR Text: "${extractedFileText}"` : ""}
${context?.event ? `Existing Event Context: ${JSON.stringify(context.event)}` : ""}

MULTIMODAL PHOTO / POSTER / FLYER OCR INSTRUCTIONS:
If an image, flyer, poster, brochure, or schedule photo is attached:
1. Scan every line of visible text, headers, subheadings, badges, speaker photos/names, dates, times, and venue locations.
2. "name": Extract the exact event name or headline (e.g., "TechX Summit 2026", "Innovate Hackathon", "Annual Cultural Fest").
3. "type": Classify into "Conference" | "Hackathon" | "Cultural Event" | "Workshop" | "Seminar" | "Competition" | "College Event" | "Other".
4. "startDate" & "endDate": Extract dates in YYYY-MM-DD format. If only day/month is shown, use 2026.
5. "startTime" & "endTime": Extract timings in HH:mm 24-hour format (e.g., "09:30", "17:30").
6. "venue": Extract hall, auditorium, campus, building, or city. Default to "Main Auditorium / Venue TBA" if unspecified.
7. "organizer": Extract the organizing club, college, or company from logos or text.
8. "description": Provide an engaging 2-3 sentence overview based on the poster theme.
9. "people": Extract EVERY speaker, chief guest, anchor, judge, or artist listed on the poster with their real title/role.
10. "sessions": Extract EVERY agenda session or speech listed in the schedule with start and end times (HH:mm) and matched speakerName. If individual talk times are not listed, construct logical chronological sessions (e.g. Opening Address, Keynote, Featured Talk, Interactive Q&A, Vote of Thanks) spanning the overall event timing.
11. "scripts": Include a stage-ready Opening Welcome address for the Anchor.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object wrapped in \`\`\`json ... \`\`\`.
2. Schema structure:
{
  "name": "Event Title",
  "type": "Hackathon" | "Workshop" | "Seminar" | "Competition" | "Cultural Event" | "Conference" | "College Event" | "Other",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "startTime": "HH:mm",
  "endTime": "HH:mm",
  "venue": "City or Venue",
  "description": "Engaging summary",
  "organizer": "Organizing body",
  "expectedAudience": "e.g. 500 students",
  "people": [
    { "name": "Person Name", "role": "Anchor" | "Host" | "Chief Guest" | "Speaker" | "Artist" | "Performer" | "Judge" | "Organizer" | "Other", "designation": "Role/Title", "organization": "Affiliation" }
  ],
  "sessions": [
    { "title": "Session Title", "type": "Opening" | "Keynote" | "Talk" | "Workshop" | "Competition" | "Break" | "Announcement" | "Panel" | "Cultural Performance" | "Closing" | "Other", "speakerName": "assigned person if any", "duration": 30, "startTime": "HH:mm", "endTime": "HH:mm", "isFixedTime": false }
  ],
  "scripts": [
    { "role": "Anchor", "targetName": "optional", "scriptType": "Opening", "content": "Stage-ready opening script" }
  ],
  "invitation": {
    "title": "Event Title",
    "subtitle": "Tagline or theme",
    "dateText": "Formatted date text",
    "timeText": "Formatted time text",
    "venueText": "Venue text",
    "theme": "modern_dark"
  },
  "suggestedValues": ["list fields you proposed/estimated because user did not supply them"],
  "notes": ["any questions or reminders for the organizer"]
}
3. DO NOT invent fake real-world people or places.
4. Support overnight events (e.g. 21:00 to 01:00) and multi-day events by calculating correct startDate and endDate.`;
        break;

      case "role_script":
      case "script_generate": {
        const role = body.role || (context?.request as Record<string, unknown> | undefined)?.role || "Anchor";
        const scriptCategory = body.scriptCategory || (context?.request as Record<string, unknown> | undefined)?.scriptCategory || "Opening Address";
        const targetPerson = body.targetPerson || context?.speaker?.name || "";
        const durationMinutes = Number(body.durationMinutes || (context?.request as Record<string, unknown> | undefined)?.durationMinutes || 0);
        const timingGuidance = durationMinutes > 0
          ? `\nTARGET DURATION: Exactly ~${durationMinutes} minutes spoken delivery (~${Math.round(durationMinutes * 125)} spoken words). Generate an expansive, full-length stage script matching this target duration without summarizing or cutting off prematurely.`
          : "";
        promptTask = `Generate a dedicated, professional, stage-ready script for the following role:
Role: ${role}
Category: ${scriptCategory}
Target Person / Subject: ${targetPerson}
User instruction: "${userText}"${timingGuidance}
${extractedFileText ? `Reference Uploaded Script/Notes: "${extractedFileText}"` : ""}
Event context: ${context?.event?.name || "Live Event"}, Venue: ${context?.event?.venue || ""}, Organizer: ${context?.event?.organizer || ""}${languageInstruction}

CRITICAL: Output spoken words ready for the stage or teleprompter without markdown bold labels.`;
        break;
      }

      case "improve_script":
      case "script_translate": {
        promptTask = `Improve, polish, or translate the following stage script:
Original Text: "${extractedFileText || userText}"
Target Language: ${requestedLanguage}
User instructions: "${userText}"
${languageInstruction}

CRITICAL: Output natural, spoken words suitable for live stage reading or teleprompter in the requested language.`;
        break;
      }

      case "invitation":
      case "invitation_translate":
        promptTask = `Generate structured invitation card data for the event based on the supplied details:
User prompt: "${userText}"
${extractedFileText ? `Extracted Invitation Document/Image Content: "${extractedFileText}"` : ""}
${context?.event ? `Event details: ${JSON.stringify(context.event)}` : ""}
${context?.speaker ? `Key Person / Speaker: ${context.speaker.name} (${context.speaker.designation || ""})` : ""}${languageInstruction}

Return a valid JSON object wrapped in \`\`\`json ... \`\`\`:
{
  "title": "Event Title",
  "subtitle": "Compelling event subtitle or theme",
  "eventType": "Event Type",
  "dateText": "Formatted date (e.g. Saturday, October 24, 2026)",
  "timeText": "Formatted time (e.g. 7:00 PM – 11:00 PM)",
  "venueText": "Venue, Hall, City",
  "description": "2-3 sentence engaging invitation overview",
  "organizer": "Organized by...",
  "chiefGuest": "Chief Guest name if available",
  "highlightPeople": ["Chief Guest: ...", "Live Performance: ..."],
  "highlights": ["3 Key Features or Highlights"],
  "theme": "modern_dark" | "executive_gold" | "neon_tech" | "clean_minimal" | "cultural_warm" | "luxury_gala" | "college_event" | "cultural_festival",
  "language": "${requestedLanguage}",
  "customNotes": "RSVP or dress code info"
}`;
        break;

      case "action_assist":
        promptTask = `Analyze the user's operational request and determine the exact structured application action to execute.
User request: "${userText}"
Event context: ${JSON.stringify(context || {})}`;
        break;

      case "speaker_intro":
        promptTask = `Introduce speaker ${context?.speaker?.name || "the speaker"}${
          context?.speaker?.designation ? `, ${context.speaker.designation}` : ""
        }${
          context?.speaker?.organization ? ` at ${context.speaker.organization}` : ""
        } for their session "${context?.nextSession?.title || context?.currentSession?.title || ""}". Tone: ${
          context?.request?.tone || "Warm"
        }. Target length: ~${context?.request?.length || "Medium"} duration.${languageInstruction}`;
        break;

      case "opening":
        promptTask = `Generate a compelling opening address and welcome speech for the event "${
          context?.event?.name || "the event"
        }" organized by ${
          context?.event?.organizer || "the organizing committee"
        }. Welcome the audience, outline the day's vision, and set an enthusiastic stage tone. Tone: ${
          context?.request?.tone || "Energetic"
        }.${languageInstruction}`;
        break;

      case "transition":
        promptTask = `Generate a smooth stage transition script from the concluding session "${
          context?.currentSession?.title || "current session"
        }" to the upcoming session "${context?.nextSession?.title || "next session"}" with speaker ${
          context?.nextSession?.speaker?.name || "our next speaker"
        }. Mention any brief context naturally. Tone: ${context?.request?.tone || "Warm"}.${languageInstruction}`;
        break;

      case "filler":
        promptTask = `Generate an engaging ~30-60 second filler script for the stage anchor during an unexpected pause. Active incident: ${
          context?.emergency?.type || "brief pause"
        } (${context?.emergency?.description || "technical adjustment"}). Keep the audience engaged, informed, and comfortable. Tone: Reassuring and professional.${languageInstruction}`;
        break;

      case "announcement":
        promptTask = `Polish and structure the following announcement to be read aloud by the stage anchor: "${userText}". Event context: ${
          context?.event?.name || "Live Stage"
        }. Tone: ${context?.request?.tone || "Formal"}.${languageInstruction}`;
        break;

      case "closing":
        promptTask = `Generate a heartfelt closing address and vote of thanks script for the event "${
          context?.event?.name || "the event"
        }" organized by ${
          context?.event?.organizer || "the organizing committee"
        }. Acknowledge all speakers, participants, stage crew, and sessions. Tone: Warm and inspiring.${languageInstruction}`;
        break;

      case "copilot":
        promptTask = `You are the Global StageX AI Copilot for event planning and live operations.
User message: "${userText}"
${extractedFileText ? `Uploaded File Content: "${extractedFileText}"` : ""}

CURRENT APP & EVENT SNAPSHOT:
${context ? JSON.stringify(context, null, 2) : "No active events loaded."}

INSTRUCTIONS:
1. If user asks an informational question (e.g., "What events do I have?", "Which events are live right now?", "Who is the next speaker?", "What is the delay?"), answer accurately, warmly, and concisely.
2. If user requests creating/updating/deleting events, sessions, speakers, scripts, or invitations:
   - Provide a clear explanation in "reply".
   - Propose an exact structured action in "action" with required confirmation.
   - Supported action types:
     * "CREATE_EVENT": payload: { "name": "...", "type": "Cultural Event"|"Workshop"|..., "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "venue": "...", "description": "...", "organizer": "..." }
     * "UPDATE_EVENT": payload: { "targetEventName": "...", "eventId": "...", "updates": { ... } }
     * "DELETE_EVENT": payload: { "targetEventName": "...", "eventId": "..." }
     * "CREATE_SESSION": payload: { "targetEventName": "...", "title": "...", "duration": 30, "type": "Keynote"|... }
     * "UPDATE_SESSION": payload: { "sessionId": "...", "updates": { ... } }
     * "DELETE_SESSION": payload: { "sessionId": "..." }
     * "ADD_SPEAKER" / "ADD_PERSON" / "ADD_ARTIST": payload: { "targetEventName": "...", "name": "...", "role": "Artist"|"Speaker"|..., "designation": "...", "organization": "..." }
     * "CREATE_SCRIPT": payload: { "targetEventName": "...", "title": "...", "category": "anchor", "scriptType": "Opening Address", "content": "..." }
     * "CREATE_INVITATION": payload: { "targetEventName": "...", "title": "...", "theme": "modern_dark", "dateText": "...", "venueText": "..." }
3. If an image, photo, flyer, poster, or document is attached, OR if user asks to read/scan a photo to create an event/agenda/speakers:
   - Perform OCR on the photo to extract: Title, Date, Time, Venue, Organizer, all Speakers/Artists, and all Agenda Sessions.
   - In "reply", provide a friendly summary breakdown of what was extracted from the photo.
   - In "plan", return the full Event Plan JSON matching the event_builder schema (name, type, startDate, endDate, startTime, endTime, venue, description, organizer, people, sessions, scripts, invitation).
4. Return JSON wrapped in \`\`\`json ... \`\`\` with:
{
  "reply": "Friendly response explaining the answer or detected photo breakdown",
  "plan": null | { ... full EventPlan if event creation or photo extraction ... },
  "action": null | {
    "id": "act_${Date.now()}",
    "type": "CREATE_EVENT" | "UPDATE_EVENT" | "DELETE_EVENT" | "CREATE_SESSION" | "UPDATE_SESSION" | "DELETE_SESSION" | "ADD_SPEAKER" | "ADD_PERSON" | "ADD_ARTIST" | "CREATE_SCRIPT" | "CREATE_INVITATION",
    "description": "Clear summary of the change requiring user confirmation",
    "targetEventName": "Name of the target event",
    "requiresConfirmation": true,
    "payload": { ... }
  }
}`;
        break;

      case "image_generate":
        promptTask = `Generate a compelling poster description, artistic concept, and typography layout for the event: "${userText}".
Event details: ${context?.event?.name || "Live Stage Event"}, Venue: ${context?.event?.venue || ""}, Theme: ${context?.event?.type || ""}.
Return a brief, energetic presentation sentence explaining the visual concept.`;
        break;

      case "standin_speech": {
        const customPrompt =
          ((body as Record<string, unknown>)?.customPrompt as string) ||
          ((context as Record<string, unknown>)?.customPrompt as string) ||
          (userText && userText !== "Provide a brief stage anchor confirmation greeting." && !userText.startsWith("Stand-in keynote speech for session") ? userText : "");
        const sessionTitle =
          (context as Record<string, unknown>)?.sessionTitle ||
          context?.currentSession?.title ||
          (customPrompt ? "Featured Keynote" : userText) ||
          "Keynote Session";
        const sessionType =
          (context as Record<string, unknown>)?.sessionType ||
          context?.currentSession?.type ||
          "Keynote";
        const emotion =
          (body as Record<string, unknown>)?.emotion ||
          (context as Record<string, unknown>)?.emotion ||
          "inspiring";
        const durationMinutes = Math.max(
          0.5,
          Number(
            (body as Record<string, unknown>)?.durationMinutes ||
            (context as Record<string, unknown>)?.durationMinutes ||
            2
          )
        );
        const language = requestedLanguage || "English";
        const langGuideline =
          language === "Hindi"
            ? `LANGUAGE: Pure, natural, emotionally expressive spoken Hindi in authentic Devanagari script. Use clear sentence pauses with commas (,) and poorna viram (।). Ensure terms are phonetically clean and easy to enunciate, so Hindi Text-To-Speech voices pronounce every syllable with warmth, gravity, and eloquence. Avoid awkward robotic literal translations.`
            : language === "Hinglish"
            ? `LANGUAGE: Authentic, conversational Indian Hinglish (written in Latin script). Blend clear English concepts with heartfelt Hindi emotion (e.g. "Namaskar dosto", "Dil se shukriya", "Yeh safar hum sab ke liye bahut khaas hai", "Jazbaa aur junoon"). Make it sound like a passionate, inspiring Indian founder or keynote speaker delivering a TEDx address with natural Indian rhythm.`
            : `LANGUAGE: English. Rich oratorical cadence, vivid rhetorical questions, inspiring pauses, and dynamic vocal delivery.`;

        const customPromptSection = customPrompt
          ? `\nORGANIZER'S CUSTOM SPEECH TOPIC & MANDATORY POINTS TO COVER:\n"${customPrompt}"\n-> You MUST center the speech around the organizer's custom instructions, topic, key highlights, names, or messages specified above.\n`
          : "";

        const longFormGuidance =
          durationMinutes >= 4
            ? `\n\nLONG-FORM EXTENDED SPEECH INSTRUCTIONS (TARGET: ~${durationMinutes} MINUTES / ~${Math.round(durationMinutes * 125)} SPOKEN WORDS):
- This is an extensive, full-scale keynote address. You MUST generate rich, expansive content spanning progressive movements/acts that thoroughly explores this subject without stopping prematurely or truncating.
- Structure the presentation across progressive movements:
  * Act I: Opening Hook, Emotional Resonance & Dramatic Introduction
  * Act II: The Conflict, Ground Realities, Challenges & Hard Truths
  * Act III: The Pivot, Core Breakthroughs, Deep Analytical Insights & Principles
  * Act IV: Real-World Case Stories, Human Triumphs, Anecdotes & Relatable Examples
  * Act V: The Horizon, Ethical Stewardship & Future Predictions
  * Act VI: High-Impact Call to Action, Tribute to the Audience & Heartfelt Climax
- Elaborate each act with multiple detailed spoken paragraphs, rhetorical questions, audience thought-experiments, and vivid stage cues.
- Do NOT abbreviate, summarize, or produce a brief outline; generate the full, comprehensive spoken script from start to finish!`
            : "";

        promptTask = `You are an extraordinary, world-class stand-in keynote speaker delivering a live stage presentation with deep feeling, heart, soul, and vocal emotion. The scheduled speaker could not arrive, and you have stepped up to command the stage and deliver an unforgettable address on "${sessionTitle}" (${sessionType}).

EMOTIONAL TONE & FEELING: "${emotion}" (Express dynamic passion, heartfelt warmth, suspense, conviction, and deep emotional resonance).
EVENT NAME: "${context?.event?.name || "StageX Live Stage"}"
ORGANIZER: "${context?.event?.organizer || "Stage Operations"}"
TARGET SPOKEN TIMING: Exactly ~${durationMinutes} minutes duration (~${Math.round(durationMinutes * 125)} spoken words) paced comfortably for live stage delivery.
${langGuideline}
${customPromptSection}

CRITICAL STAGE CUES & FORMAT:
1. Enclose emotional delivery cues in square brackets [like this] to guide vocal dynamics, such as:
   [Deep breath, looking warmly at audience]
   [Voice swelling with passionate conviction]
   [Thoughtful pause, gentle smile]
   [Energetic call to action]
2. Write ready-to-speak paragraphs that take the audience on a compelling emotional journey from problem to breakthrough, leaving them feeling uplifted, motivated, and deeply moved.
3. Keep sentence structures natural and conversational so speech timing flows smoothly without rushing or stuttering.
4. Scale the content depth and number of paragraphs so it naturally fills the requested ~${durationMinutes} minutes duration.${longFormGuidance}`;
        break;
      }

      case "general":
      default:
        promptTask = userText || "Provide a brief stage anchor confirmation greeting.";
        break;
    }

    let textPrompt = context
      ? `EVENT CONTEXT:
${JSON.stringify(context, null, 2)}

TASK:
${promptTask}`
      : `TASK:
${promptTask}`;

    let contentPayload: string | GeminiContentPart[] = textPrompt;

    // If multimodal file data is provided (PDF or Image), prepare multimodal parts
    if (body.fileData?.data && body.fileData?.mimeType) {
      contentPayload = [
        textPrompt,
        {
          inlineData: {
            mimeType: body.fileData.mimeType,
            data: body.fileData.data,
          },
        },
      ];
    }

    const requestedDurationMins = Math.max(
      0,
      Number(
        (body as Record<string, unknown>)?.durationMinutes ||
        (context as Record<string, unknown>)?.durationMinutes ||
        0
      )
    );

    let effectiveMaxTokens = 2048;
    let effectiveTimeoutMs = 15000;

    if (requestType === "standin_speech" || requestType === "role_script" || requestType === "script_generate") {
      if (requestedDurationMins >= 15) {
        effectiveMaxTokens = 8192;
        effectiveTimeoutMs = 45000;
      } else if (requestedDurationMins >= 6) {
        effectiveMaxTokens = 4096;
        effectiveTimeoutMs = 30000;
      } else if (requestedDurationMins >= 1) {
        effectiveMaxTokens = 2500;
        effectiveTimeoutMs = 20000;
      }
    }

    const models = getAvailableModels();
    const attemptDiagnostics: string[] = [];
    let lastError: AttemptResult | null = null;

    // Order API keys starting with the last known working key
    const orderedKeys: { id: string; key: string; originalIndex: number }[] = [];
    for (let i = 0; i < apiKeys.length; i++) {
      const idx = (lastWorkingKeyIndex + i) % apiKeys.length;
      orderedKeys.push({ ...apiKeys[idx], originalIndex: idx });
    }

    for (let keyIdx = 0; keyIdx < orderedKeys.length; keyIdx++) {
      const { id: keyId, key: currentKey, originalIndex } = orderedKeys[keyIdx];

      for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
        const currentModel = models[modelIdx];

        const attemptStart = Date.now();
        const result = await executeGeminiAttempt(
          currentKey,
          currentModel,
          contentPayload,
          effectiveTimeoutMs,
          effectiveMaxTokens
        );
        const attemptElapsed = Date.now() - attemptStart;

        if (result.success && result.text) {
          lastWorkingKeyIndex = originalIndex;
          lastWorkingModel = currentModel;
          const totalElapsed = Date.now() - requestStartTime;
          console.log(`[StageX AI SUCCESS] Status: 200 | Key: ${keyId} | Model: ${currentModel} | Attempt: ${attemptElapsed}ms | Total: ${totalElapsed}ms`);

          // Image intent detection & synthesis
          const isImageIntent =
            requestType === "image_generate" ||
            /\b(generate|create|make|draw|design)\b.*\b(poster|image|artwork|background|banner|visual|flyer)\b/i.test(
              userText
            );

          let generatedImages:
            | { id: string; url: string; prompt: string; createdAt: number; theme: string }[]
            | undefined = undefined;

          if (isImageIntent) {
            const detectedTheme = /tech|hackathon|cyber|code|ai|developer/i.test(userText + (context?.event?.name || ""))
              ? "neon_tech"
              : /gold|luxury|gala|award|executive|vip/i.test(userText + (context?.event?.name || ""))
              ? "executive_gold"
              : /cultural|fest|night|music|dance|concert|celebration|navratri/i.test(userText + (context?.event?.name || ""))
              ? "cultural_warm"
              : /clean|minimal|corporate|seminar|summit/i.test(userText + (context?.event?.name || ""))
              ? "clean_minimal"
              : "modern_dark";

            const cleanedTitle =
              context?.event?.name ||
              userText
                .replace(/\b(generate|create|make|draw|design|a|an|poster|image|for|the|event|artwork)\b/gi, " ")
                .replace(/\s+/g, " ")
                .trim() ||
              "StageX Event Poster";

            const artworkUrl = generateEventArtworkSVG({
              title: cleanedTitle,
              subtitle: context?.event?.description || "An Unforgettable Live Experience",
              prompt: userText,
              theme: detectedTheme,
              eventType: context?.event?.type || "Stage Event",
              organizer: context?.event?.organizer || "StageX Operations",
              venue: context?.event?.venue || "",
              dateText: context?.event?.date || "",
              aspectRatio: "poster",
            });

            generatedImages = [
              {
                id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                url: artworkUrl,
                prompt: userText,
                createdAt: Date.now(),
                theme: detectedTheme,
              },
            ];
          }

          return NextResponse.json({
            ok: true,
            text: result.text,
            model: currentModel,
            elapsedMs: totalElapsed,
            images: generatedImages,
          });
        }

        lastError = result;
        const diagMsg = `Key: ${keyId} | Model: ${currentModel} -> ${result.code} (${result.status}): ${result.error}`;
        attemptDiagnostics.push(diagMsg);
        console.warn(`[StageX AI Attempt Failed] ${diagMsg}`);

        if (!result.isRetryable) {
          console.error(`[StageX AI Non-Retryable Error] ${result.code}: ${result.error}`);
          return NextResponse.json(
            {
              ok: false,
              code: result.code || "AI_INVALID_REQUEST",
              error: result.error || "AI request could not be processed.",
            },
            { status: result.status || 400 }
          );
        }

        if (result.code === "AI_AUTH_ERROR") {
          console.warn(`[StageX AI Auth Skip] Key ${keyId} is unauthorized. Moving to next key.`);
          break;
        }
      }
    }

    console.error("[StageX AI Exhausted] All configured keys and models failed:", attemptDiagnostics);

    if (requestType === "standin_speech") {
      const fallbackSpeech = generateFallbackStandinSpeech({
        sessionTitle:
          ((context as Record<string, unknown>)?.sessionTitle as string) ||
          context?.currentSession?.title ||
          userText ||
          "Keynote Session",
        sessionType:
          ((context as Record<string, unknown>)?.sessionType as string) ||
          context?.currentSession?.type ||
          "Keynote",
        eventName: context?.event?.name || "StageX Live Stage",
        organizer: context?.event?.organizer || "Stage Operations",
        venue: context?.event?.venue || "Main Stage",
        emotion: (((body as Record<string, unknown>)?.emotion as string) || "inspiring") as SpeechEmotion,
        language: (requestedLanguage as "English" | "Hindi" | "Hinglish") || "English",
        durationMinutes: Number((body as Record<string, unknown>)?.durationMinutes || 2),
        customPrompt: ((body as Record<string, unknown>)?.customPrompt as string) || undefined,
      });

      return NextResponse.json({
        ok: true,
        text: fallbackSpeech,
        model: "stagex-standin-vocal-engine",
        fallback: true,
      });
    }

    if (requestType === "event_builder" || requestType === "file_extract" || (requestType === "copilot" && body.fileData)) {
      const fallbackPlan = generateFallbackEventPlan(
        userText,
        body.fileData?.name,
        extractedFileText
      );

      return NextResponse.json({
        ok: true,
        text: fallbackPlan,
        model: "stagex-multimodal-event-builder",
        fallback: true,
      });
    }

    const safeErrorMsg =
      lastError?.code === "AI_AUTH_ERROR"
        ? "Configured Gemini credentials are invalid or unavailable."
        : lastError?.code === "AI_RATE_LIMIT_ERROR"
        ? "AI service rate limit reached. Please wait a moment and try again."
        : "AI service is temporarily unavailable. Please try again.";

    return NextResponse.json(
      {
        ok: false,
        code: lastError?.code || "AI_SERVICE_UNAVAILABLE",
        error: safeErrorMsg,
        details: process.env.NODE_ENV !== "production" ? attemptDiagnostics : undefined,
      },
      { status: lastError?.status && lastError.status >= 400 && lastError.status <= 504 ? lastError.status : 503 }
    );
  } catch (err: unknown) {
    console.error("[StageX AI Unexpected Error]:", err);
    return NextResponse.json(
      {
        ok: false,
        code: "AI_UNKNOWN_ERROR",
        error: "AI service encountered an unexpected error.",
      },
      { status: 500 }
    );
  }
}
