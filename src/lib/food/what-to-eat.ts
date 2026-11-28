/**
 * Hôm nay ăn gì? — deterministic recommendation engine (no AI).
 *
 *  1. HARD constraints (never relaxed by the engine): meal, diet, known allergens, excluded ingredients,
 *     avoided cooking, max spice, region, recently eaten / not interested / new-only / saved-only, and —
 *     only when the user asks for a place (dine-in, takeaway, delivery, distance, open now, special dining) —
 *     a real HCMC establishment. Budget, opening hours, delivery and atmosphere exclude a venue only when
 *     its data is KNOWN to conflict; unknown data becomes a caution, never "within budget".
 *  2. SOFT preferences (goals, occasion, tastes, proteins, cooking, portion, vegetables, history) only rank.
 *  3. Small, diverse result set (6) + alternatives. When nothing matches, `explainEmpty` says which
 *     filters restrict the results and how many dishes removing each one would give — the user decides.
 * Dishes with no listed HCMC place can still be suggested; the result says so honestly.
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
export type Occasion = "everyday" | "office-lunch" | "date" | "family" | "special";
export type Goal = "balanced" | "weight" | "protein" | "budget" | "quick";
export const OCCASIONS: Occasion[] = ["everyday", "office-lunch", "date", "family", "special"];
export const GOALS: Goal[] = ["balanced", "weight", "protein", "budget", "quick"];
export const isSpecialOccasion = (o: Occasion) => o === "date" || o === "family" || o === "special";

export interface WhatToEatFilters {
  meal: Meal;
  /** PO decision: meal suitability ranks by default; true = only dishes typically eaten at this meal. */
  strictMeal: boolean;
  occasion: Occasion;
  people: number;
  /** Budget per person in VND (null = open-ended). A total group budget is converted with `people` by the caller. */
  budgetMinVnd: number | null;
  budgetMaxVnd: number | null;
  /** Soft goals: rank only, never exclude. */
  goals: Goal[];
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
  meal: "any", strictMeal: false, occasion: "everyday", people: 1, budgetMinVnd: null, budgetMaxVnd: null, goals: [], diet: [], allergens: [], excludeIngredients: "",
  tastes: [], cooking: [], avoidCooking: [], proteins: [], portion: null, moreVeg: false, maxSpice: 3, regions: [], maxDistanceKm: null,
  openNow: false, service: "any", atmosphere: [], excludeRecentDays: 0, newOnly: false, savedOnly: false,
};

/** Budget presets (VND per person). */
export const BUDGET_PRESETS: { id: string; min: number | null; max: number | null; label: L }[] = [
  { id: "any", min: null, max: null, label: { en: "Any", vi: "Bất kỳ" } },
  { id: "u30", min: null, max: 30_000, label: { en: "Under 30k", vi: "Dưới 30k" } },
  { id: "u50", min: null, max: 50_000, label: { en: "Under 50k", vi: "Dưới 50k" } },
  { id: "u100", min: null, max: 100_000, label: { en: "Under 100k", vi: "Dưới 100k" } },
  { id: "100-300", min: 100_000, max: 300_000, label: { en: "100–300k", vi: "100–300k" } },
  { id: "300+", min: 300_000, max: null, label: { en: "300k+", vi: "Trên 300k" } },
];

/** App convention for the venue price tiers recorded in the data (VND per person). */
const TIER_RANGE: Record<Tier, [number, number]> = { $: [0, 60_000], $$: [60_000, 150_000], $$$: [150_000, 400_000], $$$$: [400_000, Infinity] };
export const tierForBudget = (vnd: number): Tier => (vnd < 60_000 ? "$" : vnd < 150_000 ? "$$" : vnd < 400_000 ? "$$$" : "$$$$");
const overlaps = (lo: number, hi: number, f: WhatToEatFilters) => (f.budgetMaxVnd === null || lo <= f.budgetMaxVnd) && (f.budgetMinVnd === null || hi >= f.budgetMinVnd);
const budgetSet = (f: WhatToEatFilters) => f.budgetMinVnd !== null || f.budgetMaxVnd !== null;

