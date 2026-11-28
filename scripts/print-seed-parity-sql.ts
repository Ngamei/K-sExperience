/**
 * KEX-DB-01 seed parity: prints READ-ONLY SQL that compares a database with the canonical JSON
 * (expected counts are computed here from data/). Used by scripts/test-db.sh (local Postgres) and
 * safe to paste into a staging SQL editor — it only selects. Output rows: PARITY PASS|FAIL <check>.
 *   npx tsx scripts/print-seed-parity-sql.ts > parity.sql
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { EXPERIENCES } from "../src/experiences/registry";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
type Est = { id: string; isSample?: boolean; coordinatePrecision?: string };
const dishes: { id: string; spiceLevel?: number }[] = read("data/vietnamese-dishes.json").dishes;
const food: Est[] = read("data/hcmc-restaurants.json").restaurants.filter((r: Est) => !r.isSample);
const links = read("data/dish-restaurant-mapping.json").links.filter((l: { isSample?: boolean }) => !l.isSample);
const est = new Map<string, Est>(food.map((r) => [r.id, r]));
const tags = new Set(food.map((r) => `${r.id}@food`));
let items = 0, offerings = 0;
for (const m of EXPERIENCES.filter((e) => e.id !== "food" && e.implemented)) {
  const d = read(`data/experiences/${m.id}.json`);
  items += d.items.length;
  offerings += d.offerings.filter((o: { isSample?: boolean }) => !o.isSample).length;
  for (const e of d.establishments.filter((x: Est) => !x.isSample)) { if (!est.has(e.id)) est.set(e.id, e); tags.add(`${e.id}@${m.id}`); }
}
const precision = (p: string) => [...est.values()].filter((e) => (e.coordinatePrecision ?? "exact") === p).length;
const checks: [string, string, number][] = [
  ["dishes", "select count(*) from dishes where id <> all(array['kex-unknown-spice','sec-x'])", dishes.length],
  ["dishes with unknown spice stored as NULL (0009)", "select count(*) from dishes where spice_level is null and id <> 'kex-unknown-spice'", dishes.filter((d) => d.spiceLevel === undefined).length],
  ["establishments (restaurants table)", "select count(*) from restaurants where id not in ('test-cafe')", est.size],
  ["establishment ↔ experience tags", "select count(*) from establishment_experiences where establishment_id not in ('test-cafe','pho-hoa-pasteur') or experience_id = 'food'", [...tags].filter((t) => !t.startsWith("pho-hoa-pasteur@") || t.endsWith("@food")).length],
  ["food links", "select count(*) from dish_restaurant_links", links.length],
  ["module items", "select count(*) from experience_items where id not like 'test-%' and id not like 'sec-%'", items],
  ["module offerings", "select count(*) from offerings where item_id not like 'test-%'", offerings],
  ["street-precision pins (0010)", "select count(*) from restaurants where coordinate_precision = 'street'", precision("street")],
  ["building-precision pins (0010)", "select count(*) from restaurants where coordinate_precision = 'building' and id <> 'test-cafe'", precision("building")],
  ["no sample establishments in the database", "select count(*) from restaurants where is_sample", 0],
  ["venue photos (0015)", "select count(*) from venue_photos", read("data/venue-photos.json").photos.length],
];
console.log("-- seed parity (read-only)");
console.log("select * from (values");
console.log(checks.map(([name, q, n]) => `  ((case when (${q}) = ${n} then 'PARITY PASS ' else 'PARITY FAIL ' end) || ${`'${name.replace(/'/g, "''")}: expected ${n}, got '`} || (${q}))`).join(",\n"));
console.log(") t(result);");
