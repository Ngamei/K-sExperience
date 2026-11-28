/** KEX-IMPORT-01 — an omitted spice intensity stays unknown through intake, storage and every strict spice filter. */
import { describe, expect, it } from "vitest";
import { importCatalogue, parseCsv } from "@/lib/data/importer";
import { mergeCatalogues } from "@/lib/data/merge";
import { fromRows, toDishRow } from "@/lib/data/db-rows";
import { getFoodData } from "@/lib/data/catalogue";
import { buildAvailabilityIndex } from "@/lib/food/availability";
import { EMPTY_FILTERS, filterDishes, spiceWithin } from "@/lib/food/filters";
import { scoreDish, DEFAULT_PREFERENCES } from "@/lib/food/recommend";
import { DEFAULT_WTE, evaluate, explainEmpty, recommend } from "@/lib/food/what-to-eat";
import { HCMC_CENTER } from "@/lib/food/hcmc";
import provincesFile from "@data/provinces.json";
import regionsFile from "@data/regions.json";
import type { Dish, Province, Region } from "@/lib/data/schema";

const ctx = {
  provinces: (provincesFile as unknown as { provinces: Province[] }).provinces,
  regions: (regionsFile as unknown as { regions: Region[] }).regions,
  dataset: "master" as const,
};
const row = { nameVi: "Cơm thử nghiệm", nameEn: "Test rice", category: "Món mặn", dishType: "rice", origins: "~Hồ Chí Minh" };
const data = getFoodData();
const unknownDish = (): Dish => importCatalogue([row], ctx).dishes[0];