const MEAL_TIMES: Record<Exclude<Meal, "any">, MealTime[]> = {
  breakfast: ["breakfast"], lunch: ["lunch"], dinner: ["dinner"], snack: ["afternoon"], "late-night": ["late-night"],
};
export const mealFits = (d: Dish, meal: Meal) =>
  meal === "any" || d.mealTimes.some((m) => MEAL_TIMES[meal].includes(m)) || (meal === "snack" && d.category === "snack");

/** A place is needed only when the user asked for one. */
export const needsVenue = (f: WhatToEatFilters) =>
  f.service === "dine-in" || f.service === "takeaway" || f.service === "delivery" || f.maxDistanceKm !== null || f.openNow || isSpecialOccasion(f.occasion) || f.atmosphere.length > 0;

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

export interface VenueMatch { restaurant: Restaurant; km: number; status: string; priceVnd?: { min: number; max: number } }
export interface Recommendation {
  dish: Dish;
  score: number;
  reasons: L[];
  cautions: L[];
  /** Real HCMC establishments that satisfy the constraints, nearest first (may be empty — see cautions). */
  venues: VenueMatch[];
}

const r = (en: string, vi: string): L => ({ en, vi });
const daysAgo = (iso: string, now: Date) => (now.getTime() - new Date(iso).getTime()) / 86_400_000;
const MEAL_VI = { breakfast: "bữa sáng", lunch: "bữa trưa", dinner: "bữa tối", snack: "ăn vặt", "late-night": "ăn khuya" } as const;
const QUICK_TYPES = ["bread", "rolls", "banh", "rice", "noodles", "porridge"];
const EVERYDAY_TYPES = ["bread", "rolls", "banh", "rice", "noodles", "noodle-soup", "porridge"];
const SHARE_TYPES = ["hotpot", "grilled", "seafood"];

function venuesFor(d: Dish, f: WhatToEatFilters, ctx: WteContext, cautions: L[]) {
  const links = ctx.availability.linksByDish.get(d.id) ?? [];
  let unknownPrice = false, unknownHours = false, unknownDelivery = false;
  const out: VenueMatch[] = [];
  for (const l of links) {
    const rest = ctx.availability.restaurants.get(l.restaurantId);
    if (!rest) continue;
    const km = haversineKm(ctx.origin, rest.coordinates);
    if (f.maxDistanceKm !== null && km > f.maxDistanceKm) continue;
    if (budgetSet(f)) {
      const known = l.priceVnd ? [l.priceVnd.min, l.priceVnd.max] : rest.priceRange ? TIER_RANGE[rest.priceRange] : null;
      if (known) { if (!overlaps(known[0], known[1], f)) continue; } else unknownPrice = true;
    }
    if (f.openNow) {
      const open = isOpenAt(rest.openingHours, ctx.now);
      if (open === false) continue; // known closed
      if (open === null) unknownHours = true;
    }
    if (f.service === "delivery" && !rest.deliveryLinks.length) unknownDelivery = true;
    out.push({ restaurant: rest, km, status: l.status, ...(l.priceVnd ? { priceVnd: l.priceVnd } : {}) });
  }
  if (unknownPrice) cautions.push(r("Price not confirmed — not counted as within your budget", "Chưa xác nhận giá — chưa tính là trong ngân sách"));
  if (unknownHours) cautions.push(r("Opening hours not confirmed — check before you go", "Chưa xác nhận giờ mở cửa — hãy kiểm tra trước"));
  if (unknownDelivery) cautions.push(r("Delivery not confirmed for some places", "Chưa xác nhận giao hàng ở một số quán"));
  return out.sort((a, b) => a.km - b.km);
}

