/**
 * Customer membership (KEX-SEC-02 / KEX-MEM-01). A membership tier is an *entitlement*, never a permission:
 * nothing in this module grants staff access, and staff access (src/lib/admin/access.ts) never reads a tier.
 *
 * Prices and benefits: PO 2026-11-28 (D71, D72) — introductory pricing hypotheses in USD, to be validated
 * (willingness to pay, payment fees) before launch. No live payments: there is no checkout. Tiers are assigned as
 * test entitlements by an admin (user_memberships). Limits are defined here but NOT enforced (LIMITS_ENFORCED)
 * until paid plans can be bought — a Free member must never hit a cap they cannot upgrade past.
 */
export const TIERS = ["free", "plus", "premium"] as const;
export type Tier = (typeof TIERS)[number];
export const isTier = (x: unknown): x is Tier => typeof x === "string" && (TIERS as readonly string[]).includes(x);

export interface Plan {
  tier: Tier;
  name: string;
  /** USD; null = free. */
  monthly: number | null;
  yearly: number | null;
}
export const PLANS: Record<Tier, Plan> = {
  free: { tier: "free", name: "K's Free", monthly: null, yearly: null },
  plus: { tier: "plus", name: "K's Plus", monthly: 1.99, yearly: 19.99 },
  premium: { tier: "premium", name: "K's Premium", monthly: 3.99, yearly: 39.99 },
};
/** Membership is billed in USD (D74); establishment menu/service prices stay in VND. */
export const BILLING_CURRENCY = "USD";
/** Lowest paid monthly price, for the "Plans from …" teaser. */
export const LOWEST_PAID_MONTHLY = Math.min(...TIERS.map((t) => PLANS[t].monthly ?? Infinity));
export const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** Annual saving vs paying monthly for 12 months, in % (one decimal). Plus 16.3, Premium 16.5. */
export const annualSavingsPct = (tier: Tier): number | null => {
  const { monthly, yearly } = PLANS[tier];
  if (monthly === null || yearly === null) return null;
  return Math.round((1 - yearly / (monthly * 12)) * 1000) / 10;
};

/**
 * Usage limits (Infinity = unlimited), mirrored in the database (migration 0014 `membership_limits`; a unit test keeps
 * them in step). "Favourites" = saved references: unique saved items + saved places, counted per experience.
 */
export const LIMITS: Record<"favouritesPerExperience" | "collectionsPerExperience" | "menuViewsPerMonth" | "presetsPerExperience" | "savedLocations", Record<Tier, number>> = {
  favouritesPerExperience: { free: 20, plus: 150, premium: Infinity },
  collectionsPerExperience: { free: 2, plus: 10, premium: Infinity },
  menuViewsPerMonth: { free: 5, plus: 30, premium: Infinity },
  presetsPerExperience: { free: 3, plus: 10, premium: Infinity },
  savedLocations: { free: 2, plus: 10, premium: Infinity },
};
/** LIMITS key → membership_limits.limit_key. */
export const DB_LIMIT_KEYS = { favouritesPerExperience: "saved_references", collectionsPerExperience: "collections", menuViewsPerMonth: "menu_views", presetsPerExperience: "preference_presets", savedLocations: "saved_locations" } as const;
export type LimitKey = keyof typeof LIMITS;
/**
 * Off until paid plans are on sale (D72). The database has its own switch (membership_settings.enforce_limits, also
 * off); flip both only together with the client gate and a working upgrade path (KEX-MEM-04).
 */
export const LIMITS_ENFORCED = false;
/** Whether one more use is allowed. Guests (null) are treated as Free. Always true while limits are not enforced. */
export const withinLimit = (tier: Tier | null, key: LimitKey, used: number, enforced = LIMITS_ENFORCED) =>
  !enforced || used < LIMITS[key][tier ?? "free"];

/**
 * Plan benefits as shown on the Membership page. `available` = the feature exists in the app today;
 * otherwise it is listed as coming (never presented as working).
 */
export type BenefitId = "favourites" | "profiles" | "passport" | "menuViews" | "nutrition" | "advancedPrefs" | "menuPrices" | "priceCompare" | "allPlus";
export interface Benefit { id: BenefitId; available: boolean; value?: number }
export const BENEFITS: Record<Tier, Benefit[]> = {
  free: [
    { id: "favourites", available: true, value: LIMITS.favouritesPerExperience.free },
    { id: "profiles", available: true },
    { id: "passport", available: true },
    { id: "menuViews", available: false, value: LIMITS.menuViewsPerMonth.free },
  ],
  plus: [
    { id: "favourites", available: true, value: LIMITS.favouritesPerExperience.plus },
    { id: "nutrition", available: false },
    { id: "advancedPrefs", available: false },
    { id: "menuViews", available: false, value: LIMITS.menuViewsPerMonth.plus },
  ],
  premium: [
    { id: "favourites", available: true, value: Infinity },
    { id: "menuPrices", available: false },
    { id: "priceCompare", available: false },
    { id: "allPlus", available: true },
  ],
};

/** Hypothetical gross subscription revenue (monthly billing; excludes taxes, fees, churn, annual discounts). */
export function projectRevenue(users: number, plusRate: number, premiumRate: number) {
  const plus = Math.round(users * plusRate);
  const premium = Math.round(users * premiumRate);
  const mrr = Math.round((plus * PLANS.plus.monthly! + premium * PLANS.premium.monthly!) * 100) / 100;
  return { free: users - plus - premium, plus, premium, mrr, arr: Math.round(mrr * 12 * 100) / 100 };
}

/** Future B2B memberships (D75) — recorded only; not offered until there is an established customer base. */
export const B2B_PLANS: { name: string; monthly: number | null | "custom" }[] = [
  { name: "Business Free", monthly: null }, { name: "Business Plus", monthly: 9.99 }, { name: "Business Pro", monthly: 19.99 }, { name: "Business Enterprise", monthly: "custom" },
];

/** The tier shown for a viewer: guests have none; signed-in users without a row are Free. */
export const effectiveTier = (signedIn: boolean, row: { tier?: unknown; valid_until?: string | null } | null, now = new Date()): Tier | null => {
  if (!signedIn) return null;
  if (!row || !isTier(row.tier)) return "free";
  if (row.valid_until && new Date(row.valid_until) < now) return "free";
  return row.tier;
};
