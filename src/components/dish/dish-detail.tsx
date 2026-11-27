"use client";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Bookmark, Check, FolderPlus, MapPin } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/use-t";
import { DIETARY_TAG_LABELS, DISH_TYPE_LABELS, lbl, MEAL_LABELS, SPICE_LABELS, TASTE_LABELS, VENUE_LABELS } from "@/lib/i18n/labels";
import { useUser } from "@/lib/store/user";
import { buildAvailabilityIndex, statusOf } from "@/lib/food/availability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DishArt } from "@/components/food/dish-art";
import { DishHeroPhoto } from "@/components/food/dish-image";
import { CategoryBadge, SampleBadge, StatusDot } from "@/components/food/badges";
import { DishCard } from "@/components/food/dish-card";
import { useFoodData } from "@/components/food/food-data";
import type { DishRestaurantLink } from "@/lib/data/schema";

function Block({ title, children, testid }: { title: string; children: React.ReactNode; testid?: string }) {
  return (
    <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6" data-testid={testid}>
      <h2 className="mb-3 font-display text-xl text-forest">{title}</h2>
      {children}
    </section>
  );
}

export function DishDetail({ id, locator }: { id: string; locator: React.ReactNode }) {
  const { t, locale } = useT();
  const { dishById, provinceById, regionById, dishes, restaurants, links } = useFoodData();
  const d = dishById.get(id)!;
  const saved = useUser((s) => s.saved.includes(id));
  const tried = useUser((s) => s.tried[id]);
  const toggleSaved = useUser((s) => s.toggleSaved);
  const toggleTried = useUser((s) => s.toggleTried);
  const showSamples = useUser((s) => s.showSamples);
  const collections = useUser((s) => s.collections);
  const toggleInCollection = useUser((s) => s.toggleInCollection);
  const override = useUser((s) => s.verificationOverrides[id]);
  const [colOpen, setColOpen] = useState(false);
  const router = useRouter();

  const real = buildAvailabilityIndex(restaurants, links, { includeSamples: false });
  const sample = buildAvailabilityIndex(restaurants.filter((r) => r.isSample), links, { includeSamples: true });
  const realStatus = statusOf(real, id);
  const realLinks = real.linksByDish.get(id) ?? [];
  const sampleLinks = showSamples ? sample.linksByDish.get(id) ?? [] : [];
  const variants = d.family ? dishes.filter((x) => x.family === d.family && x.id !== d.id) : [];
  const verification = (override as typeof d.verification.status | undefined) ?? d.verification.status;

  const VenueRow = ({ l }: { l: DishRestaurantLink }) => {
    const r = restaurants.find((x) => x.id === l.restaurantId)!;
    return (
      <div className="rounded-2xl border border-line/80 bg-ivory/60 p-3.5" data-testid="venue-row" data-venue-id={r.id}>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage-soft text-forest"><MapPin className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href={`/places/${r.id}/`} className="font-medium hover:text-forest hover:underline">{r.name}</Link>
              {r.isSample && <SampleBadge />}
            </div>
            <p className="text-xs text-muted">{r.address}</p>
            <p className="text-xs text-muted">{r.neighbourhood} · {lbl(VENUE_LABELS, r.venueType, locale)}{r.priceRange ? ` · ${r.priceRange}` : ""}{l.priceVnd ? ` · ${l.priceVnd.min.toLocaleString("vi-VN")}–${l.priceVnd.max.toLocaleString("vi-VN")} ₫` : ""}</p>
            {r.highlights?.length ? <p className="mt-1 text-xs text-forest">{r.highlights.join(" · ")}</p> : null}
            {l.menuEvidence && !r.isSample && (
              <p className="mt-1.5 text-[11.5px] leading-snug text-charcoal/70">
                <span className="font-medium">{t("place.evidence")}:</span> {l.menuEvidence.note}{" "}
                {l.menuEvidence.url && <a href={l.menuEvidence.url} target="_blank" rel="noreferrer" className="underline hover:text-forest">↗</a>}
              </p>
            )}
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-[52px]">
          <StatusDot status={l.status} />
          {r.googleMapsUrl && (
            <a href={r.googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center gap-1 rounded-full bg-forest px-3 text-[11.5px] font-medium text-ivory hover:bg-forest-soft" data-testid="google-maps-link">
              <MapPin className="size-3.5" /> {t("place.googleMaps")}
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <article className="mx-auto max-w-6xl px-4 pt-4 md:px-6 md:pt-8" data-testid="dish-detail" data-dish-id={d.id}>
      <button onClick={() => (history.length > 1 ? router.back() : router.push("/catalogue/"))} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest">
        <ArrowLeft className="size-4" /> {t("nav.catalogue")}
      </button>

      <div className="mb-6 md:hidden"><DishHeroPhoto dish={d} creditLabel={t("dish.photoCredit")} /></div>
      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <div className="paper-grain relative overflow-hidden rounded-3xl border border-line/80 bg-[radial-gradient(ellipse_at_top_left,#fffdf8,#efe9dc)] p-6 md:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative">
              <DishArt type={d.dishType} category={d.category} size={d.photos.length ? 88 : 132} className="bg-paper shadow-[0_10px_30px_-14px_rgba(41,45,41,.45)]" />
              {!d.photos.length && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper/95 px-2 py-0.5 text-[9.5px] text-muted shadow-sm">{t("dish.photoPending")}</span>}
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <CategoryBadge category={d.category} />
                <Badge tone="outline">{lbl(DISH_TYPE_LABELS, d.dishType, locale)}</Badge>
                {d.regionIds.map((r) => <Badge key={r} tone="forest">{regionById.get(r)?.nameVi}</Badge>)}
              </div>
              <h1 className="font-display text-4xl leading-[1.05] text-charcoal md:text-5xl" data-testid="dish-title">{d.nameVi}</h1>
              <p className="mt-1 text-lg text-muted">{d.nameEn}</p>
              {d.altNames.length > 0 && <p className="mt-1 text-sm text-muted">{d.altNames.join(" · ")}</p>}
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-charcoal/85">{d.description[locale]}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant={saved ? "accent" : "outline"} onClick={() => toggleSaved(id)} data-testid="save-dish" aria-pressed={saved}>
              <Bookmark className={saved ? "fill-current" : ""} /> {saved ? t("dish.saved") : t("dish.save")}
            </Button>
            <Button variant={tried ? "primary" : "outline"} onClick={() => toggleTried(id)} data-testid="tried-dish" aria-pressed={Boolean(tried)}>
              <Check /> {tried ? `${t("dish.tried")} · ${tried}` : t("dish.markTried")}
            </Button>
            {collections.length > 0 && (
              <div className="relative">
                <Button variant="ghost" onClick={() => setColOpen((o) => !o)}><FolderPlus /> {t("dish.addToCollection")}</Button>
                {colOpen && (
                  <div className="absolute z-10 mt-1 w-56 rounded-2xl border border-line bg-paper p-1.5 shadow-lg">
                    {collections.map((c) => (
                      <button key={c.id} onClick={() => toggleInCollection(c.id, id)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-ivory-deep">
                        {c.name} {c.dishIds.includes(id) && <Check className="size-4 text-forest" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
        <div className="hidden md:block"><DishHeroPhoto dish={d} creditLabel={t("dish.photoCredit")} /></div>
        <Block title={t("dish.origin")} testid="origin-block">
          <div className="flex h-72 justify-center">{locator}</div>
          <ul className="mt-3 space-y-2 text-sm">
            {d.origins.map((o, i) => {
              const p = o.provinceId ? provinceById.get(o.provinceId) : null;
              return (
                <li key={i} className="flex gap-2">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${o.role === "primary" ? "bg-terracotta" : "bg-terracotta-soft"}`} />
                  <span>
                    <span className="text-[11px] uppercase tracking-wider text-muted">{o.role === "primary" ? t("dish.primary") : t("dish.associated")}</span>
                    <br />
                    <strong className="font-medium">{p ? p.nameVi : `${regionById.get(o.regionId)?.nameVi} (${t("dish.regionWide")})`}</strong>
                    {p && <span className="text-muted"> · {regionById.get(p.regionId)?.nameVi}</span>}
                    {p && p.current.nameVi !== p.nameVi && <span className="block text-xs text-muted" data-testid="current-admin">{t("explore.now", { name: p.current.nameVi })}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Block>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Block title={t("dish.ingredients")}>
          <ul className="flex flex-wrap gap-1.5">{d.ingredients.map((i) => <li key={i}><Badge tone="neutral" className="text-xs">{i}</Badge></li>)}</ul>
        </Block>
        <Block title={t("dish.taste")}>
          <div className="flex flex-wrap gap-1.5">{d.taste.map((x) => <Badge key={x} tone="terracotta" className="text-xs">{lbl(TASTE_LABELS, x, locale)}</Badge>)}</div>
          <p className="mt-3 text-sm"><span className="text-muted">{t("dish.spice")}: </span>{"🌶".repeat(d.spiceLevel) || "○"} {lbl(SPICE_LABELS, String(d.spiceLevel), locale)}</p>
          <p className="mt-1 text-sm"><span className="text-muted">{t("dish.meal")}: </span>{d.mealTimes.map((m) => lbl(MEAL_LABELS, m, locale)).join(", ")}</p>
        </Block>
        <Block title={t("dish.dietary")}>
          <div className="flex flex-wrap gap-1.5">{d.dietary.map((x) => <Badge key={x} tone="outline">{lbl(DIETARY_TAG_LABELS, x, locale)}</Badge>)}</div>
          <p className="mt-3 text-xs text-muted">{t("dish.dietaryNote")}</p>
        </Block>
        <Block title={t("dish.sources")} testid="sources-block">
          <Badge tone={verification === "verified" ? "forest" : "sample"} data-testid="verification-status">{t(`verif.${verification}`)}</Badge>
          {d.sources.length ? (
            <ul className="mt-3 space-y-1 text-sm">{d.sources.map((s, i) => <li key={i}>{s.url ? <a className="text-forest underline" href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}</li>)}</ul>
          ) : <p className="mt-3 text-sm text-muted">{t("dish.noSources")}</p>}
        </Block>
      </div>

      <div className="mt-6">
        <Block title={t("dish.hcmc")} testid="hcmc-block">
          {realLinks.length > 0 ? (
            <div className="grid gap-2">
              {realLinks.map((l) => <VenueRow key={l.restaurantId} l={l} />)}
              <p className="text-[11.5px] text-muted">{t("dish.hcmcNote")}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-ivory/60 p-4" data-testid="none-found">
              <StatusDot status={realStatus} />
              <p className="mt-2 max-w-2xl text-sm text-charcoal/80">{t("status.noneFoundBody")}</p>
            </div>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.nameVi}, Hồ Chí Minh`)}`}
            target="_blank"
            rel="noreferrer"
            className="group mt-3 flex items-center gap-3 rounded-2xl border border-line/80 bg-paper p-3.5 transition-colors hover:border-forest/40 hover:bg-sage-soft/40"
            data-testid="google-maps-search"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest text-ivory">
              <MapPin className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-charcoal group-hover:text-forest">{t("dish.searchMaps")}</span>
              <span className="block truncate text-xs text-muted">{t("dish.searchMapsSub", { name: d.nameVi })}</span>
              <span className="mt-0.5 block text-[11px] text-muted/80">{t("dish.searchMapsNote")}</span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-forest" />
          </a>
          {sampleLinks.length > 0 && (
            <div className="mt-4 rounded-2xl bg-[#fff8e1] p-3 ring-1 ring-[#efd98c]" data-testid="sample-venues">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#6b4e00]">Sample venues — fictional, for interface preview only</p>
              <div className="grid gap-2">{sampleLinks.map((l) => <VenueRow key={l.restaurantId} l={l} />)}</div>
            </div>
          )}
        </Block>
      </div>

      {variants.length > 0 && (
        <section className="mt-8" data-testid="variants">
          <h2 className="mb-3 font-display text-2xl text-forest">{t("dish.variants")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{variants.map((v) => <DishCard key={v.id} dish={v} compact />)}</div>
        </section>
      )}
    </article>
  );
}
