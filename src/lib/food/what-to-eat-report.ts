/**
 * Hôm nay ăn gì? data completeness: which attributes the recommender can rely on, by provenance
 * (sourced / estimate / derived from tags / unknown), plus venue-side coverage and per-collection yield.
 * Shared by `npm run data:what-to-eat` (docs/WHAT_TO_EAT_REPORT.md) and the Admin "Recommendations" tab.
 */
import type { Dish, DishRestaurantLink, Restaurant } from "../data/schema";
import { buildAvailabilityIndex } from "./availability";
import { eatingProfile, type Provenance } from "./eating";
import { HCMC_CENTER } from "./hcmc";
import { BUDGET_PRESETS, DEFAULT_WTE, GOALS, recommend, type Meal } from "./what-to-eat";
import { DIET_PREFS, dishMatchesDiet, type DietPref } from "./filters";
import { PRESETS, applyPreset } from "./what-to-eat-presets";

export interface CoverageRow { attribute: string; sourced: number; estimate: number; derived: number; unknown: number; total: number }
export interface FilterSupport { filter: string; value: string; dishes: number; withPlaces: number; note?: string }
export interface ZeroCombo { meal: string; diet: string; eligible: number; withPlaces: number }
export interface WteReport {
  filters: FilterSupport[];
  zeroCombos: ZeroCombo[];
  dishes: CoverageRow[];
  venues: { attribute: string; known: number; total: number }[];
  presets: { id: string; name: string; eligible: number; shown: number }[];
  /** Dishes with at least one REAL (non-sample) HCMC establishment — same count as the public page ("with HCMC places"). */
  dishesWithVenue: number;
  /** All dishes the engine can suggest (including those without a listed place). */
  dishesEligible: number;
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
  // ---- how many dishes support each filter value (and how many of those have a real HCMC place)
  const placed = new Set(links.filter((l) => !l.isSample && real.some((r) => r.id === l.restaurantId)).map((l) => l.dishId));
  const sup = (filter: string, value: string, pred: (d: Dish) => boolean, note?: string): FilterSupport => {
    const ds = dishes.filter(pred);
    return { filter, value, dishes: ds.length, withPlaces: ds.filter((d) => placed.has(d.id)).length, ...(note ? { note } : {}) };
  };
  const meals: Exclude<Meal, "any">[] = ["breakfast", "lunch", "dinner", "snack", "late-night"];
  const mealTag: Record<string, string> = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner", snack: "afternoon", "late-night": "late-night" };
  const prof = new Map(dishes.map((d) => [d.id, eatingProfile(d)]));
  const filters: FilterSupport[] = [
    ...meals.map((m) => sup("meal", m, (d) => d.mealTimes.includes(mealTag[m] as never) || (m === "snack" && d.category === "snack"))),
    ...(Object.keys(DIET_PREFS) as DietPref[]).map((p) => sup("diet", p, (d) => dishMatchesDiet(d, [p]), p === "vegetarian" ? "includes dishes with a common vegetarian version" : undefined)),
    sup("goal", "balanced", (d) => { const p = prof.get(d.id)!; return p.vegetables.value === "high" || d.taste.includes("fresh") || d.taste.includes("herbal") || (p.cookingMethods.value ?? []).some((c) => ["simmered", "steamed", "raw-fresh"].includes(c)); }, "derived from taste/cooking tags"),
    sup("goal", "weight", (d) => { const p = prof.get(d.id)!; const c = p.cookingMethods.value ?? []; return d.category !== "sweet" && !c.includes("fried") && (p.vegetables.value === "high" || d.taste.includes("fresh") || c.some((x) => ["simmered", "steamed", "raw-fresh"].includes(x))); }, "derived; no calorie data"),
    sup("goal", "protein", (d) => (prof.get(d.id)!.proteins.value ?? []).length > 0, "derived from contains-* tags"),
    sup("goal", "quick", (d) => ["bread", "rolls", "banh", "rice", "noodles", "porridge"].includes(d.dishType) || prof.get(d.id)!.portion.value === "light"),
    sup("goal", "budget", (d) => ["bread", "rolls", "banh", "rice", "noodles", "noodle-soup", "porridge"].includes(d.dishType) || d.category === "snack", "dish type only — prices mostly unknown"),
    ...BUDGET_PRESETS.filter((b) => b.id !== "any").map((b) => sup("budget", b.id, (d) => links.some((l) => l.dishId === d.id && !l.isSample && l.priceVnd && (b.max === null || l.priceVnd.min <= b.max) && (b.min === null || l.priceVnd.max >= b.min)), "dishes with a RECORDED price in range")),
    sup("spice", "recorded (0–3)", (d) => d.spiceLevel !== undefined),
    sup("spice", "no spice (0)", (d) => d.spiceLevel === 0, "unknown intensity never matches"),
    sup("spice", "unknown", (d) => d.spiceLevel === undefined, "excluded by any spice limit below 'any'"),
    sup("allergens", "known (derived)", (d) => prof.get(d.id)!.allergens.provenance !== "unknown"),
    sup("allergens", "complete (sourced)", (d) => prof.get(d.id)!.allergens.complete),
    sup("occasion", "special dining (needs a place)", (d) => placed.has(d.id)),
    sup("atmosphere", "recorded", (d) => links.some((l) => l.dishId === d.id && real.find((r) => r.id === l.restaurantId)?.dining)),
    sup("nutrition", "recorded", (d) => prof.get(d.id)!.nutrition.provenance !== "unknown"),
  ];
  void GOALS;
  // ---- meal × diet combinations that produce zero results (strict meal) or zero actionable results
  const zeroCombos: ZeroCombo[] = [];
  for (const m of meals) for (const p of Object.keys(DIET_PREFS) as DietPref[]) {
    const r = recommend(dishes, { ...DEFAULT_WTE, meal: m, strictMeal: true, diet: [p] }, ctx);
    if (r.eligible === 0 || r.withVenue === 0) zeroCombos.push({ meal: m, diet: p, eligible: r.eligible, withPlaces: r.withVenue });
  }
  return {
    filters, zeroCombos,
    dishes: Object.entries(facts).map(([attribute, xs]) => ({ attribute, sourced: count(xs, "sourced"), estimate: count(xs, "estimate"), derived: count(xs, "derived"), unknown: count(xs, "unknown"), total: xs.length })),
    venues: [
      { attribute: "Price range", known: real.filter((r) => r.priceRange).length, total: real.length },
      { attribute: "Opening hours", known: real.filter((r) => r.openingHours).length, total: real.length },
      { attribute: "Delivery links", known: real.filter((r) => r.deliveryLinks.length).length, total: real.length },
      { attribute: "Dining attributes (atmosphere, occasions)", known: real.filter((r) => r.dining).length, total: real.length },
      { attribute: "Dish price at venue (link)", known: realLinks.filter((l) => l.priceVnd).length, total: realLinks.length },
    ],
    presets: PRESETS.map((p) => { const r = recommend(dishes, applyPreset(p), ctx); return { id: p.id, name: p.name.vi, eligible: r.eligible, shown: r.results.length }; }),
    // KEX-QA-01: the headline is venue-backed (was `.eligible`, which also counts dishes without any place → 138/138).
    dishesWithVenue: recommend(dishes, DEFAULT_WTE, ctx).withVenue,
    dishesEligible: recommend(dishes, DEFAULT_WTE, ctx).eligible,
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
    `Dishes recommendable with at least one real HCMC venue: **${r.dishesWithVenue} / ${r.totalDishes}**. All ${r.dishesEligible} dishes can be suggested; the other ${r.dishesEligible - r.dishesWithVenue} appear only as "no HCMC place listed yet".`,
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
    "## Dishes supporting each recommendation filter",
    "",
    "| Filter | Value | Dishes | With an HCMC place | Note |",
    "| --- | --- | ---: | ---: | --- |",
    ...r.filters.map((x) => `| ${x.filter} | ${x.value} | ${x.dishes} | ${x.withPlaces} | ${x.note ?? ""} |`),
    "",
    "## Meal × diet combinations with no results (meal set to “only this meal”)",
    "",
    "By default meal time only ranks, so these combinations still return dishes; they show where metadata or venue research is missing. Dietary restrictions are never relaxed.",
    "",
    "| Meal | Diet | Eligible dishes | With an HCMC place |",
    "| --- | --- | ---: | ---: |",
    ...r.zeroCombos.map((x) => `| ${x.meal} | ${x.diet} | ${x.eligible} | ${x.withPlaces} |`),
    "",
    "## Collections and modes (default context: central HCMC, no history)",
    "",
    "| Preset | Eligible dishes | Shown |",
    "| --- | ---: | ---: |",
    ...r.presets.map((x) => `| ${x.name} (\`${x.id}\`) | ${x.eligible} | ${x.shown} |`),
    "",
  ].join("\n");
}
