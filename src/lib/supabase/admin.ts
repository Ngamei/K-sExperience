"use client";
/**
 * Admin CMS persistence (Supabase). Every write is validated with the same Zod schemas as the
 * importer before it is sent; the database enforces RLS (editors only), evidence rules and the HCMC boundary.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { DishRestaurantLinkSchema, DishSchema, RestaurantSchema, type Dish, type DishRestaurantLink, type Restaurant } from "../data/schema";
import { toDishRow, toLinkRow, toOriginRows, toRestaurantRow, toRestaurantSourceRows } from "../data/db-rows";
import { mergeCatalogues } from "../data/merge";

const check = <T,>(r: { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }): T => {
  if (!r.success) throw new Error(r.error.issues.map((i) => `${i.path.join(".") || "record"}: ${i.message}`).join("; "));
  return r.data;
};
const fail = (what: string, e: { message: string } | null) => { if (e) throw new Error(`${what}: ${e.message}`); };

export async function currentUser(sb: SupabaseClient): Promise<User | null> {
  return (await sb.auth.getUser()).data.user ?? null;
}
export async function isEditor(sb: SupabaseClient, user: User | null): Promise<boolean> {
  if (!user) return false;
  const { data } = await sb.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  return data?.role === "admin" || data?.role === "editor";
}
export async function signInWithEmail(sb: SupabaseClient, email: string) {
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/admin/` } });
  fail("sign-in", error);
}

export async function saveDish(sb: SupabaseClient, dish: Dish) {
  const d = check(DishSchema.safeParse(dish));
  fail("dish", (await sb.from("dishes").upsert(toDishRow(d))).error);
  fail("origins (delete)", (await sb.from("dish_origins").delete().eq("dish_id", d.id)).error);
  fail("origins", (await sb.from("dish_origins").insert(toOriginRows(d))).error);
}

/** Write shape: geography is sent as EWKT; lon/lat are generated columns. */
const toRestaurantWrite = (r: Restaurant) => {
  const { lon, lat, ...rest } = toRestaurantRow(r);
  return { ...rest, location: `SRID=4326;POINT(${lon} ${lat})` };
};
export async function saveRestaurant(sb: SupabaseClient, restaurant: Restaurant) {
  const r = check(RestaurantSchema.safeParse({ ...restaurant, isSample: false }));
  if (!r.sources.length) throw new Error("sources: at least one source is required for a real establishment");
  fail("establishment", (await sb.from("restaurants").upsert(toRestaurantWrite(r))).error);
  fail("sources (delete)", (await sb.from("restaurant_sources").delete().eq("restaurant_id", r.id)).error);
  fail("sources", (await sb.from("restaurant_sources").insert(toRestaurantSourceRows(r))).error);
  // Food establishments are tagged explicitly (migration 0007 removed the implicit tag).
  fail("mode", (await sb.from("establishment_experiences").upsert({ establishment_id: r.id, experience_id: "food" }, { onConflict: "establishment_id,experience_id", ignoreDuplicates: true })).error);
}

export async function saveLink(sb: SupabaseClient, link: DishRestaurantLink) {
  const l = check(DishRestaurantLinkSchema.safeParse({ ...link, isSample: false }));
  fail("dish–establishment link", (await sb.from("dish_restaurant_links").upsert(toLinkRow(l))).error);
}
export async function deleteLink(sb: SupabaseClient, dishId: string, restaurantId: string) {
  fail("delete link", (await sb.from("dish_restaurant_links").delete().eq("dish_id", dishId).eq("restaurant_id", restaurantId)).error);
}

export async function uploadPhoto(sb: SupabaseClient, dishId: string, file: File, meta: { credit: string; license: string; sourceUrl?: string }) {
  if (!meta.credit.trim() || !meta.license.trim()) throw new Error("photo: credit and licence are required");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${dishId}/${Date.now()}.${ext}`;
  fail("upload", (await sb.storage.from("dish-photos").upload(path, file, { contentType: file.type, upsert: false })).error);
  const url = sb.storage.from("dish-photos").getPublicUrl(path).data.publicUrl;
  const { count } = await sb.from("dish_photos").select("*", { count: "exact", head: true }).eq("dish_id", dishId);
  fail("photo record", (await sb.from("dish_photos").insert({ dish_id: dishId, url, credit: meta.credit, license: meta.license, source_url: meta.sourceUrl || null, sort_order: count ?? 0 })).error);
  return url;
}

/** Applies a validated import to the database using the same no-data-loss merge as the CLI. */
export async function applyImport(sb: SupabaseClient, current: Dish[], incoming: Dish[], provided: Record<string, (keyof Dish)[]>) {
  const { dishes, report } = mergeCatalogues(current, incoming, provided);
  const changed = new Set([...report.added, ...report.matched.filter((m) => m.changes.length).map((m) => m.id)]);
  for (const d of dishes.filter((x) => changed.has(x.id))) await saveDish(sb, d);
  return report;
}

export interface AuditEntry { id: number; table_name: string; row_key: string; action: string; changed_by: string | null; changed_at: string }
export async function recentAudit(sb: SupabaseClient, limit = 50): Promise<AuditEntry[]> {
  const { data, error } = await sb.from("content_audit").select("id,table_name,row_key,action,changed_by,changed_at").order("changed_at", { ascending: false }).limit(limit);
  fail("audit", error);
  return (data ?? []) as AuditEntry[];
}
