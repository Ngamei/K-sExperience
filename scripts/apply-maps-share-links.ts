/**
 * Writes reviewed Google Maps Share links (and closures) from a filled MAPS-SHARE-LINKS CSV into the research
 * source batches, so the normal importers carry them into the canonical data.
 *   npx tsx scripts/apply-maps-share-links.ts research-exchange/incoming/MAPS-SHARE-LINKS.filled.csv [--checked-on 2026-11-28]
 *   then: npm run data:restaurants && npm run data:research -- <bars|coffee|spa|sport>
 * Accepted rows: match = exact | same-business-different-name | closed, with a Google Maps place link.
 * `closed` also records a closure (D67) — the venue stays as a record but is never recommended.
 * not-found / not-checked rows are left alone (they need a person to re-check the address).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseCsv } from "../src/lib/data/importer";
import { isGoogleMapsPlaceUrl } from "../src/lib/geo/maps-link";
import { slugify } from "../src/lib/search/normalize";

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && a.endsWith(".csv"));
const checkedOn = args.includes("--checked-on") ? args[args.indexOf("--checked-on") + 1] : new Date().toISOString().slice(0, 10);
if (!file) { console.error("usage: npx tsx scripts/apply-maps-share-links.ts <filled.csv> [--checked-on YYYY-MM-DD]"); process.exit(2); }
const rows = parseCsv(readFileSync(path.resolve(file), "utf8").replace(/^﻿/, ""));
const ACCEPT = new Set(["exact", "same-business-different-name", "closed"]);
const wanted = new Map(rows.filter((r) => ACCEPT.has(r.match) && isGoogleMapsPlaceUrl(r.share_link)).map((r) => [r.id, r]));
const skipped = rows.filter((r) => !wanted.has(r.id)).map((r) => `${r.id} (${r.match || "no match"}${r.share_link && !isGoogleMapsPlaceUrl(r.share_link) && r.share_link !== "NOT FOUND" ? ", not a place link" : ""})`);

const dirs = ["data/source/venue-research", ...["bars", "coffee", "spa", "sport"].map((m) => `data/source/experiences/${m}`)];
const done = new Set<string>();
for (const dir of dirs) {
  for (const f of readdirSync(path.join(root, dir)).filter((x) => /^batch-[\w-]+\.json$/.test(x))) {
    const p = path.join(root, dir, f);
    const text = readFileSync(p, "utf8");
    const batch = JSON.parse(text);
    // Keep the file's own layout: one-venue-per-line files are edited in place on that line; others keep their indent.
    const oneLine = /\n\s*\{ "(id|name)": /.test(text);
    let out = text;
    let changed = false;
    for (const v of batch.venues ?? []) {
      const id = v.id ?? slugify(`${v.name} ${v.address.split(",")[0]}`);
      const r = wanted.get(id);
      if (!r) continue;
      const add: Record<string, unknown> = { googleMapsUrl: r.share_link };
      if (r.match === "closed") add.closure = { status: "permanently-closed", reportedOn: checkedOn, source: `Google Maps listing shows "Permanently closed" (${r.share_link}); checked by the PO's operator` };
      if (oneLine) {
        const lines = out.split("\n");
        const i = lines.findIndex((l) => l.includes(`"name": ${JSON.stringify(v.name)}`) && l.includes(`"address": ${JSON.stringify(v.address)}`));
        if (i === -1) throw new Error(`${f}: cannot find the line for ${id}`);
        const extra = Object.entries(add).filter(([k]) => !lines[i].includes(`"${k}":`)).map(([k, val]) => `, ${JSON.stringify(k)}: ${JSON.stringify(val).replace(/":/g, '": ').replace(/,"/g, ', "')}`).join("");
        lines[i] = lines[i].replace(/ \}(,?)\s*$/, `${extra} }$1`);
        out = lines.join("\n");
      } else Object.assign(v, add);
      changed = true; done.add(id);
    }
    if (changed) {
      const indent = text.match(/^\{\n( +)"/)?.[1].length ?? 2;
      writeFileSync(p, oneLine ? out : JSON.stringify(batch, null, indent) + "\n");
      JSON.parse(readFileSync(p, "utf8")); // still valid JSON
    }
  }
}
const missing = [...wanted.keys()].filter((id) => !done.has(id));
console.log(`✓ ${done.size} venues updated (${[...wanted.values()].filter((r) => r.match === "closed").length} closures); ${skipped.length} rows left for re-check`);
if (missing.length) { console.error(`✗ not found in any source batch: ${missing.join(", ")}`); process.exit(1); }
