"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { effectiveTier, type Tier } from "../membership/plans";

/** The signed-in customer's own membership tier (RLS: own row only). No row → Free. Never a staff permission. */
export async function loadMembership(sb: SupabaseClient, userId: string): Promise<Tier> {
  const { data, error } = await sb.from("user_memberships").select("tier,valid_until").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`membership: ${error.message}`);
  return effectiveTier(true, data) ?? "free";
}
