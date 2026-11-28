/**
 * Integration checks across all canonical data files. Also run by `npm run data:validate`.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DishCatalogueSchema, MappingFileSchema, ProvinceSchema, RegionSchema, RestaurantFileSchema } from "@/lib/data/schema";
import { pointInGeometry, type GeoJsonGeometry } from "@/lib/geo/geo";

const read = (p: string) => JSON.parse(readFileSync(path.join(__dirname, "../../", p), "utf8"));
const provincesFile = read("data/provinces.json");
const regionsFile = read("data/regions.json");
const catalogue = read("data/vietnamese-dishes.json");
const geo = read("data/vietnam.geojson");
const hcmc = read("data/hcmc-boundary.geojson");
const restaurantFiles = [read("data/hcmc-restaurants.json"), read("data/samples/hcmc-restaurants.sample.json")];
const mappingFiles = [read("data/dish-restaurant-mapping.json"), read("data/samples/dish-restaurant-mapping.sample.json")];

describe("geography", () => {
  it("has 63 historical provinces in 6 regions, each with geometry", () => {
    const provinces = provincesFile.provinces.map((p: unknown) => ProvinceSchema.parse(p));
    expect(provinces).toHaveLength(63);
    const regions = regionsFile.regions.map((r: unknown) => RegionSchema.parse(r));
    expect(regions.map((r: { id: string }) => r.id)).toEqual(["mien-bac", "bac-trung-bo", "nam-trung-bo", "tay-nguyen", "dong-nam-bo", "tay-nam-bo"]);
    expect(regions.reduce((a: number, r: { provinceIds: string[] }) => a + r.provinceIds.length, 0)).toBe(63);
    const geoIds = new Set(geo.features.map((f: { properties: { id: string } }) => f.properties.id));
    for (const p of provinces) expect(geoIds.has(p.id)).toBe(true);
  });
  it("includes Hoàng Sa and Trường Sa as labelled features", () => {
    const arch = geo.features.filter((f: { properties: { kind: string } }) => f.properties.kind === "archipelago");
    expect(arch.map((f: { properties: { id: string } }) => f.properties.id).sort()).toEqual(["hoang-sa", "truong-sa"]);
  });
  it("maps every historical province to one of 34 current (2025) units", () => {
    const units = new Set(provincesFile.provinces.map((p: { current: { id: string } }) => p.current.id));
    expect(units.size).toBe(34);
  });
  it("label points fall inside their province", () => {
    for (const p of provincesFile.provinces) {
      const f = geo.features.find((x: { properties: { id: string } }) => x.properties.id === p.id);
      expect(pointInGeometry(p.labelPoint, f.geometry as GeoJsonGeometry), p.id).toBe(true);
    }
  });
});

describe("dish catalogue", () => {
  const cat = DishCatalogueSchema.parse(catalogue);
  const provinceIds = new Set(provincesFile.provinces.map((p: { id: string }) => p.id));
  it("is schema-valid with unique ids", () => {
    expect(new Set(cat.dishes.map((d) => d.id)).size).toBe(cat.dishes.length);
    expect(cat.metadata.recordCount).toBe(cat.dishes.length);
  });
  it("every origin references a real province and the province's region", () => {
    for (const d of cat.dishes)
      for (const o of d.origins) {
        if (!o.provinceId) continue;
        expect(provinceIds.has(o.provinceId), `${d.id} → ${o.provinceId}`).toBe(true);
        const p = provincesFile.provinces.find((x: { id: string }) => x.id === o.provinceId);
        expect(p.regionId).toBe(o.regionId);
      }
  });
  it("seed data is labelled as seed and unverified", () => {
    if (cat.metadata.dataset === "seed") {
      expect(cat.metadata.label).toMatch(/SEED/);
      expect(cat.dishes.every((d) => d.dataset === "seed" && d.verification.status === "seed-unverified")).toBe(true);
    }
  });
  it("covers all three categories", () => {
    expect(new Set(cat.dishes.map((d) => d.category))).toEqual(new Set(["savory", "sweet", "snack"]));
  });
});

describe("HCMC establishments", () => {
  const hcmcGeoms = hcmc.features.map((f: { geometry: GeoJsonGeometry }) => f.geometry);
  const restaurants = restaurantFiles.flatMap((f) => RestaurantFileSchema.parse(f).restaurants);
  const links = mappingFiles.flatMap((f) => MappingFileSchema.parse(f).links);
  const dishIds = new Set(catalogue.dishes.map((d: { id: string }) => d.id));
  it("every establishment lies within the HCMC administrative boundary", () => {
    for (const r of restaurants) expect(hcmcGeoms.some((g: GeoJsonGeometry) => pointInGeometry(r.coordinates, g)), r.id).toBe(true);
  });
  it("real (non-sample) establishments carry sources and a last-verified date", () => {
    for (const r of restaurants.filter((x) => !x.isSample)) {
      expect(r.sources.length, r.id).toBeGreaterThan(0);
      expect(r.lastVerified, r.id).toBeTruthy();
    }
  });
  it("sample records are clearly labelled and never in the real files", () => {
    expect(read("data/hcmc-restaurants.json").restaurants.every((r: { isSample: boolean }) => !r.isSample)).toBe(true);
    for (const r of restaurants.filter((x) => x.isSample)) expect(r.name).toMatch(/^\[SAMPLE\]/);
  });
  it("links reference existing dishes and establishments; verified links have evidence", () => {
    const rIds = new Set(restaurants.map((r) => r.id));
    for (const l of links) {
      expect(dishIds.has(l.dishId), l.dishId).toBe(true);
      expect(rIds.has(l.restaurantId), l.restaurantId).toBe(true);
      const r = restaurants.find((x) => x.id === l.restaurantId)!;
      expect(l.isSample).toBe(r.isSample);
      if (!l.isSample && l.status !== "candidate") {
        expect(l.menuEvidence, `${l.dishId}@${l.restaurantId}`).toBeTruthy();
        expect(l.lastVerified, `${l.dishId}@${l.restaurantId} last checked`).toBeTruthy();
      }
    }
  });
  it("has at least 5 real, sourced HCMC establishments with Google Maps links", () => {
    const real = restaurants.filter((r) => !r.isSample);
    expect(real.length).toBeGreaterThanOrEqual(5);
    for (const r of real) {
      // a search link, or an exact place link from research (Google Maps → Share)
      expect(r.googleMapsUrl, r.id).toMatch(/^https:\/\/(www\.google\.com\/maps\/|maps\.app\.goo\.gl\/|goo\.gl\/maps\/)/);
      expect(r.sources.some((s) => s.url), r.id).toBe(true);
    }
  });
  it("dish photos are licensed and attributed", () => {
    const withPhotos = catalogue.dishes.filter((d: { photos: unknown[] }) => d.photos.length);
    expect(withPhotos.length).toBeGreaterThan(30);
    for (const d of withPhotos) for (const p of d.photos) {
      expect(p.license, d.id).toMatch(/CC|Public domain|CC0/i);
      expect(p.credit).toBeTruthy();
      expect(p.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });
  it("rejects a point outside HCMC (Hà Nội)", () => {
    expect(hcmcGeoms.some((g: GeoJsonGeometry) => pointInGeometry([105.8542, 21.0285], g))).toBe(false);
  });
});

describe("experience module data (shared engine)", () => {
  // Same integrity rules as Food for every module file: valid schema, real HCMC establishments with sources,
  // offerings that point at existing items/establishments of the same module, items in the module's categories.
  const dir = path.join(__dirname, "../../data/experiences");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  it("has a data file for every implemented non-Food module", async () => {
    const { EXPERIENCES } = await import("@/experiences/registry");
    for (const e of EXPERIENCES.filter((x) => x.id !== "food" && x.implemented)) expect(files).toContain(`${e.id}.json`);
  });
  for (const f of files) {
    it(`${f}: valid, inside HCMC, consistent`, async () => {
      const { ExperienceDataSchema } = await import("@/engine/schema");
      const { EXPERIENCES } = await import("@/experiences/registry");
      const d = ExperienceDataSchema.parse(read(`data/experiences/${f}`));
      const mod = EXPERIENCES.find((e) => e.id === d.metadata.experienceId)!;
      expect(`${mod.id}.json`).toBe(f);
      const { moduleDataProblems } = await import("@/engine/validate");
      expect(moduleDataProblems(mod, d)).toEqual([]);
      for (const e of d.establishments) {
        expect(e.experiences).toContain(mod.id);
        if (!e.isSample) { expect(e.sources.some((s) => s.url)).toBe(true); expect(e.lastVerified).toBeTruthy(); }
        expect(hcmc.features.some((g: { geometry: GeoJsonGeometry }) => pointInGeometry(e.coordinates, g.geometry))).toBe(true);
      }
      const items = new Set(d.items.map((i) => i.id));
      const ests = new Set(d.establishments.map((e) => e.id));
      for (const o of d.offerings) { expect(items.has(o.itemId)).toBe(true); expect(ests.has(o.establishmentId)).toBe(true); }
    });
  }
});
