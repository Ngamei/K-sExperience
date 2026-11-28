/**
 * Hôm nay ăn gì? — deterministic recommendation engine (no AI yet).
 *
 *  1. Hard constraints: meal, diet, known allergens, excluded ingredients, max spice, recently eaten,
 *     "not interested", region, a verified HCMC establishment (unless cooking at home), distance,
 *     budget / opening hours / delivery ONLY where the data is known.
 *  2. Ranking with explanations: meal fit, preferences, history, variety, budget, distance,
 *     verified availability, occasion, evidence quality.
 *  3. Small result set (6) with diversity, plus alternatives.
 * Unknown prices, hours, atmosphere, nutrition and allergens are never treated as confirmed:
 * they become cautions shown with the result.
 */
import type { Dish, MealTime, Restaurant, RegionId, Taste } from "../data/schema";
import { STATUS_RANK } from "../data/evidence";
import type { AvailabilityIndex } from "./availability";
import { DIET_PREFS, type DietPref, dishMatchesDiet } from "./filters";
import { eatingProfile } from "./eating";
import { isOpenAt } from "./hours";
import { haversineKm, type LngLat } from "../geo/geo";
import { normalizeVi } from "../search/normalize";

export interface L { en: string; vi: string }
export type Meal = "any" | "breakfast" | "lunch" | "dinner" | "snack" | "late-night";
export type Tier = "$" | "$$" | "$$$" | "$$$$";

export interface WhatToEatFilters {
  meal: Meal;
  occasion: "everyday" | "special";
  people: number;
  /** Budget per person in VND (null = any). A total group budget is converted with `people`. */
  budgetPerPersonVnd: number | null;
  diet: DietPref[];
  /** Allergens to avoid — dishes KNOWN to contain them are excluded; unknown is flagged, never "safe". */
  allergens: string[];
  excludeIngredients: string;
  tastes: Taste[];
  cooking: string[];
  /** Cooking methods to avoid (hard: excluded when known or derived). */
  avoidCooking: string[];
  proteins: string[];
  portion: "light" | "regular" | "hearty" | null;
  moreVeg: boolean;
  maxSpice: number;
  regions: RegionId[];
  maxDistanceKm: number | null;
  openNow: boolean;
  service: "any" | "dine-in" | "takeaway" | "delivery" | "home-cooking";
  atmosphere: string[];
  /** Exclude dishes eaten within this many days (0 = off). */
  excludeRecentDays: number;
  newOnly: boolean;
  savedOnly: boolean;
}

export const DEFAULT_WTE: WhatToEatFilters = {
  meal: "any", occasion: "everyday", people: 1, budgetPerPersonVnd: null, diet: [], allergens: [], excludeIngredients: "",
  tastes: [], cooking: [], avoidCooking: [], proteins: [], portion: null, moreVeg: false, maxSpice: 3, regions: [], maxDistanceKm: null,
  openNow: false, service: "any", atmosphere: [], excludeRecentDays: 0, newOnly: false, savedOnly: false,
};

/** App convention for mapping a VND budget to the venue price tiers recorded in the data. */
export const tierForBudget = (vnd: number): Tier => (vnd < 60_000 ? "$" : vnd < 150_000 ? "$$" : vnd < 400_000 ? "$$$" : "$$$$");
const TIER_RANK: Record<Tier, number> = { $: 1, $$: 2, $$$: 3, $$$$: 4 };

const MEAL_TIMES: Record<Exclude<Meal, "any">, MealTime[]> = {
  breakfast: ["breakfast"], lunch: ["lunch"], dinner: ["dinner"], snack: ["afternoon"], "late-night": ["late-night"],
};
export const mealFits = (d: Dish, meal: Meal) =>
  meal === "any" || d.mealTimes.some((m) => MEAL_TIMES[meal].includes(m)) || (meal === "snack" && d.category === "snack");

export interface HistoryCtx {
  tried: Record<string, string>;
  saved: string[];
  ratings: Record<string, number>;
  notInterested: Set<string>;
}
export interface WteContext {
  availability: AvailabilityIndex;
  history: HistoryCtx;
  origin: LngLat;
  now: Date;
  dishById: Map<string, Dish>;
}

