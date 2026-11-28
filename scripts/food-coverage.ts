/**
 * Food coverage report (machine-readable) → docs/food-coverage.json + docs/FOOD_COVERAGE.md
 *   npm run data:food-coverage
 * Counts DISTINCT real (non-sample) HCMC venues per canonical dish from public links (status ≠ candidate),
 * using the same real-only availability index as the app. Buckets: 0 · 1–4 · 5+. Totals are reconciled
 * (bucket sums = dish count; every counted venue is inside the HCMC boundary). Priority-area membership is
 * by point-in-polygon on data/neighbourhoods/neighbourhoods.json only. Nothing here is a candidate venue:
 * the output ranks DISHES to scout, never unverified places.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildAvailabilityIndex } from "../src/lib/food/availability";
import { pointInGeometry, type GeoJsonGeometry, type LngLat } from "../src/lib/geo/geo";
import type { Dish, DishRestaurantLink, Restaurant } from "../src/lib/data/schema";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
const dishes: Dish[] = read("data/vietnamese-dishes.json").dishes;
const restaurants: Restaurant[] = read("data/hcmc-restaurants.json").restaurants;
const links: DishRestaurantLink[] = read("data/dish-restaurant-mapping.json").links;
const boundary = read("data/hcmc-boundary.geojson");
const hcmcGeoms: GeoJsonGeometry[] = boundary.features ? boundary.features.map((f: { geometry: GeoJsonGeometry }) => f.geometry) : [boundary.geometry ?? boundary];
const inHcmc = (p: LngLat) => hcmcGeoms.some((g) => pointInGeometry(p, g));
type Area = { id: string; name: { en: string }; searchArea: GeoJsonGeometry };
const areas: Area[] = read("data/neighbourhoods/neighbourhoods.json").neighbourhoods;
const queue: { batchId: string; assignedTo: string; status: string; claims?: { items?: string[]; districts?: string[] } }[] = read("research-exchange/queue.json").batches ?? read("research-exchange/queue.json");

const idx = buildAvailabilityIndex(restaurants, links, { includeSamples: false });
const venuesOf = (dishId: string, { servingNow }: { servingNow: boolean }) =>
  [...new Set((idx.linksByDish.get(dishId) ?? []).filter((l) => !servingNow || l.status !== "temporarily-unavailable").map((l) => l.restaurantId))]
    .filter((id) => { const r = idx.restaurants.get(id); return r && !r.isSample && inHcmc(r.coordinates); });
const bucketOf = (n: number) => (n === 0 ? "0" : n < 5 ? "1-4" : "5+");

// Priority areas (PM request): who may scout there, so research never overlaps GPT-FOOD-001 (outer districts incl. Thủ Đức).
const PRIORITY = [
  { id: "thao-dien", district: "Thủ Đức", owner: "chatgpt (GPT-FOOD-001)" },
  { id: "sala-thu-thiem", district: "Thủ Đức", owner: "chatgpt (GPT-FOOD-001)" },
  { id: "q1-cbd", district: "Quận 1", owner: "claude-code (CC-CBDFOOD-001)" },
  { id: "phu-my-hung", district: "Quận 7", owner: "claude-code (proposed CC-PMHFOOD-001)" },
];
const gptFood = queue.find((q) => q.batchId === "GPT-FOOD-001");

const rows = dishes.map((d) => {
  const v = venuesOf(d.id, { servingNow: true });
  const any = venuesOf(d.id, { servingNow: false });
  const byArea = Object.fromEntries(PRIORITY.map((p) => {
    const a = areas.find((x) => x.id === p.id)!;
    return [p.id, v.filter((id) => pointInGeometry(idx.restaurants.get(id)!.coordinates, a.searchArea)).length];
  }));
  const priced = (idx.linksByDish.get(d.id) ?? []).filter((l) => v.includes(l.restaurantId) && l.priceVnd).length;
  return { id: d.id, nameVi: d.nameVi, nameEn: d.nameEn, dishType: d.dishType, prominence: d.prominence, lunch: d.mealTimes.includes("lunch"),
    venues: v.length, venuesIncludingTemporarilyUnavailable: any.length, bucket: bucketOf(v.length), pricedVenues: priced, byArea };
});

const buckets = { "0": rows.filter((r) => r.bucket === "0"), "1-4": rows.filter((r) => r.bucket === "1-4"), "5+": rows.filter((r) => r.bucket === "5+") };
const realVenues = [...idx.restaurants.values()].filter((r) => !r.isSample);
const linkedVenues = new Set(rows.flatMap((r) => venuesOf(r.id, { servingNow: true })));
const reconciliation = {
  dishes: dishes.length,
  bucketSum: buckets["0"].length + buckets["1-4"].length + buckets["5+"].length,
  dishesWithVenue: buckets["1-4"].length + buckets["5+"].length,
  realVenues: realVenues.length,
  realVenuesOutsideHcmc: realVenues.filter((r) => !inHcmc(r.coordinates)).length,
  venuesWithAtLeastOneDish: linkedVenues.size,
  publicRealLinks: links.filter((l) => !l.isSample && l.status !== "candidate" && idx.restaurants.has(l.restaurantId)).length,
  candidateLinksExcluded: links.filter((l) => l.status === "candidate").length,
  sampleLinksExcluded: links.filter((l) => l.isSample).length,
  temporarilyUnavailableLinksExcluded: links.filter((l) => !l.isSample && l.status === "temporarily-unavailable").length,
  ok: false,
};
reconciliation.ok = reconciliation.bucketSum === reconciliation.dishes && reconciliation.realVenuesOutsideHcmc === 0;

// Scouting priority (first user = weekday lunch near work): lunch dishes, then everyday dishes (prominence 1 = most common),
// then the citywide gap (0 venues before 1–4 before 5+). Every dish with no venue IN THE AREA is a candidate gap.
const scoutRank = (r: (typeof rows)[number]) => (r.lunch ? 0 : 1000) + r.prominence * 100 + (r.bucket === "0" ? 0 : r.bucket === "1-4" ? 10 : 20);
const scouting = PRIORITY.map((p) => {
  const gaps = rows.filter((r) => r.byArea[p.id] === 0).sort((a, b) => scoutRank(a) - scoutRank(b) || a.nameVi.localeCompare(b.nameVi, "vi"));
  const covered = rows.filter((r) => r.byArea[p.id] > 0).length;
  return { area: p.id, name: areas.find((a) => a.id === p.id)!.name.en, formerDistrict: p.district, researchOwner: p.owner,
    overlapsGptFood001: Boolean(gptFood?.claims?.districts?.includes(p.district)),
    dishesWithVenueInArea: covered, topDishesToScout: gaps.slice(0, 15).map((r) => ({ id: r.id, nameVi: r.nameVi, citywideVenues: r.venues, lunch: r.lunch, prominence: r.prominence })) };
});

const generatedFrom = { dishes: "data/vietnamese-dishes.json", venues: "data/hcmc-restaurants.json", links: "data/dish-restaurant-mapping.json", areas: "data/neighbourhoods/neighbourhoods.json", boundary: "data/hcmc-boundary.geojson" };
const out = { report: "food-coverage", version: 1, generatedFrom, rules: "distinct non-sample venues inside the HCMC boundary with a public link (status ≠ candidate, ≠ temporarily-unavailable); buckets 0 · 1-4 · 5+",
  reconciliation, buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])), scouting, dishes: rows };
writeFileSync(path.join(root, "docs/food-coverage.json"), JSON.stringify(out, null, 2) + "\n");

const md = [
  "# Food coverage report", "",
  "Generated by `npm run data:food-coverage` (machine-readable copy: [`food-coverage.json`](food-coverage.json)). Real (non-sample) HCMC venues only, public links only; candidates, samples and temporarily-unavailable links are excluded.", "",
  "## Buckets (distinct venues per dish)", "", "| Venues | Dishes |", "| --- | --- |",
  ...(["0", "1-4", "5+"] as const).map((k) => `| ${k} | ${buckets[k].length} |`), `| **Total** | **${reconciliation.bucketSum}** |`, "",
  "## Reconciliation", "", "| Check | Value |", "| --- | --- |",
  ...Object.entries(reconciliation).map(([k, v]) => `| ${k} | ${v} |`), "",
  "## Dishes with 5+ venues", "", buckets["5+"].sort((a, b) => b.venues - a.venues).map((r) => `${r.nameVi} (${r.venues})`).join(" · "), "",
  "## Dishes with 1–4 venues", "", buckets["1-4"].sort((a, b) => b.venues - a.venues).map((r) => `${r.nameVi} (${r.venues})`).join(" · "), "",
  "## Scouting priorities by area", "",
  "Dishes with no venue inside the area polygon, ranked: lunch dishes first, then everyday dishes (prominence 1), then the citywide gap (0 → 1–4 → 5+ venues). Thảo Điền and Sala are inside GPT-FOOD-001's Thủ Đức claim — these lists are hand-offs to ChatGPT, not Claude Code research.", "",
  ...scouting.flatMap((s) => [`### ${s.name} — ${s.dishesWithVenueInArea} dishes with a venue in the area · research owner: ${s.researchOwner}${s.overlapsGptFood001 ? " · **inside GPT-FOOD-001**" : ""}`, "",
    s.topDishesToScout.map((d, i) => `${i + 1}. ${d.nameVi} (${d.citywideVenues} citywide${d.lunch ? ", lunch" : ""})`).join("\n"), ""]),
].join("\n");
writeFileSync(path.join(root, "docs/FOOD_COVERAGE.md"), md + "\n");
console.log(`✓ docs/food-coverage.json · buckets 0=${buckets["0"].length} 1-4=${buckets["1-4"].length} 5+=${buckets["5+"].length} · reconciled=${reconciliation.ok}`);
if (!reconciliation.ok) process.exit(1);
