import { describe, it, expect, beforeEach } from "vitest";
import {
  getStorageKey,
  purgeLegacyDemoData,
  loadFromStorage,
  saveToStorage,
  LEGACY_TEST_KEYS,
  setActiveStorageUserId,
} from "../lib/storage";

describe("Storage Engine & Clean State Isolation", () => {
  // In-memory mock localStorage for Node/Vitest
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key in store) {
      delete store[key];
    }
    // Mock window and localStorage
    (global as unknown as { window: { localStorage: Storage } }).window = {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v;
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          for (const key in store) delete store[key];
        },
        key: (idx: number) => Object.keys(store)[idx] ?? null,
        length: 0,
      } as unknown as Storage,
    };
    Object.defineProperty(window.localStorage, "length", {
      get: () => Object.keys(store).length,
    });
    setActiveStorageUserId(null);
  });

  it("should generate distinct user-scoped storage keys", () => {
    const keyA = getStorageKey("user_A");
    const keyB = getStorageKey("user_B");
    expect(keyA).toBe("stagex-ai:user:user_A:v1");
    expect(keyB).toBe("stagex-ai:user:user_B:v1");
    expect(keyA).not.toBe(keyB);
  });

  it("should purge legacy un-scoped test/demo data keys", () => {
    // Simulate leftover demo keys from previous web testing
    for (const k of LEGACY_TEST_KEYS) {
      store[k] = JSON.stringify({ state: { events: [{ id: "demo_1", name: "Old Demo Event" }] } });
    }

    purgeLegacyDemoData();

    for (const k of LEGACY_TEST_KEYS) {
      expect(store[k]).toBeUndefined();
    }
  });

  it("should provide clean empty state for a new user without demo data", () => {
    const fallback = { events: [], speakers: [], sessions: [] };
    const { state } = loadFromStorage(fallback, "brand_new_user");
    expect(state.events).toEqual([]);
    expect(state.speakers).toEqual([]);
    expect(state.sessions).toEqual([]);
  });

  it("should isolate user data between Account A and Account B", () => {
    const fallback = { events: [] as { id: string; name: string }[] };

    // Account A saves an event
    saveToStorage({ events: [{ id: "ev_1", name: "Account A Custom Event" }] }, "account_A");

    // Account B loads and gets clean empty state (not Account A's event)
    const resultB = loadFromStorage(fallback, "account_B");
    expect(resultB.state.events).toEqual([]);

    // Account A loads and gets their event back
    const resultA = loadFromStorage(fallback, "account_A");
    expect(resultA.state.events).toHaveLength(1);
    expect(resultA.state.events[0].name).toBe("Account A Custom Event");
  });
});
