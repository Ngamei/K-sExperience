import type { AvailabilityStatus, DishRestaurantLink, Restaurant } from "../data/schema";

export const STATUS_RANK: Record<AvailabilityStatus, number> = {
  "verified-available": 3,
  unverified: 2,
  "temporarily-unavailable": 1,
  "none-found": 0,
};

export interface AvailabilityIndex {
  /** Best status per dish id. */
  statusByDish: Map<string, AvailabilityStatus>;
  /** Links per dish id. */
  linksByDish: Map<string, DishRestaurantLink[]>;
  /** Links per restaurant id. */
  linksByRestaurant: Map<string, DishRestaurantLink[]>;
  restaurants: Map<string, Restaurant>;
}

/**
 * Builds the dish ↔ establishment index.
 * `includeSamples` must be false for anything presented as a real recommendation.
 */
export function buildAvailabilityIndex(
  restaurants: Restaurant[],
  links: DishRestaurantLink[],
  opts: { includeSamples: boolean },
): AvailabilityIndex {
  const rs = new Map(restaurants.filter((r) => opts.includeSamples || !r.isSample).map((r) => [r.id, r]));
  const statusByDish = new Map<string, AvailabilityStatus>();
  const linksByDish = new Map<string, DishRestaurantLink[]>();
  const linksByRestaurant = new Map<string, DishRestaurantLink[]>();
  for (const l of links) {
    if (!rs.has(l.restaurantId)) continue;
    if (l.isSample && !opts.includeSamples) continue;
    linksByDish.set(l.dishId, [...(linksByDish.get(l.dishId) ?? []), l]);
    linksByRestaurant.set(l.restaurantId, [...(linksByRestaurant.get(l.restaurantId) ?? []), l]);
    const cur = statusByDish.get(l.dishId) ?? "none-found";
    if (STATUS_RANK[l.status] > STATUS_RANK[cur]) statusByDish.set(l.dishId, l.status);
  }
  return { statusByDish, linksByDish, linksByRestaurant, restaurants: rs };
}

export const statusOf = (idx: AvailabilityIndex, dishId: string): AvailabilityStatus =>
  idx.statusByDish.get(dishId) ?? "none-found";
