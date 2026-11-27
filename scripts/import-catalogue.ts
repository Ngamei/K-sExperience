/**
 * Import a dish catalogue into data/vietnamese-dishes.json.
 *
 *   npm run data:import -- data/source/seed-catalogue.json            (seed, default)
 *   npm run data:import -- path/to/master.csv --dataset master
 *   npm run data:import -- path/to/master.json --dataset master --dry-run
 *
 * --dataset master MERGES into the existing catalogue (src/lib/data/merge.ts): existing IDs, photos,
 * sources and restaurant links are preserved, nothing is deleted. A report is written to docs/IMPORT_REPORT.md.
 *
 * Exits non-zero on any error so CI can gate bad imports.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { importCatalogue, parseCsv } from "../src/lib/data/importer";
import { mergeCatalogues } from "../src/lib/data/merge";
import type { Dish } from "../src/lib/data/schema";
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

let finalDishes: Dish[] = result.dishes;
let finalDataset: "seed" | "master" | "mixed" = dataset;
if (dataset === "master") {
  const existing = (JSON.parse(readFileSync(path.join(root, "data/vietnamese-dishes.json"), "utf8")) as { dishes: Dish[] }).dishes;
  const { dishes: merged, report } = mergeCatalogues(existing, result.dishes, result.provided);
  finalDishes = merged;
  const seedLeft = merged.filter((d) => d.dataset === "seed").length;
  finalDataset = seedLeft ? "mixed" : "master";
  const links = (JSON.parse(readFileSync(path.join(root, "data/dish-restaurant-mapping.json"), "utf8")) as { links: { dishId: string }[] }).links;
  const ids = new Set(merged.map((d) => d.id));
  const orphanLinks = links.filter((l) => !ids.has(l.dishId));
  const rel = path.relative(root, path.resolve(file));
  const md = [
    "# Master catalogue import report",
    "",
    `_Generated ${new Date().toISOString().slice(0, 10)} from \`${rel}\`${dryRun ? " (dry run — nothing written)" : ""}._`,
    "",
    "| | Count |",
    "| --- | ---: |",
    `| Rows in file | ${result.stats.rows} |`,
    `| Rejected rows (errors) | ${result.stats.skipped} |`,
    `| Matched existing dishes | ${report.matched.length} (by id ${report.matched.filter((m) => m.by === "id").length}, by name ${report.matched.filter((m) => m.by === "name").length}) |`,
    `| New dishes added | ${report.added.length} |`,
    `| Existing dishes kept (not in file) | ${report.keptNotInImport.length} |`,
    `| "verified" without sources → pending-review | ${report.downgraded.length} |`,
    `| Total after merge | ${merged.length} |`,
    `| Restaurant links pointing to missing dishes | ${orphanLinks.length} (must be 0) |`,
    "",
    "## Matched (fields changed)",
    ...(report.matched.length ? report.matched.map((m) => `- \`${m.id}\` (${m.by}): ${m.changes.join(", ") || "no change"}`) : ["none"]),
    "",
    "## Added",
    ...(report.added.length ? report.added.map((id) => `- \`${id}\``) : ["none"]),
    "",
    "## Kept, not in import (review)",
    ...(report.keptNotInImport.length ? report.keptNotInImport.map((id) => `- \`${id}\``) : ["none"]),
    "",
    "## Issues",
    ...(result.issues.length ? result.issues.map((x) => `- ${x.level} row ${x.row}${x.name ? ` (${x.name})` : ""}: ${x.message}`) : ["none"]),
    "",
  ].join("\n");
  writeFileSync(path.join(root, "docs/IMPORT_REPORT.md"), md);
  console.log(`merge: matched ${report.matched.length}, added ${report.added.length}, kept ${report.keptNotInImport.length}, orphan links ${orphanLinks.length} → docs/IMPORT_REPORT.md`);
  if (orphanLinks.length) { console.log("✗ refusing to write: restaurant links would be orphaned"); process.exit(1); }
}

if (!dryRun && errors === 0) {
  const out = {
    metadata: { dataset: finalDataset, label: finalDataset === "seed" ? label : finalDataset === "mixed" ? "Master catalogue merged with remaining seed dishes" : label, generatedAt: new Date().toISOString().slice(0, 10), sourceFile: path.relative(root, path.resolve(file)), recordCount: finalDishes.length, seedCount: finalDishes.filter((d) => d.dataset === "seed").length },
    dishes: finalDishes,
  };
  writeFileSync(path.join(root, "data/vietnamese-dishes.json"), JSON.stringify(out, null, 2) + "\n");
  console.log("✓ wrote data/vietnamese-dishes.json");
}
process.exit(errors ? 1 : 0);
