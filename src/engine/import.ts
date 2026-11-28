/**
 * Shared CSV / JSON import for experience modules (Coffee, Bars, Spa, Sport) — used by the CLI
 * (`npm run data:import-module`) and Admin → Import. Same principles as the Food catalogue import:
 *   - dry run first; nothing is written until the report is clean
 *   - non-destructive merge: records are matched by id; only the fields supplied overwrite; nothing is deleted
 *   - duplicate detection inside the file and against existing data (same normalised name, different id)
 *   - module validation (categories, attribute vocabularies, item vs establishment attributes, evidence rules,
 *     price units, HCMC boundary)
 */
import type { ExperienceModule } from "@/experiences/registry";
import { STATUS_RANK } from "@/lib/data/evidence";
import { parseCsv } from "@/lib/data/importer";
import { normalizeVi } from "@/lib/search/normalize";
import { pointInGeometry, type GeoJsonGeometry } from "@/lib/geo/geo";
import { EstablishmentSchema, ExperienceItemSchema, OfferingSchema, type Establishment, type ExperienceData, type ExperienceItem, type Offering } from "./schema";
import { moduleDataProblems } from "./validate";

export type ImportKind = "items" | "establishments" | "offerings" | "bundle";
type Attr = ExperienceItem["attributes"][string];
interface Parsed<T> { record: T; provided: string[]; row: number }
export interface ModuleImportReport {
  kind: ImportKind;
  rows: number;
  errors: string[];
  warnings: string[];
  added: string[];
  updated: string[];
  unchanged: string[];
  /** The merged dataset (only meaningful when errors is empty). */
  merged: ExperienceData;
}

const split = (v: string) => v.split("|").map((x) => x.trim()).filter(Boolean);
const today = () => new Date().toISOString().slice(0, 10);

/** CSV cell → attribute value according to the registry definition. */
function attrFromCell(kind: "text" | "list" | "number" | "boolean" | undefined, v: string): Attr {
  if (kind === "list") return split(v);
  if (kind === "boolean") return /^(yes|true|1|có|x)$/i.test(v.trim());
  if (kind === "number") return Number(v);
  return v.trim();
}

function attrsFromRow(row: Record<string, string>, defs: ExperienceModule["attributes"]) {
  const attributes: Record<string, Attr> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!k.startsWith("attr:") || v === "") continue;
    const id = k.slice(5);
    attributes[id] = attrFromCell(defs.find((d) => d.id === id)?.kind, v);
  }
  return attributes;
}

/** Fields present in a CSV row (non-empty cells) or a JSON object (keys) — only these overwrite on merge. */
const presentKeys = (o: Record<string, unknown>) => Object.keys(o).filter((k) => o[k] !== "" && o[k] !== undefined);

function itemFromCsv(m: ExperienceModule, r: Record<string, string>): { rec: Record<string, unknown>; provided: string[] } {
  const rec: Record<string, unknown> = {
    id: r.id, experienceId: m.id, nameVi: r.name_vi, nameEn: r.name_en, altNames: r.alt_names ? split(r.alt_names) : undefined, category: r.category,
    attributes: Object.keys(attrsFromRow(r, m.attributes)).length ? attrsFromRow(r, m.attributes) : undefined,
    description: r.description_en || r.description_vi ? { en: r.description_en ?? "", vi: r.description_vi ?? "" } : undefined,
    sources: r.source_title ? [{ title: r.source_title, ...(r.source_url ? { url: r.source_url } : {}), accessed: r.source_accessed || today() }] : undefined,
    photos: r.photo_url ? [{ url: r.photo_url, credit: r.photo_credit ?? "", license: r.photo_license ?? "", ...(r.photo_source_url ? { sourceUrl: r.photo_source_url } : {}) }] : undefined,
    verification: r.verification_status ? { status: r.verification_status } : undefined,
    dataset: r.dataset || undefined,
  };
  return { rec, provided: presentKeys(rec) };
}

function establishmentFromCsv(m: ExperienceModule, r: Record<string, string>): { rec: Record<string, unknown>; provided: string[] } {
  const rec: Record<string, unknown> = {
    id: r.id, name: r.name, isSample: false, address: r.address, neighbourhood: r.neighbourhood,
    coordinates: r.lon && r.lat ? [Number(r.lon), Number(r.lat)] : undefined,
    coordinatePrecision: r.coordinate_precision || undefined, googleMapsUrl: r.google_maps_url || undefined, venueType: r.venue_type,
    priceRange: r.price_range || undefined,
    contact: r.phone || r.website ? { ...(r.phone ? { phone: r.phone } : {}), ...(r.website ? { website: r.website } : {}) } : undefined,
    sources: r.source_title ? [{ title: r.source_title, ...(r.source_url ? { url: r.source_url } : {}), accessed: r.source_accessed || today() }] : undefined,
    lastVerified: r.last_verified || undefined,
    experiences: r.experiences ? split(r.experiences) : undefined,
    attributes: Object.keys(attrsFromRow(r, m.establishmentAttributes)).length ? attrsFromRow(r, m.establishmentAttributes) : undefined,
  };
  return { rec, provided: presentKeys(rec) };
}

