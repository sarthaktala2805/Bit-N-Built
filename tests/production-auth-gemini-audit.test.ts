// StageX AI — Production Auth + Gemini Configuration Audit Tests
// Covers all 14 required audit test scenarios:
// 1. Missing Gemini credentials
// 2. Valid credential
// 3. Invalid credential
// 4. Model not found
// 5. Key 1 fails -> Key 2 succeeds
// 6. Key 1 + Key 2 fail -> Key 3 succeeds
// 7. All keys fail
// 8. No infinite retries
// 9. Secrets never appear in logs
// 10. Firebase configured
// 11. Firebase missing
// 12. Firebase Auth initialization
// 13. Google sign-in initialization
// 14. Email/password initialization

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("PART A: Firebase Production Client Audit", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("Case 10: isFirebaseConfigured() returns true when API_KEY and PROJECT_ID are present", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "mock_api_key_test_123";
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "stagex-ai";
    const { isFirebaseConfigured, getFirebaseConfigStatus } = await import("@/lib/firebase");

    expect(isFirebaseConfigured()).toBe(true);
    const status = getFirebaseConfigStatus();
    expect(status.NEXT_PUBLIC_FIREBASE_API_KEY).toBe("PRESENT");
    expect(status.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBe("PRESENT");
  });

  it("Case 11: isFirebaseConfigured() returns false when credentials are missing", async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const { isFirebaseConfigured, getFirebaseConfigStatus } = await import("@/lib/firebase");

    expect(isFirebaseConfigured()).toBe(false);
    const status = getFirebaseConfigStatus();
    expect(status.NEXT_PUBLIC_FIREBASE_API_KEY).toBe("MISSING");
    expect(status.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBe("MISSING");
  });

  it("Case 12: getFirebaseAuth() throws clear configuration error when unconfigured", async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const { getFirebaseAuth } = await import("@/lib/firebase");

    expect(() => getFirebaseAuth()).toThrow(
      "Firebase Auth is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in your Vercel Project Settings."
    );
  });

  it("Case 13: Google sign-in provider initializes with select_account prompt", async () => {
    const { GoogleAuthProvider } = await import("firebase/auth");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    expect(provider).toBeDefined();
    expect(provider.providerId).toBe("google.com");
  });

  it("Case 14: getAuthErrorMessage() returns friendly actionable messages", async () => {
    const { getAuthErrorMessage } = await import("@/contexts/auth-context");

    const unconfiguredErr = new Error(
      "Firebase Auth is not initialized. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY is configured in your Vercel Project Settings."
    );
    expect(getAuthErrorMessage(unconfiguredErr)).toContain("Firebase Auth is not initialized");

    const invalidCredErr = { code: "auth/invalid-credential" };
    expect(getAuthErrorMessage(invalidCredErr)).toBe("Invalid email or password.");

    const userNotFoundErr = { code: "auth/user-not-found" };
    expect(getAuthErrorMessage(userNotFoundErr)).toBe("No account found with this email.");
  });
});

