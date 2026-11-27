"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { MapPin, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n/use-t";
import { useShowSamples, useUser } from "@/lib/store/user";
import { DEV_DATA } from "@/lib/env";
import { useFilters } from "@/lib/store/filters";
import { HCMC_NEIGHBOURHOODS } from "@/lib/food/hcmc";
import { haversineKm } from "@/lib/geo/geo";
import { isOpenAt } from "@/lib/food/hours";
import { restaurantMatches, toggleIn } from "@/lib/food/filters";
import { lbl, VENUE_LABELS } from "@/lib/i18n/labels";
import { PRICE_RANGES, VENUE_TYPES } from "@/lib/data/schema";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Badge } from "@/components/ui/badge";
import { SampleBadge } from "@/components/food/badges";
import { useBrowseAvailability, useFoodData } from "@/components/food/food-data";

const HcmcMap = dynamic(() => import("./hcmc-map").then((m) => m.HcmcMap), { ssr: false, loading: () => <div className="h-full w-full bg-sea" /> });

export function NearbyView() {
  const { t, locale } = useT();
  const { dishById } = useFoodData();
  const availability = useBrowseAvailability();
  const showSamples = useShowSamples();
  const setShowSamples = useUser((s) => s.setShowSamples);
  const filters = useFilters((s) => s.filters);
  const set = useFilters((s) => s.set);
  const originId = useFilters((s) => s.originId);
  const origin = useFilters((s) => s.originCoords);
  const setOrigin = useFilters((s) => s.setOrigin);
  const [selected, setSelected] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);

  const venues = useMemo(() => {
    const list = [...availability.restaurants.values()]
      .filter((r) => restaurantMatches(r, filters, { availability, saved: new Set(), tried: new Set(), origin, now }))
      .map((r) => ({ r, km: haversineKm(origin, r.coordinates) }));
    return list.sort((a, b) => a.km - b.km);
  }, [availability, filters, origin, now]);

  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="relative h-[42%] shrink-0 lg:h-full lg:flex-1 lg:border-r lg:border-line">
        <HcmcMap venues={venues.map((v) => v.r)} origin={origin} selected={selected} onSelect={setSelected} />
      </div>
      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:max-w-xl lg:px-6 lg:py-6">
        <h1 className="font-display text-3xl text-forest">{t("nearby.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("nearby.subtitle")}</p>
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <select className="h-8 rounded-full border border-line bg-paper px-3 text-xs" value={originId} aria-label={t("nearby.from")}
              onChange={(e) => e.target.value === "me" && navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => setOrigin("me", [p.coords.longitude, p.coords.latitude])) : setOrigin(e.target.value)}>
              <option value="me">{t("nearby.myLocation")}</option>
              {HCMC_NEIGHBOURHOODS.map((n) => <option key={n.id} value={n.id}>{t("nearby.from")}: {n.name}</option>)}
            </select>
            {[1, 3, 5].map((km) => <Chip key={km} active={filters.maxDistanceKm === km} onClick={() => set({ maxDistanceKm: filters.maxDistanceKm === km ? null : km })}>≤ {km} km</Chip>)}
            <Chip active={filters.openNow} onClick={() => set({ openNow: !filters.openNow })}>{t("filters.openNow")}</Chip>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {PRICE_RANGES.map((p) => <Chip key={p} active={filters.budget.includes(p)} onClick={() => set({ budget: toggleIn(filters.budget, p) })}>{p}</Chip>)}
            {VENUE_TYPES.map((v) => <Chip key={v} active={filters.venueTypes.includes(v)} onClick={() => set({ venueTypes: toggleIn(filters.venueTypes, v) })}>{lbl(VENUE_LABELS, v, locale)}</Chip>)}
          </div>
        </div>

        {venues.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-line bg-paper p-6 text-center" data-testid="nearby-empty">
            <Store className="mx-auto size-8 text-muted" />
            <h2 className="mt-2 font-display text-xl">{t("nearby.empty")}</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{t("nearby.emptyBody")}</p>
            {DEV_DATA && !showSamples && <Button className="mt-4" variant="outline" onClick={() => setShowSamples(true)} data-testid="enable-samples">{t("nearby.enableSamples")}</Button>}
          </div>
        ) : (
          <ul className="mt-5 grid gap-2.5" data-testid="venue-list">
            {venues.map(({ r, km }) => {
              const ls = availability.linksByRestaurant.get(r.id) ?? [];
              const open = isOpenAt(r.openingHours, now);
              return (
                <li key={r.id}>
                  <Link href={`/places/${r.id}/`} onMouseEnter={() => setSelected(r.id)}
                    className={`block rounded-2xl border bg-paper p-3.5 transition ${selected === r.id ? "border-terracotta" : "border-line/80 hover:border-forest/30"}`} data-testid="venue-card">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5"><span className="font-medium">{r.name}</span>{r.isSample && <SampleBadge />}</div>
                        <p className="text-xs text-muted"><MapPin className="mr-0.5 inline size-3" />{r.neighbourhood} · {lbl(VENUE_LABELS, r.venueType, locale)}{r.priceRange ? ` · ${r.priceRange}` : ""}</p>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-semibold">{t("nearby.km", { n: km.toFixed(1) })}</div>
                        <div className={open ? "text-forest" : "text-muted"}>{open === null ? t("place.hoursUnknown") : open ? t("place.openNow") : t("place.closed")}</div>
                      </div>
                    </div>
                    {r.highlights?.length ? <p className="mt-1 text-xs text-forest">{r.highlights[0]}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ls.map((l) => <Badge key={l.dishId} tone={l.status === "source-listed" ? "ochre" : l.status === "temporarily-unavailable" ? "warn" : "forest"}>{dishById.get(l.dishId)?.nameVi}</Badge>)}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
