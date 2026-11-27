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
import { matchesQuery } from "@/lib/search/normalize";
import { haversineKm } from "@/lib/geo/geo";
import { HCMC_CENTER } from "@/lib/food/hcmc";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { EMPTY_PASSPORT } from "@/lib/passport/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { StatusDot } from "@/components/food/badges";
import { NAV_ICONS } from "@/components/shell/icons";
import { OfferingRow } from "./offering-row";
import type { ModuleData } from "./experience-data";

const HcmcMap = dynamic(() => import("@/components/nearby/hcmc-map").then((m) => m.HcmcMap), { ssr: false, loading: () => <div className="h-full w-full bg-sea" /> });

const priceText = (o: Offering) =>
  o.price ? `${o.price.minVnd.toLocaleString("vi-VN")}–${o.price.maxVnd.toLocaleString("vi-VN")} ₫ / ${o.price.unit}` : undefined;

/** Renders one module attribute value ("3 min", "Phin, Espresso"). */
function attrValue(def: AttributeDef, v: ExperienceItem["attributes"][string] | undefined, locale: "en" | "vi") {
  if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) return null;
  const s = Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "✓" : "—") : String(v);
  return def.unit ? `${s} ${loc(def.unit, locale)}` : s;
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

function Empty({ text }: { text: string }) {
  return <p className="rounded-3xl border border-dashed border-line p-8 text-center text-muted" data-testid="module-empty">{text}</p>;
}

/* ------------------------------------------------------------------ catalogue */

export function ItemCard({ d, item }: { d: ModuleData; item: ExperienceItem }) {
  const { locale } = useT();
  const { p } = usePassport(d.module.id);
  const status = d.index.statusByItem.get(item.id) ?? "none-found";
  const cat = d.module.categories.find((c) => c.id === item.category);
  const defs = d.module.attributes.filter((a) => d.module.catalogue.cardAttributes.includes(a.id));
  return (
    <Link href={`${d.module.routes.item}?id=${item.id}`} className="group flex gap-3 rounded-2xl border border-line/80 bg-paper p-3 hover:border-forest/30" data-testid="item-card" data-item-id={item.id}>
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
          {cat && <Badge tone="outline">{loc(cat.name, locale)}</Badge>}
          {defs.map((a) => { const v = attrValue(a, item.attributes[a.id], locale); return v ? <Badge key={a.id} tone="outline" data-testid={`card-attr-${a.id}`}>{v}</Badge> : null; })}
          {item.dataset === "seed" && <Badge tone="sample">{loc(COPY.seed, locale)}</Badge>}
          {status !== "none-found" && <StatusDot status={status} />}
        </div>
      </div>
    </Link>
  );
}

