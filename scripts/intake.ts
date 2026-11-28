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
import { BatchSchema, geocodeProblem, validateVenues, type Batch, type ExistingEstablishment, type VenueVerdict } from "../src/lib/data/exchange";
import { overlaps, queueMarkdown, readQueue, upsertEntry, writeQueue } from "../src/lib/data/exchange-queue";
import type { LngLat } from "../src/lib/geo/geo";

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
const toGeocode = (batch.venues ?? []).filter((v, i) => verdicts[i].decision === "accept" && (v.lon == null || v.lat == null));
writeFileSync(path.join(scratch, "batch-intake.json"), JSON.stringify({ researchedOn: batch.researchedOn, venues: toGeocode }));
if (toGeocode.length) {
  try { execFileSync("node", [path.join(root, "scripts/geocode-venue-research.mjs"), scratch], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_USE_ENV_PROXY: "1" } }); }
  catch (e) { warnings.push(`geocoder failed: ${(e as Error).message.split("\n")[0]} — venues without coordinates are rejected`); }
}
const geo = existsSync(path.join(scratch, "geocoded.json")) ? JSON.parse(readFileSync(path.join(scratch, "geocoded.json"), "utf8")) : {};
(batch.venues ?? []).forEach((v, i) => {
  const vd = verdicts[i];
  if (vd.decision !== "accept") return;
  if (v.lon != null && v.lat != null) { geo[`${v.name}|${v.address}|${v.district ?? ""}`] = { lon: v.lon, lat: v.lat, precision: "exact", ward: null, displayName: "researcher-supplied coordinates" }; return; }
  const p = geocodeProblem(v, geo[`${v.name}|${v.address}|${v.district ?? ""}`], DISTRICTS);
  if (p) { vd.decision = "reject"; vd.action = "none"; vd.reasons.push(`coordinates: ${p}`); }
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
      const pin = g?.lon !== undefined ? `${g.precision ?? ""} ${Number(g.lat).toFixed(5)},${Number(g.lon).toFixed(5)}` : "—";
      return `| ${v.name} | \`${v.id}\` | ${v.decision === "accept" ? "✅ accept" : "❌ reject"} | ${v.action} | ${v.offerings} | ${v.priced} | ${pin} | ${String(g?.displayName ?? "—").slice(0, 90).replace(/\|/g, "/")} | ${[...v.reasons, ...v.warnings].join("; ").replace(/\|/g, "/") || "—"} |`;
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
  const sources = [...new Set((batch.venues ?? []).flatMap((v) => v.sources))];
  queue = upsertEntry(readQueue(root), {
    batchId: batch.batchId, experience: batch.experience, kind: batch.kind, assignedTo: entry?.assignedTo ?? batch.agent, scope: entry?.scope ?? batch.method.slice(0, 120),
    status: apply ? (ok ? "imported" : "rejected") : accepted ? "validated" : "rejected",
    importStatus: apply ? (ok ? `imported ${now().slice(0, 10)} (${accepted} venues)` : "import failed — restored") : "dry run only",
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
