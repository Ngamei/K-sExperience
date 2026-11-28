"use client";
/**
 * Shared Experience Engine screens for every non-Food module (Coffee is the reference pilot).
 * Same layout and patterns as the Food reference: item-first catalogue → item detail with the shared
 * establishment cards → HCMC establishment map / Nearby → passport, all driven by the registry config.
 */
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Check, MapPin, Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { loc, navFor, type AttributeDef, type ExperienceId, type L } from "@/experiences/registry";
import type { ExperienceItem, Offering } from "@/engine/schema";
import { offeringImage } from "@/engine/offering-image";
import { COPY, fill } from "@/engine/copy";
import { haversineKm } from "@/lib/geo/geo";
import { HCMC_CENTER } from "@/lib/food/hcmc";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { EMPTY_PASSPORT } from "@/lib/passport/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { moduleStats } from "@/lib/data/platform-stats";
import { ActiveFilterBar, CatalogueLayout, FilterDrawer, type ActiveChip, type FilterDef } from "./filter-drawer";
import { DetailBlock, OfferingsSection } from "./detail";
import { filterEstablishments, filterItems, type ModuleFilters } from "@/engine/filters";
import { useModuleFilters, useModuleFilterState } from "@/lib/store/module-filters";
import { StatusDot } from "@/components/food/badges";
import { NAV_ICONS } from "@/components/shell/icons";
import { OfferingRow } from "./offering-row";
import { ItemArt } from "./item-art";
import { itemSvg } from "./item-illustrations";
import { HeroPhoto, PhotoThumb, VenueThumb } from "@/components/food/dish-image";
import type { ModuleData } from "./experience-data";

const HcmcMap = dynamic(() => import("@/components/nearby/hcmc-map").then((m) => m.HcmcMap), { ssr: false, loading: () => <div className="h-full w-full bg-sea" /> });

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const priceText = (o: Offering) =>
  o.price ? `${o.price.minVnd.toLocaleString("vi-VN")}–${o.price.maxVnd.toLocaleString("vi-VN")} ₫ / ${o.price.unit}` : undefined;

/** Renders one attribute value with its option labels ("Phin filter", "Wi-Fi ✓"). */
function attrValue(def: AttributeDef, v: ExperienceItem["attributes"][string] | undefined, locale: "en" | "vi") {
  if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) return null;
  const label = (x: string) => { const opt = def.options?.find((o) => o.id === x); return opt ? loc(opt.label, locale) : x; };
  const s = Array.isArray(v) ? v.map(label).join(", ") : typeof v === "boolean" ? (v ? "✓" : "—") : label(String(v));
  return def.unit && loc(def.unit, locale) ? `${s} ${loc(def.unit, locale)}` : s;
}

