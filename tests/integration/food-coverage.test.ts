import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildAvailabilityIndex } from "@/lib/food/availability";

// docs/food-coverage.json must reconcile and be current with the canonical data (regenerate: npm run data:food-coverage).
const root = path.resolve(__dirname, "../..");
const read = (p: string) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
describe("food coverage report", () => {
  const report = read("docs/food-coverage.json");
  const dishes = read("data/vietnamese-dishes.json").dishes;
  it("buckets add up to the dish count and no counted venue is outside HCMC", () => {
    const b = report.buckets;
    expect(b["0"] + b["1-4"] + b["5+"]).toBe(dishes.length);
    expect(report.reconciliation.ok).toBe(true);
    expect(report.reconciliation.realVenuesOutsideHcmc).toBe(0);
  });
  it("matches an independent count from the real-only availability index", () => {
    const idx = buildAvailabilityIndex(read("data/hcmc-restaurants.json").restaurants, read("data/dish-restaurant-mapping.json").links, { includeSamples: false });
    for (const d of dishes as { id: string }[]) {
      const n = new Set((idx.linksByDish.get(d.id) ?? []).filter((l) => l.status !== "temporarily-unavailable").map((l) => l.restaurantId)).size;
      expect(report.dishes.find((r: { id: string }) => r.id === d.id)?.venues, d.id).toBe(n);
    }
  });
  it("Thảo Điền and Sala scouting is marked as GPT-FOOD-001 territory", () => {
    for (const a of ["thao-dien", "sala-thu-thiem"]) expect(report.scouting.find((s: { area: string }) => s.area === a).overlapsGptFood001).toBe(true);
    for (const a of ["q1-cbd", "phu-my-hung"]) expect(report.scouting.find((s: { area: string }) => s.area === a).overlapsGptFood001).toBe(false);
  });
});
