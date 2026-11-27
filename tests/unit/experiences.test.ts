import { describe, expect, it } from "vitest";
import { EXPERIENCES, EXPERIENCE_IDS, NAV_SLOTS, getExperience, isSelectable } from "@/experiences/registry";
import { fromRows, toRows, EMPTY_PASSPORT, type HistoryRow, type SavedRow } from "@/lib/passport/model";
import { SportOfferingSchema } from "@/experiences/sport/schema";

describe("experience registry", () => {
  it("lists the six modes in Settings order with Sport last", () => {
    expect(EXPERIENCES.map((e) => e.id)).toEqual(["food", "bars", "coffee", "spa", "shopping", "sport"]);
    expect([...EXPERIENCE_IDS]).toEqual(EXPERIENCES.map((e) => e.id));
  });
  it("only Vietnamese Food is active and selectable; Sport is pilot-planned with Pickleball and Pilates", () => {
    expect(EXPERIENCES.filter((e) => isSelectable(e)).map((e) => e.id)).toEqual(["food"]);
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
  it("falls back to Food for unknown or unavailable modes", () => {
    expect(getExperience("sport").id).toBe("food");
    expect(getExperience("nonsense").id).toBe("food");
    expect(getExperience("food").nav.length).toBe(6);
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
