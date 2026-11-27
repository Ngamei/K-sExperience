import { matchesQuery, normalizeVi } from "../search/normalize";
import type { AvailabilityStatus, Category, Dietary, Dish, DishType, MealTime, Province, RegionId, Restaurant, Taste } from "../data/schema";
import { type AvailabilityIndex, statusOf } from "./availability";
import { isOpenAt } from "./hours";
import { haversineKm, type LngLat } from "../geo/geo";

/** Dietary preference filters (a preference may exclude several tags). */
export const DIET_PREFS = {
  vegetarian: { include: ["vegetarian", "vegan", "vegetarian-version-common"] },
  vegan: { include: ["vegan"] },
  "no-pork": { exclude: ["contains-pork"] },
  "no-beef": { exclude: ["contains-beef"] },
  "no-seafood": { exclude: ["contains-seafood", "contains-fish"] },
  "no-peanut": { exclude: ["contains-peanut"] },
  "no-offal": { exclude: ["contains-offal"] },
} as const satisfies Record<string, { include?: readonly Dietary[]; exclude?: readonly Dietary[] }>;
export type DietPref = keyof typeof DIET_PREFS;

export interface DishFilters {
  query: string;
  regions: RegionId[];
  provinces: string[];
  categories: Category[];
  dishTypes: DishType[];
  ingredient: string;
  tastes: Taste[];
  maxSpice: number | null;
  diet: DietPref[];
  mealTimes: MealTime[];
  // Establishment-dependent (HCMC)
  budget: Restaurant["priceRange"][];
  neighbourhoods: string[];
  venueTypes: Restaurant["venueType"][];
  maxDistanceKm: number | null;
  openNow: boolean;
  availability: AvailabilityStatus[];
  // Personal
  tried: "any" | "tried" | "untried";
  savedOnly: boolean;
}

export const EMPTY_FILTERS: DishFilters = {
  query: "", regions: [], provinces: [], categories: [], dishTypes: [], ingredient: "", tastes: [],
  maxSpice: null, diet: [], mealTimes: [], budget: [], neighbourhoods: [], venueTypes: [],
  maxDistanceKm: null, openNow: false, availability: [], tried: "any", savedOnly: false,
};

export interface FilterContext {
  availability: AvailabilityIndex;
  saved: Set<string>;
  tried: Set<string>;
  /** Reference point for distance filtering (user location or chosen neighbourhood). */
  origin?: LngLat;
  now?: Date;
  provincesById?: Map<string, Province>;
}

export function dishMatchesDiet(d: Dish, prefs: DietPref[]): boolean {
  return prefs.every((p) => {
    const rule = DIET_PREFS[p] as { include?: readonly Dietary[]; exclude?: readonly Dietary[] };
    if (rule.include && !rule.include.some((t) => d.dietary.includes(t))) return false;
    if (rule.exclude && rule.exclude.some((t) => d.dietary.includes(t))) return false;
    return true;
  });
}

export const searchText = (d: Dish, provincesById?: Map<string, Province>) =>
  [
    d.nameVi, d.nameEn, ...d.altNames, ...d.ingredients, d.family ?? "",
    ...d.origins.map((o) => (o.provinceId && provincesById?.get(o.provinceId)?.nameVi) || ""),
  ].join(" ");

const venueFiltersActive = (f: DishFilters) =>
  f.budget.length > 0 || f.neighbourhoods.length > 0 || f.venueTypes.length > 0 || f.maxDistanceKm !== null || f.openNow;

export function restaurantMatches(r: Restaurant, f: DishFilters, ctx: FilterContext): boolean {
  if (f.budget.length && (!r.priceRange || !f.budget.includes(r.priceRange))) return false;
  if (f.neighbourhoods.length && !f.neighbourhoods.includes(r.neighbourhood)) return false;
  if (f.venueTypes.length && !f.venueTypes.includes(r.venueType)) return false;
  if (f.maxDistanceKm !== null && ctx.origin && haversineKm(ctx.origin, r.coordinates) > f.maxDistanceKm) return false;
  if (f.openNow && isOpenAt(r.openingHours, ctx.now ?? new Date()) !== true) return false;
  return true;
}

export function dishMatches(d: Dish, f: DishFilters, ctx: FilterContext): boolean {
  if (f.query && !matchesQuery(searchText(d, ctx.provincesById), f.query)) return false;
  if (f.regions.length && !d.regionIds.some((r) => f.regions.includes(r))) return false;
  if (f.provinces.length && !d.origins.some((o) => o.provinceId && f.provinces.includes(o.provinceId))) return false;
  if (f.categories.length && !f.categories.includes(d.category)) return false;
  if (f.dishTypes.length && !f.dishTypes.includes(d.dishType)) return false;
  if (f.ingredient) {
    const q = normalizeVi(f.ingredient);
    if (!d.ingredients.some((i) => normalizeVi(i).includes(q))) return false;
  }
  if (f.tastes.length && !f.tastes.every((t) => d.taste.includes(t))) return false;
  if (f.maxSpice !== null && d.spiceLevel > f.maxSpice) return false;
  if (f.diet.length && !dishMatchesDiet(d, f.diet)) return false;
  if (f.mealTimes.length && !d.mealTimes.some((m) => f.mealTimes.includes(m))) return false;
  if (f.availability.length && !f.availability.includes(statusOf(ctx.availability, d.id))) return false;
  if (venueFiltersActive(f)) {
    const links = ctx.availability.linksByDish.get(d.id) ?? [];
    const ok = links.some((l) => {
      const r = ctx.availability.restaurants.get(l.restaurantId);
      return r && l.status !== "temporarily-unavailable" && restaurantMatches(r, f, ctx);
    });
    if (!ok) return false;
  }
  if (f.tried === "tried" && !ctx.tried.has(d.id)) return false;
  if (f.tried === "untried" && ctx.tried.has(d.id)) return false;
  if (f.savedOnly && !ctx.saved.has(d.id)) return false;
  return true;
}

export function filterDishes(dishes: Dish[], f: DishFilters, ctx: FilterContext): Dish[] {
  return dishes.filter((d) => dishMatches(d, f, ctx));
}

/** Flattened list of active filters, for chips. `key` + `value` identify how to remove it. */
export type ActiveChip = { key: keyof DishFilters; value?: string; label: string };
export function activeChips(f: DishFilters, label: (key: keyof DishFilters, value?: string) => string): ActiveChip[] {
  const chips: ActiveChip[] = [];
  (Object.keys(f) as (keyof DishFilters)[]).forEach((k) => {
    const v = f[k];
    if (Array.isArray(v)) v.forEach((x) => chips.push({ key: k, value: String(x), label: label(k, String(x)) }));
    else if (typeof v === "string" && v && v !== "any") chips.push({ key: k, value: v, label: label(k, v) });
    else if (typeof v === "number") chips.push({ key: k, value: String(v), label: label(k, String(v)) });
    else if (v === true) chips.push({ key: k, label: label(k) });
  });
  return chips;
}

export function removeChip(f: DishFilters, chip: ActiveChip): DishFilters {
  const cur = f[chip.key];
  if (Array.isArray(cur)) return { ...f, [chip.key]: (cur as string[]).filter((x) => String(x) !== chip.value) };
  return { ...f, [chip.key]: EMPTY_FILTERS[chip.key] };
}

export function toggleIn<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}
