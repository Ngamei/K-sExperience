import { describe, expect, it } from "vitest";
import { importCatalogue, parseCsv } from "@/lib/data/importer";
import provincesFile from "@data/provinces.json";
import regionsFile from "@data/regions.json";
import type { Province, Region } from "@/lib/data/schema";

const ctx = {
  provinces: (provincesFile as unknown as { provinces: Province[] }).provinces,
  regions: (regionsFile as unknown as { regions: Region[] }).regions,
  dataset: "master" as const,
};
const base = { nameVi: "Phở bò Nam Định", nameEn: "Nam Dinh beef pho", category: "Món mặn", dishType: "noodle-soup", origins: "Nam Định" };

describe("catalogue importer", () => {
  it("accepts Vietnamese category names and accent-free province names", () => {
    const r = importCatalogue([{ ...base, origins: "nam dinh; ~Ha Noi", taste: "umami; rich" }], ctx);
    expect(r.issues.filter((i) => i.level === "error")).toEqual([]);
    const d = r.dishes[0];
    expect(d.id).toBe("pho-bo-nam-dinh");
    expect(d.category).toBe("savory");
    expect(d.origins).toEqual([
      { provinceId: "nam-dinh", regionId: "mien-bac", role: "primary" },
      { provinceId: "ha-noi", regionId: "mien-bac", role: "associated" },
    ]);
    expect(d.verification.status).toBe("pending-review");
  });
  it("maps Ăn vặt / Món ngọt", () => {
    const r = importCatalogue([{ ...base, nameVi: "A", category: "Ăn vặt" }, { ...base, nameVi: "B", category: "Món ngọt" }], ctx);
    expect(r.dishes.map((d) => d.category)).toEqual(["snack", "sweet"]);
  });
  it("supports region-wide origins", () => {
    const r = importCatalogue([{ ...base, origins: "region:Tây Nam Bộ" }], ctx);
    expect(r.dishes[0].origins).toEqual([{ regionId: "tay-nam-bo", role: "associated" }]);
  });
  it("rejects unknown provinces, categories and duplicates instead of guessing", () => {
    const r = importCatalogue(
      [{ ...base, origins: "Atlantis" }, { ...base, category: "drinks" }, base, base],
      ctx,
    );
    const errs = r.issues.filter((i) => i.level === "error").map((i) => i.message);
    expect(errs.some((e) => e.includes("Unknown province"))).toBe(true);
    expect(errs.some((e) => e.includes("Unknown category"))).toBe(true);
    expect(errs.some((e) => e.includes("Duplicate"))).toBe(true);
    expect(r.stats.imported).toBe(1);
  });
  it("warns when verified records lack sources", () => {
    const r = importCatalogue([{ ...base, verificationStatus: "verified" }], ctx);
    expect(r.issues.some((i) => i.message.includes("no source"))).toBe(true);
  });
  it("parses CSV with quoted commas", () => {
    const rows = parseCsv('nameVi,nameEn,category,dishType,origins,descriptionEn\n"Bún chả","Bun cha",savory,noodles,Hà Nội,"Grilled pork, noodles"\n');
    expect(rows[0].descriptionEn).toBe("Grilled pork, noodles");
    const r = importCatalogue(rows, ctx);
    expect(r.dishes[0].id).toBe("bun-cha");
  });
});