/** Hard constraints on the dish itself (not on places). Returns the id of the first failing constraint, or null. */
export function dishBlocker(d: Dish, f: WhatToEatFilters, ctx: WteContext): string | null {
  if (f.strictMeal && !mealFits(d, f.meal)) return "meal";
  for (const p of f.diet) if (!dishMatchesDiet(d, [p])) return `diet:${p}`;
  if (d.spiceLevel > f.maxSpice) return "maxSpice";
  if (f.regions.length && !d.regionIds.some((x) => f.regions.includes(x))) return "regions";
  if (ctx.history.notInterested.has(d.id)) return "notInterested";
  if (f.savedOnly && !ctx.history.saved.includes(d.id)) return "savedOnly";
  const triedAt = ctx.history.tried[d.id];
  if (f.newOnly && triedAt) return "newOnly";
  if (f.excludeRecentDays > 0 && triedAt && daysAgo(triedAt, ctx.now) <= f.excludeRecentDays) return "excludeRecentDays";
  const words = f.excludeIngredients.split(",").map((w) => normalizeVi(w.trim())).filter(Boolean);
  if (words.length) {
    const text = d.ingredients.map(normalizeVi).join(" | ") + " | " + normalizeVi(`${d.nameVi} ${d.nameEn}`);
    if (words.some((w) => text.includes(w))) return "excludeIngredients";
  }
  const prof = eatingProfile(d);
  if (f.avoidCooking.length && (prof.cookingMethods.value ?? []).some((c) => f.avoidCooking.includes(c))) return "avoidCooking";
  if (f.allergens.some((a) => (prof.allergens.value ?? []).includes(a))) return "allergens";
  return null;
}

