/**
 * Import CSV / JSON into a shared-engine module dataset (non-destructive merge, dry run by default).
 *   npm run data:import-module -- <module> <file> [--kind items|establishments|offerings|bundle] [--write]
 * Without --write nothing changes (dry run). With --write the merged data/experiences/<module>.json is written
 * only if the report has no errors. A report is written to docs/imports/<module>-IMPORT_REPORT.md either way.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EXPERIENCES, type ExperienceId } from "../src/experiences/registry";
import { ExperienceDataSchema } from "../src/engine/schema";
import { importIntoModule, importReportMarkdown, type ImportKind } from "../src/engine/import";

const root = path.resolve(__dirname, "..");
const [id, file, ...rest] = process.argv.slice(2);
const flag = (n: string) => rest.includes(n);
const opt = (n: string) => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
const m = EXPERIENCES.find((e) => e.id === (id as ExperienceId));
if (!m || m.id === "food" || !m.implemented || !file) {
  console.error("usage: npm run data:import-module -- <bars|coffee|spa|sport> <file.csv|file.json> [--kind items|establishments|offerings|bundle] [--write]");
  process.exit(2);
}
const kind = (opt("--kind") ?? (file.endsWith(".json") ? "bundle" : "items")) as ImportKind;
const dataFile = path.join(root, `data/experiences/${m.id}.json`);
const current = ExperienceDataSchema.parse(JSON.parse(readFileSync(dataFile, "utf8")));
const hcmc = JSON.parse(readFileSync(path.join(root, "data/hcmc-boundary.geojson"), "utf8")).features.map((f: { geometry: unknown }) => f.geometry);
const report = importIntoModule(m, current, readFileSync(path.resolve(file), "utf8"), kind, hcmc);
const write = flag("--write") && report.errors.length === 0;
writeFileSync(path.join(root, `docs/imports/${m.id}-IMPORT_REPORT.md`), importReportMarkdown(m, report, path.relative(root, path.resolve(file)), !write) + "\n");
if (write) writeFileSync(dataFile, JSON.stringify(report.merged, null, 2) + "\n");
console.log(`${report.errors.length ? "✗" : "✓"} ${m.id}: ${report.added.length} added, ${report.updated.length} updated, ${report.unchanged.length} unchanged, ${report.errors.length} errors, ${report.warnings.length} warnings — ${write ? "written" : "dry run, nothing written"}`);
report.errors.slice(0, 20).forEach((e) => console.log("  ✗", e));
report.warnings.slice(0, 20).forEach((w) => console.log("  !", w));
if (report.errors.length) process.exit(1);
