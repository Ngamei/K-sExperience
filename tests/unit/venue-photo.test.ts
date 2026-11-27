import { describe, expect, it } from "vitest";
import { DishRestaurantLinkSchema, type Dish, type DishRestaurantLink, type LinkPhoto } from "@/lib/data/schema";
import { venueCardImage } from "@/lib/food/venue-photo";
import { fromRows, toLinkRow } from "@/lib/data/db-rows";

const generic = { url: "https://commons.wikimedia.org/wiki/Special:FilePath/Bun.jpg?width=960", credit: "Commons author", license: "CC BY-SA 4.0", sourceUrl: "https://commons.wikimedia.org/wiki/File:Bun.jpg" };
const withPhoto: Pick<Dish, "id" | "photos"> = { id: "bun-bo-hue", photos: [generic] };
const noPhoto: Pick<Dish, "id" | "photos"> = { id: "pho-sai-gon", photos: [] };
const venuePhoto: LinkPhoto = { url: "https://img.test/bbh-at-venue.jpg", kind: "venue-specific", sourceUrl: "https://venue.test/post", attribution: "Venue A", license: "Used with written permission", lastCheckedAt: "2026-11-27" };
const link = (dishId: string, restaurantId: string, photo?: LinkPhoto): DishRestaurantLink => ({
  dishId, restaurantId, status: "source-listed", isSample: false, menuEvidence: { type: "published-source", note: "guide" }, lastVerified: "2026-11-01", ...(photo ? { photo } : {}),
});

describe("venue card image (dish page)", () => {
  it("shows the venue-specific photo of this dish when present", () => {
    expect(venueCardImage(withPhoto, link("bun-bo-hue", "a", venuePhoto))).toMatchObject({ kind: "venue-specific", url: venuePhoto.url, attribution: "Venue A" });
  });
  it("uses a menu / delivery-listing image of this dish at this venue", () => {
    expect(venueCardImage(withPhoto, link("bun-bo-hue", "a", { ...venuePhoto, kind: "menu-photo" }))?.kind).toBe("menu-photo");
    expect(venueCardImage(withPhoto, link("bun-bo-hue", "a", { ...venuePhoto, kind: "delivery-listing" }))?.kind).toBe("delivery-listing");
  });
  it("falls back to the generic primary dish photo", () => {
    expect(venueCardImage(withPhoto, link("bun-bo-hue", "b"))).toMatchObject({ kind: "generic-dish", url: generic.url, attribution: "Commons author", license: "CC BY-SA 4.0" });
  });
  it("returns null (→ icon) when there is no image at all", () => {
    expect(venueCardImage(noPhoto, link("pho-sai-gon", "b"))).toBeNull();
  });
  it("never shows a photo recorded for a different dish", () => {
    // Venue A has a photo for bún bò Huế; on the phở page that link photo must not be used.
    expect(venueCardImage(noPhoto, link("bun-bo-hue", "a", venuePhoto))).toBeNull();
    expect(venueCardImage({ ...withPhoto, id: "mi-quang" }, link("bun-bo-hue", "a", venuePhoto))?.kind).toBe("generic-dish");
  });
});

describe("link photo schema", () => {
  it("requires source, attribution, licence and a checked date", () => {
    expect(DishRestaurantLinkSchema.safeParse(link("bun-bo-hue", "a", venuePhoto)).success).toBe(true);
    for (const k of ["sourceUrl", "attribution", "license", "lastCheckedAt"] as const) {
      const p = { ...venuePhoto } as Partial<LinkPhoto>;
      delete p[k];
      expect(DishRestaurantLinkSchema.safeParse(link("bun-bo-hue", "a", p as LinkPhoto)).success, k).toBe(false);
    }
    expect(DishRestaurantLinkSchema.safeParse(link("bun-bo-hue", "a", { ...venuePhoto, kind: "restaurant-interior" as never })).success).toBe(false);
  });
  it("round-trips through Supabase rows", () => {
    const l = link("bun-bo-hue", "a", venuePhoto);
    const row = toLinkRow(l);
    expect(row).toMatchObject({ primary_photo_url: venuePhoto.url, photo_kind: "venue-specific", photo_source_url: venuePhoto.sourceUrl, photo_attribution: "Venue A", photo_license: venuePhoto.license, photo_last_checked_at: "2026-11-27" });
    const back = fromRows({ regions: [], provinces: [], dishes: [], origins: [], photos: [], dishSources: [], restaurants: [], restaurantSources: [], links: [row, toLinkRow(link("bun-bo-hue", "b"))] }).links;
    expect(back[0]).toEqual(l);
    expect(back[1].photo).toBeUndefined();
  });
});
