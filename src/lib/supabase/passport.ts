"use client";
/** Personal passport persistence for signed-in users (tables from migration 0003). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { passportsFromRows, passportsToRows, type HistoryRow, type NoteRow, type Passports, type SavedRow } from "../passport/model";

const fail = (what: string, e: { message: string } | null) => { if (e) throw new Error(`${what}: ${e.message}`); };
const SAVED_PK = "user_id,experience_id,item_type,item_id,collection";
const HIST_PK = "user_id,experience_id,item_type,item_id,action";
const NOTE_PK = "user_id,experience_id,item_type,item_id";

/** All experience passports of the account (rows grouped by experience_id). */
export async function loadAccountPassport(sb: SupabaseClient, userId: string): Promise<Passports> {
  const [s, h, n] = await Promise.all([
    sb.from("saved_experiences").select("user_id,experience_id,item_type,item_id,collection").eq("user_id", userId),
    sb.from("experience_history").select("user_id,experience_id,item_type,item_id,action,occurred_on").eq("user_id", userId),
    sb.from("tasting_notes").select("user_id,experience_id,item_type,item_id,rating,note,updated_at").eq("user_id", userId),
  ]);
  fail("saved", s.error); fail("history", h.error); fail("notes", n.error);
  return passportsFromRows((s.data ?? []) as SavedRow[], (h.data ?? []) as HistoryRow[], (n.data ?? []) as NoteRow[]);
}

/** Idempotent full write (used after a guest merge): upserts every row; unique keys prevent duplicates. */
export async function writeAccountPassport(sb: SupabaseClient, userId: string, p: Passports) {
  const rows = passportsToRows(userId, p);
  if (rows.saved.length) fail("saved", (await sb.from("saved_experiences").upsert(rows.saved, { onConflict: SAVED_PK, ignoreDuplicates: true })).error);
  if (rows.history.length) fail("history", (await sb.from("experience_history").upsert(rows.history, { onConflict: HIST_PK })).error);
  if (rows.notes.length) fail("notes", (await sb.from("tasting_notes").upsert(rows.notes, { onConflict: NOTE_PK })).error);
}

const savedKey = (r: SavedRow) => `${r.experience_id}|${r.item_type}|${r.item_id}|${r.collection}`;
const histKey = (r: HistoryRow) => `${r.experience_id}|${r.item_type}|${r.item_id}|${r.action}`;
const noteKey = (r: NoteRow) => `${r.experience_id}|${r.item_type}|${r.item_id}`;

/** Sends only what changed between two snapshots (adds/updates via upsert, removals via delete). */
export async function syncPassportDiff(sb: SupabaseClient, userId: string, prev: Passports, next: Passports) {
  const a = passportsToRows(userId, prev);
  const b = passportsToRows(userId, next);
  const diff = <T,>(x: T[], y: T[], key: (r: T) => string) => {
    const xm = new Map(x.map((r) => [key(r), r]));
    const ym = new Map(y.map((r) => [key(r), r]));
    return {
      upserts: y.filter((r) => JSON.stringify(xm.get(key(r))) !== JSON.stringify(r)),
      deletes: x.filter((r) => !ym.has(key(r))),
    };
  };
  const ds = diff(a.saved, b.saved, savedKey);
  const dh = diff(a.history, b.history, histKey);
  const dn = diff(a.notes, b.notes, noteKey);
  for (const r of ds.deletes) fail("unsave", (await sb.from("saved_experiences").delete().match({ user_id: userId, experience_id: r.experience_id, item_type: r.item_type, item_id: r.item_id, collection: r.collection })).error);
  for (const r of dh.deletes) fail("untry", (await sb.from("experience_history").delete().match({ user_id: userId, experience_id: r.experience_id, item_type: r.item_type, item_id: r.item_id, action: r.action })).error);
  for (const r of dn.deletes) fail("note delete", (await sb.from("tasting_notes").delete().match({ user_id: userId, experience_id: r.experience_id, item_type: r.item_type, item_id: r.item_id })).error);
  if (ds.upserts.length) fail("save", (await sb.from("saved_experiences").upsert(ds.upserts, { onConflict: SAVED_PK, ignoreDuplicates: true })).error);
  if (dh.upserts.length) fail("history", (await sb.from("experience_history").upsert(dh.upserts, { onConflict: HIST_PK })).error);
  if (dn.upserts.length) fail("note", (await sb.from("tasting_notes").upsert(dn.upserts, { onConflict: NOTE_PK })).error);
}

export interface Profile { user_id: string; display_name: string | null; avatar_url: string | null; locale: "en" | "vi"; share_passport: boolean; created_at: string }
export async function loadProfile(sb: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await sb.from("user_profiles").select("user_id,display_name,avatar_url,locale,share_passport,created_at").eq("user_id", userId).maybeSingle();
  fail("profile", error);
  return data as Profile | null;
}
export async function saveProfile(sb: SupabaseClient, userId: string, patch: Partial<Omit<Profile, "user_id" | "created_at">>) {
  fail("profile", (await sb.from("user_profiles").upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() })).error);
}
export async function deleteMyAccount(sb: SupabaseClient) {
  fail("delete account", (await sb.rpc("delete_my_account")).error);
}