/** Scores one dish, or returns null when a hard constraint excludes it. */
export function evaluate(d: Dish, f: WhatToEatFilters, ctx: WteContext): Recommendation | null {
  if (dishBlocker(d, f, ctx)) return null;
  const prof = eatingProfile(d);
  const triedAt = ctx.history.tried[d.id];
  const reasons: L[] = [];
  const cautions: L[] = [];
  const venues = f.service === "home-cooking" ? [] : venuesFor(d, f, ctx, cautions);
  if (needsVenue(f) && f.service !== "home-cooking" && !venues.length) return null;

  // ---- ranking (soft)
  let s = 1;
  if (f.meal !== "any") {
    if (mealFits(d, f.meal)) { s += 2.5; reasons.push(r(`Suits ${f.meal === "snack" ? "a snack" : f.meal === "late-night" ? "a late-night meal" : f.meal}`, `Hợp cho ${MEAL_VI[f.meal]}`)); }
    else { s -= 1.5; cautions.push(r(`Usually eaten at: ${d.mealTimes.join(", ")}`, `Thường ăn vào: ${d.mealTimes.map((m) => ({ breakfast: "bữa sáng", lunch: "bữa trưa", afternoon: "buổi chiều", dinner: "bữa tối", "late-night": "ăn khuya" } as Record<string, string>)[m] ?? m).join(", ")}`)); }
  }
  const tasteHits = f.tastes.filter((t) => d.taste.includes(t));
  if (tasteHits.length) { s += 0.8 * tasteHits.length; reasons.push(r(`Matches your taste: ${tasteHits.join(", ")}`, `Đúng khẩu vị: ${tasteHits.join(", ")}`)); }
  const prot = prof.proteins.value ?? [];
  const hasTofu = d.ingredients.some((i) => /đậu phụ|đậu hũ|tofu/i.test(i));
  const protHits = f.proteins.filter((p) => prot.includes(p) || (p === "tofu" && hasTofu));
  if (protHits.length) { s += 1; reasons.push(r(`Protein you chose: ${protHits.join(", ")}`, `Có đạm bạn chọn: ${protHits.join(", ")}`)); }
  const cooking = prof.cookingMethods.value ?? [];
  if (f.cooking.length && cooking.some((c) => f.cooking.includes(c))) { s += 1; reasons.push(r("Cooking style you like", "Cách nấu bạn thích")); }
  if (f.portion) {
    if (prof.portion.value === f.portion) { s += 1; reasons.push(r(f.portion === "light" ? "Light portion" : f.portion === "hearty" ? "Hearty portion" : "Regular portion", f.portion === "light" ? "Món nhẹ" : f.portion === "hearty" ? "Món no lâu" : "Phần vừa")); }
    else if (prof.portion.value === null) cautions.push(r("Portion size not recorded", "Chưa có thông tin khẩu phần"));
  }
  const veggie = prof.vegetables.value === "high" || d.taste.includes("fresh") || d.taste.includes("herbal");
  const lighter = cooking.some((c) => ["simmered", "steamed", "raw-fresh"].includes(c));
  const fried = cooking.includes("fried");
  if (f.moreVeg && veggie) { s += 1; reasons.push(r("Fresh herbs and vegetables", "Nhiều rau thơm, rau tươi")); }

  // goals — ranking only, wording by ingredients/cooking (no calorie or health claims)
  if (f.goals.includes("balanced")) {
    if (veggie || lighter) { s += 1.5; reasons.push(r("Balanced: herbs/vegetables or lighter cooking", "Cân bằng: nhiều rau hoặc cách nấu nhẹ")); }
    if (fried) s -= 1;
  }
  if (f.goals.includes("weight")) {
    if ((veggie || lighter) && !fried && d.category !== "sweet") { s += 1.5; reasons.push(r("Satisfying, with vegetables and lighter cooking", "No bụng, nhiều rau, cách nấu nhẹ")); }
    if (fried || d.category === "sweet") s -= 1.5;
  }
  if (f.goals.includes("protein")) {
    if (prot.length || hasTofu) { s += 1.5; reasons.push(r(`Protein from ${[...prot, ...(hasTofu && !prot.includes("tofu") ? ["tofu"] : [])].join(", ")} (by ingredients)`, `Có đạm từ ${[...prot, ...(hasTofu && !prot.includes("tofu") ? ["tofu"] : [])].join(", ")} (theo thành phần)`)); }
    else s -= 1;
  }
  if (f.goals.includes("budget") && (EVERYDAY_TYPES.includes(d.dishType) || d.category === "snack")) { s += 1; reasons.push(r("Everyday street-food style dish", "Món bình dân, đường phố")); }
  if (f.goals.includes("quick") && (QUICK_TYPES.includes(d.dishType) || prof.portion.value === "light")) { s += 1; reasons.push(r("Quick to eat", "Ăn nhanh, gọn")); }

  if (f.diet.length) {
    reasons.push(r("Fits your dietary choice (by ingredient tags)", "Hợp chế độ ăn bạn chọn (theo thành phần)"));
    if ((f.diet.includes("vegetarian") || f.diet.includes("vegan")) && !d.dietary.includes("vegan") && !d.dietary.includes("vegetarian") && d.dietary.includes("vegetarian-version-common"))
      cautions.push(r("Usually made with meat — ask for the vegetarian version", "Thường có thịt — hãy hỏi phiên bản chay"));
  }
  if (f.allergens.length && !prof.allergens.complete) cautions.push(r("Allergen information is incomplete — always confirm with the venue", "Thông tin dị ứng chưa đầy đủ — luôn hỏi lại quán"));

  // history & variety
  if (ctx.history.saved.includes(d.id)) { s += 1; reasons.push(r("On your saved list", "Có trong danh sách đã lưu")); }
  if (!triedAt) { s += 0.6; reasons.push(r("New for you", "Món mới với bạn")); }
  else if (daysAgo(triedAt, ctx.now) <= 7) s -= 2;
  const liked = Object.entries(ctx.history.ratings).filter(([, v]) => v >= 4).map(([id]) => ctx.dishById.get(id)).filter(Boolean) as Dish[];
  if (liked.some((x) => x.id !== d.id && (x.dishType === d.dishType || (x.family && x.family === d.family)))) { s += 0.8; reasons.push(r("Similar to a dish you rated highly", "Giống món bạn đánh giá cao")); }

  // places, occasion, budget
  if (venues.length) {
    const best = Math.max(...venues.map((v) => STATUS_RANK[v.status as keyof typeof STATUS_RANK] ?? 0));
    s += best >= 4 ? 2.5 : 2;
    reasons.push(best >= 4
      ? r("Confirmed at an HCMC place", "Đã xác nhận có tại quán ở TP.HCM")
      : r(`Listed at ${venues.length} HCMC place${venues.length > 1 ? "s" : ""} by published sources`, `${venues.length} quán ở TP.HCM được nguồn uy tín giới thiệu`));
    s += Math.max(0, 5 - Math.min(venues[0].km, 5)) * 0.3;
    if (f.maxDistanceKm !== null) reasons.push(r(`Within ${f.maxDistanceKm} km (${venues[0].km.toFixed(1)} km)`, `Trong bán kính ${f.maxDistanceKm} km (${venues[0].km.toFixed(1)} km)`));
    if (budgetSet(f) && venues.some((v) => v.priceVnd || v.restaurant.priceRange)) { s += 1; reasons.push(r("Within your budget (recorded price)", "Trong ngân sách (giá đã ghi nhận)")); }
  } else if (f.service === "home-cooking") {
    reasons.push(r("Dish to cook at home", "Món tự nấu ở nhà"));
  } else {
    s -= 1.5;
    cautions.push(r("No HCMC place listed yet — we only list places with a published source", "Chưa có quán ở TP.HCM trong dữ liệu — chỉ liệt kê quán có nguồn"));
    if (budgetSet(f)) cautions.push(r("No price information for this dish", "Chưa có thông tin giá món này"));
  }
  if (f.occasion === "office-lunch") {
    if (mealFits(d, "lunch") && EVERYDAY_TYPES.includes(d.dishType)) { s += 1; reasons.push(r("Easy office lunch", "Hợp bữa trưa văn phòng")); }
    if (venues.length && venues[0].km <= 3) s += 0.5;
  }
  if (isSpecialOccasion(f.occasion) || f.atmosphere.length) {
    const fit = venues.some((v) => v.restaurant.dining && (!f.atmosphere.length || f.atmosphere.some((a) => v.restaurant.dining!.atmosphere?.includes(a as never))));
    if (fit) { s += 2; reasons.push(r("Place suits the occasion (recorded atmosphere)", "Quán hợp dịp này (không gian đã ghi nhận)")); }
    else cautions.push(r("Atmosphere not recorded yet for these places", "Chưa có thông tin không gian của các quán này"));
    if (venues.some((v) => v.restaurant.venueType === "restaurant")) s += 0.5;
    if (f.meal === "any" && d.mealTimes.includes("dinner")) s += 1;
  }
  if ((f.occasion === "family" || f.people >= 4) && SHARE_TYPES.includes(d.dishType)) { s += 1; reasons.push(r("Good for sharing", "Hợp ăn chung")); }
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
  // Diversity must never hide results: top up from the rest when the rules leave fewer than n.
  for (const x of sorted) { if (out.length >= n) break; if (!skip.has(x.dish.id) && !out.includes(x)) out.push(x); }
  return out;
}

