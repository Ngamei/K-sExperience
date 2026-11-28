/**
 * Maps a research team's neutral CSV (batch_id, experience, category, brand, venue_name, address, area, venue_type,
 * offering, evidence_level, source_url, secondary_source_url, last_checked, latitude, longitude, price_vnd, photo_url,
 * operating_status, import_status, notes) to the research-exchange batch format, then hand it to `npm run intake`.
 * Nothing is invented: blank coordinates/prices/photos stay blank (intake geocodes and validates).
 *
 *   npm run exchange:convert -- <file.csv> --batch-id GPT-BARS-001 --item craft-beer [--attr barTypes=craft-beer] [--agent chatgpt]
 *
 * Writes research-exchange/inbox/<batchId>.json and prints the field mapping + brand/branch duplicate matches.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseCsv } from "../src/lib/data/importer";
import { numberOf, streetOf } from "../src/lib/data/exchange";

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : undefined);
const file = args.find((a) => !a.startsWith("--") && !Object.values({ b: opt("batch-id"), i: opt("item"), a: opt("attr"), g: opt("agent") }).includes(a));
const batchId = opt("batch-id"), item = opt("item");
if (!file || !batchId || !item) { console.error("usage: npm run exchange:convert -- <file.csv> --batch-id GPT-BARS-001 --item craft-beer [--attr barTypes=craft-beer]"); process.exit(2); }
const attr = opt("attr")?.split("=");
const rows = parseCsv(readFileSync(path.resolve(file), "utf8").replace(/^﻿/, ""));
const experience = rows[0]?.experience;

// Former district names used by the geocoder to disambiguate (never shown as data).
const AREA: Record<string, string> = { Q1: "Quận 1", Q3: "Quận 3", Q4: "Quận 4", Q5: "Quận 5", Q7: "Quận 7", Q10: "Quận 10", "Phú Nhuận": "Phú Nhuận", "Bình Thạnh": "Bình Thạnh", "Bình Tân": "Bình Tân", "Tân Bình": "Tân Bình", "Gò Vấp": "Gò Vấp", "Thảo Điền": "Thảo Điền", "Thủ Thiêm": "Thủ Thiêm", "Thủ Đức": "Thủ Đức" };
/** "C1.09, Galleria Metropole, 20 Nguyễn Thiện Thành, Ho Chi Minh City, Vietnam" → "20 Nguyễn Thiện Thành, C1.09, Galleria Metropole". */
const address = (a: string) => {
  const parts = a.replace(/[–—]/g, "-").split(",").map((x) => x.trim()).filter((x) => x && !/^(ho chi minh city|vietnam|tp\.? hồ chí minh)$/i.test(x));
  const i = parts.findIndex((x) => /^\d[\d/a-z-]*\s+\S/i.test(x));
  return (i > 0 ? [parts[i], ...parts.filter((_, j) => j !== i)] : parts).join(", ");
};
const num = numberOf;
const street = streetOf;

// existing establishments of this experience → preserve ids (same street + same base house number, e.g. 144 ↔ 144/3)
const existing: { id: string; name: string; address: string }[] = JSON.parse(readFileSync(path.join(root, `data/experiences/${experience}.json`), "utf8")).establishments;
const matches: string[] = [];
const venues = rows.map((r) => {
  const addr = address(r.address);
  const same = existing.find((e) => street(e.address) === street(addr) && num(e.address) !== "" && num(e.address) === num(addr));
  if (same) matches.push(`${r.venue_name} (${addr}) → existing ${same.id} (${same.name}, ${same.address})`);
  const sources = [r.source_url, r.secondary_source_url].filter(Boolean);
  const lat = r.latitude ? Number(r.latitude) : null, lon = r.longitude ? Number(r.longitude) : null;
  return {
    ...(same ? { id: same.id } : {}),
    name: r.venue_name, address: addr, district: AREA[r.area] ?? r.area, venueType: r.venue_type || "bar", sources,
    attributes: { ...(attr ? { [attr[0]]: [attr[1]] } : {}), ...(r.brand ? { brand: r.brand } : {}) },
    offerings: [{
      item,
      evidence: `${new URL(r.source_url).hostname.replace(/^www\./, "")} lists ${r.venue_name} (${addr}) as a ${r.venue_type || "venue"} of ${r.brand || r.venue_name} serving ${r.offering}. ${r.notes}`.trim(),
      url: r.source_url,
      ...(r.price_vnd ? { price: { minVnd: Number(r.price_vnd), maxVnd: Number(r.price_vnd), unit: "drink" } } : {}),
    }],
    ...(lat !== null && lon !== null ? { lat, lon } : {}),
    note: [r.operating_status && `operating status: ${r.operating_status}`, r.notes, r.evidence_level && `evidence level from researcher: ${r.evidence_level}`].filter(Boolean).join(" · "),
  };
});
const batch = {
  batchId, externalBatchId: rows[0]?.batch_id, experience, kind: "venues", agent: opt("agent") ?? "chatgpt", researchedOn: rows[0]?.last_checked,
  method: `Converted from ${path.basename(file)} (${rows[0]?.batch_id}): ${rows.length} source-listed candidates, none first-hand verified; coordinates, prices and photos left blank by the researcher where not independently established.`,
  venues,
};
const out = path.join(root, "research-exchange/inbox", `${batchId}.json`);
writeFileSync(out, JSON.stringify(batch, null, 2) + "\n");
console.log(`✓ ${rows.length} rows → ${path.relative(root, out)}`);
console.log("Field mapping: venue_name→name · address→address (street first) · area→district · venue_type→venueType · brand→attributes.brand · source_url/secondary_source_url→sources · offering→offerings[].item=" + item + " · latitude/longitude→lat/lon (blank = geocode) · price_vnd→price (blank) · notes/operating_status→note");
matches.forEach((m) => console.log("  ↺ " + m));
