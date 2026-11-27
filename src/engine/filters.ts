/**
 * Shared filter logic for every non-Food module (Food keeps its richer DishFilters as its extension).
 * Filters come from the registry: category, filterable ITEM attributes (e.g. a drink's preparation),
 * filterable ESTABLISHMENT attributes (e.g. a café's Wi-Fi — an item matches when a verified HCMC
 * establishment offering it has that attribute), availability and personal filters.
 */
import type { ExperienceModule } from "@/experiences/registry";
import { matchesQuery } from "@/lib/search/normalize";
import type { OfferingIndex } from "./offering-index";
import type { Establishment, ExperienceItem, Offering } from "./schema";

export interface ModuleFilters {
  query: string;
  categories: string[];
  /** item attribute id → accepted values ("yes" for boolean attributes) */
  item: Record<string, string[]>;
  /** establishment attribute id → accepted values */
  est: Record<string, string[]>;
  availableOnly: boolean;
  tried: "any" | "tried" | "untried";
  savedOnly: boolean;
}
export const EMPTY_MODULE_FILTERS: ModuleFilters = { query: "", categories: [], item: {}, est: {}, availableOnly: false, tried: "any", savedOnly: false };

type Val = ExperienceItem["attributes"][string] | undefined;
const valueMatches = (v: Val, accepted: string[]) => {
  if (!accepted.length) return true;
  if (v === undefined) return false;
  if (typeof v === "boolean") return accepted.includes(v ? "yes" : "no");
  const vs = Array.isArray(v) ? v : [String(v)];
  return vs.some((x) => accepted.includes(x));
};

export function itemHaystack(m: ExperienceModule, i: ExperienceItem) {
  return m.searchable.map((f) => {
    if (f === "nameVi") return i.nameVi;
    if (f === "nameEn") return i.nameEn;
    if (f === "altNames") return i.altNames.join(" ");
    if (f === "description") return `${i.description.en} ${i.description.vi}`;
    const v = i.attributes[f.slice(5)];
    return Array.isArray(v) ? v.join(" ") : String(v ?? "");
  }).join(" ");
}

export function filterItems(
  m: ExperienceModule, items: ExperienceItem[], f: ModuleFilters,
  ctx: { index: OfferingIndex<Offering, Establishment>; saved: string[]; tried: Record<string, string> },
): ExperienceItem[] {
  const estFilters = Object.entries(f.est).filter(([, v]) => v.length);
  return items.filter((i) => {
    if (f.categories.length && !f.categories.includes(i.category)) return false;
    if (f.query.trim() && !matchesQuery(itemHaystack(m, i), f.query)) return false;
    for (const [k, acc] of Object.entries(f.item)) if (!valueMatches(i.attributes[k], acc)) return false;
    const offers = ctx.index.byItem.get(i.id) ?? [];
    if ((f.availableOnly || estFilters.length) && !offers.length) return false;
    if (estFilters.length && !offers.some((o) => {
      const e = ctx.index.establishments.get(o.establishmentId);
      return e && estFilters.every(([k, acc]) => valueMatches(e.attributes?.[k], acc));
    })) return false;
    if (f.tried === "tried" && !ctx.tried[i.id]) return false;
    if (f.tried === "untried" && ctx.tried[i.id]) return false;
    if (f.savedOnly && !ctx.saved.includes(i.id)) return false;
    return true;
  });
}

/** Establishments matching the establishment-attribute filters (map / Nearby). */
export const filterEstablishments = (es: Establishment[], f: ModuleFilters) =>
  es.filter((e) => Object.entries(f.est).every(([k, acc]) => valueMatches(e.attributes?.[k], acc)));