/** Filter definitions for a module, generated from its registry config (no per-module code). */
function useModuleFilterDefs(d: ModuleData): { defs: FilterDef[]; chips: ActiveChip[]; f: ModuleFilters; clear: () => void } {
  const { locale } = useT();
  const m = d.module;
  const f = useModuleFilterState(m.id);
  const set = (patch: Partial<ModuleFilters>) => useModuleFilters.getState().set(m.id, patch);
  const toggle = (xs: string[], v: string) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);
  const optionsOf = (a: AttributeDef, values: ExperienceItem["attributes"][string][]) =>
    a.kind === "boolean" ? [{ value: "yes", label: loc(COPY.yes, locale) }]
      : (a.options ?? [...new Set(values.flatMap((v) => (Array.isArray(v) ? v : v === undefined ? [] : [String(v)])))].map((x) => ({ id: x, label: { en: x, vi: x } })))
          .map((o) => ({ value: o.id, label: loc(o.label, locale) }));
  const ests = [...d.index.establishments.values()];
  const defs: FilterDef[] = [
    { kind: "chips", id: "category", title: loc(COPY.categories, locale), options: m.categories.map((c) => ({ value: c.id, label: loc(c.name, locale), testid: `filter-cat-${c.id}`, icon: <ItemArt moduleId={m.id} category={c.id} accent={m.accent} size={20} className="-ml-1" /> })), selected: f.categories, onToggle: (v) => set({ categories: toggle(f.categories, v) }) },
    ...m.attributes.filter((a) => a.filterable).map((a): FilterDef => ({
      kind: "chips", id: `item-${a.id}`, title: loc(a.label, locale), options: optionsOf(a, d.items.map((i) => i.attributes[a.id])),
      selected: f.item[a.id] ?? [], onToggle: (v) => set({ item: { ...f.item, [a.id]: toggle(f.item[a.id] ?? [], v) } }),
    })),
    { kind: "heading", id: "hcmc", title: cap(fill(loc(COPY.inHcmc, locale), { establishments: loc(m.terms.establishments, locale) })), note: loc(COPY.estFilterNote, locale) },
    { kind: "chips", id: "available", title: loc(COPY.availability, locale), options: [{ value: "yes", label: loc(COPY.availableOnly, locale), testid: "filter-available" }], selected: f.availableOnly ? ["yes"] : [], onToggle: () => set({ availableOnly: !f.availableOnly }) },
    ...m.establishmentAttributes.filter((a) => a.filterable).map((a): FilterDef => ({
      kind: "chips", id: `est-${a.id}`, title: loc(a.label, locale), options: optionsOf(a, ests.map((e) => e.attributes?.[a.id])).map((o) => ({ ...o, testid: `filter-est-${a.id}-${o.value}` })),
      selected: f.est[a.id] ?? [], onToggle: (v) => set({ est: { ...f.est, [a.id]: toggle(f.est[a.id] ?? [], v) } }),
    })),
    { kind: "heading", id: "personal", title: loc(COPY.personal, locale) },
    { kind: "single", id: "tried", title: loc(m.terms.completed, locale), value: f.tried, onPick: (v) => set({ tried: v as ModuleFilters["tried"] }),
      options: [{ value: "any", label: loc(COPY.all, locale) }, { value: "tried", label: loc(m.terms.completed, locale) }, { value: "untried", label: loc(COPY.notYet, locale) }] },
    { kind: "chips", id: "saved", title: loc(COPY.saved, locale), options: [{ value: "yes", label: loc(COPY.savedOnly, locale) }], selected: f.savedOnly ? ["yes"] : [], onToggle: () => set({ savedOnly: !f.savedOnly }) },
  ];
  const labelFor = (defs_: FilterDef[], id: string, v: string) => {
    const dd = defs_.find((x) => x.id === id);
    return dd && (dd.kind === "chips" || dd.kind === "single") ? dd.options.find((o) => o.value === v)?.label ?? v : v;
  };
  const chips: ActiveChip[] = [
    ...(f.query.trim() ? [{ key: "q", label: `“${f.query}”`, onRemove: () => set({ query: "" }) }] : []),
    ...f.categories.map((c) => ({ key: `c-${c}`, label: labelFor(defs, "category", c), onRemove: () => set({ categories: f.categories.filter((x) => x !== c) }) })),
    ...Object.entries(f.item).flatMap(([k, vs]) => vs.map((v) => ({ key: `i-${k}-${v}`, label: labelFor(defs, `item-${k}`, v), onRemove: () => set({ item: { ...f.item, [k]: vs.filter((x) => x !== v) } }) }))),
    ...Object.entries(f.est).flatMap(([k, vs]) => vs.map((v) => ({ key: `e-${k}-${v}`, label: `${loc(m.establishmentAttributes.find((a) => a.id === k)?.label ?? { en: k, vi: k }, locale)}: ${labelFor(defs, `est-${k}`, v)}`, onRemove: () => set({ est: { ...f.est, [k]: vs.filter((x) => x !== v) } }) }))),
    ...(f.availableOnly ? [{ key: "avail", label: loc(COPY.availableOnly, locale), onRemove: () => set({ availableOnly: false }) }] : []),
    ...(f.tried !== "any" ? [{ key: "tried", label: f.tried === "tried" ? loc(m.terms.completed, locale) : loc(COPY.notYet, locale), onRemove: () => set({ tried: "any" }) }] : []),
    ...(f.savedOnly ? [{ key: "saved", label: loc(COPY.savedOnly, locale), onRemove: () => set({ savedOnly: false }) }] : []),
  ];
  return { defs, chips, f, clear: () => useModuleFilters.getState().clear(m.id) };
}

