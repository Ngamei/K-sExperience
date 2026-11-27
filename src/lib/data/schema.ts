import { z } from "zod";

/* ---------------------------------------------------------------------------------------------
 * Controlled vocabularies
 * ------------------------------------------------------------------------------------------- */
export const REGION_IDS = ["mien-bac", "bac-trung-bo", "nam-trung-bo", "tay-nguyen", "dong-nam-bo", "tay-nam-bo"] as const;
export const CATEGORIES = ["savory", "sweet", "snack"] as const;
export const DISH_TYPES = [
  "noodle-soup", "noodles", "rice", "banh", "bread", "rolls", "hotpot", "grilled", "salad",
  "stew", "porridge", "soup", "che", "dessert", "fried", "cured", "seafood", "confection",
] as const;
export const TASTES = [
  "savory", "sweet", "sour", "salty", "spicy", "bitter", "umami", "herbal", "rich", "light",
  "smoky", "fermented", "fresh", "creamy", "crunchy", "chewy", "nutty", "fragrant",
] as const;
export const DIETARY = [
  "contains-pork", "contains-beef", "contains-poultry", "contains-seafood", "contains-fish",
  "contains-egg", "contains-dairy", "contains-peanut", "contains-offal", "contains-goat",
  "contains-game", "vegetarian", "vegan", "vegetarian-version-common",
] as const;
export const MEAL_TIMES = ["breakfast", "lunch", "afternoon", "dinner", "late-night"] as const;
export const VERIFICATION_STATUSES = ["seed-unverified", "pending-review", "verified", "rejected"] as const;
export const DATASETS = ["seed", "master"] as const;

export type RegionId = (typeof REGION_IDS)[number];
export type Category = (typeof CATEGORIES)[number];
export type DishType = (typeof DISH_TYPES)[number];
export type Taste = (typeof TASTES)[number];
export type Dietary = (typeof DIETARY)[number];
export type MealTime = (typeof MEAL_TIMES)[number];

const lonLat = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const localized = z.object({ vi: z.string(), en: z.string() });
const sourceRef = z.object({
  title: z.string().min(1),
  url: z.url().optional(),
  accessed: z.string().optional(),
  note: z.string().optional(),
});
const photo = z.object({
  url: z.string().min(1),
  credit: z.string().min(1),
  license: z.string().min(1),
  sourceUrl: z.url().optional(),
});

/* ---------------------------------------------------------------------------------------------
 * Geography
 * ------------------------------------------------------------------------------------------- */
export const RegionSchema = z.object({
  id: z.enum(REGION_IDS),
  nameVi: z.string(),
  nameEn: z.string(),
  color: z.string(),
  order: z.number(),
  blurbEn: z.string(),
  blurbVi: z.string(),
  provinceIds: z.array(z.string()),
});
export type Region = z.infer<typeof RegionSchema>;

export const ProvinceSchema = z.object({
  id: z.string(),
  nameVi: z.string(),
  nameEn: z.string(),
  iso: z.string(),
  regionId: z.enum(REGION_IDS),
  kind: z.enum(["city", "province"]),
  labelPoint: lonLat,
  bbox: z.array(z.number()).length(4),
  current: z.object({ id: z.string(), nameVi: z.string(), nameEn: z.string(), kind: z.enum(["city", "province"]) }),
});
export type Province = z.infer<typeof ProvinceSchema>;

export const ArchipelagoSchema = z.object({
  id: z.string(),
  nameVi: z.string(),
  nameEn: z.string(),
  parentProvinceId: z.string(),
  labelPoint: lonLat,
  islandCount: z.number(),
});
export type Archipelago = z.infer<typeof ArchipelagoSchema>;

/* ---------------------------------------------------------------------------------------------
 * Dishes (canonical form, produced by scripts/import-catalogue.ts)
 * ------------------------------------------------------------------------------------------- */
export const DishOriginSchema = z.object({
  /** Historical province (one of 63). Omitted when the origin is region-wide. */
  provinceId: z.string().optional(),
  regionId: z.enum(REGION_IDS),
  role: z.enum(["primary", "associated"]),
});
export type DishOrigin = z.infer<typeof DishOriginSchema>;

