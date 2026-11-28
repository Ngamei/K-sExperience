import { describe, expect, it } from "vitest";
import { EXPERIENCES, EXPERIENCE_IDS, NAV_SLOTS, getExperience, isPilot, isSelectable, moduleForPath, navFor } from "@/experiences/registry";
import { fromRows, toRows, EMPTY_PASSPORT, type HistoryRow, type SavedRow } from "@/lib/passport/model";
import { SportOfferingSchema } from "@/experiences/sport/schema";

describe("experience registry", () => {
  it("lists the six modes in Settings order with Sport last", () => {
    expect(EXPERIENCES.map((e) => e.id)).toEqual(["food", "bars", "coffee", "spa", "shopping", "sport"]);
    expect([...EXPERIENCE_IDS]).toEqual(EXPERIENCES.map((e) => e.id));
  });
  it("Food is active; Bars, Coffee, Spa and Sport are open pilots (PO decision); Shopping stays locked; Sport lists Pickleball and Pilates", () => {
    expect(EXPERIENCES.filter((e) => isSelectable(e)).map((e) => e.id)).toEqual(["food", "bars", "coffee", "spa", "sport"]);
    expect(EXPERIENCES.filter((e) => isPilot(e)).map((e) => e.id)).toEqual(["bars", "coffee", "spa", "sport"]);
    const sport = EXPERIENCES.find((e) => e.id === "sport")!;
    expect(sport.status).toBe("pilot-planned");
    expect(sport.name).toEqual({ en: "Sport", vi: "Thể thao" });
    expect(sport.pilots?.map((p) => p.id)).toEqual(["pickleball", "pilates"]);
    expect(EXPERIENCES.find((e) => e.id === "shopping")!.status).toBe("coming-soon");
  });
  it("feature flags can never make an unimplemented module selectable", () => {
    const allOn = () => true;
    for (const e of EXPERIENCES.filter((x) => !x.implemented)) expect(isSelectable(e, allOn)).toBe(false);
  });
  it("a pilot is selectable when opened by default or by its flag; unimplemented modules never", () => {
    const coffee = EXPERIENCES.find((e) => e.id === "coffee")!;
    expect(coffee.implemented).toBe(true);
    expect(isSelectable(coffee)).toBe(true);
    expect(isSelectable({ ...coffee, enabledByDefault: false })).toBe(false);
    expect(isSelectable({ ...coffee, enabledByDefault: false }, (f) => f === "NEXT_PUBLIC_FEATURE_COFFEE")).toBe(true);
    expect(isSelectable(EXPERIENCES.find((e) => e.id === "shopping")!, () => true)).toBe(false);
  });
  it("navigation: same slots, icons and positions in every module; module labels and routes", () => {
    const food = navFor(EXPERIENCES[0]);
    // Food adds one module-specific entry ("Hôm nay ăn gì?") after Discover; the shared slots are unchanged.
    expect(food.map((n) => n.href)).toEqual(["/", "/discover/", "/what-to-eat/", "/catalogue/", "/nearby/", "/passport/", "/saved/"]);
    expect(food.filter((n) => n.mobile).map((n) => n.short.en)).toEqual(["Explore", "Discover", "Eat today", "Catalogue", "Nearby", "Passport"]);
    const shared = (e: (typeof EXPERIENCES)[number]) => navFor(e).filter((x) => (NAV_SLOTS as readonly string[]).includes(x.slot));
    for (const e of EXPERIENCES) {
      const n = shared(e);
      expect(n.map((x) => x.slot)).toEqual([...NAV_SLOTS]);
      expect(n.map((x) => x.icon)).toEqual(shared(EXPERIENCES[0]).map((x) => x.icon));
      expect(n.find((x) => x.slot === "saved")!.href).toBe("/saved/");
    }
    const coffee = navFor(EXPERIENCES.find((e) => e.id === "coffee")!);
    expect(coffee.map((n) => n.label.en)).toEqual(["Café Map", "Discover", "Coffee Catalogue", "Nearby", "Coffee Passport", "Saved"]);
    expect(coffee.map((n) => n.href)).toEqual(["/coffee/", "/coffee/discover/", "/coffee/catalogue/", "/coffee/nearby/", "/coffee/passport/", "/saved/"]);
  });
  it("module URLs resolve to their module; Food URLs do not", () => {
    expect(moduleForPath("/coffee/catalogue/")?.id).toBe("coffee");
    expect(moduleForPath("/sport/")?.id).toBe("sport");
    expect(moduleForPath("/catalogue/")).toBeUndefined();
    expect(moduleForPath("/")).toBeUndefined();
  });
  it("each module defines searchable fields, catalogue config, detail sections with the shared offerings block, and attributes", () => {
    for (const e of EXPERIENCES) {
      expect(e.searchable.length, e.id).toBeGreaterThan(0);
      expect(e.detailSections.at(-1)?.id, e.id).toBe("offerings");
      const ids = new Set(e.attributes.map((a) => a.id));
      for (const sec of e.detailSections) for (const a of sec.attributes ?? []) expect(ids.has(a), `${e.id}.${a}`).toBe(true);
      for (const a of e.catalogue.cardAttributes) expect(ids.has(a), `${e.id}.${a}`).toBe(true);
    }
  });
  it("falls back to Food for unknown or unavailable modes", () => {
    expect(getExperience("sport").id).toBe("sport");
    expect(getExperience("nonsense").id).toBe("food");
    expect(getExperience("coffee").id).toBe("coffee");
    expect(getExperience("shopping").id).toBe("food"); // not implemented
    expect(navFor(getExperience("food")).length).toBe(7);
    expect(navFor(getExperience("coffee")).length).toBe(6);
  });
  it("every module labels the same navigation slots in both languages", () => {
    for (const e of EXPERIENCES) for (const s of NAV_SLOTS) {
      expect(e.navLabels[s].en, `${e.id}.${s}`).toBeTruthy();
      expect(e.navLabels[s].vi, `${e.id}.${s}`).toBeTruthy();
    }
    const label = (id: string, s: (typeof NAV_SLOTS)[number]) => EXPERIENCES.find((e) => e.id === id)!.navLabels[s].en;
    expect(["food", "bars", "coffee", "spa", "sport"].map((id) => label(id, "map"))).toEqual(["Food Map", "Bar Map", "Café Map", "Spa Map", "Sport Map"]);
    expect(["food", "bars", "coffee", "spa", "sport"].map((id) => label(id, "catalogue"))).toEqual(["Food Catalogue", "Drinks Catalogue", "Coffee Catalogue", "Treatment Catalogue", "Activity Catalogue"]);
    expect(["food", "bars", "coffee", "spa", "sport"].map((id) => label(id, "passport"))).toEqual(["Food Passport", "Bar Passport", "Coffee Passport", "Wellness Passport", "Sport Passport"]);
  });
  it("food-specific filters and the Vietnam origin map belong to Food only", () => {
    for (const e of EXPERIENCES.filter((x) => x.id !== "food")) {
      expect(e.filters.some((f) => f.startsWith("food:")), e.id).toBe(false);
      expect(e.map.layers).not.toContain("vietnam-origins");
    }
    expect(EXPERIENCES[0].map.layers).toContain("vietnam-origins");
  });
});

