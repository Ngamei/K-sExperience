/**
 * Conversions between the app's domain model (src/lib/data/schema.ts) and Supabase table rows
 * (supabase/migrations/0001_init.sql). Shared by the read path, the Admin CMS and tests.
 */
import type { Dish, DishRestaurantLink, LinkPhoto, Province, Region, Restaurant } from "./schema";
import type { LinkStatus, EvidenceType } from "./evidence";

export interface DishRow {
  id: string; name_vi: string; name_en: string; alt_names: string[]; category: Dish["category"]; dish_type: Dish["dishType"];
  family: string | null; ingredients: string[]; taste: string[]; spice_level: number; dietary: string[]; meal_times: string[];
  description_vi: string; description_en: string; prominence: number; dataset: Dish["dataset"];
  verification_status: Dish["verification"]["status"]; verification_notes: string | null; verified_at: string | null;
}
export interface OriginRow { dish_id: string; province_id: string | null; region_id: string; role: "primary" | "associated"; sort_order: number }
export interface PhotoRow { dish_id: string; url: string; credit: string; license: string; source_url: string | null; sort_order: number }
export interface SourceRow { dish_id?: string; restaurant_id?: string; title: string; url: string | null; accessed: string | null; note: string | null }
export interface RestaurantRow {
  id: string; name: string; is_sample: boolean; address: string; neighbourhood: string; lon: number; lat: number;
  coordinate_precision: "exact" | "street" | null; google_maps_url: string | null; highlights: string[]; venue_type: Restaurant["venueType"];
  price_range: Restaurant["priceRange"] | null; opening_hours: Restaurant["openingHours"] | null; contact: Restaurant["contact"] | null;
  delivery_links: Restaurant["deliveryLinks"]; last_verified: string | null;
}
export interface LinkRow {
  dish_id: string; restaurant_id: string; status: LinkStatus; menu_evidence: { type: EvidenceType; note: string; url?: string } | null;
  price_min_vnd: number | null; price_max_vnd: number | null; last_verified: string | null;
  primary_photo_url?: string | null; photo_kind?: LinkPhoto["kind"] | null; photo_source_url?: string | null;
  photo_attribution?: string | null; photo_license?: string | null; photo_last_checked_at?: string | null;
}
export interface RegionRow { id: string; name_vi: string; name_en: string; color: string; sort_order: number; blurb_vi: string; blurb_en: string }
export interface ProvinceRow {
  id: string; name_vi: string; name_en: string; iso: string; region_id: string; kind: "city" | "province";
  current_unit_id: string; current_unit_name_vi: string; current_unit_name_en: string; current_unit_kind: "city" | "province";
  label_lon: number; label_lat: number; bbox: number[];
}

const nn = <T,>(v: T | undefined): T | null => (v === undefined ? null : v);
const und = <T,>(v: T | null): T | undefined => (v === null ? undefined : v);

export const toDishRow = (d: Dish): DishRow => ({
  id: d.id, name_vi: d.nameVi, name_en: d.nameEn, alt_names: d.altNames, category: d.category, dish_type: d.dishType,
  family: nn(d.family), ingredients: d.ingredients, taste: d.taste, spice_level: d.spiceLevel, dietary: d.dietary, meal_times: d.mealTimes,
  description_vi: d.description.vi, description_en: d.description.en, prominence: d.prominence, dataset: d.dataset,
  verification_status: d.verification.status, verification_notes: nn(d.verification.notes), verified_at: nn(d.verification.verifiedAt),
});
export const toOriginRows = (d: Dish): OriginRow[] =>
  d.origins.map((o, i) => ({ dish_id: d.id, province_id: nn(o.provinceId), region_id: o.regionId, role: o.role, sort_order: i }));
export const toPhotoRows = (d: Dish): PhotoRow[] =>
  d.photos.map((p, i) => ({ dish_id: d.id, url: p.url, credit: p.credit, license: p.license, source_url: nn(p.sourceUrl), sort_order: i }));
