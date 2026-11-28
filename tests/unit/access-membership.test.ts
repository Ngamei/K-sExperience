import { describe, expect, it } from "vitest";
import { adminAllowed, canEdit, canManageMembers, isStaffRole, STAFF_ROLES } from "@/lib/admin/access";
import { annualSavingsPct, BENEFITS, effectiveTier, LIMITS, LIMITS_ENFORCED, LOWEST_PAID_MONTHLY, PLANS, projectRevenue, TIERS, withinLimit } from "@/lib/membership/plans";

describe("KEX-SEC-02 — staff roles and membership tiers are separate", () => {
  it("no membership tier is a staff role or grants Admin access", () => {
    for (const tier of TIERS) {
      expect(isStaffRole(tier)).toBe(false);
      expect(adminAllowed("supabase", tier as never)).toBe(false);
      expect(canEdit(tier as never)).toBe(false);
      expect(canManageMembers(tier as never)).toBe(false);
    }
  });
  it("Supabase mode: only staff roles open the portal; only admin/editor write; only admin manages members", () => {
    expect(adminAllowed("supabase", null)).toBe(false);
    for (const r of STAFF_ROLES) expect(adminAllowed("supabase", r)).toBe(true);
    expect(STAFF_ROLES.filter(canEdit)).toEqual(["admin", "editor"]);
    expect(STAFF_ROLES.filter(canManageMembers)).toEqual(["admin"]);
    expect(adminAllowed("unavailable", "admin")).toBe(false);
  });
  it("effective tier: guests have none, no row = Free, expired = Free, unknown value = Free", () => {
    expect(effectiveTier(false, { tier: "premium" })).toBeNull();
    expect(effectiveTier(true, null)).toBe("free");
    expect(effectiveTier(true, { tier: "plus" })).toBe("plus");
    expect(effectiveTier(true, { tier: "premium", valid_until: "2020-01-01T00:00:00Z" }, new Date("2026-11-28"))).toBe("free");
    expect(effectiveTier(true, { tier: "admin" })).toBe("free");
  });
  it("PO prices (USD) and annual savings 16.3% / 16.5%", () => {
    expect([PLANS.free.monthly, PLANS.plus.monthly, PLANS.plus.yearly, PLANS.premium.monthly, PLANS.premium.yearly]).toEqual([null, 1.99, 19.99, 3.99, 39.99]);
    expect(LOWEST_PAID_MONTHLY).toBe(1.99);
    expect([annualSavingsPct("free"), annualSavingsPct("plus"), annualSavingsPct("premium")]).toEqual([null, 16.3, 16.5]);
  });
  it("PO revenue projection: 10,000 users, 8% Plus, 3% Premium → MRR $2,789, ARR $33,468", () => {
    expect(projectRevenue(10000, 0.08, 0.03)).toEqual({ free: 8900, plus: 800, premium: 300, mrr: 2789, arr: 33468 });
  });
  it("limits: Free 20 / Plus 150 / Premium unlimited favourites; 5 / 30 / unlimited menu views; not enforced yet", () => {
    expect(LIMITS.favouritesPerExperience).toEqual({ free: 20, plus: 150, premium: Infinity });
    expect(LIMITS.menuViewsPerMonth).toEqual({ free: 5, plus: 30, premium: Infinity });
    expect(LIMITS_ENFORCED).toBe(false);
    expect(withinLimit("free", "favouritesPerExperience", 500)).toBe(true); // nobody is capped before paid plans exist
    expect(withinLimit("free", "favouritesPerExperience", 19, true)).toBe(true);
    expect(withinLimit("free", "favouritesPerExperience", 20, true)).toBe(false);
    expect(withinLimit(null, "menuViewsPerMonth", 5, true)).toBe(false); // guests = Free
    expect(withinLimit("plus", "favouritesPerExperience", 149, true)).toBe(true);
    expect(withinLimit("premium", "favouritesPerExperience", 1e6, true)).toBe(true);
  });
  it("benefits not built yet are never marked available", () => {
    const built = new Set(["favourites", "profiles", "passport", "allPlus"]);
    for (const t of TIERS) for (const b of BENEFITS[t]) expect(b.available, `${t}.${b.id}`).toBe(built.has(b.id));
  });
});

describe("quota parity: plans.ts ↔ migration 0014", () => {
  it("every LIMITS value matches the membership_limits seed", async () => {
    const { readFileSync } = await import("node:fs");
    const { DB_LIMIT_KEYS } = await import("@/lib/membership/plans");
    const sql = readFileSync("supabase/migrations/0014_membership_quotas.sql", "utf8");
    const seeded = new Map([...sql.matchAll(/\('(free|plus|premium)',\s*'(\w+)',\s*(\d+|null)\)/g)].map((m) => [`${m[1]}|${m[2]}`, m[3] === "null" ? Infinity : Number(m[3])]));
    expect(seeded.size).toBe(15);
    for (const [k, dbKey] of Object.entries(DB_LIMIT_KEYS)) for (const t of TIERS) expect(seeded.get(`${t}|${dbKey}`), `${t} ${dbKey}`).toBe(LIMITS[k as keyof typeof LIMITS][t]);
  });
});
