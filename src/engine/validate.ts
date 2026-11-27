/**
 * Module-aware validation for shared-engine data (used by the importer, Admin and the integration test).
 * Zod checks the shape; this checks the data against the module's registry configuration:
 * categories, attribute ids and controlled vocabularies — and keeps item attributes (on drinks, treatments…)
 * separate from establishment attributes (on cafés, spas…).
 */
import type { AttributeDef, ExperienceModule } from "@/experiences/registry";
import type { Establishment, ExperienceData, ExperienceItem, Offering } from "./schema";

type Value = ExperienceItem["attributes"][string];

export function attributeProblems(defs: AttributeDef[], values: Record<string, Value>, where: string, otherDefs: AttributeDef[] = []): string[] {
  const out: string[] = [];
  const byId = new Map(defs.map((d) => [d.id, d]));
  for (const [k, v] of Object.entries(values)) {
    const d = byId.get(k);
    if (!d) {
      out.push(otherDefs.some((x) => x.id === k)
        ? `${where}: "${k}" belongs on the other record type (item vs establishment attributes must not be mixed)`
        : `${where}: unknown attribute "${k}"`);
      continue;
    }
    const kindOk = d.kind === "list" ? Array.isArray(v) : d.kind === "boolean" ? typeof v === "boolean" : d.kind === "number" ? typeof v === "number" : typeof v === "string";
    if (!kindOk) { out.push(`${where}: "${k}" must be ${d.kind}`); continue; }
    if (d.options) {
      const allowed = new Set(d.options.map((o) => o.id));
      for (const x of Array.isArray(v) ? v : [v]) if (typeof x === "string" && !allowed.has(x)) out.push(`${where}: "${k}" value "${x}" is not one of ${[...allowed].join(", ")}`);
    }
  }
  return out;
}

export const itemProblems = (m: ExperienceModule, i: ExperienceItem) => [
  ...(i.experienceId !== m.id ? [`item ${i.id}: belongs to ${i.experienceId}, not ${m.id}`] : []),
  ...(!m.categories.some((c) => c.id === i.category) ? [`item ${i.id}: unknown category "${i.category}" (allowed: ${m.categories.map((c) => c.id).join(", ")})`] : []),
  ...attributeProblems(m.attributes, i.attributes, `item ${i.id}`, m.establishmentAttributes),
  ...(i.verification.status === "verified" && !i.sources.some((s) => s.url) ? [`item ${i.id}: "verified" needs a source URL`] : []),
];

export const establishmentProblems = (m: ExperienceModule, e: Establishment) => [
  ...(!e.experiences.includes(m.id) ? [`establishment ${e.id}: not tagged with ${m.id}`] : []),
  ...attributeProblems(m.establishmentAttributes, e.attributes ?? {}, `establishment ${e.id}`, m.attributes),
  ...(!e.isSample && !e.sources.some((s) => s.url) ? [`establishment ${e.id}: needs at least one source URL`] : []),
];

export const offeringProblems = (m: ExperienceModule, o: Offering, items: Set<string>, ests: Set<string>) => [
  ...(!items.has(o.itemId) ? [`offering ${o.itemId}@${o.establishmentId}: unknown item`] : []),
  ...(!ests.has(o.establishmentId) ? [`offering ${o.itemId}@${o.establishmentId}: unknown establishment`] : []),
  ...(o.price && !m.pricingUnits.includes(o.price.unit as never) ? [`offering ${o.itemId}@${o.establishmentId}: price unit "${o.price.unit}" not in ${m.pricingUnits.join(", ")}`] : []),
  ...(o.price && o.price.minVnd > o.price.maxVnd ? [`offering ${o.itemId}@${o.establishmentId}: price min > max`] : []),
];

/** All module-level problems of a dataset (empty = valid). */
export function moduleDataProblems(m: ExperienceModule, d: ExperienceData): string[] {
  const items = new Set(d.items.map((i) => i.id));
  const ests = new Set(d.establishments.map((e) => e.id));
  const dup = (ids: string[], what: string) => ids.filter((x, i) => ids.indexOf(x) !== i).map((x) => `duplicate ${what} id ${x}`);
  return [
    ...(d.metadata.experienceId !== m.id ? [`file is for ${d.metadata.experienceId}, not ${m.id}`] : []),
    ...dup(d.items.map((i) => i.id), "item"),
    ...dup(d.establishments.map((e) => e.id), "establishment"),
    ...dup(d.offerings.map((o) => `${o.itemId}@${o.establishmentId}`), "offering"),
    ...d.items.flatMap((i) => itemProblems(m, i)),
    ...d.establishments.flatMap((e) => establishmentProblems(m, e)),
    ...d.offerings.flatMap((o) => offeringProblems(m, o, items, ests)),
  ];
}
