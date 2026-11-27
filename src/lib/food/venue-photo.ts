import type { Dish, DishRestaurantLink, LinkPhotoKind } from "../data/schema";

/** What the venue card on a dish page shows. */
export interface VenueCardImage {
  kind: LinkPhotoKind;
  url: string;
  attribution: string;
  license: string;
  sourceUrl?: string;
  lastCheckedAt?: string;
}

/**
 * Display priority: venue photo of this dish → this venue's menu / delivery-listing image of this dish
 * → the generic primary photo of the dish → null (the card shows the generic icon).
 * Safety: a link photo is only used when the link belongs to *this* dish, so a photo recorded for
 * another dish at the same venue (or another venue) can never appear on this card.
 * Establishment-level photos are deliberately not consulted.
 */
export function venueCardImage(dish: Pick<Dish, "id" | "photos">, link: Pick<DishRestaurantLink, "dishId" | "photo">): VenueCardImage | null {
  const p = link.dishId === dish.id ? link.photo : undefined;
  if (p) return { kind: p.kind, url: p.url, attribution: p.attribution, license: p.license, sourceUrl: p.sourceUrl, lastCheckedAt: p.lastCheckedAt };
  const g = dish.photos[0];
  if (g) return { kind: "generic-dish", url: g.url, attribution: g.credit, license: g.license, ...(g.sourceUrl ? { sourceUrl: g.sourceUrl } : {}) };
  return null;
}