function offeringFromCsv(r: Record<string, string>): { rec: Record<string, unknown>; provided: string[] } {
  const rec: Record<string, unknown> = {
    itemId: r.item_id, establishmentId: r.establishment_id, status: r.status, isSample: false,
    menuEvidence: r.evidence_type ? { type: r.evidence_type, note: r.evidence_note ?? "", ...(r.evidence_url ? { url: r.evidence_url } : {}) } : undefined,
    price: r.price_min && r.price_max ? { minVnd: Number(r.price_min), maxVnd: Number(r.price_max), unit: r.price_unit } : undefined,
    lastVerified: r.last_verified || undefined,
    photo: r.photo_url ? { url: r.photo_url, kind: r.photo_kind, sourceUrl: r.photo_source_url, attribution: r.photo_attribution, license: r.photo_license, lastCheckedAt: r.photo_last_checked_at } : undefined,
  };
  return { rec, provided: presentKeys(rec) };
}

/** Parses CSV or JSON text into records of one kind (JSON may also be a bundle {items, establishments, offerings}). */
export function parseModuleImport(m: ExperienceModule, raw: string, kind: ImportKind) {
  const text = raw.trim();
  const isJson = text.startsWith("{") || text.startsWith("[");
  const out = { items: [] as Parsed<Record<string, unknown>>[], establishments: [] as Parsed<Record<string, unknown>>[], offerings: [] as Parsed<Record<string, unknown>>[] };
  if (isJson) {
    const j = JSON.parse(text);
    const take = (arr: unknown, into: Parsed<Record<string, unknown>>[], extra: Record<string, unknown> = {}) =>
      (Array.isArray(arr) ? arr : []).forEach((o: Record<string, unknown>, i) => into.push({ record: { ...extra, ...o }, provided: presentKeys(o), row: i + 1 }));
    if (Array.isArray(j)) take(j, kind === "establishments" ? out.establishments : kind === "offerings" ? out.offerings : out.items, kind === "items" || kind === "bundle" ? { experienceId: m.id } : {});
    else { take(j.items, out.items, { experienceId: m.id }); take(j.establishments, out.establishments); take(j.offerings, out.offerings); }
  } else {
    if (kind === "bundle") throw new Error("CSV files hold one kind of record: choose items, establishments or offerings");
    parseCsv(text).forEach((r, i) => {
      const { rec, provided } = kind === "items" ? itemFromCsv(m, r) : kind === "establishments" ? establishmentFromCsv(m, r) : offeringFromCsv(r);
      (kind === "items" ? out.items : kind === "establishments" ? out.establishments : out.offerings).push({ record: rec, provided, row: i + 2 });
    });
  }
  return out;
}

/** Defaults for brand-new records (only fields the file did not supply). */
const ITEM_DEFAULTS = (m: ExperienceModule) => ({ experienceId: m.id, altNames: [], attributes: {}, description: { en: "", vi: "" }, photos: [], sources: [], verification: { status: "seed-unverified" }, dataset: "seed" });
const EST_DEFAULTS = (m: ExperienceModule) => ({ isSample: false, deliveryLinks: [], sources: [], experiences: [m.id], attributes: {} });

function mergeOne(existing: object | undefined, incoming: Record<string, unknown>, provided: string[], defaults: object): Record<string, unknown> {
  if (!existing) return { ...defaults, ...Object.fromEntries(Object.entries(incoming).filter(([k]) => provided.includes(k))) };
  const out: Record<string, unknown> = { ...existing };
  for (const k of provided) {
    // attributes merge key by key (a file with one attribute column does not wipe the others)
    out[k] = k === "attributes" ? { ...((existing as Record<string, unknown>).attributes as object), ...(incoming.attributes as object) } : incoming[k];
  }
  return out;
}

/**
 * Dry-run + merge. Returns the merged dataset and a report; callers write it only when `errors` is empty.
 * `hcmc` = HCMC boundary geometries (establishments outside are rejected).
 */
