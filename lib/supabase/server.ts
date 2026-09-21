// StageX AI — Supabase Server Client (Storage Administration & Signed URL Generation)
// Uses SUPABASE_SECRET_KEY for server-side authorized storage operations.
// SERVER ONLY: NEVER import this file into React client components or browser bundles.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const STAGEX_STORAGE_BUCKET = "stagex-resources";
export const MAX_RESOURCE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB Free tier bucket limit

function cleanEnv(val?: string): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim().replace(/^["']|["']$/g, "");
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Returns true if server-side Supabase configuration is present.
 */
export function isSupabaseServerConfigured(): boolean {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const secretKey = cleanEnv(process.env.SUPABASE_SECRET_KEY);
  return Boolean(url && secretKey);
}

/**
 * Returns a server-only Supabase client with administrative storage capabilities.
 * Throws if SUPABASE_SECRET_KEY or NEXT_PUBLIC_SUPABASE_URL is missing.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const secretKey = cleanEnv(process.env.SUPABASE_SECRET_KEY);

  if (!url || !secretKey) {
    throw new Error(
      "SUPABASE_CONFIG_MISSING: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is not configured on the server."
    );
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
