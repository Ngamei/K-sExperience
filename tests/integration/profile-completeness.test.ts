import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// docs/profile-completeness.json must reconcile with the canonical data (regenerate: npm run data:profile-completeness).
const root = path.resolve(__dirname, "../..");
const read = (p: string) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
describe("business profile completeness report", () => {
  const report = read("docs/profile-completeness.json");
  const real = (xs: { isSample?: boolean }[]) => xs.filter((x) => !x.isSample).length;
  const total = real(read("data/hcmc-restaurants.json").restaurants) + ["coffee", "bars", "spa", "sport"].reduce((n, m) => n + real(read(`data/experiences/${m}.json`).establishments), 0);
  it("counts every real establishment exactly once", () => {
    expect(report.overall.total).toBe(total);
    expect(report.byArea.reduce((n: number, a: { total: number }) => n + a.total, 0)).toBe(total);
    expect(report.byExperience.reduce((n: number, x: { total: number }) => n + x.total, 0)).toBe(total);
  });
  it("phone coverage matches the records (no inferred values)", () => {
    const phones = read("data/hcmc-restaurants.json").restaurants.filter((r: { isSample?: boolean; contact?: { phone?: string } }) => !r.isSample && r.contact?.phone).length
      + ["coffee", "bars", "spa", "sport"].reduce((n, m) => n + read(`data/experiences/${m}.json`).establishments.filter((e: { isSample?: boolean; contact?: { phone?: string } }) => !e.isSample && e.contact?.phone).length, 0);
    expect(report.overall.fields.phone.count).toBe(phones);
  });
  it("keeps the PO launch targets", () => {
    expect(Object.fromEntries(report.targets.map((t: { key: string; target: number }) => [t.key, t.target]))).toEqual({ nameCategory: 100, address: 100, location: 100, status: 90, contact: 85, hours: 80, menu: 80, prices: 70, photo: 50 });
  });
});