describe("shared passport compatibility", () => {
  const U = "u1";
  it("Food passport ignores (and never emits) rows of other experiences on the same account", () => {
    const saved: SavedRow[] = [
      { user_id: U, experience_id: "food", item_type: "dish", item_id: "bun-bo-hue", collection: "" },
      { user_id: U, experience_id: "sport", item_type: "item", item_id: "reformer-pilates", collection: "" },
    ];
    const history: HistoryRow[] = [
      { user_id: U, experience_id: "food", item_type: "dish", item_id: "pho-sai-gon", action: "tried", occurred_on: "2026-11-01" },
      { user_id: U, experience_id: "sport", item_type: "item", item_id: "pickleball", action: "attended", occurred_on: "2026-11-02" },
    ];
    const p = fromRows(saved, history, []);
    expect(p.saved).toEqual(["bun-bo-hue"]);
    expect(Object.keys(p.tried)).toEqual(["pho-sai-gon"]);
    const rows = toRows(U, p);
    expect([...rows.saved, ...rows.history, ...rows.notes].every((r) => r.experience_id === "food")).toBe(true);
    expect(toRows(U, EMPTY_PASSPORT).history).toEqual([]);
  });
});

describe("sport draft schema", () => {
  it("accepts a structurally valid offering without inventing prices or schedules", () => {
    expect(SportOfferingSchema.safeParse({ activityId: "reformer-pilates", establishmentId: "x", sport: "pilates", formats: ["trial"], levels: ["beginner"] }).success).toBe(true);
    expect(SportOfferingSchema.safeParse({ activityId: "a", establishmentId: "x", sport: "tennis", formats: ["trial"], levels: ["beginner"] }).success).toBe(false);
  });
});
