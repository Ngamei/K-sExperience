/** Enrichment of existing business profiles through the research exchange (CC-ENRICH-*). */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyEnrichment, enrichProblems, type EnrichableRecord } from "@/lib/data/enrich";
import { BatchSchema, validateVenues, type Batch } from "@/lib/data/exchange";
import { DishRestaurantLinkSchema, RestaurantSchema } from "@/lib/data/schema";

const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const food = read("data/vietnamese-dishes.json");
const rest = read("data/hcmc-restaurants.json").restaurants as { id: string }[];
const links = read("data/dish-restaurant-mapping.json").links as { dishId: string; restaurantId: string }[];
const ctx = {
  dishIds: new Set<string>(food.dishes.map((d: { id: string }) => d.id)),
  moduleItems: {},
  establishments: rest.map((r) => ({ ...(r as object), experience: "food" })) as never,
  hcmc: read("data/hcmc-boundary.geojson").features.map((f: { geometry: unknown }) => f.geometry),
};
const base = { batchId: "CC-ENRICH-Q1Q3PNBT-901", experience: "food", kind: "venues", agent: "claude-code", researchedOn: "2026-11-28", method: "Test enrichment batch." } as const;
const batch = (venues: unknown[]): Batch => BatchSchema.parse({ ...base, venues });
const H = { mon: [["06:00", "22:00"]], tue: [["06:00", "22:00"]], wed: [["06:00", "22:00"]], thu: [["06:00", "22:00"]], fri: [["06:00", "22:00"]], sat: [["06:00", "22:00"]], sun: [["06:00", "22:00"]] };
const record = (): EnrichableRecord => ({
  id: "quan-a-1-le-loi", name: "Quán A", sources: [{ title: "guide.vn", url: "https://guide.vn/a", accessed: "2026-11-27" }], lastVerified: "2026-11-27",
  highlights: ["kept"], openingHours: undefined,
  dishes: [{ dishId: "pho-sai-gon", evidence: "Guide lists phở.", url: "https://guide.vn/a" }],
});

describe("enrichment — contract", () => {
  it("accepts multi-part batch ids such as CC-ENRICH-Q1Q3PNBT-001, still rejects free-form ids", () => {
    expect(BatchSchema.safeParse({ ...base, batchId: "CC-ENRICH-Q1Q3PNBT-001", venues: [] }).success).toBe(true);
    expect(BatchSchema.safeParse({ ...base, batchId: "food-1", venues: [] }).success).toBe(false);
    expect(BatchSchema.safeParse({ ...base, batchId: "CC-enrich-001", venues: [] }).success).toBe(false);
  });

  it("keeps contact, enrich and fieldSources through parsing (they used to be stripped)", () => {
    const b = batch([{ id: rest[0].id, enrich: true, name: "Quán X", address: "1 Lê Lợi", sources: ["https://x.vn/a"], contact: { phone: "+84 28 3829 7943" }, fieldSources: { phone: "https://x.vn/a" } }]);
    expect(b.venues![0]).toMatchObject({ enrich: true, contact: { phone: "+84 28 3829 7943" }, fieldSources: { phone: "https://x.vn/a" } });
  });

  it("a phone without its source URL is a schema error; malformed phones are rejected", () => {
    expect(BatchSchema.safeParse({ ...base, venues: [{ name: "Quán X", address: "1 Lê Lợi", sources: ["https://x.vn/a"], contact: { phone: "0909 123 456" } }] }).success).toBe(false);
    expect(BatchSchema.safeParse({ ...base, venues: [{ name: "Quán X", address: "1 Lê Lợi", sources: ["https://x.vn/a"], contact: { phone: "call us" }, fieldSources: { phone: "https://x.vn/a" } }] }).success).toBe(false);
  });

  it("enrichProblems: id required, provenance must be in sources, price needs a url, no coordinates", () => {
    expect(enrichProblems({ sources: ["https://a.vn/x"], openingHours: H })).toEqual(expect.arrayContaining([expect.stringMatching(/existing establishment id/), expect.stringMatching(/fieldSources.openingHours/)]));
    expect(enrichProblems({ id: "x", sources: ["https://a.vn/x"], priceRange: "$", fieldSources: { priceRange: "https://b.vn/y" } })).toEqual([expect.stringMatching(/must also be listed in sources/)]);
    expect(enrichProblems({ id: "x", sources: ["https://a.vn/x"], dishes: [{ dishId: "pho-sai-gon", priceVnd: { min: 50000, max: 60000 } }] })).toEqual([expect.stringMatching(/needs the url/)]);
    expect(enrichProblems({ id: "x", sources: ["https://a.vn/x"], lon: 106.7, lat: 10.7 })).toEqual(expect.arrayContaining([expect.stringMatching(/omit lon\/lat/)]));
    expect(enrichProblems({ id: "x", sources: ["https://a.vn/x"], contact: { phone: "028 1234 5678" }, fieldSources: { phone: "https://a.vn/x" } })).toEqual([]);
  });

  it("validateVenues: enrich of an existing id is accepted without dishes; an unknown id is rejected (never created)", () => {
    const linked = links.find((l) => l.restaurantId === rest[0].id)!;
    const [ok, missing] = validateVenues(batch([
      { id: rest[0].id, enrich: true, name: "Quán X", address: "1 Lê Lợi", sources: ["https://x.vn/a"], contact: { phone: "028 3829 7943" }, fieldSources: { phone: "https://x.vn/a" },
        dishes: [{ dishId: linked.dishId, url: "https://x.vn/a", priceVnd: { min: 50000, max: 60000 } }] },
      { id: "does-not-exist-anywhere", enrich: true, name: "Quán Y", address: "2 Lê Lợi", sources: ["https://x.vn/b"], priceRange: "$", fieldSources: { priceRange: "https://x.vn/b" } },
    ]), ctx);
    expect(ok).toMatchObject({ decision: "accept", action: "enrich", priced: 1 });
    expect(missing.decision).toBe("reject");
    expect(missing.reasons.join(" ")).toMatch(/no existing food establishment/);
  });
});