export function ItemCatalogue({ d }: { d: ModuleData }) {
  const { locale } = useT();
  const m = d.module;
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const items = useMemo(() => {
    const hay = (i: ExperienceItem) =>
      m.searchable.map((f) => {
        if (f === "nameVi") return i.nameVi;
        if (f === "nameEn") return i.nameEn;
        if (f === "altNames") return i.altNames.join(" ");
        if (f === "description") return `${i.description.en} ${i.description.vi}`;
        const v = i.attributes[f.slice(5)];
        return Array.isArray(v) ? v.join(" ") : String(v ?? "");
      }).join(" ");
    return d.items
      .filter((i) => (!cat || i.category === cat) && (!q.trim() || matchesQuery(hay(i), q)))
      .sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi"));
  }, [d.items, m.searchable, q, cat]);
  const items_ = loc(m.terms.items, locale);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <Header eyebrow={loc(m.name, locale)} title={loc(m.navLabels.catalogue, locale)} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={fill(loc(COPY.search, locale), { items: items_ })} className="h-11 w-full rounded-full border border-line bg-paper px-4 text-sm" data-testid="item-search" />
      <div className="mt-3 flex flex-wrap gap-2" data-testid="item-categories">
        <Chip active={!cat} onClick={() => setCat(null)}>{loc(COPY.all, locale)}</Chip>
        {m.categories.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(cat === c.id ? null : c.id)} data-testid={`item-cat-${c.id}`}>{loc(c.name, locale)}</Chip>)}
      </div>
      <p className="mt-3 text-sm text-muted" data-testid="item-count">{fill(loc(COPY.results, locale), { n: items.length, items: items.length === 1 ? loc(m.terms.item, locale) : items_ })}</p>
      {d.items.length === 0 ? (
        <div className="mt-4"><Empty text={fill(loc(COPY.emptyItems, locale), { items: items_ })} /></div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="item-results">{items.map((i) => <ItemCard key={i.id} d={d} item={i} />)}</div>
      )}
    </div>
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
  const photo = item.photos[0];
  return (
    <article className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-6 md:py-10" data-testid="item-detail" data-item-id={item.id}>
      <Header eyebrow={loc(m.name, locale)} title={item.nameVi} sub={item.nameEn} />
      {photo && (
        <figure className="overflow-hidden rounded-3xl border border-line/80 bg-paper" data-testid="item-photo">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote licensed image */}
          <img src={photo.url} alt={`${item.nameVi} — ${item.nameEn}`} className="aspect-[4/3] w-full object-cover" />
          <figcaption className="px-4 py-2 text-[11px] text-muted">{photo.credit} · {photo.license}</figcaption>
        </figure>
      )}
      <p className="text-charcoal/85">{item.description[locale]}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant={p.saved.includes(item.id) ? "primary" : "outline"} size="sm" onClick={() => toggleSaved(item.id)} data-testid="item-save"><Bookmark /> {loc(p.saved.includes(item.id) ? COPY.saved : COPY.save, locale)}</Button>
        <Button variant={p.tried[item.id] ? "primary" : "outline"} size="sm" onClick={() => toggleTried(item.id)} data-testid="item-tried"><Check /> {loc(m.terms.completed, locale)}</Button>
        {item.dataset === "seed" && <Badge tone="sample">{loc(COPY.seed, locale)}</Badge>}
      </div>
      {m.detailSections.map((sec) => (
        <section key={sec.id} className="rounded-3xl border border-line/80 bg-paper p-5" data-testid={`section-${sec.id}`}>
          <h2 className="mb-3 font-display text-xl text-forest">{loc(sec.title, locale)}</h2>
          {sec.id === "offerings" ? (
            offerings.length ? (
              <div className="grid gap-2">
                {offerings.map((o) => {
                  const e = d.index.establishments.get(o.establishmentId)!;
                  return (
                    <OfferingRow key={o.establishmentId} establishment={e} typeLabel={e.venueType} href={`${m.routes.establishment}?id=${e.id}`} offering={o}
                      priceText={priceText(o)} image={offeringImage(item, o)} itemName={item.nameVi} />
                  );
                })}
              </div>
            ) : <div data-testid="none-found"><StatusDot status="none-found" /><p className="mt-2 text-sm text-charcoal/80">{loc(COPY.noneFound, locale)}</p></div>
          ) : (
            <dl className="grid gap-2 sm:grid-cols-2">
              {m.attributes.filter((a) => sec.attributes?.includes(a.id)).map((a) => {
                const v = attrValue(a, item.attributes[a.id], locale);
                return v ? <div key={a.id} data-testid={`attr-${a.id}`}><dt className="text-xs text-muted">{loc(a.label, locale)}</dt><dd>{v}</dd></div> : null;
              })}
            </dl>
          )}
        </section>
      ))}
      {item.sources.length > 0 && (
        <section className="text-xs text-muted" data-testid="item-sources">
          {item.sources.map((s) => <p key={s.title}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="underline">{s.title}</a> : s.title}</p>)}
        </section>
      )}
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
  const list = useMemo(
    () => [...d.index.establishments.values()].map((e) => ({ e, km: haversineKm(HCMC_CENTER, e.coordinates) })).sort((a, b) => a.km - b.km),
    [d.index],
  );
  const detail = id ? d.index.establishments.get(id) : undefined;
  if (detail) {
    const offers = d.index.byEstablishment.get(detail.id) ?? [];
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-6 md:py-10" data-testid="establishment-detail">
        <Header eyebrow={loc(m.terms.establishment, locale)} title={detail.name} sub={detail.address} />
        <Button variant={p.visited[detail.id] ? "primary" : "outline"} size="sm" onClick={() => toggleVisited(detail.id)} data-testid="establishment-visited"><Check /> {loc(COPY.visited, locale)}</Button>
        <h2 className="font-display text-xl text-forest">{loc(COPY.offers, locale)}</h2>
        <div className="grid gap-2">
          {offers.map((o) => {
            const item = d.itemById.get(o.itemId);
            return item ? (
              <Link key={o.itemId} href={`${m.routes.item}?id=${item.id}`} className="flex items-center justify-between rounded-2xl border border-line/80 bg-paper p-3" data-testid="establishment-offering">
                <span>{item.nameVi} <span className="text-xs text-muted">{priceText(o)}</span></span><StatusDot status={o.status} />
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
        <HcmcMap venues={list.map((x) => x.e)} origin={HCMC_CENTER} selected={selected} onSelect={(eid) => { setSelected(eid); router.push(`${m.routes.establishment}?id=${eid}`); }} />
      </div>
      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:max-w-xl lg:px-6 lg:py-6">
        <h1 className="font-display text-3xl text-forest">{loc(title, locale)}</h1>
        <p className="mb-3 text-sm text-muted">{loc(m.name, locale)} · {loc(m.terms.establishments, locale)}</p>
        {list.length === 0 ? <Empty text={fill(loc(COPY.emptyEstablishments, locale), { establishments: loc(m.terms.establishments, locale) })} /> : (
          <div className="grid gap-2" data-testid="establishment-list">
            {list.map(({ e, km }) => (
              <Link key={e.id} href={`${m.routes.establishment}?id=${e.id}`} className="rounded-2xl border border-line/80 bg-paper p-3" data-testid="establishment-card">
                <p className="font-medium">{e.name}</p>
                <p className="text-xs text-muted">{e.address} · {fill(loc(COPY.kmAway, locale), { km: km.toFixed(1) })}</p>
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
          <Link key={c.id} href={m.routes.catalogue} className="rounded-3xl border border-line/80 bg-paper p-5 font-display text-lg hover:border-forest/40" data-testid={`discover-cat-${c.id}`}>
            {loc(c.name, locale)}<span className="block font-sans text-xs text-muted">{d.items.filter((i) => i.category === c.id).length} {loc(m.terms.items, locale)}</span>
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
      <div className="paper-grain rounded-[2rem] bg-forest p-6 text-ivory md:p-10" data-testid="module-passport">
        <Icon className="size-7 text-sage" />
        <h1 className="font-display text-4xl">{loc(m.passport.name, locale)}</h1>
        <p className="text-sage">{loc(m.passport.summary, locale)}</p>
        <dl className="mt-6 grid grid-cols-3 gap-4">
          <div><dt className="text-xs text-sage">{loc(m.terms.completed, locale)}</dt><dd className="font-display text-4xl" data-testid="module-passport-tried">{Object.keys(p.tried).length}<span className="text-lg text-sage">/{d.items.length}</span></dd></div>
          <div><dt className="text-xs text-sage">{loc(COPY.visited, locale)}</dt><dd className="font-display text-4xl" data-testid="module-passport-visited">{Object.keys(p.visited).length}</dd></div>
          <div><dt className="text-xs text-sage">{loc(COPY.saved, locale)}</dt><dd className="font-display text-4xl">{p.saved.length}</dd></div>
        </dl>
      </div>
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
      {items.length === 0 ? <Empty text="—" /> : <div className="grid gap-3 sm:grid-cols-2">{items.map((i) => <ItemCard key={i.id} d={d} item={i} />)}</div>}
    </div>
  );
}
