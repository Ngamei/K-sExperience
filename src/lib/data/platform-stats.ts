/**
 * Platform data counts — always computed from the loaded data (never hardcoded), unique by id, real records only
 * (sample venues and candidate links excluded). Used by the catalogue, Settings → About and Admin → Overview.
 */
import type { Dish, DishRestaurantLink, Province, Region, Restaurant } from "./schema";
import type { ExperienceData } from "../../engine/schema";

export interface CoverageStats {
  items: number;
  /** Real establishments in the dataset. */
  establishments: number;
  /** Establishments with at least one public offering (unique). */
  linkedEstablishments: number;
  offerings: number;
  pricedOfferings: number;
  photographedOfferings: number;
  itemsWithEstablishments: number;
  /** Unique establishments per item id. */
  placesByItem: Map<string, number>;
  provinces?: { covered: number; total: number };
  regions?: { covered: number; total: number };
}

const placesMap = (pairs: { item: string; place: string }[]) => {
  const m = new Map<string, Set<string>>();
  for (const p of pairs) { if (!m.has(p.item)) m.set(p.item, new Set()); m.get(p.item)!.add(p.place); }
  return new Map([...m].map(([k, v]) => [k, v.size]));
};

export function foodStats(d: { dishes: Dish[]; restaurants: Restaurant[]; links: DishRestaurantLink[]; provinces: Province[]; regions: Region[] }): CoverageStats {
  const real = new Set(d.restaurants.filter((r) => !r.isSample).map((r) => r.id));
  const links = d.links.filter((l) => !l.isSample && l.status !== "candidate" && real.has(l.restaurantId));
  const placesByItem = placesMap(links.map((l) => ({ item: l.dishId, place: l.restaurantId })));
  const provinceIds = new Set(d.dishes.flatMap((x) => x.origins.map((o) => o.provinceId)).filter(Boolean));
  const regionIds = new Set(d.dishes.flatMap((x) => x.regionIds));
  return {
    items: d.dishes.length, establishments: real.size, linkedEstablishments: new Set(links.map((l) => l.restaurantId)).size,
    offerings: links.length, pricedOfferings: links.filter((l) => l.priceVnd).length, photographedOfferings: links.filter((l) => l.photo).length,
    itemsWithEstablishments: placesByItem.size, placesByItem,
    provinces: { covered: d.provinces.filter((p) => provinceIds.has(p.id)).length, total: d.provinces.length },
    regions: { covered: d.regions.filter((r) => regionIds.has(r.id)).length, total: d.regions.length },
  };
}

export function moduleStats(d: ExperienceData): CoverageStats {
  const real = new Set(d.establishments.filter((e) => !e.isSample).map((e) => e.id));
  const offs = d.offerings.filter((o) => !o.isSample && o.status !== "candidate" && real.has(o.establishmentId));
  const placesByItem = placesMap(offs.map((o) => ({ item: o.itemId, place: o.establishmentId })));
  return {
    items: d.items.length, establishments: real.size, linkedEstablishments: new Set(offs.map((o) => o.establishmentId)).size,
    offerings: offs.length, pricedOfferings: offs.filter((o) => o.price).length, photographedOfferings: offs.filter((o) => o.photo).length,
    itemsWithEstablishments: placesByItem.size, placesByItem,
  };
}

/** Unique establishments across experiences (a venue tagged for two experiences counts once). */
export const uniqueEstablishments = (lists: { id: string; isSample?: boolean }[][]) => new Set(lists.flat().filter((e) => !e.isSample).map((e) => e.id)).size;
