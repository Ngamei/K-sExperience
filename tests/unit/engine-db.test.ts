import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EXPERIENCES } from "@/experiences/registry";
import { fromEstablishmentRow, fromItemRow, fromOfferingRow, toEstablishmentRow, toEstablishmentSourceRows, toItemRow, toOfferingRow, toTagRows } from "@/engine/db-rows";
import { moduleDataProblems } from "@/engine/validate";
import { saveEstablishment, saveItem, saveOffering } from "@/lib/supabase/modules";
import type { Establishment, ExperienceItem, Offering } from "@/engine/schema";

const coffee = EXPERIENCES.find((e) => e.id === "coffee")!;
const item: ExperienceItem = {
  id: "ca-phe-muoi", experienceId: "coffee", nameVi: "Cà phê muối", nameEn: "Salt coffee", altNames: [], category: "vietnamese-coffee",
  attributes: { preparation: "phin", flavour: ["salty", "sweet"], served: ["hot", "iced"] }, description: { en: "x", vi: "x" },
  photos: [], sources: [{ title: "Wikipedia", url: "https://en.wikipedia.org/wiki/Vietnamese_coffee" }], verification: { status: "seed-unverified" }, dataset: "seed",
};
const est: Establishment = {
  id: "cafe-a", name: "Café A", isSample: false, address: "1 Street", neighbourhood: "Bến Nghé", coordinates: [106.7, 10.77], venueType: "café",
  deliveryLinks: [], sources: [{ title: "Guide", url: "https://example.org/guide" }], lastVerified: "2026-11-27", experiences: ["coffee", "bars"],
  attributes: { cafeTypes: ["working"], wifi: true, powerSockets: true, noise: "quiet" },
};
const off: Offering = { itemId: "ca-phe-muoi", establishmentId: "cafe-a", status: "source-listed", isSample: false, menuEvidence: { type: "published-source", note: "guide" }, lastVerified: "2026-11-27", price: { minVnd: 30000, maxVnd: 40000, unit: "cup" } };

describe("shared-engine rows round-trip", () => {
  it("items, establishments (attributes + modes), offerings", () => {
    expect(fromItemRow(toItemRow(item))).toEqual(item);
    const { lon, lat, ...row } = toEstablishmentRow(est);
    expect(row.attributes).toEqual(est.attributes);
    expect(fromEstablishmentRow({ ...row, lon, lat }, toTagRows(est), toEstablishmentSourceRows(est))).toEqual(est);
    expect(fromOfferingRow(toOfferingRow(off))).toEqual(off);
  });
});

describe("module rules", () => {
  it("drinks and café characteristics are never mixed", () => {
    const bad = { ...item, attributes: { wifi: true } };
    expect(moduleDataProblems(coffee, { metadata: { experienceId: "coffee", note: "", dataset: "seed" }, items: [bad], establishments: [], offerings: [] }).join()).toMatch(/other record type/);
    const badEst = { ...est, attributes: { preparation: "phin" } };
    expect(moduleDataProblems(coffee, { metadata: { experienceId: "coffee", note: "", dataset: "seed" }, items: [], establishments: [badEst], offerings: [] }).join()).toMatch(/other record type/);
  });
  it("controlled vocabularies, categories and price units are enforced", () => {
    const d = { metadata: { experienceId: "coffee" as const, note: "", dataset: "seed" as const }, items: [{ ...item, category: "cocktail", attributes: { preparation: "magic" } }], establishments: [est], offerings: [{ ...off, price: { minVnd: 1, maxVnd: 2, unit: "court-hour" } }] };
    const p = moduleDataProblems(coffee, d).join("\n");
    expect(p).toMatch(/unknown category "cocktail"/);
    expect(p).toMatch(/"preparation" value "magic"/);
    expect(p).toMatch(/price unit "court-hour"/);
  });
});

describe("writes never report false success", () => {
  const failing = { from: () => ({ upsert: async () => ({ error: { message: "permission denied for table experience_items" } }), delete: () => ({ eq: async () => ({ error: null }) }), insert: async () => ({ error: null }) }) } as unknown as SupabaseClient;
  const ok = { from: () => ({ upsert: async () => ({ error: null }), delete: () => ({ eq: async () => ({ error: null }) }), insert: async () => ({ error: null }) }) } as unknown as SupabaseClient;
  it("a database error is thrown to the caller", async () => {
    await expect(saveItem(failing, "coffee", item)).rejects.toThrow(/permission denied/);
    await expect(saveEstablishment(failing, "coffee", est)).rejects.toThrow(/permission denied/);
    await expect(saveOffering(failing, "coffee", off, { items: new Set(["ca-phe-muoi"]), establishments: new Set(["cafe-a"]) })).rejects.toThrow(/permission denied/);
  });
  it("invalid records are rejected before anything is sent", async () => {
    await expect(saveItem(ok, "coffee", { ...item, category: "nope" })).rejects.toThrow(/unknown category/);
    await expect(saveOffering(ok, "coffee", off, { items: new Set(), establishments: new Set(["cafe-a"]) })).rejects.toThrow(/unknown item/);
    await expect(saveItem(ok, "food", item)).rejects.toThrow(/not a shared-engine module/);
    await expect(saveItem(ok, "coffee", item)).resolves.toBeUndefined();
  });
});