export const toDishSourceRows = (d: Dish): SourceRow[] =>
  d.sources.map((s) => ({ dish_id: d.id, title: s.title, url: nn(s.url), accessed: nn(s.accessed), note: nn(s.note) }));

export const toRestaurantRow = (r: Restaurant): RestaurantRow => ({
  id: r.id, name: r.name, is_sample: r.isSample, address: r.address, neighbourhood: r.neighbourhood, lon: r.coordinates[0], lat: r.coordinates[1],
  coordinate_precision: nn(r.coordinatePrecision), google_maps_url: nn(r.googleMapsUrl), highlights: r.highlights ?? [], venue_type: r.venueType,
  price_range: nn(r.priceRange), opening_hours: nn(r.openingHours), contact: nn(r.contact), delivery_links: r.deliveryLinks, last_verified: nn(r.lastVerified),
});
export const toRestaurantSourceRows = (r: Restaurant): SourceRow[] =>
  r.sources.map((s) => ({ restaurant_id: r.id, title: s.title, url: nn(s.url), accessed: nn(s.accessed), note: nn(s.note) }));
export const toLinkRow = (l: DishRestaurantLink): LinkRow => ({
  dish_id: l.dishId, restaurant_id: l.restaurantId, status: l.status, menu_evidence: nn(l.menuEvidence) as LinkRow["menu_evidence"],
  price_min_vnd: nn(l.priceVnd?.min), price_max_vnd: nn(l.priceVnd?.max), last_verified: nn(l.lastVerified),
  primary_photo_url: nn(l.photo?.url), photo_kind: nn(l.photo?.kind), photo_source_url: nn(l.photo?.sourceUrl),
  photo_attribution: nn(l.photo?.attribution), photo_license: nn(l.photo?.license), photo_last_checked_at: nn(l.photo?.lastCheckedAt),
});

