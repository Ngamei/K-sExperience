import type { LinkPhoto, LinkPhotoKind } from "../lib/data/schema";

/** What an establishment card on an item page shows. */
export interface OfferingImage {
  kind: LinkPhotoKind;
  url: string;
  attribution: string;
  license: string;
  sourceUrl?: string;
  lastCheckedAt?: string;
}

/**
 * Image for an establishment card on an item page (dish, drink, treatment, activity), shared by all modules.
 * Priority: establishment photo of this item → the establishment's menu / service / listing image of this item
 * → the item's reference photo (labelled "not from this venue") → null (generic icon).
 * Safety: the offering photo is used only when the offering belongs to this item, so a photo recorded for
 * another item (at this or any establishment) can never appear. Establishment-level photos are never used.
 */
export function offeringImage(
  item: { id: string; photos: { url: string; credit: string; license: string; sourceUrl?: string }[] },
  offering: { itemId: string; photo?: LinkPhoto },
): OfferingImage | null {
  const p = offering.itemId === item.id ? offering.photo : undefined;
  if (p) return { kind: p.kind, url: p.url, attribution: p.attribution, license: p.license, sourceUrl: p.sourceUrl, lastCheckedAt: p.lastCheckedAt };
  const g = item.photos[0];
  if (g) return { kind: "generic-dish", url: g.url, attribution: g.credit, license: g.license, ...(g.sourceUrl ? { sourceUrl: g.sourceUrl } : {}) };
  return null;
}