describe("KEX-IMPORT-01 · intake", () => {
  it("an omitted spice level is unknown (absent), never 0, and is not a provided field", () => {
    const r = importCatalogue([row], ctx);
    expect(r.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(r.dishes[0].spiceLevel).toBeUndefined();
    expect(r.provided[r.dishes[0].id]).not.toContain("spiceLevel");
  });
  it("blank CSV cells are unknown too", () => {
    const csv = parseCsv("nameVi,nameEn,category,dishType,origins,spiceLevel\nCơm thử nghiệm,Test rice,Món mặn,rice,~Hồ Chí Minh,\n");
    expect(importCatalogue(csv, ctx).dishes[0].spiceLevel).toBeUndefined();
  });
  it("legacy numeric rows are kept: numbers and numeric strings; 0 stays a real 0", () => {
    expect(importCatalogue([{ ...row, spiceLevel: 2 }], ctx).dishes[0].spiceLevel).toBe(2);
    expect(importCatalogue([{ ...row, spiceLevel: "1" }], ctx).dishes[0].spiceLevel).toBe(1);
    expect(importCatalogue([{ ...row, spiceLevel: "0" }], ctx).dishes[0].spiceLevel).toBe(0);
    const csv = parseCsv("nameVi,nameEn,category,dishType,origins,spiceLevel\nCơm thử nghiệm,Test rice,Món mặn,rice,~Hồ Chí Minh,3\n");
    expect(importCatalogue(csv, ctx).dishes[0].spiceLevel).toBe(3);
  });
  it("out-of-range values are clamped with a warning; non-numeric values stay unknown with a warning", () => {
    const hi = importCatalogue([{ ...row, spiceLevel: 7 }], ctx);
    expect(hi.dishes[0].spiceLevel).toBe(3);
    expect(hi.issues.map((i) => i.message).join()).toMatch(/normalised to 3/);
    const bad = importCatalogue([{ ...row, spiceLevel: "very hot" }], ctx);
    expect(bad.dishes[0].spiceLevel).toBeUndefined();
    expect(bad.issues.map((i) => i.message).join()).toMatch(/non-numeric spiceLevel/);
  });
  it("merging an unknown spice never erases a recorded level", () => {
    const existing = data.dishes.find((d) => d.id === "bun-bo-hue")!;
    const inc = importCatalogue([{ id: "bun-bo-hue", nameVi: existing.nameVi, nameEn: "Hue beef noodle soup", category: "Món mặn", dishType: "noodle-soup", origins: "Thừa Thiên Huế" }], ctx);
    const { dishes } = mergeCatalogues(data.dishes, inc.dishes, inc.provided);
    expect(dishes.find((d) => d.id === "bun-bo-hue")!.spiceLevel).toBe(existing.spiceLevel);
  });
});

describe("KEX-IMPORT-01 · strict spice filters exclude unknown", () => {
  it("spiceWithin: unknown fails every limit below 3, passes 'any'", () => {
    const u = { spiceLevel: undefined };
    for (const max of [0, 1, 2]) expect(spiceWithin(u, max)).toBe(false);
    expect(spiceWithin(u, 3)).toBe(true);
    expect(spiceWithin({ spiceLevel: 0 }, 0)).toBe(true);
    expect(spiceWithin({ spiceLevel: 2 }, 1)).toBe(false);
  });
  it("catalogue filter: strict no-spice never shows an unknown dish", () => {
    const dishes = [...data.dishes, unknownDish()];
    const availability = buildAvailabilityIndex(data.restaurants, data.links, { includeSamples: false });
    const fctx = { availability, saved: new Set<string>(), tried: new Set<string>() };
    const none = filterDishes(dishes, { ...EMPTY_FILTERS, maxSpice: 0 }, fctx);
    expect(none.some((d) => d.id === "com-thu-nghiem")).toBe(false);
    expect(none.every((d) => d.spiceLevel === 0)).toBe(true);
    expect(filterDishes(dishes, { ...EMPTY_FILTERS, maxSpice: null }, fctx).some((d) => d.id === "com-thu-nghiem")).toBe(true);
  });
  it("Surprise me preferences and Hôm nay ăn gì? treat unknown as not matching no-spice", () => {
    const d = unknownDish();
    const availability = buildAvailabilityIndex(data.restaurants, data.links, { includeSamples: false });
    expect(scoreDish(d, { ...DEFAULT_PREFERENCES, maxSpice: 0 }, { availability, tried: new Set() })).toBe(-1);
    const wctx = { availability, origin: HCMC_CENTER, now: new Date(), dishById: new Map([[d.id, d]]), history: { tried: {}, saved: [], ratings: {}, notInterested: new Set<string>() } };
    expect(evaluate(d, { ...DEFAULT_WTE, maxSpice: 0 }, wctx)).toBeNull();
    expect(evaluate(d, { ...DEFAULT_WTE, maxSpice: 3 }, wctx)).not.toBeNull();
    const r = recommend([d], { ...DEFAULT_WTE, maxSpice: 0 }, wctx);
    expect(r.eligible).toBe(0);
    expect(explainEmpty([d], { ...DEFAULT_WTE, maxSpice: 0 }, wctx).map((b) => b.id)).toContain("maxSpice");
  });
});

describe("KEX-IMPORT-01 · bundled data and Supabase mapping", () => {
  it("bundled catalogue keeps its recorded numeric levels (all 0–3)", () => {
    for (const d of data.dishes) expect(d.spiceLevel === undefined || [0, 1, 2, 3].includes(d.spiceLevel)).toBe(true);
    expect(data.dishes.filter((d) => d.spiceLevel !== undefined)).toHaveLength(data.dishes.length); // legacy data is all recorded
  });
  it("Supabase rows: unknown ↔ NULL, recorded levels round-trip unchanged", () => {
    const u = unknownDish();
    expect(toDishRow(u).spice_level).toBeNull();
    const zero = data.dishes.find((d) => d.spiceLevel === 0)!;
    expect(toDishRow(zero).spice_level).toBe(0);
    const back = fromRows({ regions: [], provinces: [], dishes: [toDishRow(u), toDishRow(zero)], origins: [], photos: [], dishSources: [], restaurants: [], restaurantSources: [], links: [] }).dishes;
    expect(back[0].spiceLevel).toBeUndefined();
    expect("spiceLevel" in back[0]).toBe(false);
    expect(back[1].spiceLevel).toBe(0);
  });
});
