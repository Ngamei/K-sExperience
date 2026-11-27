"use client";
import { createContext, useContext, useMemo } from "react";
import type { FoodData } from "@/lib/data/catalogue";
import { buildAvailabilityIndex } from "@/lib/food/availability";
import type { FilterContext } from "@/lib/food/filters";
import { useUser } from "@/lib/store/user";
import type { Dish, Province, Region } from "@/lib/data/schema";

interface Ctx extends FoodData {
  dishById: Map<string, Dish>;
  provinceById: Map<string, Province>;
  regionById: Map<string, Region>;
}
const FoodDataContext = createContext<Ctx | null>(null);

export function FoodDataProvider({ data, children }: { data: FoodData; children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      ...data,
      dishById: new Map(data.dishes.map((d) => [d.id, d])),
      provinceById: new Map(data.provinces.map((p) => [p.id, p])),
      regionById: new Map(data.regions.map((r) => [r.id, r])),
    }),
    [data],
  );
  return <FoodDataContext.Provider value={value}>{children}</FoodDataContext.Provider>;
}

export function useFoodData() {
  const v = useContext(FoodDataContext);
  if (!v) throw new Error("FoodDataProvider missing");
  return v;
}

/** Availability index for browsing (samples only when the user enabled them). */
export function useBrowseAvailability() {
  const { restaurants, links } = useFoodData();
  const showSamples = useUser((s) => s.showSamples);
  return useMemo(() => buildAvailabilityIndex(restaurants, links, { includeSamples: showSamples }), [restaurants, links, showSamples]);
}

/** Availability index for recommendations — NEVER includes samples. */
export function useRealAvailability() {
  const { restaurants, links } = useFoodData();
  return useMemo(() => buildAvailabilityIndex(restaurants, links, { includeSamples: false }), [restaurants, links]);
}

export function useFilterContext(extra?: Partial<FilterContext>): FilterContext {
  const availability = useBrowseAvailability();
  const { provinceById } = useFoodData();
  const savedArr = useUser((s) => s.saved);
  const triedObj = useUser((s) => s.tried);
  return useMemo(
    () => ({ availability, saved: new Set(savedArr), tried: new Set(Object.keys(triedObj)), provincesById: provinceById, ...extra }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availability, savedArr, triedObj, provinceById, extra?.origin, extra?.now],
  );
}
