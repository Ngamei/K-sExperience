import type { Category, Dish, MealTime, RegionId } from "../data/schema";
import { type AvailabilityIndex, statusOf } from "./availability";
import { type DietPref, dishMatchesDiet } from "./filters";

export interface Preferences {
  categories: Category[];
  regions: RegionId[];
  maxSpice: number;
  diet: DietPref[];
  mealTime: MealTime | "any";
}

export const DEFAULT_PREFERENCES: Preferences = { categories: [], regions: [], maxSpice: 3, diet: [], mealTime: "any" };

/**
 * Scores dishes against preferences. Hard constraints (diet, spice) exclude; soft ones boost.
 * IMPORTANT: availability must be built with includeSamples=false so sample venues never
 * influence real recommendations.
 */
export function scoreDish(d: Dish, p: Preferences, ctx: { availability: AvailabilityIndex; tried: Set<string> }): number {
  if (d.spiceLevel > p.maxSpice) return -1;
  if (p.diet.length && !dishMatchesDiet(d, p.diet)) return -1;
  if (p.categories.length && !p.categories.includes(d.category)) return -1;
  let s = 1;
  if (p.regions.length && d.regionIds.some((r) => p.regions.includes(r))) s += 2;
  if (p.mealTime !== "any" && d.mealTimes.includes(p.mealTime)) s += 1.5;
  if (!ctx.tried.has(d.id)) s += 1;
  if (statusOf(ctx.availability, d.id) === "verified-available") s += 2;
  s += (4 - d.prominence) * 0.3;
  return s;
}

/** Weighted random pick ("Surprise me"). `rand` injectable for tests. */
export function surpriseMe(
  dishes: Dish[],
  p: Preferences,
  ctx: { availability: AvailabilityIndex; tried: Set<string> },
  rand: () => number = Math.random,
  exclude?: string,
): Dish | null {
  const scored = dishes.map((d) => [d, scoreDish(d, p, ctx)] as const).filter(([d, s]) => s > 0 && d.id !== exclude);
  if (!scored.length) return null;
  const total = scored.reduce((a, [, s]) => a + s, 0);
  let r = rand() * total;
  for (const [d, s] of scored) if ((r -= s) <= 0) return d;
  return scored[scored.length - 1][0];
}