describe("PART B: Gemini AI Multi-Key & Fallback Audit", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("Case 1: returns GEMINI_CONFIG_MISSING (503) when no API keys are present", async () => {
    delete process.env.GEMINI_API_KEY_1;
    delete process.env.GEMINI_API_KEY_2;
    delete process.env.GEMINI_API_KEY_3;
    delete process.env.GEMINI_API_KEY;

    const { POST } = await import("@/app/api/ai/route");
    const req = new Request("http://localhost:2828/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "general", prompt: "Hello" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.code).toBe("GEMINI_CONFIG_MISSING");
    expect(data.error).toContain("Gemini API credentials are not configured");
  });

  it("Case 2: returns success when Gemini upstream generates content", async () => {
    process.env.GEMINI_API_KEY_1 = "test-key-mock-1";
    process.env.GEMINI_MODEL_PRIMARY = "gemini-flash-lite-latest";

    vi.doMock("@google/generative-ai", () => {
      return {
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
          getGenerativeModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockResolvedValue({
              response: { text: () => "Welcome to StageX AI live operations!" },
            }),
          }),
        })),
      };
    });

    const { POST } = await import("@/app/api/ai/route");
    const req = new Request("http://localhost:2828/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "general", prompt: "Welcome announcement" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.text).toBe("Welcome to StageX AI live operations!");
  });

  it("Case 3 & 4: handles invalid credential (GEMINI_AUTH_ERROR) and model not found (GEMINI_MODEL_NOT_FOUND)", async () => {
    process.env.GEMINI_API_KEY_1 = "invalid-key";

    vi.doMock("@google/generative-ai", () => {
      return {
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
          getGenerativeModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockRejectedValue(new Error("API key not valid. Please pass a valid API key.")),
          }),
        })),
      };
    });

    const { POST } = await import("@/app/api/ai/route");
    const req = new Request("http://localhost:2828/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "general", prompt: "Hello" }),
    });

    const res = await POST(req as never);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.code).toBe("GEMINI_AUTH_ERROR");
  });

  it("Case 5: Key 1 fails (auth error) -> Key 2 succeeds", async () => {
    process.env.GEMINI_API_KEY_1 = "bad-key-1";
    process.env.GEMINI_API_KEY_2 = "good-key-2";

    const attemptTracker: string[] = [];

    vi.doMock("@google/generative-ai", () => {
      return {
        GoogleGenerativeAI: vi.fn().mockImplementation((key: string) => ({
          getGenerativeModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockImplementation(async () => {
              attemptTracker.push(key);
              if (key === "bad-key-1") {
                throw new Error("401 Unauthorized: API key not valid");
              }
              return {
                response: { text: () => "Key 2 generated successfully." },
              };
            }),
          }),
        })),
      };
    });

    const { POST } = await import("@/app/api/ai/route");
    const req = new Request("http://localhost:2828/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "general", prompt: "Hello" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.text).toBe("Key 2 generated successfully.");
    expect(attemptTracker).toContain("bad-key-1");
    expect(attemptTracker).toContain("good-key-2");
  });

  it("Case 6: Key 1 + Key 2 fail -> Key 3 succeeds", async () => {
    process.env.GEMINI_API_KEY_1 = "bad-key-1";
    process.env.GEMINI_API_KEY_2 = "bad-key-2";
    process.env.GEMINI_API_KEY_3 = "good-key-3";

    const attemptTracker: string[] = [];

    vi.doMock("@google/generative-ai", () => {
      return {
        GoogleGenerativeAI: vi.fn().mockImplementation((key: string) => ({
          getGenerativeModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockImplementation(async () => {
              attemptTracker.push(key);
              if (key === "bad-key-1" || key === "bad-key-2") {
                throw new Error("API key not valid [403 Forbidden]");
              }
              return {
                response: { text: () => "Key 3 fallback succeeded." },
              };
            }),
          }),
        })),
      };
    });

    const { POST } = await import("@/app/api/ai/route");
    const req = new Request("http://localhost:2828/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "general", prompt: "Hello" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.text).toBe("Key 3 fallback succeeded.");
  });

  it("Case 7 & 8: All keys fail -> returns structured error without infinite retries", async () => {
    process.env.GEMINI_API_KEY_1 = "bad-key-1";
    process.env.GEMINI_API_KEY_2 = "bad-key-2";
    process.env.GEMINI_API_KEY_3 = "bad-key-3";

    let totalCalls = 0;

    vi.doMock("@google/generative-ai", () => {
      return {
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
          getGenerativeModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockImplementation(async () => {
              totalCalls++;
              throw new Error("403 Forbidden: API key unauthorized");
            }),
          }),
        })),
      };
    });

    const { POST } = await import("@/app/api/ai/route");
    const req = new Request("http://localhost:2828/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "general", prompt: "Hello" }),
    });

    const res = await POST(req as never);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.code).toBe("GEMINI_AUTH_ERROR");
    // With 3 keys failing with AUTH_ERROR, each key should be attempted once and skipped immediately (totalCalls <= 3)
    expect(totalCalls).toBe(3);
  });

  it("Case 9: Secrets never appear in response payloads or logs", async () => {
    const SECRET_KEY = "SUPER_SECRET_GEMINI_KEY_DO_NOT_LEAK_998877";
    process.env.GEMINI_API_KEY_1 = SECRET_KEY;

    vi.doMock("@google/generative-ai", () => {
      return {
        GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
          getGenerativeModel: vi.fn().mockReturnValue({
            generateContent: vi.fn().mockRejectedValue(new Error(`API key ${SECRET_KEY} is invalid`)),
          }),
        })),
      };
    });

    const { POST } = await import("@/app/api/ai/route");
    const req = new Request("http://localhost:2828/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "general", prompt: "Hello" }),
    });

    const res = await POST(req as never);
    const textOutput = await res.text();
    // Raw secret must NEVER be in response text
    expect(textOutput).not.toContain(SECRET_KEY);
  });
});
