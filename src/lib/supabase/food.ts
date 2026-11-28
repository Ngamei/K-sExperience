import type { SupabaseClient } from "@supabase/supabase-js";
import { fromRows, type DishRow, type LinkRow, type OriginRow, type PhotoRow, type ProvinceRow, type RegionRow, type RestaurantRow, type SourceRow } from "../data/db-rows";

const PAGE = 1000; // PostgREST default max rows per request

/** Columns the app reads — also used by `npm run test:db` to check they exist and are readable by anon. */
export const READ_COLUMNS = {
  regions: "id,name_vi,name_en,color,sort_order,blurb_vi,blurb_en",
  provinces: "id,name_vi,name_en,iso,region_id,kind,current_unit_id,current_unit_name_vi,current_unit_name_en,current_unit_kind,label_lon,label_lat,bbox",
  dishes: "id,name_vi,name_en,alt_names,category,dish_type,family,ingredients,taste,spice_level,dietary,meal_times,description_vi,description_en,prominence,dataset,verification_status,verification_notes,verified_at,eating",
  dish_origins: "dish_id,province_id,region_id,role,sort_order",
  dish_photos: "dish_id,url,credit,license,source_url,sort_order",
  dish_sources: "dish_id,title,url,accessed,note",
  restaurants: "id,name,is_sample,address,neighbourhood,lon,lat,coordinate_precision,google_maps_url,highlights,venue_type,price_range,opening_hours,contact,delivery_links,last_verified,attributes,dining",
  restaurant_sources: "restaurant_id,title,url,accessed,note",
  dish_restaurant_links: "dish_id,restaurant_id,status,menu_evidence,price_min_vnd,price_max_vnd,last_verified,primary_photo_url,photo_kind,photo_source_url,photo_attribution,photo_license,photo_last_checked_at",
  establishment_experiences: "establishment_id,experience_id",
  experience_items: "id,experience_id,name_vi,name_en,alt_names,category,attributes,description_vi,description_en,photos,sources,verification_status,dataset",
  offerings: "item_id,establishment_id,status,menu_evidence,price_min_vnd,price_max_vnd,price_unit,last_verified,primary_photo_url,photo_kind,photo_source_url,photo_attribution,photo_license,photo_last_checked_at",
} as const;

async function all<T>(sb: SupabaseClient, table: string, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return out;
  }
}

/** Reads the public catalogue + real establishments from Supabase (RLS hides candidates and samples). */
export async function fetchSupabaseFood(sb: SupabaseClient, opts: { includeCandidates?: boolean } = {}) {
  const [regions, provinces, dishes, origins, photos, dishSources, restaurants, tags, restaurantSources, links] = await Promise.all([
    all<RegionRow>(sb, "regions", READ_COLUMNS.regions),
    all<ProvinceRow>(sb, "provinces", READ_COLUMNS.provinces),
    all<DishRow>(sb, "dishes", READ_COLUMNS.dishes),
    all<OriginRow>(sb, "dish_origins", READ_COLUMNS.dish_origins),
    all<PhotoRow>(sb, "dish_photos", READ_COLUMNS.dish_photos),
    all<SourceRow>(sb, "dish_sources", READ_COLUMNS.dish_sources),
    all<RestaurantRow>(sb, "restaurants", READ_COLUMNS.restaurants),
    all<{ establishment_id: string; experience_id: string }>(sb, "establishment_experiences", READ_COLUMNS.establishment_experiences),
    all<SourceRow>(sb, "restaurant_sources", READ_COLUMNS.restaurant_sources),
    all<LinkRow>(sb, "dish_restaurant_links", READ_COLUMNS.dish_restaurant_links),
  ]);
  // Only establishments tagged with Food appear in Food (a café added for Coffee must not show up in Food's Nearby).
  const foodIds = new Set(tags.filter((t) => t.experience_id === "food").map((t) => t.establishment_id));
  const mapped = fromRows({ regions, provinces, dishes, origins, photos, dishSources, restaurants: restaurants.filter((r) => !r.is_sample && foodIds.has(r.id)), restaurantSources, links });
  if (!opts.includeCandidates) mapped.links = mapped.links.filter((l) => l.status !== "candidate");
  return mapped;
}