function usePassport(id: ExperienceId) {
  const p = useUser((s) => s.modulePassports[id]) ?? EMPTY_PASSPORT;
  return {
    p,
    toggleSaved: (itemId: string) => useUser.getState().toggleModuleSaved(id, itemId),
    toggleTried: (itemId: string) => useUser.getState().toggleModuleTried(id, itemId),
    toggleVisited: (eid: string) => useUser.getState().toggleModuleVisited(id, eid),
  };
}

function Header({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <header className="mb-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">{eyebrow}</p>
      <h1 className="font-display text-4xl text-forest md:text-5xl">{title}</h1>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </header>
  );
}

function Empty({ text, art }: { text: string; art?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line p-8 text-center text-muted" data-testid="module-empty">
      {art}
      <p>{text}</p>
    </div>
  );
}

/** Category badge with its illustration and the module accent (same role as Food's coloured category badge). */
function CategoryDot({ d, id }: { d: ModuleData; id: string }) {
  const { locale } = useT();
  const cat = d.module.categories.find((c) => c.id === id);
  if (!cat) return null;
  return (
    <span className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full py-0.5 pl-0.5 pr-2 text-[11px] font-medium" style={{ background: d.module.accent + "14", color: d.module.accent }} data-testid="category-badge">
      <ItemArt moduleId={d.module.id} category={id} size={18} accent={d.module.accent} />
      {loc(cat.name, locale)}
    </span>
  );
}

/* ------------------------------------------------------------------ catalogue */

/** The category an establishment offers most (e.g. Pilates studio vs pickleball court) — drives its marker and medallion. */
const topCategoryOf = (d: ModuleData, id: string) => {
  const counts = new Map<string, number>();
  for (const o of d.index.byEstablishment.get(id) ?? []) { const c = d.itemById.get(o.itemId)?.category; if (c) counts.set(c, (counts.get(c) ?? 0) + 1); }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? d.module.categories[0]?.id ?? "";
};

function EstablishmentArt({ d, id }: { d: ModuleData; id: string }) {
  return <ItemArt moduleId={d.module.id} category={topCategoryOf(d, id)} accent={d.module.accent} size={48} className="bg-ivory" />;
}

/** Offering thumbnail on an establishment page: same image-priority rule as the item page cards. */
function VenueOfferingThumb({ d, item, offering }: { d: ModuleData; item: ExperienceItem; offering: Offering }) {
  const img = offeringImage(item, offering);
  const [failed, setFailed] = useState<string | null>(null);
  return <VenueThumb image={img && img.url !== failed ? img : null} alt={`${item.nameVi}`} onError={setFailed} fallback={<ItemArt moduleId={d.module.id} category={item.category} accent={d.module.accent} size={44} />} />;
}

export function ItemCard({ d, item, places }: { d: ModuleData; item: ExperienceItem; /** Unique real establishments offering this item. */ places?: number }) {
  const { locale } = useT();
  const { p } = usePassport(d.module.id);
  const status = d.index.statusByItem.get(item.id) ?? "none-found";
  const cat = d.module.categories.find((c) => c.id === item.category);
  const defs = d.module.attributes.filter((a) => d.module.catalogue.cardAttributes.includes(a.id));
  return (
    <Link href={`${d.module.routes.item}?id=${item.id}`} className="group relative flex gap-3 rounded-2xl border border-line/80 bg-paper p-3 transition-all hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-[0_8px_24px_-12px_rgba(41,45,41,.25)]" data-testid="item-card" data-item-id={item.id}>
      <PhotoThumb photo={item.photos[0]} alt={item.nameVi} size={64} className="bg-ivory" fallback={<ItemArt moduleId={d.module.id} category={item.category} accent={d.module.accent} size={64} className="bg-ivory" />} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[17px] leading-tight group-hover:text-forest">{item.nameVi}</h3>
          <span className="flex shrink-0 gap-1 text-muted">
            {p.tried[item.id] && <Check className="size-4 text-forest" />}
            {p.saved.includes(item.id) && <Bookmark className="size-4 fill-terracotta text-terracotta" />}
          </span>
        </div>
        <p className="truncate text-xs text-muted">{item.nameEn}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {cat && <CategoryDot d={d} id={cat.id} />}
          {defs.map((a) => { const v = attrValue(a, item.attributes[a.id], locale); return v ? <Badge key={a.id} tone="outline" data-testid={`card-attr-${a.id}`}>{v}</Badge> : null; })}
          {item.verification.status !== "verified" && <Badge tone="outline" data-testid="item-unverified">{loc(COPY.unverified, locale)}</Badge>}
          {status !== "none-found" && <StatusDot status={status} />}
          {places !== undefined && places > 0 && <span className="inline-flex items-center gap-0.5 text-[11px] text-forest" data-testid="item-places"><MapPin className="size-3" />{places} {loc(places === 1 ? COPY.placeOne : COPY.placeMany, locale)}</span>}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-charcoal/75">{item.description[locale]}</p>
      </div>
    </Link>
  );
}

