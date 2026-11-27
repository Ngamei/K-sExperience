import type { Dish, DishRestaurantLink } from "../data/schema";
import { offeringImage, type OfferingImage } from "../../engine/offering-image";

/** Food alias of the shared engine type. */
export type VenueCardImage = OfferingImage;

/** Venue-card image on a dish page — the shared engine rule applied to a dish ↔ restaurant link. */
export const venueCardImage = (dish: Pick<Dish, "id" | "photos">, link: Pick<DishRestaurantLink, "dishId" | "photo">): VenueCardImage | null =>
  offeringImage(dish, { itemId: link.dishId, photo: link.photo });
