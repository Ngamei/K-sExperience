import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXPERIENCES } from "@/experiences/registry";
import { importIntoModule } from "@/engine/import";
import type { ExperienceData } from "@/engine/schema";

const coffee = EXPERIENCES.find((e) => e.id === "coffee")!;
const hcmc = JSON.parse(readFileSync("data/hcmc-boundary.geojson", "utf8")).features.map((f: { geometry: unknown }) => f.geometry);
const empty: ExperienceData = { metadata: { experienceId: "coffee", note: "t", dataset: "empty" }, items: [], establishments: [], offerings: [] };

const ITEMS = `id,name_vi,name_en,category,attr:preparation,attr:flavour,attr:served,description_en,source_title,source_url
ca-phe-muoi,Cà phê muối,Salt coffee,vietnamese-coffee,phin,salty|sweet,hot|iced,Phin coffee topped with salted cream.,Wikipedia,https://en.wikipedia.org/wiki/Vietnamese_iced_coffee
bac-xiu,Bạc xỉu,White coffee,vietnamese-coffee,phin,milky|sweet,iced,,Wikipedia,https://vi.wikipedia.org/wiki/B%E1%BA%A1c_x%E1%BB%89u`;
const ESTS = `id,name,address,neighbourhood,lon,lat,venue_type,source_title,source_url,last_verified,attr:cafeTypes,attr:wifi,attr:noise
cafe-a,Café A,1 Lê Lợi,Bến Thành,106.700,10.775,café,Guide,https://example.org/guide,2026-11-27,working|book,yes,quiet`;
const OFFS = `item_id,establishment_id,status,evidence_type,evidence_note,evidence_url,price_min,price_max,price_unit,last_verified
ca-phe-muoi,cafe-a,source-listed,published-source,Guide lists salt coffee,https://example.org/guide,35000,45000,cup,2026-11-27`;

describe("module import (dry run + non-destructive merge)", () => {
  it("imports items, establishments (with café attributes) and offerings from CSV", () => {
    const a = importIntoModule(coffee, empty, ITEMS, "items", hcmc);
    expect(a.errors).toEqual([]);
    expect(a.added).toEqual(["item ca-phe-muoi", "item bac-xiu"]);
    expect(a.merged.items[0].attributes).toEqual({ preparation: "phin", flavour: ["salty", "sweet"], served: ["hot", "iced"] });
    const b = importIntoModule(coffee, a.merged, ESTS, "establishments", hcmc);
    expect(b.errors).toEqual([]);
    expect(b.merged.establishments[0]).toMatchObject({ experiences: ["coffee"], attributes: { cafeTypes: ["working", "book"], wifi: true, noise: "quiet" } });
    const c = importIntoModule(coffee, b.merged, OFFS, "offerings", hcmc);
    expect(c.errors).toEqual([]);
    expect(c.merged.offerings[0]).toMatchObject({ status: "source-listed", price: { minVnd: 35000, maxVnd: 45000, unit: "cup" } });
  });
  it("only supplied columns overwrite; nothing is deleted; re-import is unchanged", () => {
    const base = importIntoModule(coffee, empty, ITEMS, "items", hcmc).merged;
    const patch = importIntoModule(coffee, base, "id,name_en\nbac-xiu,Vietnamese white coffee", "items", hcmc);
    expect(patch.errors).toEqual([]);
    expect(patch.updated).toEqual(["item bac-xiu"]);
    const bx = patch.merged.items.find((i) => i.id === "bac-xiu")!;
    expect(bx.nameEn).toBe("Vietnamese white coffee");
    expect(bx.nameVi).toBe("Bạc xỉu");
    expect(bx.attributes.preparation).toBe("phin");
    expect(patch.merged.items).toHaveLength(2);
    expect(importIntoModule(coffee, base, ITEMS, "items", hcmc).unchanged).toHaveLength(2);
  });
  it("never overwrites stronger evidence with weaker evidence (a closure update is still allowed)", () => {
    const a = importIntoModule(coffee, empty, ITEMS, "items", hcmc).merged;
    const b = importIntoModule(coffee, a, ESTS, "establishments", hcmc).merged;
    const strong = importIntoModule(coffee, b, `item_id,establishment_id,status,evidence_type,evidence_note,evidence_url,last_verified
ca-phe-muoi,cafe-a,menu-confirmed,official-menu,Menu lists salt coffee,https://example.org/menu,2026-11-27`, "offerings", hcmc);
    expect(strong.errors).toEqual([]);
    const weak = importIntoModule(coffee, strong.merged, OFFS, "offerings", hcmc);
    expect(weak.merged.offerings[0].status).toBe("menu-confirmed");
    expect(weak.warnings.join()).toMatch(/kept stronger evidence/);
    const closed = importIntoModule(coffee, strong.merged, `item_id,establishment_id,status,evidence_type,evidence_note,evidence_url,last_verified
ca-phe-muoi,cafe-a,temporarily-unavailable,official-menu,Removed from menu,https://example.org/menu,2026-12-01`, "offerings", hcmc);
    expect(closed.merged.offerings[0].status).toBe("temporarily-unavailable");
  });
  it("detects duplicates, invalid vocabularies, wrong record types and places outside HCMC", () => {
    const dupe = importIntoModule(coffee, empty, `${ITEMS}\nca-phe-muoi-2,Cà phê muối,Salt coffee 2,vietnamese-coffee,phin,,,,,`, "items", hcmc);
    expect(dupe.warnings.join()).toMatch(/possible duplicate items/);
    const dupId = importIntoModule(coffee, empty, `${ITEMS}\nbac-xiu,Bạc xỉu,x,vietnamese-coffee,,,,,,`, "items", hcmc);
    expect(dupId.errors.join()).toMatch(/duplicate bac-xiu in this file/);
    const bad = importIntoModule(coffee, empty, "id,name_vi,name_en,category,attr:preparation,attr:wifi\nx,X,X,cocktail,magic,yes", "items", hcmc);
    expect(bad.errors.join("\n")).toMatch(/unknown category/);
    expect(bad.errors.join("\n")).toMatch(/"magic"/);
    expect(bad.errors.join("\n")).toMatch(/other record type/);
    const outside = importIntoModule(coffee, empty, ESTS.replace("106.700,10.775", "105.85,21.03"), "establishments", hcmc);
    expect(outside.errors.join()).toMatch(/outside Ho Chi Minh City/);
  });
  it("offerings need matching evidence and existing records", () => {
    const base = importIntoModule(coffee, importIntoModule(coffee, empty, ITEMS, "items", hcmc).merged, ESTS, "establishments", hcmc).merged;
    const r = importIntoModule(coffee, base, OFFS.replace("source-listed,published-source", "menu-confirmed,published-source").replace("ca-phe-muoi,cafe-a", "unknown,cafe-a"), "offerings", hcmc);
    expect(r.errors.join("\n")).toMatch(/cannot justify/);
  });
});
