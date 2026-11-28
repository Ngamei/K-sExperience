/**
 * Eating profile of a dish for Hôm nay ăn gì? — three kinds of facts, always distinguished:
 *   sourced / estimate : recorded in `dish.eating` with a source
 *   derived            : computed here from existing curated tags (dietary, dishType, category, taste)
 *   unknown            : neither — never treated as confirmed
 */
import type { Dish, DishEating } from "../data/schema";

export type Provenance = "sourced" | "estimate" | "derived" | "unknown";
export interface Fact<T> { value: T | null; provenance: Provenance }

export interface EatingProfile {
  proteins: Fact<string[]>;
  cookingMethods: Fact<string[]>;
  /** Allergens known to be present. `complete` false = there may be others. */
  allergens: Fact<string[]> & { complete: boolean };
  portion: Fact<"light" | "regular" | "hearty">;
  vegetables: Fact<"low" | "medium" | "high">;
  occasions: Fact<string[]>;
  serviceStyles: Fact<string[]>;
  nutrition: Fact<NonNullable<DishEating["nutrition"]>>;
}

const PROTEIN_TAGS: Record<string, string> = {
  "contains-pork": "pork", "contains-beef": "beef", "contains-poultry": "poultry", "contains-seafood": "seafood",
  "contains-fish": "fish", "contains-egg": "egg", "contains-goat": "goat", "contains-offal": "offal",
};
const ALLERGEN_TAGS: Record<string, string> = { "contains-peanut": "peanut", "contains-egg": "egg", "contains-dairy": "dairy", "contains-fish": "fish", "contains-seafood": "shellfish" };
const COOKING_BY_TYPE: Partial<Record<Dish["dishType"], string>> = {
  grilled: "grilled", fried: "fried", "noodle-soup": "simmered", soup: "simmered", hotpot: "simmered", porridge: "simmered", stew: "braised", salad: "raw-fresh",
};

const fact = <T,>(recorded: T | undefined, conf: "sourced" | "estimate" | undefined, derived: T | null): Fact<T> =>
  recorded !== undefined ? { value: recorded, provenance: conf ?? "estimate" } : derived !== null ? { value: derived, provenance: "derived" } : { value: null, provenance: "unknown" };

export function eatingProfile(d: Dish): EatingProfile {
  const e = d.eating ?? {};
  const conf = e.source?.confidence;
  const derivedProteins = d.dietary.map((t) => PROTEIN_TAGS[t]).filter(Boolean);
  const vegan = d.dietary.includes("vegan") || d.dietary.includes("vegetarian");
  const derivedAllergens = [...new Set(d.dietary.map((t) => ALLERGEN_TAGS[t]).filter(Boolean))];
  const cm = COOKING_BY_TYPE[d.dishType];
  const portion = d.category === "snack" || d.category === "sweet" ? "light" : d.dishType === "hotpot" ? "hearty" : null;
  return {
    proteins: fact(e.proteins, conf, derivedProteins.length ? derivedProteins : vegan ? [] : null),
    cookingMethods: fact(e.cookingMethods, conf, cm ? [cm] : null),
    allergens: { ...fact(e.allergens, conf, derivedAllergens), complete: Boolean(e.allergensComplete) },
    portion: fact(e.portion, conf, portion),
    vegetables: fact(e.vegetables, conf, d.dishType === "salad" ? "high" : null),
    occasions: fact(e.occasions, conf, null),
    serviceStyles: fact(e.serviceStyles, conf, null),
    nutrition: e.nutrition ? { value: e.nutrition, provenance: e.nutrition.confidence } : { value: null, provenance: "unknown" },
  };
}