export function rankAll(dishes: Dish[], f: WhatToEatFilters, ctx: WteContext) {
  return dishes.map((d) => evaluate(d, f, ctx)).filter((x): x is Recommendation => x !== null)
    .sort((a, b) => b.score - a.score || a.dish.nameVi.localeCompare(b.dish.nameVi, "vi"));
}

/**
 * PO decision: actionable first. `results` = dishes with a matching HCMC place; `withoutPlaces` = other suitable
 * dishes with no listed place (never implied to be available). Counts are unique (dishes, establishments).
 */
export function recommend(dishes: Dish[], f: WhatToEatFilters, ctx: WteContext, n = 6) {
  const eligible = rankAll(dishes, f, ctx);
  const placed = eligible.filter((x) => x.venues.length);
  const unplaced = eligible.filter((x) => !x.venues.length);
  const top = diverse(placed, n);
  const withoutPlaces = diverse(unplaced, n);
  const alternatives = diverse(placed, n, new Set(top.map((x) => x.dish.id)));
  const establishments = new Set(placed.flatMap((x) => x.venues.map((v) => v.restaurant.id))).size;
  return { results: top, withoutPlaces, alternatives, eligible: eligible.length, withVenue: placed.length, withoutVenue: unplaced.length, establishments };
}

/** "Surprise me": a weighted random pick among eligible dishes, avoiding `exclude` when possible (rand injectable). */
export function surprise(dishes: Dish[], f: WhatToEatFilters, ctx: WteContext, rand: () => number = Math.random, exclude: string[] = []) {
  const all = rankAll(dishes, f, ctx);
  const el = all.filter((x) => !exclude.includes(x.dish.id)).length ? all.filter((x) => !exclude.includes(x.dish.id)) : all;
  if (!el.length) return null;
  const total = el.reduce((a, x) => a + Math.max(x.score, 0.1), 0);
  let t = rand() * total;
  for (const x of el) if ((t -= Math.max(x.score, 0.1)) <= 0) return x;
  return el[el.length - 1];
}

// ---- zero-result explanation ------------------------------------------------------------------------
export interface Blocker { id: string; label: L; /** Eligible dishes if only this filter were removed. */ without: number; hard: boolean }

