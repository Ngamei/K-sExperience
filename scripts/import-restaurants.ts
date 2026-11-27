/**
 * Imports researched HCMC establishments into the canonical files.
 *
 *   npm run data:restaurants   (reads data/source/hcmc-restaurants.source.json)
 *
 * Writes data/hcmc-restaurants.json and data/dish-restaurant-mapping.json.
 * Rejects: venues outside the current HCMC boundary, unknown dish ids, missing sources,
 * and any "verified-available" link without menu evidence. Exits non-zero on error.
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
type BatchVenue = { name: string; address: string; district?: string; dishes: string[]; sources: string[]; note?: string; styleNote?: boolean };
const geocoded = read("data/source/venue-research/geocoded.json") as Record<string, { failed?: boolean; reason?: string; lon: number; lat: number; precision: "exact" | "street"; ward: string | null }>;
const batchFiles = readdirSync(path.join(root, "data/source/venue-research")).filter((f) => /^batch-\d+\.json$/.test(f)).sort();
const skipped: string[] = [];
const byId = new Map<string, Record<string, unknown> & { dishes: { dishId: string; evidence: string; url: string }[] }>();
for (const r of src.restaurants) byId.set(r.id, r);
for (const f of batchFiles) {
  const batch = read(`data/source/venue-research/${f}`) as { researchedOn: string; venues: BatchVenue[] };
  for (const v of batch.venues) {
    const g = geocoded[`${v.name}|${v.address}|${v.district ?? ""}`];
    if (!g || g.failed) { skipped.push(`${v.name} (${v.address}) — ${g?.reason ?? "not geocoded yet"}`); continue; }
    const id = slugify(`${v.name} ${v.address.split(",")[0]}`);
    const fullAddress = `${v.address.split(",")[0]}${v.district ? `, ${v.district}` : ""}, TP. Hồ Chí Minh`;
    const existing = byId.get(id);
    const dishes = v.dishes.map((dishId) => ({
      dishId,
      evidence: `Listed for this dish by a published HCMC food guide${v.styleNote ? " (regional style not confirmed)" : ""}.${v.note ? " " + v.note : ""}`,
      url: v.sources[0],
    }));
    if (existing) { existing.dishes.push(...dishes.filter((d) => !existing.dishes.some((e) => e.dishId === d.dishId))); continue; }
    byId.set(id, {
      id,
      name: v.name,
      address: fullAddress,
      neighbourhood: g.ward ?? v.district ?? "TP. Hồ Chí Minh",
      coordinates: [g.lon, g.lat],
      coordinatePrecision: g.precision,
      venueType: "eatery",
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
      status: d.status ?? "unverified",
      isSample: false,
      menuEvidence: { type: d.evidenceType ?? "published-source", note: d.evidence, url: d.url },
      priceVnd: d.priceVnd,
      lastVerified: date,
    });
    if (!link.success) { errors.push(`${r.id}/${d.dishId}: ${link.error.message}`); continue; }
    if (link.data.status === "verified-available" && link.data.menuEvidence?.type === "published-source")
      errors.push(`${r.id}/${d.dishId}: a published source alone cannot mark a dish verified-available`);
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
  metadata: { note: "Links between dishes and REAL HCMC establishments. 'unverified' = listed by a published source (cited in menuEvidence), not yet confirmed on site or by phone. 'verified-available' requires first-hand evidence (menu photo, official menu, site visit or phone call)." },
  links,
}, null, 2) + "\n");
const perDish = new Map<string, number>();
links.forEach((l) => perDish.set(l.dishId, (perDish.get(l.dishId) ?? 0) + 1));
console.log(`✓ ${restaurants.length} restaurants, ${links.length} dish links, ${perDish.size} dishes covered, ${[...perDish.values()].filter((n) => n >= 5).length} dishes with ≥5 venues`);