export function ItemCatalogue({ d }: { d: ModuleData }) {
  const { locale } = useT();
  const m = d.module;
  const { p } = usePassport(m.id);
  const { defs, chips, f, clear } = useModuleFilterDefs(d);
  const set = (patch: Partial<ModuleFilters>) => useModuleFilters.getState().set(m.id, patch);
  const items = useMemo(
    () => filterItems(m, d.items, f, { index: d.index, saved: p.saved, tried: p.tried }).sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi")),
    [m, d.items, d.index, f, p.saved, p.tried],
  );
  const items_ = loc(m.terms.items, locale);
  const stats = useMemo(() => moduleStats(d), [d]);
  return (
    <CatalogueLayout
      eyebrow={loc(m.name, locale)}
      summary={
        <p className="text-sm text-muted" data-testid="module-coverage">
          {stats.items} {items_} · {stats.linkedEstablishments} {loc(stats.linkedEstablishments === 1 ? COPY.placeOne : COPY.placeMany, locale)}
        </p>
      }
      title={loc(m.navLabels.catalogue, locale)}
      filters={<FilterDrawer defs={defs} testid="module-filter-panel" />}
      search={<input type="search" value={f.query} onChange={(e) => set({ query: e.target.value })} placeholder={fill(loc(COPY.search, locale), { items: items_ })} className="h-11 w-full rounded-full border border-line bg-paper px-4 text-sm outline-none focus:border-forest/50" data-testid="item-search" aria-label={fill(loc(COPY.search, locale), { items: items_ })} />}
      chipsRow={
        <div className="flex gap-2" data-testid="item-categories">
          {m.categories.map((c) => <Chip key={c.id} active={f.categories.includes(c.id)} onClick={() => set({ categories: f.categories.includes(c.id) ? f.categories.filter((x) => x !== c.id) : [...f.categories, c.id] })} data-testid={`item-cat-${c.id}`}><ItemArt moduleId={m.id} category={c.id} accent={m.accent} size={20} className="-ml-1" />{loc(c.name, locale)}</Chip>)}
        </div>
      }
      activeBar={<ActiveFilterBar countTestId="item-count" countLabel={(items.length < d.items.length ? `${items.length}/` : "") + fill(loc(COPY.results, locale), { n: items.length < d.items.length ? d.items.length : items.length, items: items.length === 1 && items.length === d.items.length ? loc(m.terms.item, locale) : items_ })} chips={chips} onClear={clear} clearLabel={loc(COPY.clearAll, locale)} />}
      filtersLabel={loc(COPY.filters, locale)}
      resultsTestId="item-results"
      empty={d.items.length === 0 ? <div className="mt-4"><Empty text={fill(loc(COPY.emptyItems, locale), { items: items_ })} /></div> : items.length === 0 ? <p className="py-16 text-center text-muted" data-testid="item-no-match">{loc(COPY.noMatch, locale)}</p> : null}
    >
      {items.map((i) => <ItemCard key={i.id} d={d} item={i} places={stats.placesByItem.get(i.id) ?? 0} />)}
    </CatalogueLayout>
  );
}

