/** Research exchange: batch schema + venue validation against the real data (no fixtures for existing records). */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BatchSchema, establishmentId, geocodeProblem, validateVenues, type Batch } from "@/lib/data/exchange";
import { overlaps, type Queue } from "@/lib/data/exchange-queue";

const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const food = read("data/vietnamese-dishes.json");
const rest = read("data/hcmc-restaurants.json").restaurants;
const coffee = read("data/experiences/coffee.json");
const ctx = {
  dishIds: new Set<string>(food.dishes.map((d: { id: string }) => d.id)),
  moduleItems: { coffee: new Set<string>(coffee.items.map((i: { id: string }) => i.id)) },
  establishments: [...rest.map((r: object) => ({ ...r, experience: "food" })), ...coffee.establishments.map((e: object) => ({ ...e, experience: "coffee" }))],
  hcmc: read("data/hcmc-boundary.geojson").features.map((f: { geometry: unknown }) => f.geometry),
};
const base = { batchId: "GPT-FOOD-901", experience: "food", kind: "venues", agent: "chatgpt", researchedOn: "2026-11-28", method: "Test batch from official menus." } as const;
const batch = (venues: unknown[], extra: object = {}): Batch => BatchSchema.parse({ ...base, ...extra, venues });

describe("research exchange — batch validation", () => {
  it("schema: batch id format, https sources, price sanity", () => {
    expect(BatchSchema.safeParse({ ...base, batchId: "food-1", venues: [] }).success).toBe(false);
    expect(BatchSchema.safeParse({ ...base, venues: [{ name: "Quán A", address: "1 Lê Lợi", sources: ["http://x.vn"], dishes: ["pho-sai-gon"] }] }).success).toBe(false);
    expect(BatchSchema.safeParse({ ...base, venues: [{ name: "Quán A", address: "1 Lê Lợi", sources: ["https://x.vn/a"], dishes: [{ dishId: "pho-sai-gon", priceVnd: { min: 90000, max: 50000 } }] }] }).success).toBe(false);
  });

  it("accepts a new venue with known dishes; rejects unknown dish ids and coordinates outside HCMC", () => {
    const [ok, bad, out] = validateVenues(batch([
      { name: "Quán Thử Nghiệm", address: "999 Đường Không Tồn Tại", sources: ["https://example.vn/a"], dishes: [{ dishId: "pho-sai-gon", evidence: "Menu lists phở bò tái.", priceVnd: { min: 55000, max: 75000 } }] },
      { name: "Quán Lạ", address: "998 Đường Không Tồn Tại", sources: ["https://example.vn/b"], dishes: ["mon-khong-co"] },
      { name: "Quán Hà Nội", address: "1 Phố Huế", sources: ["https://example.vn/c"], dishes: ["pho-sai-gon"], lon: 105.85, lat: 21.02 },
    ]), ctx);
    expect(ok).toMatchObject({ decision: "accept", action: "new", offerings: 1, priced: 1 });
    expect(bad.decision).toBe("reject");
    expect(bad.reasons.join()).toMatch(/unknown dish id "mon-khong-co"/);
    expect(out.reasons.join()).toMatch(/outside Ho Chi Minh City/);
  });

  it("same name + address merges into the existing id; same address under another name is flagged as a duplicate", () => {
    const existing = rest[0];
    const [merge, dup] = validateVenues(batch([
      { name: existing.name, address: existing.address.split(",")[0], sources: ["https://example.vn/d"], dishes: ["pho-sai-gon"] },
      { name: "Tên Khác", address: existing.address.split(",")[0], sources: ["https://example.vn/e"], dishes: ["pho-sai-gon"] },
    ]), ctx);
    expect(merge.id).toBe(existing.id); // legacy id kept, not a new slug
    expect(establishmentId(existing.name, existing.address.split(",")[0])).not.toBe(existing.id);
    expect(merge.action).toBe("merge");
    expect(dup.decision).toBe("reject");
    expect(dup.reasons.join()).toMatch(/possible duplicate of existing establishment/);
    const [ok] = validateVenues(batch([{ name: "Tên Khác", address: existing.address.split(",")[0], sources: ["https://example.vn/e"], dishes: ["pho-sai-gon"], confirmDistinct: true }]), ctx);
    expect(ok.decision).toBe("accept");
  });

  it("module batches need known items; photo metadata must be complete", () => {
    const [v] = validateVenues(batch([{ name: "Cà phê Thử", address: "5 Hẻm Thử", sources: ["https://example.vn/f"],
      offerings: [{ item: "ca-phe-trung", evidence: "Menu lists egg coffee.", url: "https://example.vn/f", photo: { url: "https://example.vn/p.jpg", kind: "menu-photo" } }] }], { batchId: "CC-COFFEE-901", experience: "coffee" }), ctx);
    expect(v.decision).toBe("reject");
    expect(v.reasons.join()).toMatch(/photo for ca-phe-trung/);
  });

  it("geocode sanity: wrong street or far from the stated district is rejected", () => {
    const centres = { "Quận 7": [106.722, 10.734] as [number, number] };
    expect(geocodeProblem({ address: "Shophouse 7, Hưng Phúc Premier", district: "Quận 7" }, { lon: 106.7087, lat: 10.7305, displayName: "Nhà Thuốc An Khang, 7, Bùi Bằng Đoàn, Tân Hưng" }, centres)).toMatch(/not on/);
    expect(geocodeProblem({ address: "10 Nguyễn Văn Linh", district: "Quận 7" }, { lon: 106.9, lat: 10.9, displayName: "Nguyễn Văn Linh, …" }, centres)).toMatch(/km from Quận 7/);
    expect(geocodeProblem({ address: "10 Nguyễn Văn Linh", district: "Quận 7" }, { lon: 106.72, lat: 10.735, displayName: "Nguyễn Văn Linh, Tân Phong" }, centres)).toBeNull();
    expect(geocodeProblem({ address: "1 A" }, { failed: true, reason: "ambiguous" }, centres)).toMatch(/ambiguous/);
    // street-level pin of "393/7 Hai Bà Trưng" (stated Quận 3) that lands in Quận 1
    const two = { "Quận 1": [106.700, 10.776] as [number, number], "Quận 3": [106.684, 10.783] as [number, number] };
    expect(geocodeProblem({ address: "393/7 Hai Bà Trưng", district: "Quận 3" }, { lon: 106.7004, lat: 10.7808, displayName: "Hai Bà Trưng, Sài Gòn", precision: "street" }, two)).toMatch(/nearer Quận 1/);
    expect(geocodeProblem({ address: "393/7 Hai Bà Trưng", district: "Quận 3" }, { lon: 106.7004, lat: 10.7808, displayName: "Hai Bà Trưng, Sài Gòn", precision: "exact" }, two)).toBeNull();
  });

  it("queue: another agent's active claim on the same item + district is reported", () => {
    const q: Queue = { batches: [
      { batchId: "CC-FOOD-009", experience: "food", kind: "venues", scope: "central districts", claims: { items: ["ca-kho-to"], districts: ["Quận 1"] }, assignedTo: "claude-code", status: "in-progress", sources: [], importStatus: "", updatedAt: "2026-11-28" },
      { batchId: "GPT-FOOD-901", experience: "food", kind: "venues", scope: "test batch", assignedTo: "chatgpt", status: "planned", sources: [], importStatus: "", updatedAt: "2026-11-28" },
    ] };
    expect(overlaps(q, "GPT-FOOD-901", "food", [{ item: "ca-kho-to", district: "Quận 1" }])).toHaveLength(1);
    expect(overlaps(q, "GPT-FOOD-901", "food", [{ item: "ca-kho-to", district: "Gò Vấp" }])).toHaveLength(0);
  });

  it("the shared queue file is valid", () => {
    const q = read("research-exchange/queue.json");
    expect(q.batches.length).toBeGreaterThan(10);
    expect(new Set(q.batches.map((b: { batchId: string }) => b.batchId)).size).toBe(q.batches.length);
  });
});