describe("enrichment — merge into an existing record", () => {
  it("adds contact, hours, price range, closure and link price without losing existing data", () => {
    const r = record();
    const changes = applyEnrichment(r, {
      sources: ["https://guide.vn/a", "https://listing.vn/a", "https://second.vn/a"],
      contact: { phone: "028 3829 7943" }, openingHours: H, priceRange: "$",
      fieldSources: { phone: "https://listing.vn/a", openingHours: "https://listing.vn/a", priceRange: "https://guide.vn/a" },
      dishes: [{ dishId: "pho-sai-gon", url: "https://listing.vn/a", priceVnd: { min: 55000, max: 75000 } }],
    }, "2026-11-28");
    expect(changes).toEqual(["phone", "openingHours", "priceRange", "price:pho-sai-gon"]);
    expect(r.contact).toEqual({ phone: "028 3829 7943" });
    expect(r.highlights).toEqual(["kept"]);
    expect(r.dishes).toHaveLength(1);
    expect(r.dishes[0]).toMatchObject({ dishId: "pho-sai-gon", url: "https://guide.vn/a", priceVnd: { min: 55000, max: 75000 } });
    expect(r.dishes[0].evidence).toMatch(/^Guide lists phở\. Price 55\.000–75\.000 VND per listing\.vn \(checked 2026-11-28\)\.$/);
    // field-level provenance: the phone's URL is a venue source naming the fields it supports
    expect(r.sources).toHaveLength(3);
    expect(r.sources[1]).toMatchObject({ url: "https://listing.vn/a", accessed: "2026-11-28" });
    expect(r.sources[2]).toMatchObject({ url: "https://second.vn/a", note: expect.stringMatching(/Corroborating/) });
    expect(r.sources[1].note).toMatch(/phone, opening hours, price of pho-sai-gon/);
    expect(r.sources[0].note).toMatch(/price range/);
    expect(r.lastVerified).toBe("2026-11-28");
    // result is still a valid canonical record + link
    const { dishes, ...venue } = r;
    expect(RestaurantSchema.safeParse({ ...venue, address: "1 Lê Lợi", neighbourhood: "Bến Thành", coordinates: [106.7, 10.77], isSample: false, venueType: "eatery", deliveryLinks: [] }).success).toBe(true);
    expect(DishRestaurantLinkSchema.safeParse({ dishId: "pho-sai-gon", restaurantId: r.id, status: "source-listed", isSample: false, menuEvidence: { type: "published-source", note: dishes[0].evidence, url: dishes[0].url }, priceVnd: dishes[0].priceVnd, lastVerified: "2026-11-28" }).success).toBe(true);
  });

  it("is idempotent and keeps existing contact keys", () => {
    const r = record();
    r.contact = { website: "https://quana.vn/" };
    const v = { sources: ["https://listing.vn/a"], contact: { phone: "0909 123 456" }, fieldSources: { phone: "https://listing.vn/a" } };
    applyEnrichment(r, v, "2026-11-28");
    expect(applyEnrichment(r, v, "2026-11-28")).toEqual([]);
    expect(r.contact).toEqual({ website: "https://quana.vn/", phone: "0909 123 456" });
    expect(r.sources.filter((s) => s.url === "https://listing.vn/a")).toHaveLength(1);
  });

  it("records a reported closure", () => {
    const r = record();
    applyEnrichment(r, { sources: ["https://news.vn/x"], closure: { status: "permanently-closed", reportedOn: "2026-11-28", source: "https://news.vn/x" }, fieldSources: { closure: "https://news.vn/x" } }, "2026-11-28");
    expect(r.closure).toMatchObject({ status: "permanently-closed" });
  });
});

describe("enrichment — canonical data provenance", () => {
  it("every venue with a phone cites the source of that phone", () => {
    for (const r of read("data/hcmc-restaurants.json").restaurants as { id: string; contact?: { phone?: string }; sources: { note?: string }[] }[])
      if (r.contact?.phone) expect(r.sources.some((s) => /Source for: [^)]*phone/.test(s.note ?? "")), r.id).toBe(true);
  });
});