export interface Recommendation {
  dish: Dish;
  score: number;
  reasons: L[];
  cautions: L[];
  /** Real HCMC establishments that satisfy the constraints, nearest first. */
  venues: { restaurant: Restaurant; km: number; status: string }[];
}

const r = (en: string, vi: string): L => ({ en, vi });
const daysAgo = (iso: string, now: Date) => (now.getTime() - new Date(iso).getTime()) / 86_400_000;

function venuesFor(d: Dish, f: WhatToEatFilters, ctx: WteContext, cautions: L[]) {
  const links = ctx.availability.linksByDish.get(d.id) ?? [];
  const maxTier = f.budgetPerPersonVnd ? TIER_RANK[tierForBudget(f.budgetPerPersonVnd)] : null;
  let unknownPrice = false, unknownHours = false, unknownDelivery = false;
  const out: Recommendation["venues"] = [];
  for (const l of links) {
    const rest = ctx.availability.restaurants.get(l.restaurantId);
    if (!rest) continue;
    const km = haversineKm(ctx.origin, rest.coordinates);
    if (f.maxDistanceKm !== null && km > f.maxDistanceKm) continue;
    if (maxTier !== null) {
      if (rest.priceRange) { if (TIER_RANK[rest.priceRange] > maxTier) continue; } else unknownPrice = true;
    }
    if (f.openNow) {
      const open = isOpenAt(rest.openingHours, ctx.now);
      if (open === false) continue; // known closed
      if (open === null) unknownHours = true;
    }
    if (f.service === "delivery") {
      if (!rest.deliveryLinks.length) { unknownDelivery = true; }
    }
    out.push({ restaurant: rest, km, status: l.status });
  }
  if (unknownPrice) cautions.push(r("Prices not confirmed for some places", "Chưa xác nhận giá ở một số quán"));
  if (unknownHours) cautions.push(r("Opening hours not confirmed — check before you go", "Chưa xác nhận giờ mở cửa — hãy kiểm tra trước"));
  if (unknownDelivery) cautions.push(r("Delivery not confirmed for some places", "Chưa xác nhận giao hàng ở một số quán"));
  return out.sort((a, b) => a.km - b.km);
}

