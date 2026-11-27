import { describe, expect, it } from "vitest";
import { getFoodData } from "@/lib/data/catalogue";
import {
  fromRows, toDishRow, toDishSourceRows, toLinkRow, toOriginRows, toPhotoRows, toRestaurantRow, toRestaurantSourceRows,
  type ProvinceRow, type RegionRow,
} from "@/lib/data/db-rows";

const data = getFoodData();
const real = data.restaurants.filter((r) => !r.isSample);
const realLinks = data.links.filter((l) => !l.isSample);

describe("Supabase row mapping round-trips without loss", () => {
  const regions: RegionRow[] = data.regions.map((r) => ({ id: r.id, name_vi: r.nameVi, name_en: r.nameEn, color: r.color, sort_order: r.order, blurb_vi: r.blurbVi, blurb_en: r.blurbEn }));
  const provinces: ProvinceRow[] = data.provinces.map((p) => ({
    id: p.id, name_vi: p.nameVi, name_en: p.nameEn, iso: p.iso, region_id: p.regionId, kind: p.kind,
    current_unit_id: p.current.id, current_unit_name_vi: p.current.nameVi, current_unit_name_en: p.current.nameEn, current_unit_kind: p.current.kind,
    label_lon: p.labelPoint[0], label_lat: p.labelPoint[1], bbox: p.bbox,
  }));
  const back = fromRows({
    regions, provinces,
    dishes: data.dishes.map(toDishRow), origins: data.dishes.flatMap(toOriginRows), photos: data.dishes.flatMap(toPhotoRows),
    dishSources: data.dishes.flatMap(toDishSourceRows), restaurants: real.map(toRestaurantRow), restaurantSources: real.flatMap(toRestaurantSourceRows),
    links: realLinks.map(toLinkRow),
  });
  it("dishes", () => expect(back.dishes).toEqual(data.dishes));
  it("regions and provinces", () => {
    expect(back.regions).toEqual(data.regions);
    expect(back.provinces).toEqual(data.provinces);
  });
  it("restaurants and links", () => {
    expect(back.restaurants).toEqual(real);
    expect(back.links).toEqual(realLinks);
  });
});
