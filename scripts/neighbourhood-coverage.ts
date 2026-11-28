/**
 * Neighbourhood coverage audit (neighbourhood-first strategy) → docs/NEIGHBOURHOOD_COVERAGE.md
 *   npm run data:neighbourhoods
 * Membership = establishment coordinates inside the PROVISIONAL search polygon in data/neighbourhoods/neighbourhoods.json
 * (never a district name). Exact and street-level (approximate) pins are counted separately. Real records only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pointInGeometry, type GeoJsonGeometry, type LngLat } from "../src/lib/geo/geo";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
type Area = { id: string; tier: number; name: { vi: string; en: string }; searchArea: GeoJsonGeometry & { status: string }; targets?: Record<string, number> };
const areas: Area[] = read("data/neighbourhoods/neighbourhoods.json").neighbourhoods;
const EXPS = ["food", "coffee", "bars", "spa", "sport"] as const;

interface Est { id: string; experience: string; name: string; coordinates: LngLat; precision: string; ward: string; offers: string[]; categories: string[]; priced: number; hours: boolean }
const ests: Est[] = [];
// Food
const food = read("data/vietnamese-dishes.json").dishes as { id: string; dishType: string; mealTimes: string[]; dietary: string[]; category: string }[];
const links = (read("data/dish-restaurant-mapping.json").links as { dishId: string; restaurantId: string; isSample?: boolean; status: string; priceVnd?: unknown }[]).filter((l) => !l.isSample && l.status !== "candidate");
for (const r of read("data/hcmc-restaurants.json").restaurants as { id: string; name: string; isSample?: boolean; coordinates: LngLat; coordinatePrecision?: string; neighbourhood: string; openingHours?: unknown }[]) {
  if (r.isSample) continue;
  const ls = links.filter((l) => l.restaurantId === r.id);
  ests.push({ id: r.id, experience: "food", name: r.name, coordinates: r.coordinates, precision: r.coordinatePrecision ?? "exact", ward: r.neighbourhood, offers: ls.map((l) => l.dishId), categories: [], priced: ls.filter((l) => l.priceVnd).length, hours: Boolean(r.openingHours) });
}
// Modules
const itemCat: Record<string, Record<string, string>> = {};
for (const m of EXPS.filter((e) => e !== "food")) {
  const d = read(`data/experiences/${m}.json`);
  itemCat[m] = Object.fromEntries(d.items.map((i: { id: string; category: string }) => [i.id, i.category]));
  for (const e of d.establishments as { id: string; name: string; isSample?: boolean; coordinates: LngLat; coordinatePrecision?: string; neighbourhood: string; openingHours?: unknown }[]) {
    if (e.isSample) continue;
    const os = (d.offerings as { itemId: string; establishmentId: string; isSample?: boolean; status: string; price?: unknown }[]).filter((o) => o.establishmentId === e.id && !o.isSample && o.status !== "candidate");
    ests.push({ id: e.id, experience: m, name: e.name, coordinates: e.coordinates, precision: e.coordinatePrecision ?? "exact", ward: e.neighbourhood, offers: os.map((o) => o.itemId), categories: [...new Set(os.map((o) => itemCat[m][o.itemId]).filter(Boolean))], priced: os.filter((o) => o.price).length, hours: Boolean(e.openingHours) });
  }
}

const inside = (a: Area, e: Est) => pointInGeometry(e.coordinates, a.searchArea);
const rows = areas.map((a) => {
  const es = ests.filter((e) => inside(a, e));
  const by = (x: string) => es.filter((e) => e.experience === x);
  const per = Object.fromEntries(EXPS.map((x) => [x, { total: by(x).length, exact: by(x).filter((e) => e.precision === "exact").length, street: by(x).filter((e) => e.precision === "street").length }]));
  const wards = [...new Set(es.map((e) => e.ward))].sort();
  const dishes = new Set(by("food").flatMap((e) => e.offers));
  const cats = (x: string) => { const c: Record<string, number> = {}; for (const e of by(x)) for (const k of e.categories) c[k] = (c[k] ?? 0) + 1; return c; };
  return { a, es, per, unique: new Set(es.map((e) => e.id)).size, wards, dishes, cats: { spa: cats("spa"), sport: cats("sport"), bars: cats("bars"), coffee: cats("coffee") }, priced: es.reduce((n, e) => n + e.priced, 0), hours: es.filter((e) => e.hours).length };
});
const inAny = new Set(rows.flatMap((r) => r.es.map((e) => `${e.experience}:${e.id}`)));
const overlaps = areas.flatMap((a, i) => areas.slice(i + 1).map((b) => [a, b, ests.filter((e) => inside(a, e) && inside(b, e)).length] as const)).filter((x) => x[2] > 0);

const fmt = (p: { total: number; exact: number; street: number }) => (p.total ? `${p.total} (${p.exact} exact · ${p.street} approx)` : "0");
const gap = (t: number | undefined, have: number) => (t === undefined ? "—" : `${have}/${t} (gap ${Math.max(0, t - have)})`);
const md = [
  "# Neighbourhood coverage audit",
  "",
  `Generated ${new Date().toISOString().slice(0, 10)} by \`npm run data:neighbourhoods\` from the canonical data. Do not edit by hand.`,
  "",
  "**Method.** An establishment belongs to a neighbourhood only if its coordinates fall inside the neighbourhood's **provisional** search polygon (`data/neighbourhoods/neighbourhoods.json`), never because of a district name. *Exact* = mapped POI/house number; *approx* = street-level pin (house number not located — may sit elsewhere on the street, so membership near an edge is uncertain). Real records only (no samples, no candidates). Targets are the PO's Phase 1 proposals; gaps compare against **all** in-area records, the exact count is the conservative figure.",
  "",
  "## Tier 1 — coverage vs targets (establishments per experience)",
  "",
  "| Neighbourhood | Food | Coffee | Bars | Spa | Sport | Unique venues | Target total |",
  "| --- | --- | --- | --- | --- | --- | ---: | ---: |",
  ...rows.filter((r) => r.a.tier === 1).map((r) => `| ${r.a.name.vi} | ${gap(r.a.targets?.food, r.per.food.total)} | ${gap(r.a.targets?.coffee, r.per.coffee.total)} | ${gap(r.a.targets?.bars, r.per.bars.total)} | ${gap(r.a.targets?.spa, r.per.spa.total)} | ${gap(r.a.targets?.sport, r.per.sport.total)} | ${r.unique} | ${Object.values(r.a.targets ?? {}).reduce((x, y) => x + y, 0)} |`),
  "",
  "## All neighbourhoods — detail",
  "",
  "| Neighbourhood | Tier | Food | Coffee | Bars | Spa | Sport | Dishes with a place here | Priced links | Venues with hours | Current wards (from geocoded records) |",
  "| --- | ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |",
  ...rows.map((r) => `| ${r.a.name.vi} | ${r.a.tier} | ${fmt(r.per.food)} | ${fmt(r.per.coffee)} | ${fmt(r.per.bars)} | ${fmt(r.per.spa)} | ${fmt(r.per.sport)} | ${r.dishes.size} | ${r.priced} | ${r.hours} | ${r.wards.join(", ") || "—"} |`),
  "",
  "## Category-level coverage (establishments offering ≥1 item in the category)",
  "",
  "| Neighbourhood | Spa categories | Sport categories | Bars categories | Coffee categories |",
  "| --- | --- | --- | --- | --- |",
  ...rows.map((r) => `| ${r.a.name.vi} | ${Object.entries(r.cats.spa).map(([k, v]) => `${k} ${v}`).join(", ") || "—"} | ${Object.entries(r.cats.sport).map(([k, v]) => `${k} ${v}`).join(", ") || "—"} | ${Object.entries(r.cats.bars).map(([k, v]) => `${k} ${v}`).join(", ") || "—"} | ${Object.entries(r.cats.coffee).map(([k, v]) => `${k} ${v}`).join(", ") || "—"} |`),
  "",
  "## Outside all 12 areas and overlaps",
  "",
  `- Establishment records (experience × venue) inside at least one area: **${inAny.size} / ${ests.length}**; outside all areas: ${ests.length - inAny.size} (kept — nothing outside the priority areas is removed).`,
  ...(overlaps.length ? overlaps.map(([a, b, n]) => `- Overlap: ${a.name.vi} ∩ ${b.name.vi}: ${n} records (provisional polygons touch; resolve when boundaries are reviewed).`) : ["- No overlaps between provisional areas."]),
  "",
].join("\n");
writeFileSync(path.join(root, "docs/NEIGHBOURHOOD_COVERAGE.md"), md + "\n");
console.log(`✓ docs/NEIGHBOURHOOD_COVERAGE.md — ${areas.length} areas, ${inAny.size}/${ests.length} records inside an area`);
for (const r of rows) console.log(`  ${r.a.id.padEnd(22)} food ${r.per.food.total} coffee ${r.per.coffee.total} bars ${r.per.bars.total} spa ${r.per.spa.total} sport ${r.per.sport.total} | dishes ${r.dishes.size}`);