export function importIntoModule(m: ExperienceModule, current: ExperienceData, raw: string, kind: ImportKind, hcmc: GeoJsonGeometry[]): ModuleImportReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const added: string[] = [], updated: string[] = [], unchanged: string[] = [];
  let parsed: ReturnType<typeof parseModuleImport>;
  try { parsed = parseModuleImport(m, raw, kind); } catch (e) {
    return { kind, rows: 0, errors: [`Could not read the file: ${(e as Error).message}`], warnings, added, updated, unchanged, merged: current };
  }
  const items = new Map(current.items.map((i) => [i.id, i]));
  const ests = new Map(current.establishments.map((e) => [e.id, e]));
  const offs = new Map(current.offerings.map((o) => [`${o.itemId}@${o.establishmentId}`, o]));

  const apply = <T extends object>(list: Parsed<Record<string, unknown>>[], what: string, keyOf: (r: Record<string, unknown>) => string, map: Map<string, T>,
    defaults: object, schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { issues: { path: PropertyKey[]; message: string }[] } } }) => {
    const seen = new Set<string>();
    for (const p of list) {
      const key = keyOf(p.record);
      if (!key || key.includes("undefined")) { errors.push(`${what} row ${p.row}: missing id`); continue; }
      if (seen.has(key)) { errors.push(`${what} row ${p.row}: duplicate ${key} in this file`); continue; }
      seen.add(key);
      const before = map.get(key);
      // Never overwrite stronger evidence with weaker evidence (offerings / links).
      const rank = (x: unknown) => STATUS_RANK[(x as { status?: keyof typeof STATUS_RANK })?.status as keyof typeof STATUS_RANK] ?? -1;
      if (before && "status" in before && p.provided.includes("status") && p.record.status !== "temporarily-unavailable" && rank(p.record) < rank(before)) {
        warnings.push(`${what} ${key}: kept stronger evidence (${(before as { status: string }).status}) — incoming ${String(p.record.status)} ignored`);
        unchanged.push(`${what} ${key}`);
        continue;
      }
      const merged = mergeOne(before, p.record, p.provided, defaults);
      const r = schema.safeParse(merged);
      if (!r.success) { errors.push(`${what} ${key}: ${r.error!.issues.map((i) => `${i.path.join(".") || "record"} ${i.message}`).join("; ")}`); continue; }
      if (!before) added.push(`${what} ${key}`);
      else if (JSON.stringify(before) === JSON.stringify(r.data)) unchanged.push(`${what} ${key}`);
      else updated.push(`${what} ${key}`);
      map.set(key, r.data as T);
    }
  };
  apply<ExperienceItem>(parsed.items, "item", (r) => String(r.id), items, ITEM_DEFAULTS(m), ExperienceItemSchema);
  apply<Establishment>(parsed.establishments, "establishment", (r) => String(r.id), ests, EST_DEFAULTS(m), EstablishmentSchema);
  apply<Offering>(parsed.offerings, "offering", (r) => `${r.itemId}@${r.establishmentId}`, offs, { isSample: false }, OfferingSchema);

  // Possible duplicates under different ids (same normalised name; same name + address)
  const byName = new Map<string, string>();
  for (const i of items.values()) {
    const k = normalizeVi(i.nameVi);
    if (byName.has(k) && byName.get(k) !== i.id) warnings.push(`possible duplicate items: ${byName.get(k)} and ${i.id} (“${i.nameVi}”)`);
    byName.set(k, i.id);
  }
  const byPlace = new Map<string, string>();
  for (const e of ests.values()) {
    const k = `${normalizeVi(e.name)}|${normalizeVi(e.address)}`;
    if (byPlace.has(k) && byPlace.get(k) !== e.id) warnings.push(`possible duplicate establishments: ${byPlace.get(k)} and ${e.id}`);
    byPlace.set(k, e.id);
  }
  for (const e of ests.values()) if (hcmc.length && !hcmc.some((g) => pointInGeometry(e.coordinates, g))) errors.push(`establishment ${e.id}: coordinates are outside Ho Chi Minh City`);

  const merged: ExperienceData = {
    metadata: { ...current.metadata, dataset: items.size ? (current.metadata.dataset === "empty" ? "seed" : current.metadata.dataset) : "empty", generatedAt: today() },
    items: [...items.values()], establishments: [...ests.values()], offerings: [...offs.values()],
  };
  errors.push(...moduleDataProblems(m, merged));
  return { kind, rows: parsed.items.length + parsed.establishments.length + parsed.offerings.length, errors: [...new Set(errors)], warnings, added, updated, unchanged, merged };
}

export function importReportMarkdown(m: ExperienceModule, r: ModuleImportReport, file: string, dryRun: boolean) {
  const list = (title: string, xs: string[]) => [`### ${title} (${xs.length})`, ...(xs.length ? xs.map((x) => `- ${x}`) : ["- none"]), ""];
  return [
    `# Import report — ${m.id}`, "", `File: \`${file}\` · kind: ${r.kind} · rows: ${r.rows} · ${dryRun ? "**dry run (nothing written)**" : "written"} · ${new Date().toISOString().slice(0, 10)}`, "",
    `Result: ${r.errors.length ? `**${r.errors.length} errors — not written**` : "valid"}; ${r.added.length} added, ${r.updated.length} updated, ${r.unchanged.length} unchanged; nothing deleted.`, "",
    ...list("Errors", r.errors), ...list("Warnings", r.warnings), ...list("Added", r.added), ...list("Updated", r.updated),
  ].join("\n");
}
