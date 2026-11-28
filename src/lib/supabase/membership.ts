"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_MEMBER_TIER, effectiveTier, foundingRefusalOf, type FoundingRefusal, type Tier } from "../membership/plans";

/**
 * The signed-in customer's own membership tier (RLS: own row only). No row or an expired row → DEFAULT_MEMBER_TIER
 * (Plus during development). Never a staff permission.
 */
export async function loadMembership(sb: SupabaseClient, userId: string): Promise<Tier> {
  const { data, error } = await sb.from("user_memberships").select("tier,valid_until").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`membership: ${error.message}`);
  return effectiveTier(true, data) ?? DEFAULT_MEMBER_TIER;
}

/** Claim a Founding Member place (RPC claim_founding_membership, 0016). Refusals come back as a reason, not a throw. */
export async function claimFoundingMembership(sb: SupabaseClient): Promise<{ ok: true; validUntil: string } | { ok: false; reason: FoundingRefusal | "error"; message: string }> {
  const { data, error } = await sb.rpc("claim_founding_membership");
  if (error) return { ok: false, reason: foundingRefusalOf(error.message) ?? "error", message: error.message };
  return { ok: true, validUntil: (data as { valid_until: string }).valid_until };
}
/** Remaining Founding places — a count only (RPC founding_places_left); null when off or unreadable. */
export async function loadFoundingPlacesLeft(sb: SupabaseClient): Promise<number | null> {
  const { data, error } = await sb.rpc("founding_places_left");
  return error || data === null || data === undefined ? null : Number(data);
}

/** Complete menu unlocks used this billing period and the quota (Infinity = unlimited) — RPC menu_unlock_usage (0016). */
export async function loadMenuUnlockUsage(sb: SupabaseClient): Promise<{ used: number; limit: number; periodStart: string; enforced: boolean }> {
  const { data, error } = await sb.rpc("menu_unlock_usage");
  if (error) throw new Error(`menu unlocks: ${error.message}`);
  const d = data as { used: number; limit: number | null; period_start: string; enforced: boolean };
  return { used: Number(d.used), limit: d.limit === null ? Infinity : Number(d.limit), periodStart: d.period_start, enforced: !!d.enforced };
}
