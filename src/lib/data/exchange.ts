/**
 * Research exchange: the batch format shared by Claude Code and the ChatGPT Research Team, and the pure
 * validation used by `npm run intake` (scripts/intake.ts). Nothing here writes files.
 * See research-exchange/README.md.
 */
import { z } from "zod";
import { normalizeVi, slugify } from "../search/normalize";
import { pointInGeometry, haversineKm, type GeoJsonGeometry, type LngLat } from "../geo/geo";
import { LinkPhotoSchema, OpeningHoursSchema, PRICE_RANGES, VENUE_TYPES } from "./schema";

export const EXCHANGE_EXPERIENCES = ["food", "coffee", "bars", "spa", "sport"] as const;
export const AGENTS = ["claude-code", "chatgpt", "codex", "product-owner"] as const;
const Https = z.string().regex(/^https:\/\/[^\s]+\.[^\s]+/, "must be an https:// URL");
const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");
const Price = z.object({ min: z.number().int().min(1000).max(10_000_000), max: z.number().int().min(1000).max(10_000_000) }).refine((p) => p.min <= p.max, "min must be ≤ max");

export const BatchDishSchema = z.union([
  z.string(),
  z.object({ dishId: z.string(), evidence: z.string().min(10).optional(), url: Https.optional(), priceVnd: Price.optional(), photo: z.unknown().optional() }),
]);
export const BatchOfferingSchema = z.object({
  item: z.string(), evidence: z.string().min(10), url: Https,
  price: z.object({ minVnd: z.number().int().min(1000), maxVnd: z.number().int().max(50_000_000), unit: z.string() }).refine((p) => p.minVnd <= p.maxVnd, "minVnd must be ≤ maxVnd").optional(),
  photo: z.unknown().optional(),
});
export const BatchVenueSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2), address: z.string().min(4), district: z.string().optional(),
  venueType: z.string().optional(), sources: z.array(Https).min(1),
  dishes: z.array(BatchDishSchema).optional(), offerings: z.array(BatchOfferingSchema).optional(),
  lon: z.number().nullable().optional(), lat: z.number().nullable().optional(),
  openingHours: OpeningHoursSchema.nullable().optional(), priceRange: z.enum(PRICE_RANGES).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(), note: z.string().optional(), excluded: z.string().optional(),
  /** Set to true after checking that a same-name venue nearby is a different branch. */
  confirmDistinct: z.boolean().optional(),
});
export const BatchSchema = z.object({
  batchId: z.string().regex(/^(CC|GPT|CX|PO)-[A-Z]+-\d{3}$/, "e.g. GPT-FOOD-001 (agent prefix, scope, number)"),
  experience: z.enum(EXCHANGE_EXPERIENCES),
  kind: z.enum(["venues", "catalogue"]),
  agent: z.enum(AGENTS),
  researchedOn: Day,
  method: z.string().min(10),
  venues: z.array(BatchVenueSchema).optional(),
  dishes: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type Batch = z.infer<typeof BatchSchema>;
export type BatchVenue = z.infer<typeof BatchVenueSchema>;

export const ID_RULES = {
  dish: "slug of nameVi without diacritics (slugify), unique; regional variants get their own id (e.g. pho-bo-nam-dinh), linked by `family`. Existing ids never change.",
  establishment: "slug of `<name> <house number + street>` (e.g. bun-cha-145-145-bui-vien); the same venue in another batch merges into the same id. Branches are separate establishments.",
  moduleItem: "slug of the English or Vietnamese name, unique within the experience (e.g. ca-phe-trung).",
  offering: "<item or dish id>@<establishment id> — one record per pair; evidence only moves up (src/lib/data/evidence.ts STATUS_RANK), except a newer temporarily-unavailable.",
  batch: "<AGENT>-<SCOPE>-<NNN>, AGENT = CC (Claude Code) | GPT (ChatGPT) | CX (Codex) | PO; e.g. CC-FOOD-009, GPT-CAT-001.",
};

/** Same rule as scripts/import-restaurants.ts. */
export const establishmentId = (name: string, address: string) => slugify(`${name} ${address.split(",")[0]}`);
const streetOf = (address: string) => normalizeVi(address.split(",")[0]).replace(/^[\d/a-z]*\d[\d/a-z]*\s+/, "").replace(/^(duong|so)\s+/, "").trim();
const numberOf = (address: string) => (normalizeVi(address.split(",")[0]).match(/^[\d/]+[a-z]?/) ?? [""])[0];

export interface ExistingEstablishment { id: string; experience: string; name: string; address: string; coordinates: LngLat }
export interface ValidationCtx {
  dishIds: Set<string>;
  moduleItems: Record<string, Set<string>>;
  establishments: ExistingEstablishment[];
  hcmc: GeoJsonGeometry[];
}
export interface VenueVerdict {
  name: string; id: string; decision: "accept" | "reject";
  /** "new" or "merge" (same id already exists → offerings are added, evidence never weakened). */
  action: "new" | "merge" | "none";
  reasons: string[]; warnings: string[]; offerings: number; priced: number;
}

/** Schema, references, sources, prices, media, coordinates and duplicates for one venues batch. Geocoding is checked separately. */
export function validateVenues(batch: Batch, ctx: ValidationCtx): VenueVerdict[] {
  const seen = new Set<string>();
  return (batch.venues ?? []).map((v) => {
    let id = v.id ?? establishmentId(v.name, v.address);
    const reasons: string[] = [], warnings: string[] = [];
    if (v.excluded) return { name: v.name, id, decision: "reject" as const, action: "none" as const, reasons: [`excluded by researcher: ${v.excluded}`], warnings, offerings: 0, priced: 0 };
    if (seen.has(id)) reasons.push("duplicate venue within this batch");
    seen.add(id);
    let offerings = 0, priced = 0;
    if (batch.experience === "food") {
      if (!v.dishes?.length) reasons.push("no dishes — a Food venue needs at least one dish with evidence");
      for (const d of v.dishes ?? []) {
        const dishId = typeof d === "string" ? d : d.dishId;
        if (!ctx.dishIds.has(dishId)) { reasons.push(`unknown dish id "${dishId}" (see contract/vocabularies.json → food.dishIds)`); continue; }
        offerings++;
        if (typeof d !== "string" && d.priceVnd) priced++;
        if (typeof d !== "string" && d.photo !== undefined) {
          const p = LinkPhotoSchema.safeParse(d.photo);
          if (!p.success) reasons.push(`photo for ${dishId}: ${p.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
        }
      }
      if (v.venueType && !(VENUE_TYPES as readonly string[]).includes(v.venueType)) reasons.push(`unknown venueType "${v.venueType}" (${VENUE_TYPES.join(", ")})`);
    } else {
      const items = ctx.moduleItems[batch.experience] ?? new Set();
      if (!v.offerings?.length) reasons.push("no offerings — each venue needs at least one item with evidence");
      for (const o of v.offerings ?? []) {
        if (!items.has(o.item)) { reasons.push(`unknown ${batch.experience} item "${o.item}"`); continue; }
        offerings++;
        if (o.price) priced++;
        if (o.photo !== undefined) {
          const p = LinkPhotoSchema.safeParse(o.photo);
          if (!p.success) reasons.push(`photo for ${o.item}: ${p.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
        }
      }
    }
    if (v.lon != null && v.lat != null && ctx.hcmc.length && !ctx.hcmc.some((g) => pointInGeometry([v.lon!, v.lat!], g))) reasons.push("coordinates are outside Ho Chi Minh City");
    if ((v.lon == null) !== (v.lat == null)) reasons.push("give both lon and lat, or neither");
    if (v.openingHours && !v.sources.length) reasons.push("opening hours need a source");

    // duplicates against existing establishments
    // Same name + same house number and street = the same place, even when its legacy id differs from the slug rule.
    const sameRecord = ctx.establishments.find((e) => e.id !== id && normalizeVi(e.name) === normalizeVi(v.name) && numberOf(e.address) !== "" && numberOf(e.address) === numberOf(v.address) && streetOf(e.address) === streetOf(v.address));
    if (sameRecord && !v.id) id = sameRecord.id;
    const exact = ctx.establishments.find((e) => e.id === id);
    let action: VenueVerdict["action"] = exact ? "merge" : "new";
    if (exact && exact.experience !== batch.experience && batch.experience !== "food") warnings.push(`same id exists in ${exact.experience}; the venue will be tagged for both experiences`);
    if (!exact) {
      const nName = normalizeVi(v.name);
      for (const e of ctx.establishments) {
        const sameName = normalizeVi(e.name) === nName || normalizeVi(e.name).includes(nName) || nName.includes(normalizeVi(e.name));
        const sameAddress = streetOf(e.address) === streetOf(v.address) && numberOf(e.address) === numberOf(v.address) && numberOf(v.address) !== "";
        const near = v.lon != null && v.lat != null && haversineKm(e.coordinates, [v.lon, v.lat]) < 0.15;
        if (sameAddress || (sameName && near)) {
          if (v.confirmDistinct) warnings.push(`similar to existing ${e.id} — confirmed distinct by researcher`);
          else { reasons.push(`possible duplicate of existing establishment ${e.id} (${e.name}, ${e.address}) — use the same name/address to merge, or set confirmDistinct`); action = "none"; }
          break;
        }
      }
    }
    return { name: v.name, id, decision: reasons.length ? "reject" as const : "accept" as const, action: reasons.length ? "none" as const : action, reasons, warnings, offerings, priced };
  });
}

/** Geocode sanity: the matched place must be on the stated street and near the stated former district. */
export function geocodeProblem(v: Pick<BatchVenue, "address" | "district">, g: { lon?: number; lat?: number; failed?: boolean; reason?: string; displayName?: string } | undefined, districtCentres: Record<string, LngLat>): string | null {
  if (!g || g.failed || g.lon === undefined || g.lat === undefined) return `not geocoded: ${g?.reason ?? "no result"}`;
  const street = streetOf(v.address);
  if (street && g.displayName && !normalizeVi(g.displayName).includes(street)) return `geocoder matched "${g.displayName}", which is not on ${v.address.split(",")[0]}`;
  const c = v.district ? districtCentres[v.district] : undefined;
  if (c && haversineKm(c, [g.lon, g.lat]) > 6) return `geocoded ${haversineKm(c, [g.lon, g.lat]).toFixed(1)} km from ${v.district}`;
  return null;
}