// ---- rows → domain -------------------------------------------------------------------------------
export function fromRows(rows: {
  regions: RegionRow[]; provinces: ProvinceRow[]; dishes: DishRow[]; origins: OriginRow[]; photos: PhotoRow[]; dishSources: SourceRow[];
  restaurants: RestaurantRow[]; restaurantSources: SourceRow[]; links: LinkRow[];
}): { regions: Region[]; provinces: Province[]; dishes: Dish[]; restaurants: Restaurant[]; links: DishRestaurantLink[] } {
  const group = <T extends Record<string, unknown>>(arr: T[], key: keyof T) => {
    const m = new Map<string, T[]>();
    for (const x of arr) { const k = x[key] as string; m.set(k, [...(m.get(k) ?? []), x]); }
    return m;
  };
  const originsBy = group(rows.origins as unknown as Record<string, unknown>[], "dish_id") as unknown as Map<string, OriginRow[]>;
  const photosBy = group(rows.photos as unknown as Record<string, unknown>[], "dish_id") as unknown as Map<string, PhotoRow[]>;
  const dsrcBy = group(rows.dishSources as unknown as Record<string, unknown>[], "dish_id") as unknown as Map<string, SourceRow[]>;
  const rsrcBy = group(rows.restaurantSources as unknown as Record<string, unknown>[], "restaurant_id") as unknown as Map<string, SourceRow[]>;
  const src = (s: SourceRow) => ({ title: s.title, ...(s.url ? { url: s.url } : {}), ...(s.accessed ? { accessed: s.accessed } : {}), ...(s.note ? { note: s.note } : {}) });
  const provincesById = new Map(rows.provinces.map((p) => [p.id, p]));

  const regions: Region[] = [...rows.regions].sort((a, b) => a.sort_order - b.sort_order).map((r) => ({
    id: r.id as Region["id"], nameVi: r.name_vi, nameEn: r.name_en, color: r.color, order: r.sort_order, blurbEn: r.blurb_en, blurbVi: r.blurb_vi,
    provinceIds: rows.provinces.filter((p) => p.region_id === r.id).map((p) => p.id),
  }));
  const provinces: Province[] = rows.provinces.map((p) => ({
    id: p.id, nameVi: p.name_vi, nameEn: p.name_en, iso: p.iso, regionId: p.region_id as Province["regionId"], kind: p.kind,
    labelPoint: [p.label_lon, p.label_lat], bbox: p.bbox,
    current: { id: p.current_unit_id, nameVi: p.current_unit_name_vi, nameEn: p.current_unit_name_en, kind: p.current_unit_kind },
  }));
  const dishes: Dish[] = rows.dishes.map((d) => {
    const origins = (originsBy.get(d.id) ?? []).sort((a, b) => a.sort_order - b.sort_order).map((o) => ({
      ...(o.province_id ? { provinceId: o.province_id } : {}), regionId: (o.region_id ?? provincesById.get(o.province_id ?? "")?.region_id) as Dish["regionIds"][number], role: o.role,
    }));
    return {
      id: d.id, nameVi: d.name_vi, nameEn: d.name_en, altNames: d.alt_names, category: d.category, dishType: d.dish_type,
      ...(d.family ? { family: d.family } : {}),
      origins, regionIds: [...new Set(origins.map((o) => o.regionId))],
      ingredients: d.ingredients, taste: d.taste as Dish["taste"], spiceLevel: d.spice_level, dietary: d.dietary as Dish["dietary"], mealTimes: d.meal_times as Dish["mealTimes"],
      description: { vi: d.description_vi, en: d.description_en },
      photos: (photosBy.get(d.id) ?? []).sort((a, b) => a.sort_order - b.sort_order).map((p) => ({ url: p.url, credit: p.credit, license: p.license, ...(p.source_url ? { sourceUrl: p.source_url } : {}) })),
      sources: (dsrcBy.get(d.id) ?? []).map(src),
      verification: { status: d.verification_status, ...(d.verification_notes ? { notes: d.verification_notes } : {}), ...(d.verified_at ? { verifiedAt: d.verified_at } : {}) },
      dataset: d.dataset, prominence: d.prominence as Dish["prominence"],
    };
  });
  const restaurants: Restaurant[] = rows.restaurants.map((r) => ({
    id: r.id, name: r.name, isSample: r.is_sample, address: r.address, neighbourhood: r.neighbourhood, coordinates: [r.lon, r.lat],
    ...(r.coordinate_precision ? { coordinatePrecision: r.coordinate_precision } : {}),
    ...(r.google_maps_url ? { googleMapsUrl: r.google_maps_url } : {}),
    ...(r.highlights.length ? { highlights: r.highlights } : {}),
    venueType: r.venue_type, ...(r.price_range ? { priceRange: r.price_range } : {}),
    ...(r.opening_hours ? { openingHours: r.opening_hours } : {}), ...(r.contact ? { contact: r.contact } : {}),
    deliveryLinks: r.delivery_links ?? [], sources: (rsrcBy.get(r.id) ?? []).map(src), ...(r.last_verified ? { lastVerified: r.last_verified } : {}),
  }));
  const links: DishRestaurantLink[] = rows.links.map((l) => ({
    dishId: l.dish_id, restaurantId: l.restaurant_id, status: l.status, isSample: false,
    ...(l.menu_evidence ? { menuEvidence: l.menu_evidence } : {}),
    ...(l.price_min_vnd !== null && l.price_max_vnd !== null ? { priceVnd: { min: l.price_min_vnd, max: l.price_max_vnd } } : {}),
    ...(l.last_verified ? { lastVerified: l.last_verified } : {}),
    ...(l.primary_photo_url && l.photo_kind && l.photo_source_url && l.photo_attribution && l.photo_license && l.photo_last_checked_at
      ? { photo: { url: l.primary_photo_url, kind: l.photo_kind, sourceUrl: l.photo_source_url, attribution: l.photo_attribution, license: l.photo_license, lastCheckedAt: l.photo_last_checked_at } }
      : {}),
  }));
  return { regions, provinces, dishes, restaurants, links };
}
export { und };
