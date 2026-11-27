import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildOfferingIndex } from "@/engine/offering-index";
import { offeringImage } from "@/engine/offering-image";
import { ExperienceDataSchema, OfferingSchema } from "@/engine/schema";
import { buildAvailabilityIndex } from "@/lib/food/availability";
import { getFoodData } from "@/lib/data/catalogue";
import { EMPTY_PASSPORT, mergeAllPassports, passportsFromRows, passportsToRows, type Passports } from "@/lib/passport/model";

const est = (id: string, isSample = false) => ({ id, isSample });
const off = (itemId: string, establishmentId: string, status: "source-listed" | "candidate" | "menu-confirmed", isSample = false) => ({ itemId, establishmentId, status, isSample });

describe("shared offering index", () => {
  it("ranks the best public status, hides samples and candidates", () => {
    const idx = buildOfferingIndex([est("a"), est("b"), est("s", true)],
      [off("x", "a", "source-listed"), off("x", "b", "menu-confirmed"), off("x", "s", "menu-confirmed", true), off("y", "a", "candidate")],
      { item: (o) => o.itemId, establishment: (o) => o.establishmentId }, { includeSamples: false });
    expect(idx.statusByItem.get("x")).toBe("menu-confirmed");
    expect(idx.byItem.get("x")!.map((o) => o.establishmentId)).toEqual(["a", "b"]);
    expect(idx.byItem.has("y")).toBe(false);
    expect(idx.establishments.has("s")).toBe(false);
  });
  it("Food's availability index is the same engine (identical result on the real dataset)", () => {
    const { restaurants, links } = getFoodData();
    const food = buildAvailabilityIndex(restaurants, links, { includeSamples: false });
    const eng = buildOfferingIndex(restaurants, links, { item: (l) => l.dishId, establishment: (l) => l.restaurantId }, { includeSamples: false });
    expect([...food.statusByDish]).toEqual([...eng.statusByItem]);
    expect(food.linksByDish.size).toBeGreaterThan(30);
  });
});

describe("shared offering image (all modules)", () => {
  const ph = { url: "https://img.test/a.jpg", kind: "menu-photo" as const, sourceUrl: "https://img.test/menu", attribution: "Café A", license: "Permission", lastCheckedAt: "2026-11-27" };
  it("uses the offering photo only for its own item", () => {
    expect(offeringImage({ id: "ca-phe-muoi", photos: [] }, { itemId: "ca-phe-muoi", photo: ph })?.kind).toBe("menu-photo");
    expect(offeringImage({ id: "bac-xiu", photos: [] }, { itemId: "ca-phe-muoi", photo: ph })).toBeNull();
  });
});

describe("module data files", () => {
  it("coffee.json is valid and contains nothing invented (empty until researched)", () => {
    const d = ExperienceDataSchema.parse(JSON.parse(readFileSync("data/experiences/coffee.json", "utf8")));
    expect(d.metadata.experienceId).toBe("coffee");
    expect(d.items.length + d.establishments.length + d.offerings.length).toBe(0);
  });
  it("offerings use the same evidence rules as Food links", () => {
    const base = { itemId: "x", establishmentId: "a", isSample: false, lastVerified: "2026-11-27" };
    expect(OfferingSchema.safeParse({ ...base, status: "menu-confirmed", menuEvidence: { type: "delivery-listing", note: "Grab" } }).success).toBe(true);
    expect(OfferingSchema.safeParse({ ...base, status: "menu-confirmed", menuEvidence: { type: "published-source", note: "blog" } }).success).toBe(false);
    expect(OfferingSchema.safeParse({ itemId: "x", establishmentId: "a", isSample: false, status: "source-listed", menuEvidence: { type: "published-source", note: "guide" } }).success).toBe(false);
  });
});

describe("one account, one passport per experience", () => {
  const coffee = { ...EMPTY_PASSPORT, saved: ["ca-phe-muoi"], tried: { "ca-phe-muoi": "2026-11-20" }, visited: { "cafe-a": "2026-11-20" } };
  const food = { ...EMPTY_PASSPORT, saved: ["bun-bo-hue"], tried: { "pho-sai-gon": "2026-11-01" } };
  it("rows round-trip per experience and stay isolated", () => {
    const all: Passports = { food, coffee };
    const rows = passportsToRows("u", all);
    expect(rows.saved.find((r) => r.item_id === "ca-phe-muoi")).toMatchObject({ experience_id: "coffee", item_type: "item" });
    expect(rows.saved.find((r) => r.item_id === "bun-bo-hue")).toMatchObject({ experience_id: "food", item_type: "dish" });
    const back = passportsFromRows(rows.saved, rows.history, rows.notes);
    expect(back.food).toEqual(food);
    expect(back.coffee).toEqual(coffee);
  });
  it("guest → account merge keeps experiences apart, without loss or duplicates", () => {
    const merged = mergeAllPassports({ food }, { food: { ...EMPTY_PASSPORT, saved: ["bun-bo-hue", "mi-quang"] }, coffee });
    expect(merged.food.saved).toEqual(["bun-bo-hue", "mi-quang"]);
    expect(merged.coffee.saved).toEqual(["ca-phe-muoi"]);
    expect(merged.food.tried).toEqual({ "pho-sai-gon": "2026-11-01" });
  });
});
