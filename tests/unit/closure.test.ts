import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildAvailabilityIndex } from "@/lib/food/availability";
import { RestaurantSchema } from "@/lib/data/schema";

// D67: a closed establishment keeps its record but is never a place to go.
const read = (p: string) => JSON.parse(readFileSync(path.resolve(__dirname, "../..", p), "utf8"));
describe("establishment closure", () => {
  const restaurants = read("data/hcmc-restaurants.json").restaurants;
  const links = read("data/dish-restaurant-mapping.json").links;
  const closed = restaurants.filter((r: { closure?: unknown }) => r.closure);
  it("closed venues stay in the data (history and saved items still resolve)", () => {
    expect(closed.map((r: { id: string }) => r.id)).toContain("bun-bo-hue-kim-huong-rach-bung-binh-17-rach-bung-binh");
  });
  it("closed venues are never in the recommendation index", () => {
    const idx = buildAvailabilityIndex(restaurants, links, { includeSamples: false });
    for (const r of closed) {
      expect(idx.restaurants.has(r.id)).toBe(false);
      for (const ls of idx.linksByDish.values()) expect(ls.some((l) => l.restaurantId === r.id)).toBe(false);
    }
  });
  it("a closure must say what kind, when and where it was seen", () => {
    const base = { ...restaurants[0] };
    expect(RestaurantSchema.safeParse({ ...base, closure: { status: "permanently-closed", reportedOn: "2026-11-28", source: "Google Maps listing" } }).success).toBe(true);
    expect(RestaurantSchema.safeParse({ ...base, closure: { status: "closed", reportedOn: "2026-11-28", source: "x listing" } }).success).toBe(false);
    expect(RestaurantSchema.safeParse({ ...base, closure: { status: "permanently-closed", reportedOn: "2026-11-28" } }).success).toBe(false);
  });
});
