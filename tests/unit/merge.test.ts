import { describe, expect, it } from "vitest";
import { mergeCatalogues } from "@/lib/data/merge";
import { importCatalogue } from "@/lib/data/importer";
import { getFoodData } from "@/lib/data/catalogue";

const data = getFoodData();
const ctx = { provinces: data.provinces, regions: data.regions, dataset: "master" as const };

describe("master catalogue merge (no data loss)", () => {
  const rows = [
    // matches existing by id, adds a source and changes the description
    { nameVi: "Mì Quảng", nameEn: "Quang noodles", category: "Món mặn", dishType: "noodles", origins: "Quảng Nam", descriptionEn: "Updated.", descriptionVi: "Cập nhật.", sources: "https://example.org/mi-quang" },
    // matches existing by accent-insensitive NAME although the id would differ
    { id: "bun-bo-hue-goc", nameVi: "bun bo Hue", nameEn: "Hue beef noodles", category: "savory", dishType: "noodle-soup", origins: "Thừa Thiên Huế" },
    // new dish (a real Bạc Liêu speciality)
    { nameVi: "Bún bò cay Bạc Liêu", nameEn: "Bạc Liêu spicy beef noodles", category: "Món mặn", dishType: "noodle-soup", origins: "Bạc Liêu", verificationStatus: "verified" },
  ];
  const imported = importCatalogue(rows, ctx);
  const { dishes, report } = mergeCatalogues(data.dishes, imported.dishes, imported.provided);
  const byId = new Map(dishes.map((d) => [d.id, d]));

  it("keeps every existing dish id", () => {
    for (const d of data.dishes) expect(byId.has(d.id), d.id).toBe(true);
    expect(dishes.length).toBe(data.dishes.length + 1);
  });
  it("matches by id and by name, keeping the existing id", () => {
    expect(report.matched.map((m) => [m.id, m.by])).toEqual([["mi-quang", "id"], ["bun-bo-hue", "name"]]);
    expect(byId.has("bun-bo-hue-goc")).toBe(false);
  });
  it("preserves photos and unions sources; never blanks existing fields", () => {
    const before = data.dishes.find((d) => d.id === "mi-quang")!;
    const after = byId.get("mi-quang")!;
    expect(after.photos).toEqual(before.photos);
    expect(after.sources.map((s) => s.url)).toContain("https://example.org/mi-quang");
    expect(after.description.en).toBe("Updated.");
    expect(after.ingredients).toEqual(before.ingredients); // not supplied → kept
    expect(after.spiceLevel).toBe(before.spiceLevel); // importer default (0) must not overwrite
    expect(after.prominence).toBe(before.prominence); // importer default (3) must not overwrite
    expect(after.mealTimes).toEqual(before.mealTimes);
    expect(report.matched[0].changes.sort()).toEqual(["description", "nameEn", "sources+"].sort());
    expect(after.dataset).toBe("master");
  });
  it("adds new dishes as research candidates (verified without sources is downgraded)", () => {
    expect(report.added).toEqual(["bun-bo-cay-bac-lieu"]);
    expect(byId.get("bun-bo-cay-bac-lieu")!.verification.status).toBe("pending-review");
    expect(report.downgraded).toEqual(["bun-bo-cay-bac-lieu"]);
  });
  it("keeps all restaurant links resolvable", () => {
    for (const l of data.links) expect(byId.has(l.dishId), l.dishId).toBe(true);
  });
  it("reports existing dishes absent from the import instead of deleting them", () => {
    expect(report.keptNotInImport.length).toBe(data.dishes.length - 2);
  });
});
