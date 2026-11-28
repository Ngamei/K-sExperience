/**
 * Merges an imported catalogue into the existing one WITHOUT data loss (Sprint 3, Decision 1):
 * - existing dish IDs are kept; incoming rows match by id, then by accent-insensitive Vietnamese name;
 * - photos and sources are preserved (sources are unioned, photos kept unless the import supplies some);
 * - existing dishes absent from the import are kept and reported;
 * - imported rows are research candidates: "verified" without sources is downgraded to "pending-review".
 */
import { normalizeVi } from "../search/normalize";
import type { Dish } from "./schema";

export interface MergeReport {
  matched: { id: string; by: "id" | "name"; changes: string[] }[];
  added: string[];
  keptNotInImport: string[];
  downgraded: string[];
}

const FIELDS: (keyof Dish)[] = ["nameVi", "nameEn", "altNames", "category", "dishType", "family", "origins", "regionIds", "ingredients", "taste", "spiceLevel", "dietary", "mealTimes", "description", "prominence", "eating"];
const empty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && v !== null && !Array.isArray(v) && Object.values(v).every((x) => x === "" || x === undefined));

export function mergeCatalogues(
  existing: Dish[],
  incoming: Dish[],
  /** From ImportResult.provided: only these fields may overwrite existing values (defaults never do). */
  provided?: Record<string, (keyof Dish)[]>,
): { dishes: Dish[]; report: MergeReport } {
  const report: MergeReport = { matched: [], added: [], keptNotInImport: [], downgraded: [] };
  const byId = new Map(existing.map((d) => [d.id, d]));
  const byName = new Map(existing.map((d) => [normalizeVi(d.nameVi), d]));
  const result = new Map(existing.map((d) => [d.id, d]));
  const touched = new Set<string>();

  for (const inc of incoming) {
    let d = inc;
    if (d.verification.status === "verified" && d.sources.length === 0) {
      d = { ...d, verification: { ...d.verification, status: "pending-review", notes: "Downgraded on import: marked verified without sources." } };
      report.downgraded.push(d.id);
    }
    const hit = byId.get(d.id) ? { e: byId.get(d.id)!, by: "id" as const } : byName.get(normalizeVi(d.nameVi)) ? { e: byName.get(normalizeVi(d.nameVi))!, by: "name" as const } : null;
    if (!hit) {
      if (result.has(d.id)) { report.matched.push({ id: d.id, by: "id", changes: ["duplicate id in import ignored"] }); continue; }
      result.set(d.id, d);
      report.added.push(d.id);
      continue;
    }
    const e = hit.e;
    const merged: Dish = { ...e };
    const changes: string[] = [];
    const allowed = provided?.[inc.id];
    for (const f of FIELDS) {
      if (allowed && !allowed.includes(f)) continue;
      const v = d[f];
      if (empty(v)) continue; // never overwrite existing data with blanks
      if (f === "description") {
        const dv = v as Dish["description"];
        const next = { en: dv.en || e.description.en, vi: dv.vi || e.description.vi }; // a blank language never erases
        if (JSON.stringify(next) !== JSON.stringify(e.description)) { merged.description = next; changes.push(f); }
        continue;
      }
      if (JSON.stringify(v) !== JSON.stringify(e[f])) { (merged as Record<string, unknown>)[f] = v; changes.push(f); }
    }
    const seen = new Set(e.sources.map((s) => s.url ?? s.title));
    merged.sources = [...e.sources, ...d.sources.filter((s) => !seen.has(s.url ?? s.title))];
    if (merged.sources.length !== e.sources.length) changes.push("sources+");
    merged.photos = d.photos.length ? d.photos : e.photos;
    merged.dataset = "master";
    merged.verification = d.verification;
    merged.id = e.id; // keep existing id → links, saved dishes and URLs stay valid
    result.set(e.id, merged);
    touched.add(e.id);
    report.matched.push({ id: e.id, by: hit.by, changes });
  }
  for (const e of existing) if (!touched.has(e.id)) report.keptNotInImport.push(e.id);
  return { dishes: [...result.values()], report };
}