/** Scores one dish, or returns null when a hard constraint excludes it. */
export function evaluate(d: Dish, f: WhatToEatFilters, ctx: WteContext): Recommendation | null {
  // ---- hard constraints
  if (!mealFits(d, f.meal)) return null;
  if (f.diet.length && !dishMatchesDiet(d, f.diet)) return null;
  if (d.spiceLevel > f.maxSpice) return null;
  if (f.regions.length && !d.regionIds.some((x) => f.regions.includes(x))) return null;
  if (ctx.history.notInterested.has(d.id)) return null;
  if (f.savedOnly && !ctx.history.saved.includes(d.id)) return null;
  const triedAt = ctx.history.tried[d.id];
  if (f.newOnly && triedAt) return null;
  if (f.excludeRecentDays > 0 && triedAt && daysAgo(triedAt, ctx.now) <= f.excludeRecentDays) return null;
  const words = f.excludeIngredients.split(",").map((w) => normalizeVi(w.trim())).filter(Boolean);
  const ingredients = d.ingredients.map(normalizeVi).join(" | ") + " | " + normalizeVi(`${d.nameVi} ${d.nameEn}`);
  if (words.some((w) => ingredients.includes(w))) return null;
  const prof = eatingProfile(d);
  if (f.avoidCooking.length && (prof.cookingMethods.value ?? []).some((c) => f.avoidCooking.includes(c))) return null;
  const knownAllergens = prof.allergens.value ?? [];
  if (f.allergens.some((a) => knownAllergens.includes(a))) return null;

  const reasons: L[] = [];
  const cautions: L[] = [];
  const needVenue = f.service !== "home-cooking";
  const venues = needVenue ? venuesFor(d, f, ctx, cautions) : [];
  if (needVenue && !venues.length) return null;

  // ---- ranking
  let s = 1;
  if (f.meal !== "any") { s += 2; reasons.push(r(`Suits ${f.meal === "snack" ? "a snack" : f.meal}`, `Hợp cho ${({ breakfast: "bữa sáng", lunch: "bữa trưa", dinner: "bữa tối", snack: "ăn vặt", "late-night": "ăn khuya" } as const)[f.meal]}`)); }
  const tasteHits = f.tastes.filter((t) => d.taste.includes(t));
  if (tasteHits.length) { s += 0.8 * tasteHits.length; reasons.push(r(`Matches your taste: ${tasteHits.join(", ")}`, `Đúng khẩu vị: ${tasteHits.join(", ")}`)); }
  const prot = prof.proteins.value ?? [];
  const protHits = f.proteins.filter((p) => prot.includes(p) || (p === "tofu" && d.ingredients.some((i) => /đậu phụ|tofu/i.test(i))));
  if (protHits.length) { s += 1; reasons.push(r(`Protein you chose: ${protHits.join(", ")}`, `Có đạm bạn chọn: ${protHits.join(", ")}`)); }
  if (f.cooking.length && (prof.cookingMethods.value ?? []).some((c) => f.cooking.includes(c))) { s += 1; reasons.push(r("Cooking style you like", "Cách nấu bạn thích")); }
  if (f.portion) {
    if (prof.portion.value === f.portion) { s += 1; reasons.push(r(`${f.portion === "light" ? "Light" : f.portion === "hearty" ? "Hearty" : "Regular"} portion`, f.portion === "light" ? "Món nhẹ" : f.portion === "hearty" ? "Món no lâu" : "Phần vừa")); }
    else if (prof.portion.value === null) cautions.push(r("Portion size not recorded", "Chưa có thông tin khẩu phần"));
  }
  if (f.moreVeg && (prof.vegetables.value === "high" || d.taste.includes("fresh") || d.taste.includes("herbal"))) { s += 1; reasons.push(r("Fresh herbs and vegetables", "Nhiều rau thơm, rau tươi")); }
  if (f.diet.length) {
    reasons.push(r("Fits your dietary choice (by ingredient tags)", "Hợp chế độ ăn bạn chọn (theo thành phần)"));
    if ((f.diet.includes("vegetarian") || f.diet.includes("vegan")) && !d.dietary.includes("vegan") && !d.dietary.includes("vegetarian") && d.dietary.includes("vegetarian-version-common"))
      cautions.push(r("Ask for the vegetarian version", "Hãy hỏi phiên bản chay"));
  }
  if (f.allergens.length && !prof.allergens.complete) cautions.push(r("Allergen information is incomplete — always confirm with the venue", "Thông tin dị ứng chưa đầy đủ — luôn hỏi lại quán"));

  // history & variety
  if (ctx.history.saved.includes(d.id)) { s += 1; reasons.push(r("On your saved list", "Có trong danh sách đã lưu")); }
  if (!triedAt) { s += 0.6; reasons.push(r("New for you", "Món mới với bạn")); }
  else if (daysAgo(triedAt, ctx.now) <= 7) { s -= 2; }
  const liked = Object.entries(ctx.history.ratings).filter(([, v]) => v >= 4).map(([id]) => ctx.dishById.get(id)).filter(Boolean) as Dish[];
  if (liked.some((x) => x.id !== d.id && (x.dishType === d.dishType || (x.family && x.family === d.family)))) { s += 0.8; reasons.push(r("Similar to a dish you rated highly", "Giống món bạn đánh giá cao")); }

  // venues: availability evidence, distance, budget, occasion
  if (venues.length) {
    const best = Math.max(...venues.map((v) => STATUS_RANK[v.status as keyof typeof STATUS_RANK] ?? 0));
    s += best >= 4 ? 2 : 1;
    reasons.push(best >= 4
      ? r("Confirmed at an HCMC venue", "Đã xác nhận có tại quán ở TP.HCM")
      : r(`Listed at ${venues.length} HCMC place${venues.length > 1 ? "s" : ""} by published sources`, `${venues.length} quán ở TP.HCM được nguồn uy tín giới thiệu`));
    s += Math.max(0, 5 - Math.min(venues[0].km, 5)) * 0.3;
    if (f.maxDistanceKm !== null) reasons.push(r(`Within ${f.maxDistanceKm} km (${venues[0].km.toFixed(1)} km)`, `Trong bán kính ${f.maxDistanceKm} km (${venues[0].km.toFixed(1)} km)`));
    if (f.budgetPerPersonVnd && venues.some((v) => v.restaurant.priceRange)) { s += 1; reasons.push(r("Within your budget", "Trong ngân sách")); }
    if (f.occasion === "special" || f.atmosphere.length) {
      const fit = venues.some((v) => v.restaurant.dining && (f.atmosphere.length ? f.atmosphere.some((a) => v.restaurant.dining!.atmosphere?.includes(a as never)) : true));
      if (fit) { s += 2; reasons.push(r("Atmosphere suits the occasion", "Không gian hợp dịp này")); }
      else cautions.push(r("Atmosphere not recorded yet for these places", "Chưa có thông tin không gian của các quán này"));
      if (venues.some((v) => v.restaurant.venueType === "restaurant")) s += 0.5;
    }
  } else if (f.service === "home-cooking") {
    reasons.push(r("Home-style dish to cook yourself", "Món nhà, tự nấu"));
  }
  if (f.occasion === "special" && f.meal === "any" && d.mealTimes.includes("dinner")) s += 1;
  if (f.people >= 4 && ["hotpot", "grilled", "seafood"].includes(d.dishType)) { s += 1; reasons.push(r("Good for sharing in a group", "Hợp ăn chung nhóm đông")); }
  if (d.verification.status !== "verified") cautions.push(r("Dish description not yet verified", "Mô tả món chưa được xác minh"));
  s += (4 - d.prominence) * 0.2;
  return { dish: d, score: s, reasons: reasons.slice(0, 4), cautions, venues };
}

