/** Hôm nay ăn gì? engine — every test runs on the REAL bundled catalogue and HCMC venues (no fixtures). */
import { describe, expect, it } from "vitest";
import { getFoodData } from "@/lib/data/catalogue";
import { buildAvailabilityIndex } from "@/lib/food/availability";
import { eatingProfile } from "@/lib/food/eating";
import { dishMatchesDiet } from "@/lib/food/filters";
import { HCMC_CENTER } from "@/lib/food/hcmc";
import { DEFAULT_WTE, evaluate, explainEmpty, recommend, surprise, tierForBudget, type WhatToEatFilters, type WteContext } from "@/lib/food/what-to-eat";
import { COLLECTIONS, MODES, PRESETS, applyPreset } from "@/lib/food/what-to-eat-presets";

const data = getFoodData();
const availability = buildAvailabilityIndex(data.restaurants, data.links, { includeSamples: false });
const NOW = new Date("2026-11-27T12:00:00+07:00");
const mk = (h: Partial<WteContext["history"]> = {}): WteContext => ({
  availability, origin: HCMC_CENTER, now: NOW, dishById: new Map(data.dishes.map((d) => [d.id, d])),
  history: { tried: {}, saved: [], ratings: {}, notInterested: new Set(), ...h },
});
const f = (p: Partial<WhatToEatFilters> = {}): WhatToEatFilters => ({ ...DEFAULT_WTE, ...p });
const ids = (r: ReturnType<typeof recommend>) => r.results.map((x) => x.dish.id);
const byId = (id: string) => data.dishes.find((d) => d.id === id)!;

