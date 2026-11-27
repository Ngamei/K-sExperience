"use client";
import Link from "next/link";
import { ArrowRight, List, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useT } from "@/lib/i18n/use-t";
import { useFilters } from "@/lib/store/filters";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { DishCard } from "@/components/food/dish-card";
import { DishArt } from "@/components/food/dish-art";
import { CategoryBadge } from "@/components/food/badges";
import { useFoodData } from "@/components/food/food-data";
import { ActiveChips, CategoryChips, FilterPanel, RegionChips, SearchBox } from "@/components/food/filter-panel";
import { useFilteredDishes } from "@/components/food/use-filtered";
import { statusOf } from "@/lib/food/availability";
import type { MapFocus } from "./vietnam-map";

const VietnamMap = dynamic(() => import("./vietnam-map").then((m) => m.VietnamMap), { ssr: false, loading: () => <div className="h-full w-full bg-sea" /> });

export function ExploreView() {
  const { t, locale } = useT();
  const { provinceById, regionById, dishById } = useFoodData();
  const { dishes, ctx } = useFilteredDishes();
  const filters = useFilters((s) => s.filters);
  const set = useFilters((s) => s.set);
  const [focus, setFocus] = useState<MapFocus>({ kind: "all" });
  const [nonce, setNonce] = useState(0);
  const [selectedDish, setSelectedDish] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const selectedProvince = filters.provinces.length === 1 ? filters.provinces[0] : null;
  const selectedRegion = filters.regions.length === 1 ? filters.regions[0] : null;
  const province = selectedProvince ? provinceById.get(selectedProvince) : null;
  const region = selectedRegion ? regionById.get(selectedRegion) : null;

  const focusOn = (f: MapFocus) => { setFocus(f); setNonce((n) => n + 1); };
  const onProvinceClick = (id: string) => {
    const p = provinceById.get(id)!;
    set({ provinces: [id], regions: [p.regionId] });
    focusOn({ kind: "province", id });
  };
  const dish = selectedDish ? dishById.get(selectedDish) : null;

  const heading = (() => {
    if (province) return { title: province.nameVi, sub: `${regionById.get(province.regionId)?.nameVi} · ${province.current.id !== province.id || province.current.nameVi !== province.nameVi ? t("explore.now", { name: province.current.nameVi }) : province.current.nameVi}` };
    if (region) return { title: region.nameVi, sub: locale === "vi" ? region.blurbVi : `${region.nameEn} — ${region.blurbEn}` };
    return { title: t("explore.title"), sub: t("explore.subtitle") };
  })();

  const list = (
    <div className="grid gap-2.5" data-testid="explore-list">
      {dishes.map((d) => <DishCard key={d.id} dish={d} status={statusOf(ctx.availability, d.id)} compact />)}
      {dishes.length === 0 && <p className="py-8 text-center text-sm text-muted">—</p>}
    </div>
  );

  return (
    <div className="relative flex h-full flex-col lg:flex-row">
      {/* Map column — portrait */}
      <div className="relative min-h-0 flex-1 lg:max-w-[min(54vw,720px)] lg:flex-none lg:basis-[min(54vw,720px)] lg:border-r lg:border-line">
        <VietnamMap
          dishes={dishes}
          focus={focus}
          focusNonce={nonce}
          selectedProvince={selectedProvince}
          selectedRegion={selectedRegion}
          onProvinceClick={onProvinceClick}
          onDishClick={setSelectedDish}
        />
        {/* Mobile overlays */}
        <div className="pointer-events-none absolute inset-x-0 top-0 space-y-2 p-3 lg:hidden">
          <div className="pointer-events-auto"><RegionChips onPick={(id) => focusOn(id ? { kind: "region", id } : { kind: "all" })} className="pb-0.5" /></div>
          <div className="pointer-events-auto flex items-center gap-2">
            <CategoryChips />
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)} aria-label={t("common.filters")}><SlidersHorizontal /></Button>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center lg:hidden">
          {!dish && (
            <Button onClick={() => setListOpen(true)} className="shadow-lg" data-testid="open-list">
              <List /> {t("common.results", { n: dishes.length })}
            </Button>
          )}
        </div>
        {dish && (
          <div className="absolute inset-x-3 bottom-3 z-20 lg:hidden" data-testid="dish-preview">
            <DishPreview id={dish.id} onClose={() => setSelectedDish(null)} />
          </div>
        )}
      </div>

      {/* Side panel (desktop) */}
      <aside className="hidden min-h-0 min-w-0 flex-1 flex-col lg:flex">
        <div className="space-y-3 border-b border-line px-6 pb-4 pt-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">{province ? t("explore.selectedProvince") : region ? t("filters.region") : t("nav.explore")}</p>
            <h1 className="font-display text-3xl text-forest" data-testid="explore-heading">{heading.title}</h1>
            <p className="mt-1 max-w-prose text-sm text-muted">{heading.sub}</p>
          </div>
          <SearchBox />
          <RegionChips onPick={(id) => focusOn(id ? { kind: "region", id } : { kind: "all" })} />
          <div className="flex items-center gap-2">
            <CategoryChips />
            <Button variant="outline" size="sm" onClick={() => setFiltersOpen(true)} data-testid="more-filters"><SlidersHorizontal /> {t("common.filters")}</Button>
          </div>
          <ActiveChips count={dishes.length} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {dish && <div className="mb-4" data-testid="dish-preview"><DishPreview id={dish.id} onClose={() => setSelectedDish(null)} /></div>}
          {list}
        </div>
      </aside>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen} title={t("common.filters")} side="right">
        <div className="mb-4 lg:hidden"><SearchBox /></div>
        <ActiveChips count={dishes.length} className="mb-4" />
        <FilterPanel />
      </Sheet>
      <Sheet open={listOpen} onOpenChange={setListOpen} title={heading.title}>
        <ActiveChips count={dishes.length} className="mb-3" />
        {list}
      </Sheet>
    </div>
  );
}

function DishPreview({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, locale } = useT();
  const { dishById, provinceById, regionById } = useFoodData();
  const d = dishById.get(id)!;
  const o = d.origins.find((x) => x.role === "primary") ?? d.origins[0];
  return (
    <div className="relative flex gap-3 rounded-2xl border border-line bg-paper p-3.5 shadow-[0_12px_32px_-12px_rgba(41,45,41,.35)]">
      <button onClick={onClose} className="absolute right-2 top-2 rounded-full p-1.5 text-muted hover:bg-ivory-deep" aria-label={t("common.close")}><X className="size-4" /></button>
      <DishArt type={d.dishType} category={d.category} size={72} className="bg-ivory" />
      <div className="min-w-0 flex-1 pr-6">
        <h3 className="font-display text-xl leading-tight">{d.nameVi}</h3>
        <p className="text-xs text-muted">{d.nameEn} · {o.provinceId ? provinceById.get(o.provinceId)?.nameVi : regionById.get(o.regionId)?.nameVi}</p>
        <div className="mt-1"><CategoryBadge category={d.category} /></div>
        <p className="mt-1.5 line-clamp-2 text-[12.5px] text-charcoal/80">{d.description[locale]}</p>
        <Link href={`/dishes/${d.id}/`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-terracotta hover:underline" data-testid="preview-view-dish">
          {t("common.viewDish")} <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
