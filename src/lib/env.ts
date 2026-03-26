/**
 * Centralized environment configuration.
 *
 * All client-side env access is consolidated here so that
 * (a) validation happens once at startup, and
 * (b) direct env reads are confined to a single file.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const _meta = (import.meta as any).env ?? {};
const SUPABASE_URL: string = _meta.VITE_SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY: string = _meta.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

export const env = {
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
} as const;