/* ------------------------------------------------------------------ item detail */

export function ItemDetail({ d }: { d: ModuleData }) {
  const { locale } = useT();
  const id = useSearchParams().get("id") ?? "";
  const item = d.itemById.get(id);
  const m = d.module;
  const { p, toggleSaved, toggleTried } = usePassport(m.id);
  if (!item) return <p className="px-4 py-20 text-center text-muted" data-testid="item-not-found">{loc(COPY.notFound, locale)}</p>;
  const offerings = d.index.byItem.get(item.id) ?? [];
  const status = d.index.statusByItem.get(item.id) ?? "none-found";
  const photo = item.photos[0];
  const cat = m.categories.find((c) => c.id === item.category);
  return (
    <article className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-6 md:py-10" data-testid="item-detail" data-item-id={item.id}>
      <Header eyebrow={`${loc(m.name, locale)}${cat ? ` · ${loc(cat.name, locale)}` : ""}`} title={item.nameVi} sub={item.nameEn} />
      <HeroPhoto photo={photo} alt={`${item.nameVi} — ${item.nameEn}`} creditLabel={loc(COPY.referencePhoto, locale)} testid="item-photo"
        fallback={
          <div className="paper-grain flex flex-col items-center justify-center gap-2 rounded-3xl border border-line/80 bg-ivory-deep/60 py-10" data-testid="item-illustration">
            <ItemArt moduleId={m.id} category={item.category} accent={m.accent} size={132} className="bg-paper shadow-[0_10px_30px_-14px_rgba(41,45,41,.45)]" />
            <span className="rounded-full bg-paper/95 px-2 py-0.5 text-[10.5px] text-muted shadow-sm">{loc(COPY.illustration, locale)}</span>
          </div>
        } />
      <p className="text-charcoal/85">{item.description[locale]}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={p.saved.includes(item.id) ? "primary" : "outline"} size="sm" onClick={() => toggleSaved(item.id)} data-testid="item-save"><Bookmark /> {loc(p.saved.includes(item.id) ? COPY.saved : COPY.save, locale)}</Button>
        <Button variant={p.tried[item.id] ? "primary" : "outline"} size="sm" onClick={() => toggleTried(item.id)} data-testid="item-tried"><Check /> {loc(m.terms.completed, locale)}</Button>
      </div>
      {m.detailSections.map((sec) =>
        sec.id === "offerings" ? (
          <OfferingsSection key={sec.id} testid="section-offerings" title={loc(sec.title, locale)} status={status} noneFoundBody={loc(COPY.noneFound, locale)} mapsQuery={item.nameVi}
            rows={offerings.map((o) => {
              const e = d.index.establishments.get(o.establishmentId)!;
              const vt = m.establishmentAttributes[0];
              const typeLabel = (vt && attrValue(vt, e.attributes?.[vt.id], locale)) || e.venueType;
              return <OfferingRow key={o.establishmentId} establishment={e} typeLabel={typeLabel} href={`${m.routes.establishment}?id=${e.id}`} offering={o} priceText={priceText(o)} image={offeringImage(item, o)} itemName={item.nameVi} itemNoun={loc(m.terms.item, locale)}
                fallback={<ItemArt moduleId={m.id} category={item.category} accent={m.accent} size={48} />} />;
            })} />
        ) : (
          <DetailBlock key={sec.id} title={loc(sec.title, locale)} testid={`section-${sec.id}`}>
            <dl className="grid gap-2 sm:grid-cols-2">
              {m.attributes.filter((a) => sec.attributes?.includes(a.id)).map((a) => {
                const v = attrValue(a, item.attributes[a.id], locale);
                return v ? <div key={a.id} data-testid={`attr-${a.id}`}><dt className="text-xs text-muted">{loc(a.label, locale)}</dt><dd>{v}</dd></div> : null;
              })}
            </dl>
          </DetailBlock>
        ),
      )}
      <DetailBlock title={loc(COPY.sourcesTitle, locale)} testid="item-sources">
        <p className="mb-2 text-sm" data-testid="item-verification">
          {item.verification.status === "verified" ? loc(COPY.verifiedItem, locale) : loc(COPY.unverifiedItem, locale)}
        </p>
        <ul className="space-y-1 text-xs text-muted">
          {item.sources.map((s) => <li key={s.title}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.title}</a> : s.title}</li>)}
        </ul>
      </DetailBlock>
    </article>
  );
}

