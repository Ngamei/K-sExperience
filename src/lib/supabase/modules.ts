"use client";
/**
 * Supabase read + write for the shared Experience Engine (Bars, Coffee, Spa, Sport; Food has food.ts/admin.ts).
 * Reads: items of the module, establishments tagged with the module (+ attributes, sources), public offerings.
 * Writes: validated with Zod + the module's registry rules before sending; any database error is thrown —
 * callers never report success unless every write succeeded.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { EXPERIENCES, type ExperienceId } from "@/experiences/registry";
import { EstablishmentSchema, ExperienceItemSchema, OfferingSchema, type Establishment, type ExperienceData, type ExperienceItem, type Offering } from "@/engine/schema";
import { establishmentProblems, itemProblems, offeringProblems } from "@/engine/validate";
import {
  fromEstablishmentRow, fromItemRow, fromOfferingRow, toEstablishmentRow, toEstablishmentSourceRows, toItemRow, toOfferingRow, toTagRows,
  type EstablishmentRow, type ItemRow, type OfferingRow, type TagRow,
} from "@/engine/db-rows";
import type { SourceRow } from "@/lib/data/db-rows";
import { READ_COLUMNS } from "./food";

const fail = (what: string, e: { message: string } | null) => { if (e) throw new Error(`${what}: ${e.message}`); };
const zodCheck = <T,>(r: { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }): T => {
  if (!r.success) throw new Error(r.error.issues.map((i) => `${i.path.join(".") || "record"}: ${i.message}`).join("; "));
  return r.data;
};
const moduleOf = (id: ExperienceId) => {
  const m = EXPERIENCES.find((e) => e.id === id);
  if (!m || id === "food") throw new Error(`not a shared-engine module: ${id}`);
  return m;
};
const rules = (problems: string[]) => { if (problems.length) throw new Error(problems.join("; ")); };

export async function fetchSupabaseModule(sb: SupabaseClient, id: ExperienceId): Promise<ExperienceData> {
  const [items, tags] = await Promise.all([
    sb.from("experience_items").select(READ_COLUMNS.experience_items).eq("experience_id", id),
    sb.from("establishment_experiences").select(READ_COLUMNS.establishment_experiences).eq("experience_id", id),
  ]);
  fail("items", items.error); fail("establishment modes", tags.error);
  const itemRows = (items.data ?? []) as unknown as ItemRow[];
  const tagRows = (tags.data ?? []) as unknown as TagRow[];
  const estIds = tagRows.map((t) => t.establishment_id);
  const itemIds = itemRows.map((i) => i.id);
  const [ests, allTags, srcs, offs] = await Promise.all([
    estIds.length ? sb.from("restaurants").select(READ_COLUMNS.restaurants).in("id", estIds) : Promise.resolve({ data: [], error: null }),
    estIds.length ? sb.from("establishment_experiences").select(READ_COLUMNS.establishment_experiences).in("establishment_id", estIds) : Promise.resolve({ data: [], error: null }),
    estIds.length ? sb.from("restaurant_sources").select(READ_COLUMNS.restaurant_sources).in("restaurant_id", estIds) : Promise.resolve({ data: [], error: null }),
    itemIds.length ? sb.from("offerings").select(READ_COLUMNS.offerings).in("item_id", itemIds) : Promise.resolve({ data: [], error: null }),
  ]);
  fail("establishments", ests.error); fail("establishment modes", allTags.error); fail("sources", srcs.error); fail("offerings", offs.error);
  return {
    metadata: { experienceId: id, dataset: itemRows.length ? "master" : "empty", note: "Supabase" },
    items: itemRows.map(fromItemRow),
    establishments: ((ests.data ?? []) as unknown as EstablishmentRow[]).filter((r) => !r.is_sample)
      .map((r) => fromEstablishmentRow(r, (allTags.data ?? []) as unknown as TagRow[], (srcs.data ?? []) as unknown as SourceRow[])),
    offerings: ((offs.data ?? []) as unknown as OfferingRow[]).filter((o) => o.status !== "candidate").map(fromOfferingRow),
  };
}

export async function saveItem(sb: SupabaseClient, id: ExperienceId, item: ExperienceItem) {
  const m = moduleOf(id);
  const i = zodCheck(ExperienceItemSchema.safeParse(item));
  rules(itemProblems(m, i));
  fail("item", (await sb.from("experience_items").upsert(toItemRow(i))).error);
}

/** Upserts the shared establishment row, its sources and its mode tags (existing tags of other modes are kept). */
export async function saveEstablishment(sb: SupabaseClient, id: ExperienceId, est: Establishment) {
  const m = moduleOf(id);
  const e = zodCheck(EstablishmentSchema.safeParse({ ...est, isSample: false }));
  rules(establishmentProblems(m, e));
  const { lon, lat, ...row } = toEstablishmentRow(e);
  fail("establishment", (await sb.from("restaurants").upsert({ ...row, location: `SRID=4326;POINT(${lon} ${lat})` })).error);
  fail("sources (delete)", (await sb.from("restaurant_sources").delete().eq("restaurant_id", e.id)).error);
  fail("sources", (await sb.from("restaurant_sources").insert(toEstablishmentSourceRows(e))).error);
  fail("modes", (await sb.from("establishment_experiences").upsert(toTagRows(e), { onConflict: "establishment_id,experience_id", ignoreDuplicates: true })).error);
}

export async function saveOffering(sb: SupabaseClient, id: ExperienceId, offering: Offering, known: { items: Set<string>; establishments: Set<string> }) {
  const m = moduleOf(id);
  const o = zodCheck(OfferingSchema.safeParse({ ...offering, isSample: false }));
  rules(offeringProblems(m, o, known.items, known.establishments));
  fail("offering", (await sb.from("offerings").upsert(toOfferingRow(o))).error);
}