describe("Hôm nay ăn gì? — PO scenarios on the real dataset", () => {
  it("no filters → several suitable dishes, places first", () => {
    const r = recommend(data.dishes, f(), mk());
    expect(r.results).toHaveLength(6);
    expect(r.results[0].venues.length).toBeGreaterThan(0); // dishes with a listed place rank first
    expect(r.eligible).toBe(data.dishes.length); // nothing is hidden just because a place is not listed
  });

  it("lunch + under 50k → lunch dishes; unknown prices are flagged, never 'within budget'", () => {
    const r = recommend(data.dishes, f({ meal: "lunch", budgetMaxVnd: 50_000 }), mk());
    expect(r.results.length).toBeGreaterThanOrEqual(3);
    for (const x of r.results) {
      expect(x.dish.mealTimes).toContain("lunch");
      const priced = x.venues.some((v) => v.priceVnd || v.restaurant.priceRange);
      if (!priced) expect(x.reasons.map((y) => y.en).join()).not.toMatch(/Within your budget/);
      if (!priced) expect(x.cautions.map((y) => y.en).join(" ")).toMatch(/Price not confirmed|No price information/);
    }
  });

  it("weight management → satisfying, non-fried, non-dessert dishes first, with no calorie claims", () => {
    const r = recommend(data.dishes, f({ goals: ["weight"] }), mk());
    for (const x of r.results.slice(0, 3)) {
      expect(x.dish.category).not.toBe("sweet");
      expect(eatingProfile(x.dish).cookingMethods.value ?? []).not.toContain("fried");
    }
    const text = r.results.flatMap((x) => x.reasons.map((y) => y.en)).join(" ");
    expect(text).not.toMatch(/calorie|kcal|slim|diet/i);
  });

  it("vegan → only dishes tagged vegan (never relaxed), even without a listed place", () => {
    const r = recommend(data.dishes, f({ diet: ["vegan"] }), mk());
    expect(r.results.length).toBeGreaterThan(0);
    for (const x of r.results) expect(x.dish.dietary).toContain("vegan");
    expect(r.results.some((x) => !x.venues.length && x.cautions.some((c) => c.en.startsWith("No HCMC place listed")))).toBe(true);
  });

  it("saved Vegan + No pork at lunch (the reported bug) → real vegan lunch dishes, diet never relaxed", () => {
    const r = recommend(data.dishes, f({ meal: "lunch", diet: ["vegan", "no-pork"] }), mk());
    expect(r.results.length).toBeGreaterThan(0); // was 0: the old engine required a listed place
    for (const x of r.results) { expect(dishMatchesDiet(x.dish, ["vegan", "no-pork"])).toBe(true); expect(x.dish.mealTimes).toContain("lunch"); }
  });

  it("zero results are explained: which filters restrict, and how many dishes each would give", () => {
    const filters = f({ meal: "lunch", diet: ["vegan", "no-pork"], service: "dine-in" });
    expect(recommend(data.dishes, filters, mk()).eligible).toBe(0);
    const why = explainEmpty(data.dishes, filters, mk());
    expect(why.map((b) => b.id)).toEqual(expect.arrayContaining(["meal", "diet:vegan", "diet:no-pork", "place"]));
    expect(why.find((b) => b.id === "place")!.without).toBeGreaterThan(0);
    expect(why.find((b) => b.id === "diet:vegan")!.hard).toBe(true);
    // "Remove place requirement" keeps the diet
    for (const x of recommend(data.dishes, { ...filters, service: "any" }, mk()).results) expect(dishMatchesDiet(x.dish, ["vegan", "no-pork"])).toBe(true);
    const late = explainEmpty(data.dishes, f({ meal: "late-night", diet: ["vegan"] }), mk());
    expect(late[0]).toMatchObject({ id: "meal" });
    expect(late[0].without).toBeGreaterThan(0);
  });

  it("special dining → only dishes with a listed place; atmosphere gaps are flagged", () => {
    const r = recommend(data.dishes, f({ occasion: "special" }), mk());
    expect(r.results.length).toBeGreaterThan(0);
    for (const x of r.results) {
      expect(x.venues.length).toBeGreaterThan(0);
      expect(x.cautions.map((c) => c.en).join()).toMatch(/Atmosphere not recorded/);
    }
  });

  it("surprise picks an eligible dish and avoids ones already shown", () => {
    const filters = f({ meal: "breakfast" });
    const shown = ids(recommend(data.dishes, filters, mk()));
    for (let i = 0; i < 10; i++) {
      const s = surprise(data.dishes, filters, mk(), () => i / 10, shown)!;
      expect(s.dish.mealTimes).toContain("breakfast");
      expect(shown).not.toContain(s.dish.id);
    }
    expect(surprise(data.dishes, f({ meal: "breakfast", maxSpice: -1 }), mk())).toBeNull();
  });

  it("missing restaurant data → dish suggestions with honest availability", () => {
    const noPlace = recommend(data.dishes, f({ meal: "breakfast" }), mk()).alternatives.find((x) => !x.venues.length)
      ?? recommend(data.dishes, f({ diet: ["vegan"] }), mk()).results.find((x) => !x.venues.length)!;
    expect(noPlace.cautions.map((c) => c.en).join()).toMatch(/No HCMC place listed yet/);
  });
});

