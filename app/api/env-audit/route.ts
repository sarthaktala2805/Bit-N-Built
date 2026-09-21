import { NextResponse } from "next/server";

export async function GET() {
  const auditKeys = [
    "GEMINI_API_KEY_1",
    "GEMINI_API_KEY_2",
    "GEMINI_API_KEY_3",
    "GEMINI_API_KEY",
    "GEMINI_MODEL_PRIMARY",
    "GEMINI_MODEL_FALLBACK_1",
    "GEMINI_MODEL_FALLBACK_2",
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];

  const envKeysInProcess = Object.keys(process.env);

  const results: Record<string, {
    status: "PRESENT" | "EMPTY" | "MISSING";
    length: number;
    exactMatch: boolean;
    fuzzyMatches?: string[];
  }> = {};

  for (const expected of auditKeys) {
    const rawVal = process.env[expected];
    const fuzzy = envKeysInProcess.filter(
      (k) => k !== expected && k.trim().toUpperCase() === expected.toUpperCase()
    );

    if (rawVal !== undefined) {
      const trimmed = rawVal.trim();
      results[expected] = {
        status: trimmed.length > 0 ? "PRESENT" : "EMPTY",
        length: trimmed.length,
        exactMatch: true,
      };
    } else {
      results[expected] = {
        status: "MISSING",
        length: 0,
        exactMatch: false,
        fuzzyMatches: fuzzy.length > 0 ? fuzzy : undefined,
      };
    }
  }

  // Check if any process.env key has hidden whitespace or typos
  const relatedEnvKeys = envKeysInProcess
    .filter((k) => k.includes("GEMINI") || k.includes("FIREBASE"))
    .map((k) => ({
      key: JSON.stringify(k),
      valLength: process.env[k]?.length || 0,
    }));

  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || "unknown",
    audit: results,
    detectedRelatedKeys: relatedEnvKeys,
  });
}