/** Diverse top-N: at most 2 per dish type and 1 per regional family. */
function diverse(sorted: Recommendation[], n: number, skip = new Set<string>()) {
  const out: Recommendation[] = [];
  const types = new Map<string, number>();
  const fams = new Set<string>();
  for (const x of sorted) {
    if (skip.has(x.dish.id)) continue;
    if ((types.get(x.dish.dishType) ?? 0) >= 2) continue;
    if (x.dish.family && fams.has(x.dish.family)) continue;
    out.push(x);
    types.set(x.dish.dishType, (types.get(x.dish.dishType) ?? 0) + 1);
    if (x.dish.family) fams.add(x.dish.family);
    if (out.length === n) break;
  }
  return out;
}

export function recommend(dishes: Dish[], f: WhatToEatFilters, ctx: WteContext, n = 6) {
  const eligible = dishes.map((d) => evaluate(d, f, ctx)).filter((x): x is Recommendation => x !== null)
    .sort((a, b) => b.score - a.score || a.dish.nameVi.localeCompare(b.dish.nameVi, "vi"));
  const top = diverse(eligible, n);
  const alternatives = diverse(eligible, n, new Set(top.map((x) => x.dish.id)));
  return { results: top, alternatives, eligible: eligible.length };
}

/** "Surprise me": a weighted random pick among eligible dishes (rand injectable for tests). */
export function surprise(dishes: Dish[], f: WhatToEatFilters, ctx: WteContext, rand: () => number = Math.random) {
  const el = dishes.map((d) => evaluate(d, f, ctx)).filter((x): x is Recommendation => x !== null);
  if (!el.length) return null;
  const total = el.reduce((a, x) => a + Math.max(x.score, 0.1), 0);
  let t = rand() * total;
  for (const x of el) if ((t -= Math.max(x.score, 0.1)) <= 0) return x;
  return el[el.length - 1];
}

export { DIET_PREFS };
