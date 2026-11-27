"use client";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/use-t";
import { statusOf } from "@/lib/food/availability";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { DishCard } from "@/components/food/dish-card";
import { ActiveChips, CategoryChips, FilterPanel, SearchBox } from "@/components/food/filter-panel";
import { useFilteredDishes } from "@/components/food/use-filtered";

export function CatalogueView() {
  const { t } = useT();
  const { dishes, ctx } = useFilteredDishes();
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">{t("nav.catalogue")}</p>
        <h1 className="font-display text-4xl text-forest md:text-5xl">{t("nav.catalogue")}</h1>
      </header>
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2">
            <FilterPanel />
          </div>
        </aside>
        <div className="min-w-0">
          <div className="sticky top-14 z-20 -mx-4 space-y-3 bg-ivory/95 px-4 pb-3 pt-1 backdrop-blur md:top-16 lg:static lg:mx-0 lg:bg-transparent lg:px-0">
            <SearchBox />
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <CategoryChips />
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)} data-testid="open-filters"><SlidersHorizontal /> {t("common.filters")}</Button>
            </div>
            <ActiveChips count={dishes.length} />
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="catalogue-results">
            {dishes.map((d) => <DishCard key={d.id} dish={d} status={statusOf(ctx.availability, d.id)} />)}
          </div>
          {dishes.length === 0 && <p className="py-16 text-center text-muted">0 · {t("common.clearAll")}?</p>}
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title={t("common.filters")}>
        <ActiveChips count={dishes.length} className="mb-4" />
        <FilterPanel />
      </Sheet>
    </div>
  );
}