export const DishSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nameVi: z.string().min(1),
  nameEn: z.string().min(1),
  altNames: z.array(z.string()),
  category: z.enum(CATEGORIES),
  dishType: z.enum(DISH_TYPES),
  /** Groups meaningful regional variants (e.g. all phở) without merging them into one record. */
  family: z.string().optional(),
  origins: z.array(DishOriginSchema).min(1),
  regionIds: z.array(z.enum(REGION_IDS)).min(1),
  ingredients: z.array(z.string()),
  taste: z.array(z.enum(TASTES)),
  spiceLevel: z.number().int().min(0).max(3),
  dietary: z.array(z.enum(DIETARY)),
  mealTimes: z.array(z.enum(MEAL_TIMES)),
  description: localized,
  photos: z.array(photo),
  sources: z.array(sourceRef),
  verification: z.object({
    status: z.enum(VERIFICATION_STATUSES),
    notes: z.string().optional(),
    verifiedAt: z.string().optional(),
  }),
  dataset: z.enum(DATASETS),
  /** 1 = shown at national zoom, 2 = regional zoom, 3 = provincial zoom. */
  prominence: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type Dish = z.infer<typeof DishSchema>;

export const DishCatalogueSchema = z.object({
  metadata: z.object({
    /** "mixed" = master import merged into the seed catalogue (seed dishes kept). */
    dataset: z.enum([...DATASETS, "mixed"]),
    label: z.string(),
    seedCount: z.number().optional(),
    generatedAt: z.string(),
    sourceFile: z.string(),
    recordCount: z.number(),
  }),
  dishes: z.array(DishSchema),
});
export type DishCatalogue = z.infer<typeof DishCatalogueSchema>;

/* ---------------------------------------------------------------------------------------------
 * HCMC establishments
 * ------------------------------------------------------------------------------------------- */
export { LINK_STATUSES as AVAILABILITY_STATUSES } from "./evidence";
import { EVIDENCE_TYPES, LINK_STATUSES, evidenceProblem, type LinkStatus } from "./evidence";
export type AvailabilityStatus = LinkStatus | "none-found";

export const VENUE_TYPES = ["street-stall", "eatery", "restaurant", "market-stall", "cafe-dessert", "food-court"] as const;
export const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"] as const;

const dayHours = z.array(z.tuple([z.string().regex(/^\d{2}:\d{2}$/), z.string().regex(/^\d{2}:\d{2}$/)]));
export const OpeningHoursSchema = z.object({
  mon: dayHours, tue: dayHours, wed: dayHours, thu: dayHours, fri: dayHours, sat: dayHours, sun: dayHours,
});
export type OpeningHours = z.infer<typeof OpeningHoursSchema>;

export const RestaurantSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  /** true for clearly-labelled demonstration records. Never shown in real recommendations. */
  isSample: z.boolean(),
  address: z.string().min(1),
  neighbourhood: z.string().min(1),
  coordinates: lonLat,
  /** "exact" = building/POI match; "street" = only the street could be geocoded (shown as approximate). */
  coordinatePrecision: z.enum(["exact", "street"]).optional(),
  /** Google Maps search link (name + address) — opens the real place listing. */
  googleMapsUrl: z.url().optional(),
  /** Short factual notes attributed to a cited source (e.g. guide distinctions). */
  highlights: z.array(z.string()).optional(),
  venueType: z.enum(VENUE_TYPES),
  priceRange: z.enum(PRICE_RANGES).optional(),
  openingHours: OpeningHoursSchema.optional(),
  contact: z.object({ phone: z.string().optional(), website: z.url().optional(), social: z.url().optional() }).optional(),
  deliveryLinks: z.array(z.object({ provider: z.string(), url: z.url() })),
  sources: z.array(sourceRef),
  lastVerified: z.string().optional(),
});
export type Restaurant = z.infer<typeof RestaurantSchema>;

export const DishRestaurantLinkSchema = z.object({
  dishId: z.string(),
  restaurantId: z.string(),
  status: z.enum(LINK_STATUSES),
  isSample: z.boolean(),
  menuEvidence: z.object({ type: z.enum(EVIDENCE_TYPES), note: z.string(), url: z.url().optional() }).optional(),
  priceVnd: z.object({ min: z.number(), max: z.number() }).optional(),
  /** Date the evidence was last checked (shown as "Last checked"). */
  lastVerified: z.string().optional(),
}).superRefine((l, ctx) => {
  const problem = evidenceProblem(l.status, l.menuEvidence?.type, l.isSample);
  if (problem) ctx.addIssue({ code: "custom", message: problem, path: ["menuEvidence"] });
  if (l.status !== "candidate" && !l.isSample && !l.lastVerified) ctx.addIssue({ code: "custom", message: "lastVerified (last-checked date) is required", path: ["lastVerified"] });
});
export type DishRestaurantLink = z.infer<typeof DishRestaurantLinkSchema>;

export const RestaurantFileSchema = z.object({
  metadata: z.object({ note: z.string(), coverage: z.string() }),
  restaurants: z.array(RestaurantSchema),
});
export const MappingFileSchema = z.object({
  metadata: z.object({ note: z.string() }),
  links: z.array(DishRestaurantLinkSchema),
});
