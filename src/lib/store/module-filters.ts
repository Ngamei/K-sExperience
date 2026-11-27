"use client";
import { create } from "zustand";
import { EMPTY_MODULE_FILTERS, type ModuleFilters } from "@/engine/filters";

/** Per-module filter state (kept while browsing between catalogue, detail and map; separate per experience). */
interface S {
  byModule: Record<string, ModuleFilters>;
  set: (id: string, patch: Partial<ModuleFilters>) => void;
  clear: (id: string) => void;
}
export const useModuleFilters = create<S>()((set, get) => ({
  byModule: {},
  set: (id, patch) => set({ byModule: { ...get().byModule, [id]: { ...(get().byModule[id] ?? EMPTY_MODULE_FILTERS), ...patch } } }),
  clear: (id) => set({ byModule: { ...get().byModule, [id]: EMPTY_MODULE_FILTERS } }),
}));
export const useModuleFilterState = (id: string) => useModuleFilters((s) => s.byModule[id] ?? EMPTY_MODULE_FILTERS);
