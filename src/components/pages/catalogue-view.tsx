"use client";
import { useT } from "@/lib/i18n/use-t";
import { statusOf } from "@/lib/food/availability";
import { DishCard } from "@/components/food/dish-card";
import { ActiveChips, CategoryChips, FilterPanel, SearchBox } from "@/components/food/filter-panel";
import { useFilteredDishes } from "@/components/food/use-filtered";
import { CatalogueLayout } from "@/components/engine/filter-drawer";
import { useFoodData } from "@/components/food/food-data";
import { foodStats } from "@/lib/data/platform-stats";
import { useMemo } from "react";

/** Food catalogue = the shared CatalogueLayout with Food's filter definitions and dish cards. */
export function CatalogueView() {
  const { t, locale } = useT();
  const { dishes, ctx } = useFilteredDishes();
  const food = useFoodData();
  const stats = useMemo(() => foodStats(food), [food]);
  return (
    <CatalogueLayout
      eyebrow={t("nav.catalogue")}
      title={t("nav.catalogue")}
      filters={<FilterPanel />}
      search={<SearchBox />}
      chipsRow={<CategoryChips />}
      activeBar={<ActiveChips count={dishes.length} total={stats.items} />}
      summary={
        <p className="text-sm text-muted" data-testid="catalogue-coverage">
          {stats.items} {locale === "vi" ? "món" : "dishes"} · {stats.provinces!.covered}/{stats.provinces!.total} {locale === "vi" ? "tỉnh" : "provinces"} · {stats.regions!.covered}/{stats.regions!.total} {locale === "vi" ? "vùng" : "regions"} · {stats.itemsWithEstablishments} {locale === "vi" ? "món có quán ở TP.HCM" : "with HCMC places"} · {stats.linkedEstablishments} {locale === "vi" ? "quán" : "places"}
        </p>
      }
      filtersLabel={t("common.filters")}
      empty={dishes.length === 0 ? <p className="py-16 text-center text-muted">0 · {t("common.clearAll")}?</p> : null}
    >
      {dishes.map((d) => <DishCard key={d.id} dish={d} status={statusOf(ctx.availability, d.id)} places={stats.placesByItem.get(d.id) ?? 0} />)}
    </CatalogueLayout>
  );
}
