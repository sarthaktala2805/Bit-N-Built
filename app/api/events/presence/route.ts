import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { validateEventCode } from "@/lib/event-code";
import {
  signPresenceToken,
  verifyPresenceToken,
  getActiveAttendeeCount,
  presenceRegistry,
  STALE_PRESENCE_THRESHOLD_MS,
} from "@/lib/presence-service";

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "127.0.0.1";
  return ip;
}

// GET /api/events/presence?code=ST8X9B -> Returns ONLY { ok: true, activeCount: number }
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawCode = searchParams.get("code") || "";
    const val = validateEventCode(rawCode);

    if (!val.valid) {
      return NextResponse.json(
        { ok: false, error: val.error || "Valid 6-character event code required." },
        { status: 400 }
      );
    }

    const eventCode = val.code;
    const activeCount = getActiveAttendeeCount(eventCode);

    return NextResponse.json({
      ok: true,
      eventCode,
      activeCount,
    });
  } catch (err) {
    console.error("[Presence GET Error]:", err);
    return NextResponse.json({ ok: false, error: "Failed to get presence count." }, { status: 500 });
  }
}

// POST /api/events/presence -> { action: "join" | "heartbeat" | "leave", ... }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, eventCode: rawCode, sessionToken, userUid } = body;

    const val = validateEventCode(rawCode);
    if (!val.valid) {
      return NextResponse.json(
        { ok: false, error: val.error || "Valid 6-character event code required." },
        { status: 400 }
      );
    }

    const eventCode = val.code;
    const clientIp = getClientIdentifier(request);
    const now = Date.now();

    // ── ACTION: JOIN ──
    if (action === "join") {
      // Anti-inflation: check if client IP already has an active session for this event
      const clientKey = `${eventCode}:${clientIp}`;
      const existing = presenceRegistry.get(clientKey);

      let sessionId: string;
      if (existing && existing.status === "active" && existing.lastSeenAt >= now - STALE_PRESENCE_THRESHOLD_MS) {
        // Reuse existing session to prevent duplicate count inflation
        sessionId = existing.sessionId;
        existing.lastSeenAt = now;
      } else {
        sessionId = "sess_" + crypto.randomBytes(12).toString("hex");
      }

      const token = signPresenceToken(sessionId, eventCode, clientIp);

      presenceRegistry.set(clientKey, {
        sessionId,
        eventCode,
        clientIp,
        userUid: typeof userUid === "string" && userUid.trim() ? userUid.trim() : "anonymous",
        joinedAt: existing?.joinedAt || now,
        lastSeenAt: now,
        status: "active",
        leftAt: null,
      });

      return NextResponse.json({
        ok: true,
        sessionId,
        sessionToken: token,
        activeCount: getActiveAttendeeCount(eventCode),
      });
    }

    // ── ACTION: HEARTBEAT ──
    if (action === "heartbeat") {
      if (!sessionToken || typeof sessionToken !== "string") {
        return NextResponse.json({ ok: false, error: "Session token required." }, { status: 401 });
      }

      const verification = verifyPresenceToken(sessionToken, eventCode, clientIp);
      if (!verification.valid || !verification.sessionId) {
        return NextResponse.json({ ok: false, error: "Invalid or forged session token." }, { status: 401 });
      }

      const clientKey = `${eventCode}:${clientIp}`;
      const record = presenceRegistry.get(clientKey);

      if (!record || record.sessionId !== verification.sessionId) {
        return NextResponse.json({ ok: false, error: "Session expired or not found." }, { status: 404 });
      }

      // Update heartbeat
      record.lastSeenAt = now;
      record.status = "active";

      return NextResponse.json({
        ok: true,
        activeCount: getActiveAttendeeCount(eventCode),
      });
    }

    // ── ACTION: LEAVE ──
    if (action === "leave") {
      if (!sessionToken || typeof sessionToken !== "string") {
        return NextResponse.json({ ok: false, error: "Session token required." }, { status: 401 });
      }

      const verification = verifyPresenceToken(sessionToken, eventCode, clientIp);
      if (!verification.valid || !verification.sessionId) {
        return NextResponse.json({ ok: false, error: "Invalid or forged session token." }, { status: 401 });
      }

      const clientKey = `${eventCode}:${clientIp}`;
      const record = presenceRegistry.get(clientKey);

      if (record && record.sessionId === verification.sessionId) {
        record.status = "left";
        record.leftAt = now;
      }

      return NextResponse.json({
        ok: true,
        activeCount: getActiveAttendeeCount(eventCode),
      });
    }

    return NextResponse.json({ ok: false, error: "Unknown presence action." }, { status: 400 });
  } catch (err) {
    console.error("[Presence POST Error]:", err);
    return NextResponse.json({ ok: false, error: "Failed to process presence update." }, { status: 500 });
  }
}
