/**
 * Research pipeline for a shared-engine module (Coffee first; same for Bars, Spa, Sport):
 *   data/source/experiences/<module>/catalogue.json   items with sources (no prices)
 *   data/source/experiences/<module>/batch-*.json     researched venues: sources + offerings (item + evidence)
 *   data/source/experiences/<module>/geocoded.json    `node scripts/geocode-venue-research.mjs data/source/experiences/<module>`
 * → merged non-destructively into data/experiences/<module>.json through the module importer + validators.
 *   npm run data:research -- <module> [--dry-run]
 * Venues that failed geocoding or are marked "excluded" are skipped and listed in the report — never guessed.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EXPERIENCES, type ExperienceId } from "../src/experiences/registry";
import { ExperienceDataSchema } from "../src/engine/schema";
import { importIntoModule, importReportMarkdown } from "../src/engine/import";

const root = path.resolve(__dirname, "..");
const [id, ...rest] = process.argv.slice(2);
const m = EXPERIENCES.find((e) => e.id === (id as ExperienceId));
if (!m || m.id === "food" || !m.implemented) { console.error("usage: npm run data:research -- <bars|coffee|spa|sport> [--dry-run]"); process.exit(2); }
const dir = path.join(root, "data/source/experiences", m.id);
const read = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8"));
const catalogue = existsSync(path.join(dir, "catalogue.json")) ? read("catalogue.json") : { items: [] };
const geo: Record<string, { lon?: number; lat?: number; precision?: string; ward?: string | null; failed?: boolean; reason?: string }> = existsSync(path.join(dir, "geocoded.json")) ? read("geocoded.json") : {};

interface Venue { id: string; name: string; address: string; district?: string; venueType: string; sources: string[]; attributes?: Record<string, unknown>; openingHours?: unknown; priceRange?: string;
  offerings: { item: string; evidence: string; url: string; price?: { minVnd: number; maxVnd: number; unit: string }; photo?: unknown }[]; excluded?: string }
const skipped: string[] = [];
const establishments: unknown[] = [];
const offerings: unknown[] = [];
for (const f of readdirSync(dir).filter((x) => /^batch-[\w-]+\.json$/.test(x)).sort()) {
  const batch = read(f) as { researchedOn: string; venues: Venue[] };
  for (const v of batch.venues) {
    if (v.excluded) { skipped.push(`${v.name}: ${v.excluded}`); continue; }
    const g = geo[`${v.name}|${v.address}|${v.district ?? ""}`];
    if (!g || g.failed || g.lon === undefined || g.lat === undefined) { skipped.push(`${v.name}: not geocoded (${g?.reason ?? "run the geocoder"})`); continue; }
    establishments.push({
      id: v.id, name: v.name, isSample: false, address: v.address, neighbourhood: g.ward ?? v.district ?? "TP. Hồ Chí Minh",
      coordinates: [g.lon, g.lat], coordinatePrecision: g.precision, venueType: v.venueType,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name}, ${v.address}`)}`,
      deliveryLinks: [], experiences: [m.id], attributes: v.attributes ?? {},
      ...(v.openingHours ? { openingHours: v.openingHours } : {}), ...(v.priceRange ? { priceRange: v.priceRange } : {}),
      sources: [
        ...v.sources.map((url) => ({ title: new URL(url).hostname.replace(/^www\./, ""), url, accessed: batch.researchedOn })),
        { title: "OpenStreetMap / Nominatim (coordinates)", url: "https://www.openstreetmap.org/", accessed: batch.researchedOn },
      ],
      lastVerified: batch.researchedOn,
    });
    for (const o of v.offerings)
      offerings.push({ itemId: o.item, establishmentId: v.id, status: "source-listed", isSample: false, menuEvidence: { type: "published-source", note: o.evidence, url: o.url }, lastVerified: batch.researchedOn,
        ...(o.price ? { price: o.price } : {}), ...(o.photo ? { photo: o.photo } : {}) });
  }
}
const dataFile = path.join(root, `data/experiences/${m.id}.json`);
const current = ExperienceDataSchema.parse(JSON.parse(readFileSync(dataFile, "utf8")));
const hcmc = JSON.parse(readFileSync(path.join(root, "data/hcmc-boundary.geojson"), "utf8")).features.map((f: { geometry: unknown }) => f.geometry);
const bundle = JSON.stringify({ items: catalogue.items, establishments, offerings });
const report = importIntoModule(m, current, bundle, "bundle", hcmc);
report.warnings.push(...skipped.map((s) => `skipped venue — ${s}`));
const dry = rest.includes("--dry-run") || report.errors.length > 0;
if (!dry) {
  const merged = { ...report.merged, metadata: { ...report.merged.metadata, dataset: "seed" as const, note: `${m.id} pilot: catalogue items from published references (seed, not yet reviewed); venues and offerings from desk research — every offering cites a published source; status source-listed. Built by scripts/build-experience-research.ts.` } };
  writeFileSync(dataFile, JSON.stringify(merged, null, 2) + "\n");
}
writeFileSync(path.join(root, `docs/imports/${m.id}-RESEARCH_REPORT.md`), importReportMarkdown(m, report, `data/source/experiences/${m.id}/`, dry) + "\n");
console.log(`${report.errors.length ? "✗" : "✓"} ${m.id}: ${report.added.length} added, ${report.updated.length} updated, ${report.errors.length} errors, ${skipped.length} venues skipped — ${dry ? "dry run" : "written"}`);
report.errors.forEach((e) => console.log("  ✗", e));
skipped.forEach((s) => console.log("  · skipped", s));
if (report.errors.length) process.exit(1);
