import { describe, expect, it } from "vitest";
import { getFoodData } from "@/lib/data/catalogue";
import { buildAvailabilityIndex } from "@/lib/food/availability";
import { eatingProfile } from "@/lib/food/eating";
import { HCMC_CENTER } from "@/lib/food/hcmc";
import { DEFAULT_WTE, evaluate, recommend, surprise, tierForBudget, type WhatToEatFilters, type WteContext } from "@/lib/food/what-to-eat";
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

describe("Hôm nay ăn gì? engine", () => {
  it("returns a small, diverse set without any filters", () => {
    const r = recommend(data.dishes, f(), mk());
    expect(r.results.length).toBeGreaterThan(0);
    expect(r.results.length).toBeLessThanOrEqual(6);
    const types = r.results.map((x) => x.dish.dishType);
    for (const t of new Set(types)) expect(types.filter((x) => x === t).length).toBeLessThanOrEqual(2);
    const fams = r.results.map((x) => x.dish.family).filter(Boolean);
    expect(new Set(fams).size).toBe(fams.length);
    expect(r.alternatives.every((a) => !ids(r).includes(a.dish.id))).toBe(true);
  });

  it("is deterministic", () => {
    expect(ids(recommend(data.dishes, f({ meal: "lunch" }), mk()))).toEqual(ids(recommend(data.dishes, f({ meal: "lunch" }), mk())));
  });

  it("only recommends dishes with a real (non-sample) HCMC venue unless cooking at home", () => {
    for (const x of recommend(data.dishes, f(), mk()).results) {
      expect(x.venues.length).toBeGreaterThan(0);
      for (const v of x.venues) expect(v.restaurant.isSample ?? false).toBe(false);
    }
    const home = recommend(data.dishes, f({ service: "home-cooking" }), mk());
    expect(home.eligible).toBeGreaterThan(recommend(data.dishes, f(), mk()).eligible);
  });

  it("applies hard constraints: meal, diet, spice, regions", () => {
    for (const x of recommend(data.dishes, f({ meal: "breakfast" }), mk()).results) expect(x.dish.mealTimes).toContain("breakfast");
    for (const x of recommend(data.dishes, f({ maxSpice: 0 }), mk()).results) expect(x.dish.spiceLevel).toBe(0);
    for (const x of recommend(data.dishes, f({ diet: ["no-pork"] }), mk()).results) expect(x.dish.dietary).not.toContain("contains-pork");
    for (const x of recommend(data.dishes, f({ regions: ["mien-bac"], service: "home-cooking" }), mk()).results) expect(x.dish.regionIds).toContain("mien-bac");
  });

  it("excludes known allergens and ingredient words, and warns that allergen data is incomplete", () => {
    const peanut = data.dishes.filter((d) => eatingProfile(d).allergens.value?.includes("peanut"));
    expect(peanut.length).toBeGreaterThan(0);
    const r = recommend(data.dishes, f({ allergens: ["peanut"], service: "home-cooking" }), mk());
    expect(r.results.some((x) => peanut.includes(x.dish))).toBe(false);
    for (const x of r.results) if (!eatingProfile(x.dish).allergens.complete) expect(x.cautions.map((c) => c.en).join()).toMatch(/Allergen information is incomplete/);
    const noRice = recommend(data.dishes, f({ excludeIngredients: "cơm", service: "home-cooking" }), mk());
    for (const x of noRice.results) expect(x.dish.nameVi.toLowerCase()).not.toContain("cơm");
  });

  it("excludes recently eaten, not-interested and tried (newOnly) dishes", () => {
    const top = recommend(data.dishes, f(), mk()).results[0].dish.id;
    const recent = mk({ tried: { [top]: new Date(NOW.getTime() - 2 * 86_400_000).toISOString() } });
    expect(ids(recommend(data.dishes, f({ excludeRecentDays: 3 }), recent))).not.toContain(top);
    expect(ids(recommend(data.dishes, f({ newOnly: true }), recent))).not.toContain(top);
    expect(ids(recommend(data.dishes, f(), mk({ notInterested: new Set([top]) })))).not.toContain(top);
    // An old meal is not excluded by a 3-day window.
    const old = mk({ tried: { [top]: new Date(NOW.getTime() - 30 * 86_400_000).toISOString() } });
    expect(evaluate(byId(top), f({ excludeRecentDays: 3 }), old)).not.toBeNull();
  });

  it("savedOnly limits to saved dishes and explains why", () => {
    const top = recommend(data.dishes, f(), mk()).results[0].dish.id;
    const r = recommend(data.dishes, f({ savedOnly: true }), mk({ saved: [top] }));
    expect(ids(r)).toEqual([top]);
    expect(r.results[0].reasons.map((x) => x.en)).toContain("On your saved list");
  });

  it("never excludes on unknown price/hours — it adds a caution instead", () => {
    const base = recommend(data.dishes, f(), mk()).eligible;
    const r = recommend(data.dishes, f({ budgetPerPersonVnd: 50_000, openNow: true }), mk());
    expect(r.eligible).toBeGreaterThan(base * 0.8);
    const cautions = r.results.flatMap((x) => x.cautions.map((c) => c.en)).join(" ");
    expect(cautions).toMatch(/Prices not confirmed|Opening hours not confirmed/);
  });

  it("every recommendation carries at least one reason in both languages", () => {
    for (const p of PRESETS) for (const x of recommend(data.dishes, applyPreset(p), mk()).results) {
      expect(x.reasons.length).toBeGreaterThan(0);
      for (const t of [...x.reasons, ...x.cautions]) { expect(t.en).toBeTruthy(); expect(t.vi).toBeTruthy(); }
    }
  });

  it("distance filter only keeps venues within range", () => {
    for (const x of recommend(data.dishes, f({ maxDistanceKm: 2 }), mk()).results) for (const v of x.venues) expect(v.km).toBeLessThanOrEqual(2);
  });

  it("surprise picks an eligible dish (injectable randomness)", () => {
    const s = surprise(data.dishes, f({ meal: "breakfast" }), mk(), () => 0);
    expect(s?.dish.mealTimes).toContain("breakfast");
    expect(surprise(data.dishes, f({ meal: "breakfast", maxSpice: -1 }), mk())).toBeNull();
  });

  it("has 12 collections and further modes, each giving at least one suggestion", () => {
    expect(COLLECTIONS).toHaveLength(12);
    expect(MODES.length).toBeGreaterThanOrEqual(6);
    for (const p of PRESETS) expect(recommend(data.dishes, applyPreset(p), mk()).results.length, p.id).toBeGreaterThan(0);
  });

  it("budget tiers", () => {
    expect([30_000, 100_000, 300_000, 900_000].map(tierForBudget)).toEqual(["$", "$$", "$$$", "$$$$"]);
  });
});

describe("eating profile provenance", () => {
  it("marks derived facts as derived and missing facts as unknown — never sourced without a source", () => {
    for (const d of data.dishes) {
      const p = eatingProfile(d);
      for (const fact of [p.proteins, p.cookingMethods, p.allergens, p.portion, p.vegetables, p.nutrition]) {
        if (fact.value === null || (Array.isArray(fact.value) && fact.value.length === 0)) expect(["unknown", "derived"]).toContain(fact.provenance);
        if (fact.provenance === "sourced") expect(d.eating?.source?.url ?? d.eating?.nutrition?.source).toBeTruthy();
      }
    }
  });
});
