/**
 * Batch intake for the research exchange — wraps the EXISTING importers (no second pipeline):
 *   venues/food     → data/source/venue-research/batch-<id>.json  → scripts/import-restaurants.ts
 *   venues/<module> → data/source/experiences/<m>/batch-<id>.json → scripts/build-experience-research.ts
 *   catalogue/food  → scripts/import-catalogue.ts --dataset master (non-destructive merge)
 *
 *   npm run intake -- research-exchange/inbox/GPT-FOOD-001.json          dry run (default): validate + geocode + report
 *   npm run intake -- research-exchange/inbox/GPT-FOOD-001.json --apply  back up, import, verify, audit (auto-restore on failure)
 *   npm run intake -- --rollback GPT-FOOD-001                            restore the backup taken before that batch
 *
 * Writes research-exchange/reports/<batchId>.md, appends research-exchange/audit/history.jsonl, updates queue.json.
 * Never deletes ids (dishes, establishments, links): user saved items, history and passports reference them.
 */
import { execFileSync } from "node:child_process";
import { appendFileSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { BatchSchema, geocodeProblem, pinKey, resolvePins, snapshotMismatches, validateVenues, type Batch, type ExistingEstablishment, type FailedPin, type Pin, type VenueVerdict } from "../src/lib/data/exchange";
import { overlaps, queueMarkdown, readQueue, upsertEntry, writeQueue } from "../src/lib/data/exchange-queue";
import { haversineKm, pointInGeometry, type GeoJsonGeometry, type LngLat } from "../src/lib/geo/geo";

const root = path.resolve(__dirname, "..");
const X = path.join(root, "research-exchange");
const args = process.argv.slice(2);
const now = () => new Date().toISOString();
const rel = (p: string) => path.relative(root, p);
const readJson = (p: string) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
const audit = (e: Record<string, unknown>) => { mkdirSync(path.join(X, "audit"), { recursive: true }); appendFileSync(path.join(X, "audit/history.jsonl"), JSON.stringify({ at: now(), ...e }) + "\n"); };
const run = (script: string, a: string[] = []) => execFileSync("npx", ["tsx", path.join(root, "scripts", script), ...a], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const MODULES = ["coffee", "bars", "spa", "sport"];
/** Canonical files an intake may change (backed up first). */
const CANONICAL = ["data/vietnamese-dishes.json", "data/hcmc-restaurants.json", "data/dish-restaurant-mapping.json", "data/source/venue-research/geocoded.json",
  ...MODULES.flatMap((m) => [`data/experiences/${m}.json`, `data/source/experiences/${m}/geocoded.json`])];
const DISTRICTS: Record<string, LngLat> = {
  "Quận 1": [106.700, 10.776], "Quận 3": [106.684, 10.783], "Quận 4": [106.704, 10.759], "Quận 5": [106.667, 10.755], "Quận 6": [106.635, 10.747], "Quận 7": [106.722, 10.734],
  "Quận 8": [106.655, 10.738], "Quận 10": [106.667, 10.773], "Quận 11": [106.650, 10.763], "Quận 12": [106.654, 10.867], "Bình Thạnh": [106.709, 10.810], "Phú Nhuận": [106.680, 10.800],
  "Tân Bình": [106.652, 10.801], "Tân Phú": [106.628, 10.791], "Gò Vấp": [106.665, 10.838], "Bình Tân": [106.603, 10.765], "Thủ Đức": [106.762, 10.850], "Thảo Điền": [106.733, 10.805], "Thủ Thiêm": [106.720, 10.775], "An Phú": [106.748, 10.800], "Nhà Bè": [106.730, 10.695], "Bình Chánh": [106.590, 10.730],
};

const NEIGHBOURHOODS: { id: string; name: { vi: string }; intakeAliases?: string[]; searchArea: GeoJsonGeometry }[] =
  existsSync(path.join(root, "data/neighbourhoods/neighbourhoods.json")) ? readJson("data/neighbourhoods/neighbourhoods.json").neighbourhoods : [];

// ---- rollback ---------------------------------------------------------------------------------------
if (args[0] === "--rollback") {
  const id = args[1];
  const dir = path.join(X, "backups", id ?? "");
  if (!id || !existsSync(path.join(dir, "manifest.json"))) { console.error(`no backup for ${id}`); process.exit(2); }
  const man = JSON.parse(readFileSync(path.join(dir, "manifest.json"), "utf8")) as { files: string[]; added: string[] };
  for (const f of man.files) copyFileSync(path.join(dir, "files", f.replace(/\//g, "__")), path.join(root, f));
  for (const f of man.added) rmSync(path.join(root, f), { force: true });
  writeQueue(root, upsertEntry(readQueue(root), { batchId: id, status: "rolled-back", importStatus: `rolled back ${now().slice(0, 10)}` }));
  writeFileSync(path.join(X, "QUEUE.md"), queueMarkdown(readQueue(root)));
  audit({ batchId: id, action: "rollback", restored: man.files, removed: man.added });
  console.log(`✓ ${id} rolled back (${man.files.length} files restored, ${man.added.length} removed). Run npm run db:seed-sql and the reports again.`);
  process.exit(0);
}

const file = args.find((a) => !a.startsWith("--"));
const apply = args.includes("--apply");
if (!file) { console.error("usage: npm run intake -- <batch.json> [--apply] | --rollback <batchId>"); process.exit(2); }
const raw = JSON.parse(readFileSync(path.resolve(file), "utf8"));
const parsed = BatchSchema.safeParse(raw);
if (!parsed.success) {
  console.error("✗ batch does not match research-exchange/contract/json-schema/research-batch.json:");
  parsed.error.issues.forEach((i) => console.error(`  ${i.path.join(".") || "batch"}: ${i.message}`));
  audit({ batchId: raw?.batchId, action: "validate", result: "schema-error", issues: parsed.error.issues.length });
  process.exit(1);
}
const batch: Batch = parsed.data;
let queue = readQueue(root);
const entry = queue.batches.find((b) => b.batchId === batch.batchId);
const warnings: string[] = [];
if (!entry) warnings.push(`batch ${batch.batchId} is not in queue.json — add it (scope, assignee, claims) before importing`);
else if (entry.assignedTo !== batch.agent) warnings.push(`queue assigns ${batch.batchId} to ${entry.assignedTo}, batch says ${batch.agent}`);
if (entry?.status === "imported") warnings.push(`${batch.batchId} was already imported — re-import is idempotent (same ids merge)`);

// ---- catalogue batches → existing catalogue importer ---------------------------------------------------
if (batch.kind === "catalogue") {
  if (batch.experience !== "food" || !batch.dishes?.length) { console.error("✗ catalogue batches are Food dishes[] (module items: npm run data:import-module)"); process.exit(1); }
  const tmp = path.join(mkdtempSync(path.join(os.tmpdir(), "intake-")), "dishes.json");
  writeFileSync(tmp, JSON.stringify(batch.dishes));
  let out = "", ok = true;
  try { out = run("import-catalogue.ts", [tmp, "--dataset", "master", "--dry-run"]); } catch (e) { ok = false; out = String((e as { stdout?: string }).stdout ?? e); }
  if (ok && apply) {
    const backup = takeBackup([]);
    try { out = run("import-catalogue.ts", [tmp, "--dataset", "master"]); verifyNoLostIds(backup); }
    catch (e) { restore(backup); ok = false; out += `\n${String((e as { stdout?: string }).stdout ?? e)}\nRESTORED from backup.`; }
  }
  finish({ accepted: ok ? batch.dishes.length : 0, rejected: ok ? 0 : batch.dishes.length, body: ["## Catalogue importer output", "", "```", out.trim(), "```", "", "Full merge report: docs/IMPORT_REPORT.md"], ok });
}

// ---- venues batches ------------------------------------------------------------------------------------
const food = readJson("data/vietnamese-dishes.json");
const ests: ExistingEstablishment[] = readJson("data/hcmc-restaurants.json").restaurants.map((r: ExistingEstablishment) => ({ ...r, experience: "food" }));
const moduleItems: Record<string, Set<string>> = {};
for (const m of MODULES) {
  const d = readJson(`data/experiences/${m}.json`);
  moduleItems[m] = new Set(d.items.map((i: { id: string }) => i.id));
  ests.push(...d.establishments.map((e: ExistingEstablishment) => ({ ...e, experience: m })));
}
const hcmc = readJson("data/hcmc-boundary.geojson").features.map((f: { geometry: unknown }) => f.geometry);
const verdicts = validateVenues(batch, { dishIds: new Set(food.dishes.map((d: { id: string }) => d.id)), moduleItems, establishments: ests, hcmc });

// overlap with other agents' active claims
const pairs = (batch.venues ?? []).flatMap((v) => (batch.experience === "food" ? (v.dishes ?? []).map((d) => (typeof d === "string" ? d : d.dishId)) : (v.offerings ?? []).map((o) => o.item)).map((item) => ({ item, district: v.district })));
warnings.push(...overlaps(queue, batch.batchId, batch.experience, pairs));

// geocode in a scratch copy (never touches the canonical cache during a dry run)
const srcDir = batch.experience === "food" ? "data/source/venue-research" : `data/source/experiences/${batch.experience}`;
const scratch = mkdtempSync(path.join(os.tmpdir(), "intake-geo-"));
const cache = path.join(root, srcDir, "geocoded.json");
if (existsSync(cache)) copyFileSync(cache, path.join(scratch, "geocoded.json"));
// KEX-QA-01/03: an apply evaluates the SAME pins as the reviewed dry run. The dry run snapshots the SELECTED pins
// (supplied coordinates take precedence over cached/geocoded points and keep their source-derived precision);
// the apply reuses that snapshot without new Nominatim queries and refuses if the batch no longer matches it.
const snapshot = path.join(X, "geocodes", `${batch.batchId}.json`);
const venuesAll = batch.venues ?? [];
// Enrichment venues (existing ids, profile fields only) keep the existing record's coordinates: never geocoded or pinned.
const enrichVenue = (v: { enrich?: boolean }) => v.enrich === true;
const venuesPinned = venuesAll.filter((v) => !enrichVenue(v));
let pins: Record<string, Pin | FailedPin>;
const snap = apply && existsSync(snapshot) ? (JSON.parse(readFileSync(snapshot, "utf8")) as { at: string; pins?: Record<string, Pin | FailedPin> }) : null;
if (apply && !snap?.pins) { console.error(`✗ ${batch.batchId}: no dry-run pin snapshot (research-exchange/geocodes/${batch.batchId}.json) — run the dry run first`); process.exit(1); }
if (snap?.pins) {
  const mism = snapshotMismatches(venuesAll.filter((v, i) => verdicts[i].decision === "accept" && !enrichVenue(v)), snap.pins);
  if (mism.length) { console.error(`✗ ${batch.batchId}: batch differs from its dry run — re-run the dry run:\n  ${mism.join("\n  ")}`); process.exit(1); }
  pins = snap.pins;
  warnings.push(`pins reused from the dry run of ${snap.at} (no new Nominatim queries; supplied coordinates verified unchanged)`);
} else {
  const toGeocode = venuesAll.filter((v, i) => verdicts[i].decision === "accept" && !enrichVenue(v) && (v.lon == null || v.lat == null));
  writeFileSync(path.join(scratch, "batch-intake.json"), JSON.stringify({ researchedOn: batch.researchedOn, venues: toGeocode }));
  if (toGeocode.length) {
    try { execFileSync("node", [path.join(root, "scripts/geocode-venue-research.mjs"), scratch], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_USE_ENV_PROXY: "1" } }); }
    catch (e) { warnings.push(`geocoder failed: ${(e as Error).message.split("\n")[0]} — venues without coordinates are rejected`); }
  }
  const cacheNow = existsSync(path.join(scratch, "geocoded.json")) ? JSON.parse(readFileSync(path.join(scratch, "geocoded.json"), "utf8")) : {};
  pins = resolvePins(venuesPinned, cacheNow);
  mkdirSync(path.join(X, "geocodes"), { recursive: true });
  writeFileSync(snapshot, JSON.stringify({ at: now(), pins: Object.fromEntries(venuesPinned.map((v) => [pinKey(v), pins[pinKey(v)]]).filter(([, p]) => p)) }, null, 2) + "\n");
}
// `geo` = selected pins in the geocode-cache shape the importers read (precision preserved: exact | building | street)
const geo: Record<string, { lon?: number; lat?: number; precision?: string; ward?: string | null; displayName?: string; failed?: boolean; reason?: string }> =
  existsSync(path.join(scratch, "geocoded.json")) ? JSON.parse(readFileSync(path.join(scratch, "geocoded.json"), "utf8")) : {};
for (const [k, p] of Object.entries(pins)) geo[k] = "failed" in p ? { failed: true, reason: p.reason } : { lon: p.lon, lat: p.lat, precision: p.precision, ward: p.ward, displayName: p.displayName };
venuesAll.forEach((v, i) => {
  const vd = verdicts[i];
  if (vd.decision !== "accept" || enrichVenue(v)) return;
  const p = pins[pinKey(v)];
  if (p && !("failed" in p) && p.origin === "supplied") {
    const c = v.district ? DISTRICTS[v.district] : undefined;
    if (c && haversineKm(c, [p.lon, p.lat]) > 6) { vd.decision = "reject"; vd.action = "none"; vd.reasons.push(`coordinates: supplied point is ${haversineKm(c, [p.lon, p.lat]).toFixed(1)} km from ${v.district}`); }
    return;
  }
  const prob = geocodeProblem(v, geo[pinKey(v)], DISTRICTS);
  if (prob) { vd.decision = "reject"; vd.action = "none"; vd.reasons.push(`coordinates: ${prob}`); }
});
// Neighbourhood-first: a venue stated to be in an approved neighbourhood must be pinned inside its polygon
// (numbered streets such as "Đường số 10" repeat across the city and can geocode elsewhere). Applies to supplied pins too.
venuesAll.forEach((v, i) => {
  const vd = verdicts[i];
  const p = pins[pinKey(v)];
  if (vd.decision !== "accept" || !p || "failed" in p) return;
  const area = NEIGHBOURHOODS.find((n) => n.intakeAliases?.includes(v.district ?? ""));
  if (area && !pointInGeometry([p.lon, p.lat], area.searchArea)) {
    vd.decision = "reject"; vd.action = "none";
    vd.reasons.push(`coordinates: pin (${p.origin === "supplied" ? p.sourceRef ?? "supplied" : p.displayName || "geocoded"}) is outside the approved ${area.name.vi} area — street name likely repeats elsewhere`);
  }
});
// KEX-QA-02: a street-level geocode is a street-segment point, so different addresses on one street can get the
// identical point. Flag it (never presented as exact; the UI labels street-level pins as approximate).
const pinOf = (i: number) => { const v = (batch.venues ?? [])[i]; return v ? geo[`${v.name}|${v.address}|${v.district ?? ""}`] : undefined; };
(batch.venues ?? []).forEach((v, i) => {
  const vd = verdicts[i], g = pinOf(i);
  if (vd.decision !== "accept" || g?.precision !== "street" || g.lon === undefined) return;
  const same = [
    ...(batch.venues ?? []).map((w, j) => (j !== i && verdicts[j].decision === "accept" && pinOf(j)?.lon === g.lon && pinOf(j)?.lat === g.lat ? w.name : null)),
    ...ests.filter((e) => e.id !== vd.id && e.coordinates[0] === g.lon && e.coordinates[1] === g.lat).map((e) => `${e.name} (${e.experience})`),
  ].filter(Boolean);
  if (same.length) vd.warnings.push(`shares an identical street-level point with ${same.join(", ")} — location approximate (house number not mapped)`);
});
const accepted = verdicts.filter((v) => v.decision === "accept");
const rejected = verdicts.filter((v) => v.decision === "reject");

let ok = true;
let importOut = "";
if (apply && accepted.length) {
  // Rejected venues stay in the stored batch as "excluded" with the reason — never silently dropped.
  const stored = { ...batch, venues: (batch.venues ?? []).map((v, i) => {
    const vd = verdicts[i];
    const id = vd.id;
    return vd.decision === "accept" ? { ...v, id } : { ...v, id, excluded: v.excluded ?? `intake ${batch.batchId}: ${vd.reasons.join("; ")}` };
  }) };
  const target = path.join(root, srcDir, `batch-${batch.batchId}.json`);
  const backup = takeBackup(existsSync(target) ? [] : [rel(target)]);
  try {
    writeFileSync(target, JSON.stringify(stored, null, 2) + "\n");
    writeFileSync(cache, JSON.stringify(geo, null, 2) + "\n");
    importOut = batch.experience === "food" ? run("import-restaurants.ts") : run("build-experience-research.ts", [batch.experience]);
    verifyNoLostIds(backup);
  } catch (e) {
    restore(backup);
    ok = false;
    importOut += `\n${String((e as { stdout?: string }).stdout ?? (e as Error).message)}\nRESTORED from backup — nothing changed.`;
  }
}

finish({
  accepted: accepted.length, rejected: rejected.length, ok,
  body: [
    "| Venue | Id | Decision | Action | Offerings | Priced | Pin | Geocoder match | Reasons / warnings |",
    "| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |",
    ...verdicts.map((v: VenueVerdict, i: number) => {
      const bv = (batch.venues ?? [])[i];
      const g = bv ? geo[`${bv.name}|${bv.address}|${bv.district ?? ""}`] : undefined;
      const sel = bv ? pins[pinKey(bv)] : undefined;
      const pin = bv && enrichVenue(bv) ? "existing record" : sel && !("failed" in sel) ? `${sel.precision} · ${sel.origin} ${Number(sel.lat).toFixed(7)},${Number(sel.lon).toFixed(7)}` : "—";
      return `| ${v.name} | \`${v.id}\` | ${v.decision === "accept" ? "✅ accept" : "❌ reject"} | ${v.action} | ${v.offerings} | ${v.priced} | ${pin} | ${String((sel && !("failed" in sel) ? sel.sourceRef ?? sel.displayName : g?.displayName) ?? "—").slice(0, 90).replace(/\|/g, "/")} | ${[...v.reasons, ...v.warnings].join("; ").replace(/\|/g, "/") || "—"} |`;
    }),
    ...(importOut ? ["", "## Importer output", "", "```", importOut.trim(), "```"] : []),
  ],
});

// ---- helpers -------------------------------------------------------------------------------------------
function takeBackup(added: string[]) {
  const dir = path.join(X, "backups", batch.batchId);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(path.join(dir, "files"), { recursive: true });
  const files = CANONICAL.filter((f) => existsSync(path.join(root, f)));
  for (const f of files) copyFileSync(path.join(root, f), path.join(dir, "files", f.replace(/\//g, "__")));
  writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ batchId: batch.batchId, at: now(), files, added }, null, 2));
  return { dir, files, added };
}
function restore(b: { dir: string; files: string[]; added: string[] }) {
  for (const f of b.files) copyFileSync(path.join(b.dir, "files", f.replace(/\//g, "__")), path.join(root, f));
  for (const f of b.added) rmSync(path.join(root, f), { force: true });
}
/** Ids referenced by user data (saved, tried, passports, notes) must survive every import. */
function verifyNoLostIds(b: { dir: string; files: string[] }) {
  const lost: string[] = [];
  const idsOf = (f: string, text: string) => {
    const j = JSON.parse(text);
    if (f.endsWith("vietnamese-dishes.json")) return j.dishes.map((d: { id: string }) => `dish:${d.id}`);
    if (f.endsWith("hcmc-restaurants.json")) return j.restaurants.map((r: { id: string }) => `est:${r.id}`);
    if (f.endsWith("dish-restaurant-mapping.json")) return j.links.map((l: { dishId: string; restaurantId: string }) => `link:${l.dishId}@${l.restaurantId}`);
    if (/data\/experiences\/\w+\.json$/.test(f)) return [...j.items.map((i: { id: string }) => `item:${i.id}`), ...j.establishments.map((e: { id: string }) => `est:${e.id}`), ...j.offerings.map((o: { itemId: string; establishmentId: string }) => `off:${o.itemId}@${o.establishmentId}`)];
    return [];
  };
  for (const f of b.files) {
    const before = new Set<string>(idsOf(f, readFileSync(path.join(b.dir, "files", f.replace(/\//g, "__")), "utf8")));
    const after = new Set<string>(idsOf(f, readFileSync(path.join(root, f), "utf8")));
    for (const id of before) if (!after.has(id)) lost.push(`${f}: ${id}`);
  }
  if (lost.length) throw new Error(`import would remove existing records (${lost.slice(0, 5).join(", ")}${lost.length > 5 ? " …" : ""})`);
}
function finish({ accepted, rejected, body, ok }: { accepted: number; rejected: number; body: string[]; ok: boolean }) {
  const mode = apply ? (ok ? "applied" : "FAILED — restored") : "dry run";
  const report = [
    `# Intake ${batch.batchId} — ${mode}`,
    "",
    `- Experience: ${batch.experience} · kind: ${batch.kind} · agent: ${batch.agent} · researched ${batch.researchedOn}`,
    `- Method: ${batch.method}`,
    `- Result: **${accepted} accepted, ${rejected} rejected, ${warnings.length} warnings** (${now()})`,
    "",
    ...(warnings.length ? ["## Warnings", "", ...warnings.map((w) => `- ${w}`), ""] : []),
    ...body,
    "",
    apply && ok ? "Next: `npm run db:seed-sql && npm run data:report && npm run data:coverage && npm run data:experiences && npm run data:what-to-eat && npm run exchange:export`, then `npm run qa`." : "Dry run only — nothing was written. Re-run with `--apply` to import the accepted records.",
  ].join("\n");
  mkdirSync(path.join(X, "reports"), { recursive: true });
  writeFileSync(path.join(X, "reports", `${batch.batchId}.md`), report + "\n");
  // Every run is kept (the latest report above is overwritten): reports/history/<batch>-<mode>-<timestamp>.md
  const stamp = now().replace(/[:.]/g, "-");
  mkdirSync(path.join(X, "reports", "history"), { recursive: true });
  writeFileSync(path.join(X, "reports", "history", `${batch.batchId}-${apply ? "apply" : "dryrun"}-${stamp}.md`), report + "\n");
  const sources = [...new Set((batch.venues ?? []).flatMap((v) => v.sources))];
  queue = upsertEntry(readQueue(root), {
    batchId: batch.batchId, experience: batch.experience, kind: batch.kind, assignedTo: entry?.assignedTo ?? batch.agent, scope: entry?.scope ?? batch.method.slice(0, 120),
    // a dry run never downgrades an already imported batch in the shared queue
    status: apply ? (ok ? "imported" : "rejected") : entry?.status === "imported" ? "imported" : accepted ? "validated" : "rejected",
    importStatus: apply ? (ok ? `imported ${now().slice(0, 10)} (${accepted} venues)` : "import failed — restored") : entry?.status === "imported" ? entry.importStatus : "dry run only",
    sources: sources.length ? sources : entry?.sources ?? [],
    validation: { at: now().slice(0, 10), accepted, rejected, warnings: warnings.length, report: `research-exchange/reports/${batch.batchId}.md` },
  });
  writeQueue(root, queue);
  writeFileSync(path.join(X, "QUEUE.md"), queueMarkdown(queue));
  audit({ batchId: batch.batchId, action: apply ? "apply" : "dry-run", result: ok ? "ok" : "failed-restored", accepted, rejected, warnings: warnings.length, file: rel(path.resolve(file!)) });
  console.log(`${ok ? "✓" : "✗"} ${batch.batchId}: ${accepted} accepted, ${rejected} rejected, ${warnings.length} warnings — ${mode}. Report: research-exchange/reports/${batch.batchId}.md`);
  process.exit(ok ? 0 : 1);
}
void cpSync; void readdirSync;
