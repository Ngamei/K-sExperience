/**
 * Imports researched HCMC establishments into the canonical files.
 *
 *   npm run data:restaurants   (reads data/source/hcmc-restaurants.source.json)
 *
 * Writes data/hcmc-restaurants.json and data/dish-restaurant-mapping.json.
 * Rejects: venues outside the current HCMC boundary, unknown dish ids, missing sources,
 * and any link whose evidence cannot justify its status (src/lib/data/evidence.ts). Exits non-zero on error.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { slugify } from "../src/lib/search/normalize";
import path from "node:path";
import { DishRestaurantLinkSchema, RestaurantSchema, type DishRestaurantLink, type Restaurant } from "../src/lib/data/schema";
import { pointInGeometry, type GeoJsonGeometry } from "../src/lib/geo/geo";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
const src = read("data/source/hcmc-restaurants.source.json");
const hcmc = read("data/hcmc-boundary.geojson").features.map((f: { geometry: GeoJsonGeometry }) => f.geometry);
const dishIds = new Set(read("data/vietnamese-dishes.json").dishes.map((d: { id: string }) => d.id));
const date: string = src.metadata.researchedOn;

const errors: string[] = [];

// ---- Merge research batches (data/source/venue-research/batch-*.json) -------------------------
/** A dish entry is a dish id (generic evidence) or an object with its own evidence, price and photo (research exchange format). */
type BatchDish = string | { dishId: string; evidence?: string; url?: string; priceVnd?: { min: number; max: number }; photo?: unknown; status?: string; evidenceType?: string };
type BatchVenue = { id?: string; name: string; address: string; district?: string; dishes: BatchDish[]; sources: string[]; note?: string; styleNote?: boolean; excluded?: string;
  venueType?: string; priceRange?: string; openingHours?: unknown; contact?: unknown; highlights?: string[] };
const geocoded = read("data/source/venue-research/geocoded.json") as Record<string, { failed?: boolean; reason?: string; lon: number; lat: number; precision: "exact" | "street"; ward: string | null }>;
const batchFiles = readdirSync(path.join(root, "data/source/venue-research")).filter((f) => /^batch-[\w-]+\.json$/.test(f)).sort();
const skipped: string[] = [];
const byId = new Map<string, Record<string, unknown> & { dishes: { dishId: string; evidence: string; url: string }[] }>();
for (const r of src.restaurants) byId.set(r.id, r);
for (const f of batchFiles) {
  const batch = read(`data/source/venue-research/${f}`) as { researchedOn: string; venues: BatchVenue[] };
  for (const v of batch.venues) {
    if (v.excluded) { skipped.push(`${v.name} (${v.address}) — ${v.excluded}`); continue; }
    const g = geocoded[`${v.name}|${v.address}|${v.district ?? ""}`];
    if (!g || g.failed) { skipped.push(`${v.name} (${v.address}) — ${g?.reason ?? "not geocoded yet"}`); continue; }
    const id = v.id ?? slugify(`${v.name} ${v.address.split(",")[0]}`); // intake sets id (e.g. a legacy id it merges into)
    const fullAddress = `${v.address.split(",")[0]}${v.district ? `, ${v.district}` : ""}, TP. Hồ Chí Minh`;
    const existing = byId.get(id);
    const dishes = v.dishes.map((d) => typeof d === "string" ? {
      dishId: d,
      evidence: `Listed for this dish by a published HCMC food guide${v.styleNote ? " (regional style not confirmed)" : ""}.${v.note ? " " + v.note : ""}`,
      url: v.sources[0],
    } : { ...d, evidence: d.evidence ?? `Listed for this dish by a published source.${v.note ? " " + v.note : ""}`, url: d.url ?? v.sources[0] });
    if (existing) { existing.dishes.push(...dishes.filter((d) => !existing.dishes.some((e) => e.dishId === d.dishId))); continue; }
    byId.set(id, {
      id,
      name: v.name,
      address: fullAddress,
      neighbourhood: g.ward ?? v.district ?? "TP. Hồ Chí Minh",
      coordinates: [g.lon, g.lat],
      coordinatePrecision: g.precision,
      venueType: v.venueType ?? "eatery",
      ...(v.priceRange ? { priceRange: v.priceRange } : {}),
      ...(v.openingHours ? { openingHours: v.openingHours } : {}),
      ...(v.contact ? { contact: v.contact } : {}),
      ...(v.highlights ? { highlights: v.highlights } : {}),
      sources: [
        ...v.sources.map((url) => ({ title: new URL(url).hostname.replace(/^www\./, ""), url, accessed: batch.researchedOn })),
        { title: "OpenStreetMap / Nominatim (coordinates)", url: "https://www.openstreetmap.org/", accessed: batch.researchedOn },
      ],
      lastVerified: batch.researchedOn,
      dishes,
    });
  }
}
src.restaurants = [...byId.values()];
const restaurants: Restaurant[] = [];
const links: DishRestaurantLink[] = [];

