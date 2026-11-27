/**
 * Local (JSON-file) data access. This is the "local development mode" data source used
 * when Supabase credentials are absent, and for the offline static preview.
 * Server components call these; client components receive the data as props.
 */
import dishesFile from "@data/vietnamese-dishes.json";
import provincesFile from "@data/provinces.json";
import regionsFile from "@data/regions.json";
import restaurantsFile from "@data/hcmc-restaurants.json";
import mappingFile from "@data/dish-restaurant-mapping.json";
import sampleRestaurantsFile from "@data/samples/hcmc-restaurants.sample.json";
import sampleMappingFile from "@data/samples/dish-restaurant-mapping.sample.json";
import type { Archipelago, Dish, DishCatalogue, DishRestaurantLink, Province, Region, Restaurant } from "./schema";

export interface FoodData {
  catalogue: DishCatalogue["metadata"];
  dishes: Dish[];
  regions: Region[];
  provinces: Province[];
  archipelagos: Archipelago[];
  /** Real establishments + clearly-flagged samples (isSample). UI decides what to show. */
  restaurants: Restaurant[];
  links: DishRestaurantLink[];
}

let cache: FoodData | null = null;

export function getFoodData(): FoodData {
  if (cache) return cache;
  const cat = dishesFile as unknown as DishCatalogue;
  cache = {
    catalogue: cat.metadata,
    dishes: cat.dishes,
    regions: (regionsFile as unknown as { regions: Region[] }).regions,
    provinces: (provincesFile as unknown as { provinces: Province[] }).provinces,
    archipelagos: (provincesFile as unknown as { archipelagos: Archipelago[] }).archipelagos,
    restaurants: [
      ...(restaurantsFile as unknown as { restaurants: Restaurant[] }).restaurants,
      ...(sampleRestaurantsFile as unknown as { restaurants: Restaurant[] }).restaurants,
    ],
    links: [
      ...(mappingFile as unknown as { links: DishRestaurantLink[] }).links,
      ...(sampleMappingFile as unknown as { links: DishRestaurantLink[] }).links,
    ],
  };
  return cache;
}

export const getDish = (id: string) => getFoodData().dishes.find((d) => d.id === id);
export const getRestaurant = (id: string) => getFoodData().restaurants.find((r) => r.id === id);
