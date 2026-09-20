import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { serializeSession, deserializeSession } from "../lib/firestore/sessions";
import { Session } from "../types";
import { POST } from "../app/api/generate-image/route";
import { NextRequest } from "next/server";

// Mock lib/firebase to keep unit tests isolated
vi.mock("../lib/firebase", () => ({
  db: { type: "mock-firestore" },
  auth: { currentUser: null },
  app: {},
}));

describe("Keyless Image Generation & Session Model Serialization", () => {
  const sampleSession: Session = {
    id: "ses_keyless_01",
    eventId: "ev_event_01",
    title: "Keynote: Next-Gen Quantum AI",
    type: "Keynote",
    speakerId: "spk_99",
    sessionDate: "2026-10-15",
    startTime: "10:00",
    endTime: "11:00",
    startDateTime: 1792058400000,
    endDateTime: 1792062000000,
    duration: 60,
    status: "Upcoming",
    isFixedTime: false,
    originalStartTime: "10:00",
    originalEndTime: "11:00",
    originalSessionDate: "2026-10-15",
    originalStartDateTime: 1792058400000,
    originalEndDateTime: 1792062000000,
    actualStartTime: null,
    actualEndTime: null,
    imageUrl: "data:image/jpeg;base64,mockBase64ImageData",
  };

  describe("Session Model Image Serialization", () => {
    it("should serialize Session with imageUrl", () => {
      const serialized = serializeSession(sampleSession);
      expect(serialized.id).toBe("ses_keyless_01");
      expect(serialized.imageUrl).toBe("data:image/jpeg;base64,mockBase64ImageData");
    });

    it("should serialize Session with null imageUrl when omitted", () => {
      const { imageUrl, ...rest } = sampleSession;
      const serialized = serializeSession(rest as Session);
      expect(serialized.imageUrl).toBeNull();
    });

    it("should deserialize Firestore document data into Session preserving imageUrl", () => {
      const rawData = {
        title: "Keynote: Next-Gen Quantum AI",
        type: "Keynote",
        imageUrl: "data:image/jpeg;base64,mockBase64ImageData",
      };
      const session = deserializeSession(rawData, "ses_keyless_01", "ev_event_01");
      expect(session.id).toBe("ses_keyless_01");
      expect(session.imageUrl).toBe("data:image/jpeg;base64,mockBase64ImageData");
    });
  });

  describe("API Route: /api/generate-image (Keyless & Login-Free)", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should generate vector stage artwork in artwork mode without any token", async () => {
      const req = new NextRequest("http://localhost:3000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Quantum Revolution",
          type: "Keynote",
          mode: "artwork",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.source).toBe("vector_artwork");
      expect(data.imageUrl).toContain("data:image/svg+xml;base64,");
    });

    it("should return photorealistic stage visual without requiring any login or key", async () => {
      const mockBinaryData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("unsplash.com/napi")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              results: [
                {
                  urls: { regular: "https://images.unsplash.com/photo-mock-regular.jpg" },
                  user: { name: "Test Photographer" },
                },
              ],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "image/jpeg" }),
          arrayBuffer: async () => mockBinaryData.buffer,
        });
      });

      const req = new NextRequest("http://localhost:3000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Conference keynote stage",
          mode: "photo",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.source).toBe("photorealistic");
      expect(data.imageUrl).toContain("data:image/jpeg;base64,");
    });

    it("should gracefully fallback to vector artwork when external network search fails", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

      const req = new NextRequest("http://localhost:3000/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Offline Keynote",
          type: "Keynote",
          mode: "photo",
        }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.source).toBe("vector_fallback");
      expect(data.imageUrl).toContain("data:image/svg+xml;base64,");

      // Verify SVG decodes to actual SVG markup rather than corrupted nested data URLs
      const b64 = data.imageUrl.replace("data:image/svg+xml;base64,", "");
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      expect(decoded.trim().startsWith("<svg")).toBe(true);
      expect(decoded).not.toContain("data:image/svg+xml");
    });
  });

  describe("Event Model Poster Serialization & Attachment", () => {
    it("should serialize and deserialize Event with posterUrl", async () => {
      const { serializeEvent, deserializeEvent } = await import("../lib/firestore/events");
      const sampleEvent: any = {
        id: "ev_poster_01",
        name: "StageX Summit",
        type: "Summit",
        status: "Scheduled",
        date: "2026-11-01",
        startDate: "2026-11-01",
        endDate: "2026-11-01",
        startTime: "09:00",
        endTime: "18:00",
        venue: "Hall A",
        posterUrl: "https://images.unsplash.com/photo-sample.jpg",
      };

      const serialized = serializeEvent(sampleEvent);
      expect(serialized.posterUrl).toBe("https://images.unsplash.com/photo-sample.jpg");

      const deserialized = deserializeEvent(serialized, "ev_poster_01");
      expect(deserialized.posterUrl).toBe("https://images.unsplash.com/photo-sample.jpg");
    });

    it("should default posterUrl to null when omitted during deserialization", async () => {
      const { deserializeEvent } = await import("../lib/firestore/events");
      const deserialized = deserializeEvent({ name: "No Poster Event" }, "ev_no_poster");
      expect(deserialized.posterUrl).toBeNull();
    });
  });
});
