import { describe, expect, it } from "vitest";
import { adminAllowed, canEdit, canManageMembers, isStaffRole, STAFF_ROLES } from "@/lib/admin/access";
import { effectiveTier, entitlements, LOWEST_PAID_MONTHLY, PLANS, TIERS } from "@/lib/membership/plans";

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
  it("proposed USD prices; entitlements equal on every tier until paid benefits are defined", () => {
    expect([PLANS.free.monthly, PLANS.plus.monthly, PLANS.plus.yearly, PLANS.premium.monthly, PLANS.premium.yearly]).toEqual([null, 1.99, 19.99, 3.99, 39.99]);
    expect(LOWEST_PAID_MONTHLY).toBe(1.99);
    expect(entitlements("free")).toEqual(entitlements("premium"));
  });
});