for (const r of src.restaurants) {
  const { dishes, ...venue } = r;
  const candidate = {
    ...venue,
    isSample: false,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`,
    deliveryLinks: venue.deliveryLinks ?? [],
    lastVerified: venue.lastVerified ?? date,
  };
  const parsed = RestaurantSchema.safeParse(candidate);
  if (!parsed.success) { errors.push(`${r.id}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`); continue; }
  if (!hcmc.some((g: GeoJsonGeometry) => pointInGeometry(parsed.data.coordinates, g))) errors.push(`${r.id}: coordinates outside Ho Chi Minh City`);
  if (!parsed.data.sources.some((s) => s.url)) errors.push(`${r.id}: needs at least one source URL`);
  restaurants.push(parsed.data);
  for (const d of dishes ?? []) {
    if (!dishIds.has(d.dishId)) { errors.push(`${r.id}: unknown dish ${d.dishId}`); continue; }
    const link = DishRestaurantLinkSchema.safeParse({
      dishId: d.dishId,
      restaurantId: r.id,
      status: d.status ?? "source-listed",
      isSample: false,
      menuEvidence: { type: d.evidenceType ?? "published-source", note: d.evidence, url: d.url },
      priceVnd: d.priceVnd,
      lastVerified: date,
      // Optional dish-at-place photo (LinkPhotoSchema): must show this exact dish; licence + source required.
      ...((d as { photo?: unknown }).photo ? { photo: (d as { photo?: unknown }).photo } : {}),
    });
    if (!link.success) { errors.push(`${r.id}/${d.dishId}: ${link.error.message}`); continue; }
    links.push(link.data);
  }
}

skipped.forEach((e) => console.log("· skipped", e));
errors.forEach((e) => console.log("✗", e));
if (errors.length) process.exit(1);

writeFileSync(path.join(root, "data/hcmc-restaurants.json"), JSON.stringify({
  metadata: {
    note: "Canonical list of REAL Ho Chi Minh City establishments, generated by scripts/import-restaurants.ts from data/source/hcmc-restaurants.source.json. Every record cites its sources; lastVerified is the date of the desk check. Demonstration venues live in data/samples/ and are never mixed in here.",
    coverage: "Ho Chi Minh City administrative boundary as of 1 July 2025 (former HCMC, Bình Dương and Bà Rịa – Vũng Tàu). Enforced by the importer and `npm run data:validate`.",
  },
  restaurants,
}, null, 2) + "\n");
writeFileSync(path.join(root, "data/dish-restaurant-mapping.json"), JSON.stringify({
  metadata: { note: "Links between dishes and REAL HCMC establishments with evidence levels (src/lib/data/evidence.ts): source-listed = a published source links venue and exact dish; menu-confirmed / directly-confirmed / visit-confirmed require official menu or delivery listing / phone or message / visit evidence. lastVerified = last-checked date." },
  links,
}, null, 2) + "\n");
const perDish = new Map<string, number>();
links.forEach((l) => perDish.set(l.dishId, (perDish.get(l.dishId) ?? 0) + 1));
console.log(`✓ ${restaurants.length} restaurants, ${links.length} dish links, ${perDish.size} dishes covered, ${[...perDish.values()].filter((n) => n >= 5).length} dishes with ≥5 venues`);
