// StageX AI — Local Storage Management
// Traces to STAGEX_AI_PRD.md §21
// Supports user-scoped client persistence and purges legacy un-scoped test/demo keys.

export const CURRENT_SCHEMA_VERSION = 1;

// Legacy un-scoped storage keys from prior development/web testing to purge
export const LEGACY_TEST_KEYS = [
  "stagex-ai:v1",
  "stagex-ai:corrupt-backup",
  "stagex-ai:demo",
  "stagex_demo_data",
  "stagex-test-events",
];

let activeStorageUserId: string | null = null;

export function setActiveStorageUserId(userId: string | null): void {
  activeStorageUserId = userId;
}

export function getActiveStorageUserId(): string | null {
  return activeStorageUserId;
}

export interface StorageContainer<T> {
  schemaVersion: number;
  state: T;
  timestamp: number;
}

export function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const test = "__storage_test__";
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a user-scoped storage key so that different Firebase accounts
 * on the same browser do not inherit each other's or old demo data.
 */
export function getStorageKey(userId?: string | null): string {
  const targetId = userId !== undefined ? userId : activeStorageUserId;
  if (targetId) {
    return `stagex-ai:user:${targetId}:v1`;
  }
  return "stagex-ai:v1:clean";
}

/**
 * Purges any legacy un-scoped test/demo keys created during earlier testing.
 */
export function purgeLegacyDemoData(): void {
  if (!isLocalStorageAvailable()) return;
  for (const key of LEGACY_TEST_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export function loadFromStorage<T>(
  fallbackState: T,
  userId?: string | null
): {
  state: T;
  wasCorrupted: boolean;
  error?: string;
} {
  if (!isLocalStorageAvailable()) {
    return { state: fallbackState, wasCorrupted: false };
  }

  // Purge any legacy un-scoped test/demo data left over from earlier development
  purgeLegacyDemoData();

  if (userId !== undefined) {
    setActiveStorageUserId(userId);
  }

  const key = getStorageKey(userId);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return { state: fallbackState, wasCorrupted: false };
  }

  try {
    const parsed = JSON.parse(raw) as StorageContainer<T>;

    if (!parsed || typeof parsed !== "object" || parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      // Schema version mismatch or malformed structure
      const backupKey = `${key}:corrupt-backup`;
      window.localStorage.setItem(backupKey, raw);
      return {
        state: fallbackState,
        wasCorrupted: true,
        error: "Saved data schema version was incompatible and was reset. A backup copy was kept.",
      };
    }

    return { state: parsed.state, wasCorrupted: false };
  } catch {
    // JSON parse error or corruption
    try {
      const backupKey = `${key}:corrupt-backup`;
      window.localStorage.setItem(backupKey, raw);
    } catch {
      // ignore
    }
    return {
      state: fallbackState,
      wasCorrupted: true,
      error: "Saved data could not be read and was reset. A backup copy was kept.",
    };
  }
}

export function saveToStorage<T>(
  state: T,
  userId?: string | null
): { success: boolean; error?: string } {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: "Local storage is not available in this browser." };
  }

  try {
    const key = getStorageKey(userId);
    const container: StorageContainer<T> = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      state,
      timestamp: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(container));
    return { success: true };
  } catch (err: unknown) {
    console.error("StageX LocalStorage save error:", err);
    return {
      success: false,
      error: "Unable to save data locally. Storage quota may have been exceeded.",
    };
  }
}

export function getStorageUsageBytes(userId?: string | null): number {
  if (!isLocalStorageAvailable()) return 0;
  const targetKey = getStorageKey(userId);
  let total = 0;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && (key === targetKey || (!userId && !activeStorageUserId && key.startsWith("stagex-ai")))) {
      const val = window.localStorage.getItem(key);
      total += (key.length + (val ? val.length : 0)) * 2; // UTF-16 approx
    }
  }
  return total;
}

export function resetAllStorage(userId?: string | null): void {
  if (!isLocalStorageAvailable()) return;
  // Always clean legacy test/demo keys
  purgeLegacyDemoData();

  const targetId = userId !== undefined ? userId : activeStorageUserId;
  if (targetId) {
    const userPrefix = `stagex-ai:user:${targetId}`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(userPrefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } else {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("stagex")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  }
}
