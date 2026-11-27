"use client";
import { useMemo } from "react";
import { filterDishes } from "@/lib/food/filters";
import { useFilters } from "@/lib/store/filters";
import { useFilterContext, useFoodData } from "./food-data";

export function useFilteredDishes() {
  const { dishes } = useFoodData();
  const filters = useFilters((s) => s.filters);
  const origin = useFilters((s) => s.originCoords);
  const ctx = useFilterContext({ origin });
  const result = useMemo(() => filterDishes(dishes, filters, ctx).sort((a, b) => a.prominence - b.prominence || a.nameVi.localeCompare(b.nameVi, "vi")), [dishes, filters, ctx]);
  return { dishes: result, ctx, filters };
}
