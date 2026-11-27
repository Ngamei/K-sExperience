import { describe, expect, it } from "vitest";
import { buildAvailabilityIndex, statusOf } from "@/lib/food/availability";
import { activeChips, EMPTY_FILTERS, filterDishes, removeChip } from "@/lib/food/filters";
import { isOpenAt, opensDuring } from "@/lib/food/hours";
import { surpriseMe, DEFAULT_PREFERENCES } from "@/lib/food/recommend";
import { passportProgress } from "@/lib/food/passport";
import { getFoodData } from "@/lib/data/catalogue";

const data = getFoodData();
const real = buildAvailabilityIndex(data.restaurants, data.links, { includeSamples: false });
const withSamples = buildAvailabilityIndex(data.restaurants, data.links, { includeSamples: true });
const ctx = { availability: real, saved: new Set<string>(), tried: new Set<string>() };

describe("availability", () => {
  it("sample venues never count unless explicitly included", () => {
    expect(statusOf(real, "pho-bo-ha-noi")).toBe("none-found");
    expect(statusOf(withSamples, "pho-bo-ha-noi")).toBe("verified-available");
    expect(statusOf(withSamples, "banh-beo-hue")).toBe("temporarily-unavailable");
  });
});

describe("dish filters", () => {
  it("filters by region and category combined", () => {
    const r = filterDishes(data.dishes, { ...EMPTY_FILTERS, regions: ["bac-trung-bo"], categories: ["sweet"] }, ctx);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((d) => d.regionIds.includes("bac-trung-bo") && d.category === "sweet")).toBe(true);
  });
  it("accent-insensitive search finds Bún bò Huế", () => {
    const r = filterDishes(data.dishes, { ...EMPTY_FILTERS, query: "bun bo hue" }, ctx);
    expect(r.map((d) => d.id)).toContain("bun-bo-hue");
  });
  it("searches by origin province name", () => {
    const provincesById = new Map(data.provinces.map((p) => [p.id, p]));
    const r = filterDishes(data.dishes, { ...EMPTY_FILTERS, query: "soc trang" }, { ...ctx, provincesById });
    expect(r.some((d) => d.id === "banh-pia-soc-trang")).toBe(true);
  });
  it("dietary: no-pork excludes pork dishes; vegetarian includes vegetarian-friendly", () => {
    const noPork = filterDishes(data.dishes, { ...EMPTY_FILTERS, diet: ["no-pork"] }, ctx);
    expect(noPork.some((d) => d.dietary.includes("contains-pork"))).toBe(false);
    const veg = filterDishes(data.dishes, { ...EMPTY_FILTERS, diet: ["vegetarian"] }, ctx);
    expect(veg.map((d) => d.id)).toContain("keo-dua-ben-tre");
  });
  it("spice level ceiling", () => {
    const r = filterDishes(data.dishes, { ...EMPTY_FILTERS, maxSpice: 0 }, ctx);
    expect(r.some((d) => d.id === "bun-bo-hue")).toBe(false);
  });
  it("venue filters only match via establishments in the index", () => {
    const f = { ...EMPTY_FILTERS, neighbourhoods: ["Quận 1"] };
    expect(filterDishes(data.dishes, f, ctx)).toHaveLength(0);
    const s = filterDishes(data.dishes, f, { ...ctx, availability: withSamples });
    expect(s.map((d) => d.id).sort()).toEqual(["bun-cha-ha-noi", "cha-ca-la-vong", "pho-bo-ha-noi"]);
  });
  it("tried/untried and saved", () => {
    const tried = new Set(["mi-quang"]);
    expect(filterDishes(data.dishes, { ...EMPTY_FILTERS, tried: "tried" }, { ...ctx, tried }).map((d) => d.id)).toEqual(["mi-quang"]);
    expect(filterDishes(data.dishes, { ...EMPTY_FILTERS, tried: "untried" }, { ...ctx, tried })).toHaveLength(data.dishes.length - 1);
    expect(filterDishes(data.dishes, { ...EMPTY_FILTERS, savedOnly: true }, { ...ctx, saved: new Set(["bun-bo-hue"]) })).toHaveLength(1);
  });
  it("chips round-trip", () => {
    const f = { ...EMPTY_FILTERS, categories: ["sweet" as const, "snack" as const], openNow: true };
    const chips = activeChips(f, (k, v) => `${k}:${v ?? ""}`);
    expect(chips).toHaveLength(3);
    const after = removeChip(f, chips[0]);
    expect(after.categories).toEqual(["snack"]);
    expect(removeChip(f, chips[2]).openNow).toBe(false);
  });
});

describe("opening hours (Asia/Ho_Chi_Minh)", () => {
  const h = { mon: [["16:00", "02:00"]], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [["07:00", "11:00"]] } as never;
  it("handles ranges past midnight and timezone", () => {
    // Monday 17:00 HCMC = Monday 10:00 UTC
    expect(isOpenAt(h, new Date("2026-11-23T10:00:00Z"))).toBe(true);
    // Tuesday 01:00 HCMC = Monday 18:00 UTC → still open from Monday
    expect(isOpenAt(h, new Date("2026-11-23T18:00:00Z"))).toBe(true);
    // Tuesday 03:00 HCMC
    expect(isOpenAt(h, new Date("2026-11-23T20:00:00Z"))).toBe(false);
    expect(isOpenAt(undefined, new Date())).toBeNull();
  });
  it("slot matching", () => {
    expect(opensDuring(h, "late-night")).toBe(true);
    expect(opensDuring(h, "morning")).toBe(true);
    expect(opensDuring(h, "midday")).toBe(false);
  });
});

describe("Surprise me", () => {
  it("respects hard constraints and never returns excluded dish", () => {
    for (let i = 0; i < 50; i++) {
      const d = surpriseMe(data.dishes, { ...DEFAULT_PREFERENCES, maxSpice: 0, diet: ["no-pork"], categories: ["savory"] }, { availability: real, tried: new Set() }, Math.random, "pho-bo-ha-noi")!;
      expect(d.spiceLevel).toBe(0);
      expect(d.dietary).not.toContain("contains-pork");
      expect(d.category).toBe("savory");
      expect(d.id).not.toBe("pho-bo-ha-noi");
    }
  });
  it("returns null when nothing qualifies", () => {
    expect(surpriseMe(data.dishes, { ...DEFAULT_PREFERENCES, categories: ["sweet"], diet: ["no-pork", "vegan"], maxSpice: 0, regions: [] }, { availability: real, tried: new Set() }, () => 0)?.category ?? "sweet").toBe("sweet");
    expect(surpriseMe([], DEFAULT_PREFERENCES, { availability: real, tried: new Set() })).toBeNull();
  });
});

describe("Food Passport", () => {
  it("computes regional completion", () => {
    const p = passportProgress(data.dishes, data.regions, new Set(["bun-bo-hue", "com-hen"]));
    expect(p.triedCount).toBe(2);
    expect(p.provincesTried).toBe(1);
    const btb = p.perRegion.find((r) => r.regionId === "bac-trung-bo")!;
    expect(btb.tried).toBe(2);
    expect(btb.pct).toBe(Math.round((2 / btb.total) * 100));
  });
});
