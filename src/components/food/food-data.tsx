"use client";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";
import type { FoodData } from "@/lib/data/catalogue";
import { getSupabase } from "@/lib/supabase/client";
import { fetchSupabaseFood } from "@/lib/supabase/food";
import { buildAvailabilityIndex } from "@/lib/food/availability";
import type { FilterContext } from "@/lib/food/filters";
import { useShowSamples, useUser } from "@/lib/store/user";
import type { Dish, Province, Region } from "@/lib/data/schema";

interface Ctx extends FoodData {
  dishById: Map<string, Dish>;
  provinceById: Map<string, Province>;
  regionById: Map<string, Region>;
}
const FoodDataContext = createContext<Ctx | null>(null);

async function fetchFoodData(): Promise<FoodData> {
  const r = await fetch("/data/food.json");
  if (!r.ok) throw new Error(`Failed to load catalogue (${r.status})`);
  const local = (await r.json()) as FoodData;
  const sb = getSupabase();
  if (!sb) return { ...local, source: "local" };
  try {
    // Supabase is the source of truth for the catalogue and real venues; bundled samples and archipelago labels stay local.
    const remote = await fetchSupabaseFood(sb);
    const seedCount = remote.dishes.filter((d) => d.dataset === "seed").length;
    return {
      ...local,
      ...remote,
      restaurants: [...remote.restaurants, ...local.restaurants.filter((x) => x.isSample)],
      links: [...remote.links, ...local.links.filter((x) => x.isSample)],
      catalogue: { ...local.catalogue, dataset: seedCount === remote.dishes.length ? "seed" : seedCount ? "mixed" : "master", recordCount: remote.dishes.length, seedCount, sourceFile: "supabase" },
      source: "supabase",
    };
  } catch (e) {
    console.warn("[K's Experience] Supabase unavailable, using bundled data:", e);
    return { ...local, source: "local-fallback" };
  }
}

/** Loads the dataset once (client-side, cached) and provides indexed lookups to the app. */
export function FoodDataProvider({ children }: { children: React.ReactNode }) {
  const { data, error, refetch } = useQuery({ queryKey: ["food-data"], queryFn: fetchFoodData, staleTime: Infinity });
  const value = useMemo(
    () =>
      data && {
        ...data,
        dishById: new Map(data.dishes.map((d) => [d.id, d])),
        provinceById: new Map(data.provinces.map((p) => [p.id, p])),
        regionById: new Map(data.regions.map((r) => [r.id, r])),
      },
    [data],
  );
  if (error)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted" role="alert">
        Could not load the catalogue. <button className="text-terracotta underline" onClick={() => refetch()}>Retry</button>
      </div>
    );
  if (!value)
    return (
      <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true" data-testid="loading">
        <div className="size-8 animate-spin rounded-full border-2 border-sage border-t-forest" />
      </div>
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
  const showSamples = useShowSamples();
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
