"use client";
import { create } from "zustand";
import { EMPTY_FILTERS, type DishFilters } from "../food/filters";
import type { LngLat } from "../geo/geo";
import { HCMC_NEIGHBOURHOODS } from "../food/hcmc";

/** Session filter state shared between Explore Vietnam, the Food Catalogue and Nearby. */
interface FilterState {
  filters: DishFilters;
  /** Reference point for distance: a neighbourhood id or "me" (browser geolocation). */
  originId: string;
  originCoords: LngLat;
  set: (patch: Partial<DishFilters>) => void;
  replace: (f: DishFilters) => void;
  clear: () => void;
  setOrigin: (id: string, coords?: LngLat) => void;
}

export const useFilters = create<FilterState>()((set, get) => ({
  filters: EMPTY_FILTERS,
  originId: HCMC_NEIGHBOURHOODS[0].id,
  originCoords: HCMC_NEIGHBOURHOODS[0].center,
  set: (patch) => set({ filters: { ...get().filters, ...patch } }),
  replace: (filters) => set({ filters }),
  clear: () => set({ filters: EMPTY_FILTERS }),
  setOrigin: (id, coords) => set({ originId: id, originCoords: coords ?? HCMC_NEIGHBOURHOODS.find((n) => n.id === id)?.center ?? get().originCoords }),
}));
