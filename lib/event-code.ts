// StageX AI — Event Code Utilities & Shared Normalization
// Ensures account-independent, globally unique, exactly 6-character uppercase alphanumeric codes.

import { doc, getDoc } from "firebase/firestore";
import * as fb from "@/lib/firebase";

export const EVENT_CODE_LENGTH = 6;
// Unambiguous uppercase alphanumeric charset (excluding easily confused 0, O, 1, I)
export const EVENT_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface EventCodeValidationResult {
  valid: boolean;
  code: string;
  error?: string;
}

/**
 * Normalizes user/URL input into canonical 6-character uppercase alphanumeric event code.
 * Rules:
 * - Trims whitespace
 * - Converts to uppercase
 * - Rejects empty / non-string input
 * - Enforces exact length (6 characters)
 * - Enforces allowed characters (^[A-Z0-9]{6}$)
 * - No fuzzy matching, no guessing, no fallback
 */
export function normalizeEventCode(rawCode: unknown): string {
  if (typeof rawCode !== "string") {
    throw new Error("Event code must be a string.");
  }

  const trimmed = rawCode.trim().toUpperCase();

  if (!trimmed) {
    throw new Error("Event code cannot be empty.");
  }

  if (trimmed.length !== EVENT_CODE_LENGTH) {
    throw new Error(
      `Event code must be exactly ${EVENT_CODE_LENGTH} characters. Received ${trimmed.length} character(s).`
    );
  }

  if (!/^[A-Z0-9]{6}$/.test(trimmed)) {
    throw new Error("Event code must contain only uppercase alphanumeric characters (A-Z, 0-9).");
  }

  return trimmed;
}

/**
 * Non-throwing validator returning structured validation result
 */
export function validateEventCode(rawCode: unknown): EventCodeValidationResult {
  try {
    const code = normalizeEventCode(rawCode);
    return { valid: true, code };
  } catch (err) {
    return { valid: false, code: "", error: (err as Error).message };
  }
}

/**
 * Generates a candidate 6-character random uppercase alphanumeric event code
 */
export function generateCandidateEventCode(): string {
  let result = "";
  const chars = EVENT_CODE_CHARSET;
  for (let i = 0; i < EVENT_CODE_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Checks whether an event code already exists in Cloud Firestore publicEvents collection
 * or is reserved in the deletedCodes tombstone collection (preventing code reuse).
 */
export async function checkEventCodeExistsInFirestore(code: string): Promise<boolean> {
  const normalized = normalizeEventCode(code);

  try {
    const targetDb =
      typeof (fb as Record<string, unknown>).getFirebaseDb === "function"
        ? ((fb as Record<string, unknown>).getFirebaseDb as () => unknown)()
        : (fb as Record<string, unknown>).db;

    if (targetDb) {
      // 1. Check if active in publicEvents
      const docRef = doc(targetDb as never, "publicEvents", normalized);
      const snap = await getDoc(docRef);
      if (snap && typeof snap.exists === "function" && snap.exists()) {
        return true;
      }

      // 2. Check if reserved in deletedCodes tombstone collection
      const deletedRef = doc(targetDb as never, "deletedCodes", normalized);
      const delSnap = await getDoc(deletedRef);
      if (delSnap && typeof delSnap.exists === "function" && delSnap.exists()) {
        return true;
      }
    }
  } catch (err) {
    console.warn(`[EventCode Check Warning for ${normalized}]:`, err);
  }

  return false;
}

/**
 * Generates a globally unique event code by checking the global publicEvents directory.
 * Retries a bounded number of times on collision.
 */
export async function generateUniqueEventCode(maxRetries = 5): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const candidate = generateCandidateEventCode();
    const exists = await checkEventCodeExistsInFirestore(candidate);
    if (!exists) {
      return candidate;
    }
  }

  throw new Error(
    `Failed to generate a globally unique event code after ${maxRetries} attempts due to collisions. Please try again.`
  );
}