const DIET_L: Record<string, L> = {
  vegetarian: r("Vegetarian", "Ăn chay"), vegan: r("Vegan", "Thuần chay"), "no-pork": r("No pork", "Không thịt heo"), "no-beef": r("No beef", "Không thịt bò"),
  "no-seafood": r("No fish/seafood", "Không cá/hải sản"), "no-peanut": r("No peanuts", "Không đậu phộng"), "no-offal": r("No offal", "Không nội tạng"),
};
/** Removes one constraint from the filters (used only to explain — the engine never relaxes by itself). */
function without(f: WhatToEatFilters, id: string): WhatToEatFilters {
  if (id.startsWith("diet:")) return { ...f, diet: f.diet.filter((x) => x !== id.slice(5)) };
  switch (id) {
    case "meal": return { ...f, strictMeal: false };
    case "maxSpice": return { ...f, maxSpice: 3 };
    case "regions": return { ...f, regions: [] };
    case "savedOnly": return { ...f, savedOnly: false };
    case "newOnly": return { ...f, newOnly: false };
    case "excludeRecentDays": return { ...f, excludeRecentDays: 0 };
    case "excludeIngredients": return { ...f, excludeIngredients: "" };
    case "avoidCooking": return { ...f, avoidCooking: [] };
    case "allergens": return { ...f, allergens: [] };
    case "place": return { ...f, service: f.service === "home-cooking" ? f.service : "any", maxDistanceKm: null, openNow: false, atmosphere: [], occasion: isSpecialOccasion(f.occasion) ? "everyday" : f.occasion };
    case "budget": return { ...f, budgetMinVnd: null, budgetMaxVnd: null };
    default: return f;
  }
}
const BLOCKER_L: Record<string, L> = {
  meal: r("Only this meal", "Chỉ bữa này"), maxSpice: r("Spice limit", "Giới hạn độ cay"), regions: r("Regions", "Vùng miền"), savedOnly: r("Saved only", "Chỉ món đã lưu"),
  newOnly: r("Not tried yet", "Món chưa thử"), excludeRecentDays: r("Skip recently eaten", "Bỏ món đã ăn gần đây"), excludeIngredients: r("Excluded ingredients", "Thành phần loại trừ"),
  avoidCooking: r("Avoided cooking styles", "Cách nấu cần tránh"), allergens: r("Allergens", "Dị ứng"), budget: r("Budget (places with a recorded price outside it)", "Ngân sách (quán có giá ngoài khoảng)"),
  place: r("Needs a listed place (dine-in / distance / open now / special dining)", "Cần quán trong dữ liệu (ăn tại quán / khoảng cách / đang mở / dịp đặc biệt)"),
};
const HARD = (id: string) => id.startsWith("diet:") || id === "allergens" || id === "excludeIngredients";

export function activeConstraints(f: WhatToEatFilters, ctx: WteContext): string[] {
  const ids: string[] = [];
  if (f.meal !== "any" && f.strictMeal) ids.push("meal");
  for (const d of f.diet) ids.push(`diet:${d}`);
  if (f.maxSpice < 3) ids.push("maxSpice");
  if (f.regions.length) ids.push("regions");
  if (f.savedOnly) ids.push("savedOnly");
  if (f.newOnly) ids.push("newOnly");
  if (f.excludeRecentDays > 0) ids.push("excludeRecentDays");
  if (f.excludeIngredients.trim()) ids.push("excludeIngredients");
  if (f.avoidCooking.length) ids.push("avoidCooking");
  if (f.allergens.length) ids.push("allergens");
  if (needsVenue(f) && f.service !== "home-cooking") { ids.push("place"); if (budgetSet(f)) ids.push("budget"); }
  void ctx;
  return ids;
}

/** Why there are no (or few) results: each active constraint with the count you would get without it. */
export function explainEmpty(dishes: Dish[], f: WhatToEatFilters, ctx: WteContext): Blocker[] {
  return activeConstraints(f, ctx)
    .map((id) => ({ id, label: id.startsWith("diet:") ? DIET_L[id.slice(5)] ?? r(id.slice(5), id.slice(5)) : BLOCKER_L[id], without: rankAll(dishes, without(f, id), ctx).length, hard: HARD(id) }))
    .sort((a, b) => b.without - a.without);
}

/** Catalogue coverage for one diet: how many dishes carry the tags at all (data limitation note). */
export const dietCoverage = (dishes: Dish[], p: DietPref) => dishes.filter((d) => dishMatchesDiet(d, [p])).length;

export { DIET_PREFS };
