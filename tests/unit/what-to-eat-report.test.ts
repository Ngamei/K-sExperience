/** KEX-QA-01 — the report headline counts only dishes with a real HCMC venue (same number as the public page). */
import { describe, expect, it } from "vitest";
import { getFoodData } from "@/lib/data/catalogue";
import { whatToEatReport } from "@/lib/food/what-to-eat-report";
import { foodStats } from "@/lib/data/platform-stats";

const data = getFoodData();
const r = whatToEatReport(data.dishes, data.restaurants, data.links);

describe("What-to-eat report headline (KEX-QA-01)", () => {
  it("counts only dishes linked to a real (non-sample, non-candidate) HCMC establishment", () => {
    const real = new Set(data.restaurants.filter((x) => !x.isSample).map((x) => x.id));
    const linked = new Set(data.links.filter((l) => !l.isSample && l.status !== "candidate" && real.has(l.restaurantId)).map((l) => l.dishId));
    expect(r.dishesWithVenue).toBe(linked.size);
    expect(r.dishesWithVenue).toBe(foodStats(data).itemsWithEstablishments); // same as the public counts
    expect(r.dishesWithVenue).toBeLessThan(r.totalDishes); // regression: was 138/138
  });

  it("unlinked dishes are excluded from the headline even though they remain suggestible", () => {
    const unlinked = data.dishes.filter((d) => !data.links.some((l) => l.dishId === d.id && !l.isSample));
    expect(unlinked.length).toBeGreaterThan(0);
    expect(r.dishesEligible).toBe(data.dishes.length);
    expect(r.dishesWithVenue).toBe(r.dishesEligible - unlinked.length);
    // adding an unlinked dish never changes the headline
    const extra = { ...unlinked[0], id: "kex-qa-01-unlinked" };
    const r2 = whatToEatReport([...data.dishes, extra], data.restaurants, data.links);
    expect(r2.dishesWithVenue).toBe(r.dishesWithVenue);
    expect(r2.dishesEligible).toBe(r.dishesEligible + 1);
  });

  it("sample venues never count", () => {
    const sampleOnly = { ...data.dishes[0], id: "kex-qa-01-sample-only" };
    const sample = data.restaurants.find((x) => x.isSample);
    const links = sample ? [...data.links, { dishId: sampleOnly.id, restaurantId: sample.id, status: "source-listed" as const, isSample: true }] : data.links;
    const r3 = whatToEatReport([...data.dishes, sampleOnly], data.restaurants, links as typeof data.links);
    expect(r3.dishesWithVenue).toBe(r.dishesWithVenue);
  });
});