/* ------------------------------------------------------------------ establishments: map, nearby, detail */

export function EstablishmentsView({ d, title }: { d: ModuleData; title: L }) {
  const { locale } = useT();
  const m = d.module;
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [selected, setSelected] = useState<string | null>(null);
  const { p, toggleVisited } = usePassport(m.id);
  const f = useModuleFilterState(m.id);
  const set = (patch: Partial<ModuleFilters>) => useModuleFilters.getState().set(m.id, patch);
  const list = useMemo(
    () => filterEstablishments([...d.index.establishments.values()], f).map((e) => ({ e, km: haversineKm(HCMC_CENTER, e.coordinates) })).sort((a, b) => a.km - b.km),
    [d.index, f],
  );
  const estFilters = m.establishmentAttributes.filter((a) => a.filterable);
  const detail = id ? d.index.establishments.get(id) : undefined;
  if (detail) {
    const offers = d.index.byEstablishment.get(detail.id) ?? [];
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-6 md:py-10" data-testid="establishment-detail">
        <Header eyebrow={loc(m.terms.establishment, locale)} title={detail.name} sub={detail.address} />
        {detail.coordinatePrecision === "street" && <p className="text-xs text-[#8a6420]" data-testid="approx-location">{loc(COPY.approxLocation, locale)}</p>}
        {detail.coordinatePrecision === "building" && <p className="text-xs text-[#8a6420]" data-testid="building-location">{loc(COPY.buildingLocation, locale)}</p>}
        <Button variant={p.visited[detail.id] ? "primary" : "outline"} size="sm" onClick={() => toggleVisited(detail.id)} data-testid="establishment-visited"><Check /> {loc(COPY.visited, locale)}</Button>
        {m.establishmentAttributes.some((a) => attrValue(a, detail.attributes?.[a.id], locale)) && (
          <DetailBlock title={loc(COPY.features, locale)} testid="establishment-features">
            <dl className="grid gap-2 sm:grid-cols-2">
              {m.establishmentAttributes.map((a) => {
                const v = attrValue(a, detail.attributes?.[a.id], locale);
                return v ? <div key={a.id} data-testid={`est-attr-${a.id}`}><dt className="text-xs text-muted">{loc(a.label, locale)}</dt><dd>{v}</dd></div> : null;
              })}
            </dl>
          </DetailBlock>
        )}
        {detail.openingHours && (
          <DetailBlock title={loc(COPY.hours, locale)} testid="establishment-hours">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map((day) => (
                <div key={day} className="contents"><dt className="text-muted">{day}</dt><dd>{detail.openingHours![day].map(([a, b]) => `${a}–${b}`).join(", ") || "—"}</dd></div>
              ))}
            </dl>
          </DetailBlock>
        )}
        <p className="text-xs text-muted" data-testid="establishment-sources">{detail.sources.map((src) => src.url ? <a key={src.title} href={src.url} target="_blank" rel="noreferrer" className="mr-2 underline">{src.title}</a> : <span key={src.title} className="mr-2">{src.title}</span>)}{detail.lastVerified ? ` · ${loc(COPY.lastChecked, locale)} ${detail.lastVerified}` : ""}</p>
        <h2 className="font-display text-xl text-forest">{loc(COPY.offers, locale)}</h2>
        <div className="grid gap-2">
          {offers.map((o) => {
            const item = d.itemById.get(o.itemId);
            return item ? (
              <Link key={o.itemId} href={`${m.routes.item}?id=${item.id}`} className="flex items-center gap-3 rounded-2xl border border-line/80 bg-paper p-3 hover:border-forest/30" data-testid="establishment-offering">
                <VenueOfferingThumb d={d} item={item} offering={o} />
                <span className="min-w-0 flex-1"><span className="block font-medium">{item.nameVi}</span><span className="text-xs text-muted">{item.nameEn}{priceText(o) ? ` · ${priceText(o)}` : ""}</span></span>
                <StatusDot status={o.status} />
              </Link>
            ) : null;
          })}
        </div>
        {detail.googleMapsUrl && <a href={detail.googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-forest px-3 py-1.5 text-sm text-ivory"><MapPin className="size-4" /> Google Maps</a>}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative h-[42%] shrink-0 lg:h-full lg:flex-1 lg:border-r lg:border-line">
        <HcmcMap venues={list.map((x) => x.e)} origin={HCMC_CENTER} selected={selected} onSelect={(eid) => { setSelected(eid); router.push(`${m.routes.establishment}?id=${eid}`); }}
          marker={(eid) => ({ svg: itemSvg(`${m.id}:${topCategoryOf(d, eid)}`, 26), accent: m.accent })} />
      </div>
      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:max-w-xl lg:px-6 lg:py-6">
        <h1 className="font-display text-3xl text-forest">{loc(title, locale)}</h1>
        <p className="mb-3 text-sm text-muted">{loc(m.name, locale)} · <span data-testid="establishment-count">{list.length < d.index.establishments.size ? `${list.length}/${d.index.establishments.size}` : list.length}</span> {loc(m.terms.establishments, locale).toLowerCase()}</p>
        {estFilters.length > 0 && d.index.establishments.size > 0 && (
          <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto" data-testid="establishment-filters">
            {estFilters.flatMap((a) => (a.kind === "boolean" ? [{ v: "yes", l: loc(a.label, locale) }] : (a.options ?? []).map((o) => ({ v: o.id, l: loc(o.label, locale) }))).map(({ v, l }) => {
              const on = (f.est[a.id] ?? []).includes(v);
              return <Chip key={`${a.id}-${v}`} active={on} onClick={() => set({ est: { ...f.est, [a.id]: on ? (f.est[a.id] ?? []).filter((x) => x !== v) : [...(f.est[a.id] ?? []), v] } })} data-testid={`est-chip-${a.id}-${v}`}>{l}</Chip>;
            }))}
          </div>
        )}
        {list.length === 0 ? <Empty text={fill(loc(COPY.emptyEstablishments, locale), { establishments: loc(m.terms.establishments, locale) })} art={<ItemArt moduleId={m.id} category={m.categories[0]?.id ?? ""} accent={m.accent} size={72} />} /> : (
          <div className="grid gap-2" data-testid="establishment-list">
            {list.map(({ e, km }) => (
              <Link key={e.id} href={`${m.routes.establishment}?id=${e.id}`} className="flex items-center gap-3 rounded-2xl border border-line/80 bg-paper p-3 hover:border-forest/30" data-testid="establishment-card">
                <EstablishmentArt d={d} id={e.id} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{e.name}</span>
                  <span className="block text-xs text-muted">{e.address} · {fill(loc(COPY.kmAway, locale), { km: km.toFixed(1) })}</span>
                  <span className="mt-1 block truncate text-[11.5px] text-forest">{(d.index.byEstablishment.get(e.id) ?? []).map((o) => d.itemById.get(o.itemId)?.nameVi).filter(Boolean).join(" · ")}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ discover, passport, saved */

export function ModuleDiscover({ d }: { d: ModuleData }) {
  const { locale } = useT();
  const router = useRouter();
  const m = d.module;
  const pool = d.items.filter((i) => d.index.byItem.has(i.id));
  const surprise = () => {
    const from = pool.length ? pool : d.items;
    if (from.length) router.push(`${m.routes.item}?id=${from[Math.floor(Math.random() * from.length)].id}`);
  };
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <Header eyebrow={`${loc(m.name, locale)} · Ho Chi Minh City`} title={loc(m.navLabels.discover, locale)} sub={m.offerings.map((o) => loc(o, locale)).join(" · ")} />
      <Button onClick={surprise} disabled={!d.items.length} data-testid="module-surprise"><Shuffle /> {loc(COPY.surprise, locale)}</Button>
      <h2 className="mt-8 font-display text-2xl text-forest">{loc(COPY.categories, locale)}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {m.categories.map((c) => (
          <Link key={c.id} href={m.routes.catalogue} onClick={() => useModuleFilters.getState().set(m.id, { categories: [c.id] })}
            className="flex items-center gap-3 rounded-3xl border border-line/80 bg-paper p-4 font-display text-lg transition-all hover:-translate-y-0.5 hover:border-forest/40" data-testid={`discover-cat-${c.id}`}>
            <ItemArt moduleId={m.id} category={c.id} accent={m.accent} size={56} className="bg-ivory" />
            <span>{loc(c.name, locale)}<span className="block font-sans text-xs text-muted">{d.items.filter((i) => i.category === c.id).length} {loc(m.terms.items, locale)}</span></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ModulePassport({ d }: { d: ModuleData }) {
  const { locale } = useT();
  const m = d.module;
  const { p } = usePassport(m.id);
  const Icon = NAV_ICONS[m.icon];
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-10">
      <div className="paper-grain rounded-[2rem] border border-line/80 bg-sage-soft p-6 text-forest md:p-10" data-testid="module-passport">
        <Icon className="size-7 text-forest/70" />
        <h1 className="font-display text-4xl">{loc(m.passport.name, locale)}</h1>
        <p className="text-forest/70">{loc(m.passport.summary, locale)}</p>
        <dl className="mt-6 grid grid-cols-3 gap-4">
          <div><dt className="text-xs text-forest/70">{loc(m.terms.completed, locale)}</dt><dd className="font-display text-4xl" data-testid="module-passport-tried">{Object.keys(p.tried).length}<span className="text-lg text-forest/70">/{d.items.length}</span></dd></div>
          <div><dt className="text-xs text-forest/70">{loc(COPY.visited, locale)}</dt><dd className="font-display text-4xl" data-testid="module-passport-visited">{Object.keys(p.visited).length}</dd></div>
          <div><dt className="text-xs text-forest/70">{loc(COPY.saved, locale)}</dt><dd className="font-display text-4xl">{p.saved.length}</dd></div>
        </dl>
      </div>
      <h2 className="mt-8 font-display text-2xl text-forest">{loc(m.terms.completed, locale)}</h2>
      {Object.keys(p.tried).length === 0 ? (
        <div className="mt-3"><Empty text={loc(COPY.nothingYet, locale)} art={<ItemArt moduleId={m.id} category={m.categories[0]?.id ?? ""} accent={m.accent} size={72} />} /></div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="module-stamps">
          {Object.entries(p.tried).sort((x, y) => y[1].localeCompare(x[1])).map(([iid, date], k) => {
            const it = d.itemById.get(iid);
            return it ? (
              <Link key={iid} href={`${m.routes.item}?id=${iid}`} className="flex flex-col items-center rounded-3xl border-2 border-dashed border-terracotta/40 bg-paper p-4 text-center hover:border-terracotta" style={{ transform: `rotate(${((k * 37) % 7) - 3}deg)` }}>
                <PhotoThumb photo={it.photos[0]} alt={it.nameVi} size={60} fallback={<ItemArt moduleId={m.id} category={it.category} accent={m.accent} size={60} className="bg-ivory" />} />
                <span className="mt-2 font-display text-sm leading-tight">{it.nameVi}</span>
                <span className="text-[10px] uppercase tracking-wider text-terracotta">{date}</span>
              </Link>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

export function ModuleSaved({ d }: { d: ModuleData }) {
  const { locale } = useT();
  const { p } = usePassport(d.module.id);
  const items = p.saved.map((id) => d.itemById.get(id)).filter((x): x is ExperienceItem => Boolean(x));
  const saved = navFor(d.module).find((n) => n.slot === "saved")!;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10" data-testid="module-saved">
      <Header eyebrow={loc(d.module.name, locale)} title={loc(saved.label, locale)} />
      {items.length === 0 ? <Empty text={loc(COPY.nothingSaved, locale)} art={<ItemArt moduleId={d.module.id} category={d.module.categories[0]?.id ?? ""} accent={d.module.accent} size={72} />} /> : <div className="grid gap-3 sm:grid-cols-2">{items.map((i) => <ItemCard key={i.id} d={d} item={i} />)}</div>}
    </div>
  );
}
