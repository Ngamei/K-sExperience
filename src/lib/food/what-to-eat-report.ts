/**
 * Hôm nay ăn gì? data completeness: which attributes the recommender can rely on, by provenance
 * (sourced / estimate / derived from tags / unknown), plus venue-side coverage and per-collection yield.
 * Shared by `npm run data:what-to-eat` (docs/WHAT_TO_EAT_REPORT.md) and the Admin "Recommendations" tab.
 */
import type { Dish, DishRestaurantLink, Restaurant } from "../data/schema";
import { buildAvailabilityIndex } from "./availability";
import { eatingProfile, type Provenance } from "./eating";
import { HCMC_CENTER } from "./hcmc";
import { DEFAULT_WTE, recommend } from "./what-to-eat";
import { PRESETS, applyPreset } from "./what-to-eat-presets";

export interface CoverageRow { attribute: string; sourced: number; estimate: number; derived: number; unknown: number; total: number }
export interface WteReport {
  dishes: CoverageRow[];
  venues: { attribute: string; known: number; total: number }[];
  presets: { id: string; name: string; eligible: number; shown: number }[];
  dishesWithVenue: number;
  totalDishes: number;
}

export function whatToEatReport(dishes: Dish[], restaurants: Restaurant[], links: DishRestaurantLink[], now = new Date()): WteReport {
  const facts: Record<string, Provenance[]> = {};
  const push = (k: string, p: Provenance) => (facts[k] ??= []).push(p);
  for (const d of dishes) {
    const p = eatingProfile(d);
    push("Meal times", d.mealTimes.length ? "sourced" : "unknown");
    push("Dietary tags", d.dietary.length ? "sourced" : "unknown");
    push("Taste", d.taste.length ? "sourced" : "unknown");
    push("Ingredients", d.ingredients.length ? "sourced" : "unknown");
    push("Proteins", p.proteins.provenance);
    push("Cooking methods", p.cookingMethods.provenance);
    push("Allergens", p.allergens.provenance);
    push("Allergen list complete", p.allergens.complete ? "sourced" : "unknown");
    push("Portion", p.portion.provenance);
    push("Vegetables", p.vegetables.provenance);
    push("Occasions", p.occasions.provenance);
    push("Service styles", p.serviceStyles.provenance);
    push("Nutrition", p.nutrition.provenance);
  }
  const count = (xs: Provenance[], k: Provenance) => xs.filter((x) => x === k).length;
  const real = restaurants.filter((r) => !r.isSample);
  const realLinks = links.filter((l) => !l.isSample);
  const availability = buildAvailabilityIndex(restaurants, links, { includeSamples: false });
  const ctx = { availability, origin: HCMC_CENTER, now, dishById: new Map(dishes.map((d) => [d.id, d])), history: { tried: {}, saved: [], ratings: {}, notInterested: new Set<string>() } };
  return {
    dishes: Object.entries(facts).map(([attribute, xs]) => ({ attribute, sourced: count(xs, "sourced"), estimate: count(xs, "estimate"), derived: count(xs, "derived"), unknown: count(xs, "unknown"), total: xs.length })),
    venues: [
      { attribute: "Price range", known: real.filter((r) => r.priceRange).length, total: real.length },
      { attribute: "Opening hours", known: real.filter((r) => r.openingHours).length, total: real.length },
      { attribute: "Delivery links", known: real.filter((r) => r.deliveryLinks.length).length, total: real.length },
      { attribute: "Dining attributes (atmosphere, occasions)", known: real.filter((r) => r.dining).length, total: real.length },
      { attribute: "Dish price at venue (link)", known: realLinks.filter((l) => l.priceVnd).length, total: realLinks.length },
    ],
    presets: PRESETS.map((p) => { const r = recommend(dishes, applyPreset(p), ctx); return { id: p.id, name: p.name.vi, eligible: r.eligible, shown: r.results.length }; }),
    dishesWithVenue: recommend(dishes, DEFAULT_WTE, ctx).eligible,
    totalDishes: dishes.length,
  };
}

const pct = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}%` : "—");
export function reportMarkdown(r: WteReport, generated: string) {
  return [
    "# Hôm nay ăn gì? — data completeness",
    "",
    `Generated ${generated} by \`npm run data:what-to-eat\`. Do not edit by hand.`,
    "",
    "Provenance: **sourced** = recorded with a citation (catalogue tags count as sourced); **estimate** = recorded, marked as an estimate;",
    "**derived** = inferred from existing tags (e.g. proteins from `contains-*`, cooking method from dish type); **unknown** = not recorded — the engine never assumes a value.",
    "",
    `Dishes recommendable with at least one real HCMC venue: **${r.dishesWithVenue} / ${r.totalDishes}**.`,
    "",
    "## Dish attributes",
    "",
    "| Attribute | Sourced | Estimate | Derived | Unknown |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...r.dishes.map((x) => `| ${x.attribute} | ${x.sourced} (${pct(x.sourced, x.total)}) | ${x.estimate} | ${x.derived} (${pct(x.derived, x.total)}) | ${x.unknown} (${pct(x.unknown, x.total)}) |`),
    "",
    "## Venue attributes (real HCMC establishments)",
    "",
    "| Attribute | Known | Coverage |",
    "| --- | ---: | ---: |",
    ...r.venues.map((x) => `| ${x.attribute} | ${x.known} / ${x.total} | ${pct(x.known, x.total)} |`),
    "",
    "Unknown venue values never exclude a dish: budget, open-now, delivery and atmosphere filters add a caution instead.",
    "",
    "## Collections and modes (default context: central HCMC, no history)",
    "",
    "| Preset | Eligible dishes | Shown |",
    "| --- | ---: | ---: |",
    ...r.presets.map((x) => `| ${x.name} (\`${x.id}\`) | ${x.eligible} | ${x.shown} |`),
    "",
  ].join("\n");
}
