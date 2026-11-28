import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FOUNDING_BENEFITS, FOUNDING_PROGRAMME, INFO_TYPES, infoState, LIMITS, LIMITS_ENFORCED, MENU_UNLOCK_POLICY, menuUnlockPeriodStart,
  menuUnlockState, TIERS, VIEWERS, VISIBILITY, viewerOf, DEFAULT_MEMBER_TIER, effectiveTier, foundingRefusalOf, foundingSectionVisible,
} from "@/lib/membership/plans";

const MIGRATION = readFileSync("supabase/migrations/0016_menu_unlocks.sql", "utf8");

describe("complete menu unlocks (one establishment per billing period)", () => {
  it("quota: Free 5 / Plus 30 / Premium unlimited; limits still unenforced", () => {
    expect(LIMITS.menuUnlocksPerMonth).toEqual({ free: 5, plus: 30, premium: Infinity });
    expect(LIMITS_ENFORCED).toBe(false);
  });
  it("billing period = calendar month in Ho Chi Minh City time (UTC+7)", () => {
    expect(MENU_UNLOCK_POLICY).toMatchObject({ scope: "establishment", period: "calendar-month", timeZone: "Asia/Ho_Chi_Minh" });
    expect(menuUnlockPeriodStart(new Date("2026-11-28T10:00:00Z"))).toBe("2026-11-01");
    // 30 Nov 17:30 UTC is already 1 Dec 00:30 in HCMC → the new period has started
    expect(menuUnlockPeriodStart(new Date("2026-11-30T17:30:00Z"))).toBe("2026-12-01");
    expect(menuUnlockPeriodStart(new Date("2026-11-30T16:59:00Z"))).toBe("2026-11-01");
    expect(MIGRATION).toContain("date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh')::date");
  });
  it("unlock state: open while unenforced; guest must sign in; reopening an unlocked menu needs no quota", () => {
    for (const t of [null, ...TIERS]) expect(menuUnlockState(t, { unlocked: false, used: 999 })).toBe("open");
    expect(menuUnlockState(null, { unlocked: false, used: 0 }, true)).toBe("sign-in");
    expect(menuUnlockState("free", { unlocked: false, used: 4 }, true)).toBe("unlockable");
    expect(menuUnlockState("free", { unlocked: false, used: 5 }, true)).toBe("exhausted");
    expect(menuUnlockState("free", { unlocked: true, used: 5 }, true)).toBe("open");
    expect(menuUnlockState("plus", { unlocked: false, used: 29 }, true)).toBe("unlockable");
    expect(menuUnlockState("plus", { unlocked: false, used: 30 }, true)).toBe("exhausted");
    expect(menuUnlockState("premium", { unlocked: false, used: 1e6 }, true)).toBe("open");
  });
});

describe("information visibility matrix", () => {
  it("covers every information type × viewer", () => {
    expect(VIEWERS).toEqual(["guest", "free", "plus", "premium"]);
    for (const t of INFO_TYPES) for (const v of VIEWERS) expect(VISIBILITY[t][v], `${t}.${v}`).toMatch(/^(full|limited|unlock|none)$/);
    expect(viewerOf(null)).toBe("guest");
    expect(viewerOf("plus")).toBe("plus");
  });
  it("public for everyone: name, address, phone, hours, item names, price range, preview prices, allergens", () => {
    for (const t of ["businessName", "address", "phone", "openingHours", "menuItemNames", "basicPriceRange", "previewPrices", "allergens"] as const)
      for (const v of VIEWERS) expect(VISIBILITY[t][v], `${t}.${v}`).toBe("full");
  });
  it("complete menu prices: guest none, Free/Plus per unlock, Premium full", () => {
    expect(VISIBILITY.completeMenuPrices).toEqual({ guest: "none", free: "unlock", plus: "unlock", premium: "full" });
  });
  it("calories + nutrition: Plus & Premium; advanced comparison: Plus limited, Premium full", () => {
    for (const t of ["calories", "nutritionBreakdown"] as const) expect(VISIBILITY[t]).toEqual({ guest: "none", free: "none", plus: "full", premium: "full" });
    expect(VISIBILITY.advancedPriceComparison).toEqual({ guest: "none", free: "none", plus: "limited", premium: "full" });
  });
  it("unavailable (no data) is never confused with restricted (plan does not include it)", () => {
    // no data → unavailable for everyone, enforced or not
    for (const t of [null, ...TIERS]) {
      expect(infoState("calories", t, { hasData: false })).toBe("unavailable");
      expect(infoState("calories", t, { hasData: false }, true)).toBe("unavailable");
    }
    // not enforced (today): everything we hold is available
    for (const type of INFO_TYPES) for (const t of [null, ...TIERS]) expect(infoState(type, t, { hasData: true })).toBe("available");
    // enforced
    expect(infoState("calories", "free", { hasData: true }, true)).toBe("restricted");
    expect(infoState("calories", "plus", { hasData: true }, true)).toBe("available");
    expect(infoState("allergens", null, { hasData: true }, true)).toBe("available");
    expect(infoState("completeMenuPrices", null, { hasData: true }, true)).toBe("restricted");
    expect(infoState("completeMenuPrices", "free", { hasData: true, unlocked: true, usedUnlocks: 5 }, true)).toBe("available");
    expect(infoState("completeMenuPrices", "free", { hasData: true, unlocked: false, usedUnlocks: 5 }, true)).toBe("restricted");
    expect(infoState("completeMenuPrices", "premium", { hasData: true }, true)).toBe("available");
    expect(infoState("advancedPriceComparison", "plus", { hasData: true }, true)).toBe("available");
    expect(infoState("advancedPriceComparison", "free", { hasData: true }, true)).toBe("restricted");
  });
});


