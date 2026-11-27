"use client";
import { useT } from "@/lib/i18n/use-t";
import { statusOf } from "@/lib/food/availability";
import { DishCard } from "@/components/food/dish-card";
import { ActiveChips, CategoryChips, FilterPanel, SearchBox } from "@/components/food/filter-panel";
import { useFilteredDishes } from "@/components/food/use-filtered";
import { CatalogueLayout } from "@/components/engine/filter-drawer";

/** Food catalogue = the shared CatalogueLayout with Food's filter definitions and dish cards. */
export function CatalogueView() {
  const { t } = useT();
  const { dishes, ctx } = useFilteredDishes();
  return (
    <CatalogueLayout
      eyebrow={t("nav.catalogue")}
      title={t("nav.catalogue")}
      filters={<FilterPanel />}
      search={<SearchBox />}
      chipsRow={<CategoryChips />}
      activeBar={<ActiveChips count={dishes.length} />}
      filtersLabel={t("common.filters")}
      empty={dishes.length === 0 ? <p className="py-16 text-center text-muted">0 · {t("common.clearAll")}?</p> : null}
    >
      {dishes.map((d) => <DishCard key={d.id} dish={d} status={statusOf(ctx.availability, d.id)} />)}
    </CatalogueLayout>
  );
}
