/**
 * Business-profile enrichment of EXISTING establishments (research-exchange batches with `enrich: true` venues).
 *
 * A normal venues batch creates a venue or, when the id already exists, only adds new dish links. An enrichment
 * venue must name an existing id; it never creates a record and never removes anything. It may add or update:
 *   contact {phone, website, social} · openingHours · priceRange · closure · priceVnd on dish links
 * Every changed profile field must name the URL it came from (`fieldSources`); that URL is added to the venue's
 * `sources` with a note listing the fields it supports, so field-level provenance survives in the canonical data.
 * Pure: used by scripts/import-restaurants.ts and the unit tests.
 */
export const ENRICH_FIELDS = ["phone", "website", "social", "openingHours", "priceRange", "closure"] as const;
export type EnrichField = (typeof ENRICH_FIELDS)[number];

type Source = { title: string; url?: string; accessed?: string; note?: string };
type DishEntry = { dishId: string; evidence?: string; url?: string; priceVnd?: { min: number; max: number }; [k: string]: unknown };
export type EnrichableRecord = {
  id: string;
  contact?: { phone?: string; website?: string; social?: string };
  openingHours?: unknown; priceRange?: string; closure?: unknown;
  sources: Source[]; lastVerified?: string; dishes: DishEntry[];
  [k: string]: unknown;
};
export type EnrichVenue = {
  sources: string[];
  contact?: { phone?: string; website?: string; social?: string };
  openingHours?: unknown; priceRange?: string | null; closure?: unknown;
  fieldSources?: Partial<Record<EnrichField, string>>;
  dishes?: (string | DishEntry)[];
  note?: string;
};

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const fmt = (n: number) => n.toLocaleString("en-US").replace(/,/g, ".");

/** Applies one enrichment venue to an existing record (mutates and returns the list of changes). */
export function applyEnrichment(rec: EnrichableRecord, v: EnrichVenue, checkedOn: string): string[] {
  const changes: string[] = [];
  const supports = new Map<string, string[]>(); // url → fields it supports
  const cite = (url: string | undefined, what: string) => { if (url) supports.set(url, [...(supports.get(url) ?? []), what]); };

  for (const k of ["phone", "website", "social"] as const) {
    const val = v.contact?.[k];
    if (!val || rec.contact?.[k] === val) continue;
    rec.contact = { ...rec.contact, [k]: val };
    changes.push(k); cite(v.fieldSources?.[k], k);
  }
  if (v.openingHours && JSON.stringify(rec.openingHours) !== JSON.stringify(v.openingHours)) {
    rec.openingHours = v.openingHours; changes.push("openingHours"); cite(v.fieldSources?.openingHours, "opening hours");
  }
  if (v.priceRange && rec.priceRange !== v.priceRange) {
    rec.priceRange = v.priceRange; changes.push("priceRange"); cite(v.fieldSources?.priceRange, "price range");
  }
  if (v.closure && JSON.stringify(rec.closure) !== JSON.stringify(v.closure)) {
    rec.closure = v.closure; changes.push("closure"); cite(v.fieldSources?.closure, "closure");
  }
  for (const d of v.dishes ?? []) {
    const entry: DishEntry = typeof d === "string" ? { dishId: d } : d;
    const cur = rec.dishes.find((e) => e.dishId === entry.dishId);
    if (!cur) {
      rec.dishes.push({ ...entry, evidence: entry.evidence ?? `Listed for this dish by a published source.${v.note ? " " + v.note : ""}`, url: entry.url ?? v.sources[0] });
      changes.push(`link:${entry.dishId}`); cite(entry.url ?? v.sources[0], `dish ${entry.dishId}`);
      continue;
    }
    if (entry.priceVnd && (cur.priceVnd?.min !== entry.priceVnd.min || cur.priceVnd?.max !== entry.priceVnd.max)) {
      cur.priceVnd = entry.priceVnd;
      const p = entry.priceVnd.min === entry.priceVnd.max ? `${fmt(entry.priceVnd.min)} VND` : `${fmt(entry.priceVnd.min)}–${fmt(entry.priceVnd.max)} VND`;
      cur.evidence = `${cur.evidence ?? ""} Price ${p} per ${host(entry.url ?? v.sources[0])} (checked ${checkedOn}).`.trim();
      changes.push(`price:${entry.dishId}`); cite(entry.url ?? v.sources[0], `price of ${entry.dishId}`);
    }
  }
  // provenance: every supporting URL is a venue source, with the fields it supports in its note
  for (const [url, fields] of supports) {
    const note = `Source for: ${fields.join(", ")} (checked ${checkedOn})`;
    const s = rec.sources.find((x) => x.url === url);
    if (s) s.note = s.note ? `${s.note}; ${note}` : note;
    else rec.sources.push({ title: host(url), url, accessed: checkedOn, note });
  }
  // the batch's other sources corroborate the change (e.g. a second listing with the same phone)
  if (changes.length) for (const url of v.sources) {
    if (!rec.sources.some((x) => x.url === url)) rec.sources.push({ title: host(url), url, accessed: checkedOn, note: `Corroborating source for this venue's enrichment (checked ${checkedOn})` });
  }
  if (changes.length) rec.lastVerified = checkedOn;
  return changes;
}

/** Contract checks for an enrichment venue (beyond the zod shape). Returns problems; empty = ok. */
export function enrichProblems(v: EnrichVenue & { id?: string; enrich?: boolean; lon?: number | null; lat?: number | null }): string[] {
  const out: string[] = [];
  if (!v.id) out.push("enrich venues must give the existing establishment id");
  if (v.lon != null || v.lat != null) out.push("enrich venues keep the existing coordinates — omit lon/lat");
  const given: EnrichField[] = [
    ...(["phone", "website", "social"] as const).filter((k) => v.contact?.[k]),
    ...(v.openingHours ? (["openingHours"] as const) : []),
    ...(v.priceRange ? (["priceRange"] as const) : []),
    ...(v.closure ? (["closure"] as const) : []),
  ];
  for (const f of given) {
    const u = v.fieldSources?.[f];
    if (!u) out.push(`${f}: needs fieldSources.${f} (the URL it was read from)`);
    else if (!v.sources.includes(u)) out.push(`${f}: fieldSources.${f} must also be listed in sources`);
  }
  for (const d of v.dishes ?? []) if (typeof d !== "string" && d.priceVnd && !d.url) out.push(`price for ${d.dishId}: needs the url it was read from`);
  if (!given.length && !(v.dishes ?? []).length) out.push("enrich venue adds nothing (no contact, hours, price range, closure or dish prices)");
  return out;
}