describe("default member tier (Plus during development; PO switches it to Free later)", () => {
  const now = new Date("2026-11-28T12:00:00Z");
  it("plans.ts and migration 0016 membership_settings.default_tier agree", () => {
    expect(DEFAULT_MEMBER_TIER).toBe("plus");
    expect(/default_tier text not null default '(\w+)'/.exec(MIGRATION)![1]).toBe(DEFAULT_MEMBER_TIER);
  });
  it("no row → default tier; expired grant → default tier; guests have no tier", () => {
    expect(effectiveTier(true, null, now)).toBe("plus");
    expect(effectiveTier(true, { tier: "premium", valid_until: "2020-01-01T00:00:00Z" }, now)).toBe("plus");
    expect(effectiveTier(false, null, now)).toBeNull();
  });
  it("flipping the default to Free → Free", () => {
    expect(effectiveTier(true, null, now, "free")).toBe("free");
    expect(effectiveTier(true, { tier: "plus", valid_until: "2020-01-01T00:00:00Z" }, now, "free")).toBe("free");
  });
  it("founding / test / admin grants take precedence over the default", () => {
    expect(effectiveTier(true, { tier: "premium", valid_until: "2027-02-26T00:00:00Z" }, now)).toBe("premium");
    expect(effectiveTier(true, { tier: "free" }, now)).toBe("free"); // an explicit grant wins even when lower
  });
});

describe("Founding Member programme config ↔ migration 0016 (approved by the PO 2026-11-28)", () => {
  it("on, cap 100, 90 days, Premium, no automatic billing", () => {
    expect(FOUNDING_PROGRAMME).toEqual({ enabled: true, cap: 100, durationDays: 90, tier: "premium", autoBilling: false });
    expect(FOUNDING_BENEFITS).toEqual(["unlimitedSaved", "allMenuPrices", "nutrition", "earlyAccess", "feedbackChannel"]);
  });
  it("database defaults match plans.ts", () => {
    const table = /create table if not exists founding_programme \(([\s\S]*?)\n\);/.exec(MIGRATION)![1];
    expect(/enabled boolean not null default (true|false)/.exec(table)![1]).toBe(String(FOUNDING_PROGRAMME.enabled));
    expect(Number(/cap integer not null default (\d+)/.exec(table)![1])).toBe(FOUNDING_PROGRAMME.cap);
    expect(Number(/duration_days integer not null default (\d+)/.exec(table)![1])).toBe(FOUNDING_PROGRAMME.durationDays);
    expect(MIGRATION).toContain(`values (uid, '${FOUNDING_PROGRAMME.tier}', 'founding', until`);
    expect(MIGRATION).toContain("check (source in ('test', 'grant', 'billing', 'founding'))");
  });
  it("section shown by default; NEXT_PUBLIC_FOUNDING_PROGRAMME=0 hides it", () => {
    expect(foundingSectionVisible(undefined)).toBe(true);
    expect(foundingSectionVisible("1")).toBe(true);
    expect(foundingSectionVisible("0")).toBe(false);
  });
  it("refusal reasons are parsed from the RPC error", () => {
    expect(foundingRefusalOf("founding_refused:cap_reached")).toBe("cap_reached");
    expect(foundingRefusalOf("founding_refused:already_member")).toBe("already_member");
    expect(foundingRefusalOf("permission denied")).toBeNull();
    for (const r of ["disabled", "cap_reached", "already_claimed", "already_member"]) expect(MIGRATION).toContain(`founding_refused:${r}`);
  });
});
