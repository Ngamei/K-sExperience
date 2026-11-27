/**
 * Import a dish catalogue into data/vietnamese-dishes.json.
 *
 *   npm run data:import -- data/source/seed-catalogue.json            (seed, default)
 *   npm run data:import -- path/to/master.csv --dataset master
 *   npm run data:import -- path/to/master.json --dataset master --dry-run
 *
 * Exits non-zero on any error so CI can gate bad imports.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { importCatalogue, parseCsv } from "../src/lib/data/importer";
import type { Province, Region } from "../src/lib/data/schema";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) ?? "data/source/seed-catalogue.json";
const dataset = (args.includes("--dataset") ? args[args.indexOf("--dataset") + 1] : "seed") as "seed" | "master";
const dryRun = args.includes("--dry-run");
const root = path.resolve(__dirname, "..");

const text = readFileSync(path.resolve(file), "utf8");
let rows: unknown[];
let label = dataset === "seed" ? "SEED DATA — demonstration only, not verified" : "Master catalogue";
if (file.endsWith(".csv")) rows = parseCsv(text);
else {
  const json = JSON.parse(text);
  rows = Array.isArray(json) ? json : json.dishes;
  if (json.label) label = json.label;
}

const { provinces } = JSON.parse(readFileSync(path.join(root, "data/provinces.json"), "utf8")) as { provinces: Province[] };
const { regions } = JSON.parse(readFileSync(path.join(root, "data/regions.json"), "utf8")) as { regions: Region[] };
const result = importCatalogue(rows, { provinces, regions, dataset });

for (const i of result.issues) console.log(`${i.level === "error" ? "✗" : "!"} row ${i.row}${i.name ? ` (${i.name})` : ""}: ${i.message}`);
console.log(`\nRows: ${result.stats.rows}  Imported: ${result.stats.imported}  Skipped: ${result.stats.skipped}`);
const errors = result.issues.filter((i) => i.level === "error").length;

if (!dryRun && errors === 0) {
  const out = {
    metadata: { dataset, label, generatedAt: new Date().toISOString().slice(0, 10), sourceFile: path.relative(root, path.resolve(file)), recordCount: result.dishes.length },
    dishes: result.dishes,
  };
  writeFileSync(path.join(root, "data/vietnamese-dishes.json"), JSON.stringify(out, null, 2) + "\n");
  console.log("✓ wrote data/vietnamese-dishes.json");
}
process.exit(errors ? 1 : 0);