describe("Hôm nay ăn gì? engine rules", () => {
  it("diverse results, deterministic, alternatives differ", () => {
    const r = recommend(data.dishes, f({ meal: "lunch" }), mk());
    const fams = r.results.map((x) => x.dish.family).filter(Boolean);
    expect(new Set(fams).size).toBe(fams.length);
    expect(ids(recommend(data.dishes, f({ meal: "lunch" }), mk()))).toEqual(ids(r));
    expect(r.alternatives.every((a) => !ids(r).includes(a.dish.id))).toBe(true);
  });

  it("never uses sample venues", () => {
    for (const x of recommend(data.dishes, f({ service: "dine-in" }), mk()).results) for (const v of x.venues) expect(v.restaurant.isSample ?? false).toBe(false);
  });

  it("hard constraints: meal, diet, spice, regions, allergens, ingredient words", () => {
    for (const x of recommend(data.dishes, f({ meal: "breakfast" }), mk()).results) expect(x.dish.mealTimes).toContain("breakfast");
    for (const x of recommend(data.dishes, f({ maxSpice: 0 }), mk()).results) expect(x.dish.spiceLevel).toBe(0);
    for (const x of recommend(data.dishes, f({ diet: ["no-pork"] }), mk()).results) expect(x.dish.dietary).not.toContain("contains-pork");
    for (const x of recommend(data.dishes, f({ regions: ["mien-bac"] }), mk()).results) expect(x.dish.regionIds).toContain("mien-bac");
    const peanut = new Set(data.dishes.filter((d) => eatingProfile(d).allergens.value?.includes("peanut")).map((d) => d.id));
    const r = recommend(data.dishes, f({ allergens: ["peanut"] }), mk());
    for (const x of r.results) { expect(peanut.has(x.dish.id)).toBe(false); expect(x.cautions.map((c) => c.en).join()).toMatch(/Allergen information is incomplete/); }
    for (const x of recommend(data.dishes, f({ excludeIngredients: "cơm" }), mk()).results) expect(x.dish.nameVi.toLowerCase()).not.toContain("cơm");
  });

  it("history: recent, not-interested, new-only, saved-only", () => {
    const top = recommend(data.dishes, f(), mk()).results[0].dish.id;
    const recent = mk({ tried: { [top]: new Date(NOW.getTime() - 2 * 86_400_000).toISOString() } });
    expect(ids(recommend(data.dishes, f({ excludeRecentDays: 3 }), recent))).not.toContain(top);
    expect(ids(recommend(data.dishes, f({ newOnly: true }), recent))).not.toContain(top);
    expect(ids(recommend(data.dishes, f(), mk({ notInterested: new Set([top]) })))).not.toContain(top);
    const old = mk({ tried: { [top]: new Date(NOW.getTime() - 30 * 86_400_000).toISOString() } });
    expect(evaluate(byId(top), f({ excludeRecentDays: 3 }), old)).not.toBeNull();
    const s = recommend(data.dishes, f({ savedOnly: true }), mk({ saved: [top] }));
    expect(ids(s)).toEqual([top]);
    expect(s.results[0].reasons.map((x) => x.en)).toContain("On your saved list");
  });

  it("budget ranges: known prices outside the range exclude the place, unknown never does", () => {
    const priced = data.links.find((l) => l.priceVnd && !l.isSample);
    if (priced) {
      const hi = priced.priceVnd!.min - 1;
      const r = evaluate(byId(priced.dishId), f({ budgetMaxVnd: hi, service: "dine-in" }), mk());
      expect(r?.venues.some((v) => v.restaurant.id === priced.restaurantId) ?? false).toBe(false);
    }
    const base = recommend(data.dishes, f(), mk()).eligible;
    expect(recommend(data.dishes, f({ budgetMaxVnd: 30_000 }), mk()).eligible).toBe(base);
    expect([30_000, 100_000, 300_000, 900_000].map(tierForBudget)).toEqual(["$", "$$", "$$$", "$$$$"]);
  });

  it("distance filter only keeps venues within range", () => {
    for (const x of recommend(data.dishes, f({ maxDistanceKm: 2 }), mk()).results) for (const v of x.venues) expect(v.km).toBeLessThanOrEqual(2);
  });

  it("every collection and mode returns suggestions with bilingual reasons", () => {
    expect(COLLECTIONS).toHaveLength(12);
    expect(MODES.length).toBeGreaterThanOrEqual(6);
    for (const p of PRESETS) {
      const r = recommend(data.dishes, applyPreset(p), mk());
      expect(r.results.length, p.id).toBeGreaterThan(0);
      for (const x of r.results) { expect(x.reasons.length).toBeGreaterThan(0); for (const y of [...x.reasons, ...x.cautions]) { expect(y.en).toBeTruthy(); expect(y.vi).toBeTruthy(); } }
    }
  });
});

describe("eating profile provenance", () => {
  it("never calls a value sourced without a source", () => {
    for (const d of data.dishes) {
      const p = eatingProfile(d);
      for (const fact of [p.proteins, p.cookingMethods, p.allergens, p.portion, p.vegetables, p.nutrition]) {
        if (fact.value === null || (Array.isArray(fact.value) && fact.value.length === 0)) expect(["unknown", "derived"]).toContain(fact.provenance);
        if (fact.provenance === "sourced") expect(d.eating?.source?.url ?? d.eating?.nutrition?.source).toBeTruthy();
      }
    }
  });
});
