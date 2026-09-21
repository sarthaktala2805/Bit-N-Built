// StageX AI — Supabase Browser Client Singleton
// Uses public credentials only (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).
// Safe to bundle in client browser code. NEVER exposes secret keys.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

function cleanEnv(val?: string): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim().replace(/^["']|["']$/g, "");
  return trimmed === "" ? undefined : trimmed;
}

let clientInstance: SupabaseClient | null = null;

export function getPublicSupabaseUrl(): string | undefined {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getPublicSupabasePublishableKey(): string | undefined {
  return cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/**
 * Returns true if the public Supabase configuration is present.
 */
export function isSupabaseClientConfigured(): boolean {
  return Boolean(getPublicSupabaseUrl() && getPublicSupabasePublishableKey());
}

/**
 * Returns a browser-safe Supabase client initialized with public credentials.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = getPublicSupabaseUrl();
  const key = getPublicSupabasePublishableKey();

  if (!url || !key) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return clientInstance;
}

export const supabaseClient = getSupabaseClient();
