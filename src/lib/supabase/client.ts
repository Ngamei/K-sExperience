"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase is used only when NEXT_PUBLIC_DATA_MODE=supabase and both public values are set.
 * Only the public anon key is ever used in the browser; the service-role key must never be configured here.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseEnabled = process.env.NEXT_PUBLIC_DATA_MODE === "supabase" && Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
