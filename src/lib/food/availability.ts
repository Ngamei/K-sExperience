import type { AvailabilityStatus, DishRestaurantLink, Restaurant } from "../data/schema";
import { STATUS_RANK } from "../data/evidence";
import { buildOfferingIndex } from "../../engine/offering-index";
export { STATUS_RANK };

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
  opts: { includeSamples: boolean; includeCandidates?: boolean },
): AvailabilityIndex {
  // Food is one configuration of the shared engine index (src/engine/offering-index.ts).
  const idx = buildOfferingIndex(restaurants, links, { item: (l) => l.dishId, establishment: (l) => l.restaurantId }, opts);
  return { statusByDish: idx.statusByItem, linksByDish: idx.byItem, linksByRestaurant: idx.byEstablishment, restaurants: idx.establishments };
}

export const statusOf = (idx: AvailabilityIndex, dishId: string): AvailabilityStatus =>
  idx.statusByDish.get(dishId) ?? "none-found";
