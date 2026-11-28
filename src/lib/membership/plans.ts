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
export const LIMITS: Record<"favouritesPerExperience" | "collectionsPerExperience" | "menuUnlocksPerMonth" | "presetsPerExperience" | "savedLocations", Record<Tier, number>> = {
  favouritesPerExperience: { free: 20, plus: 150, premium: Infinity },
  collectionsPerExperience: { free: 2, plus: 10, premium: Infinity },
  menuUnlocksPerMonth: { free: 5, plus: 30, premium: Infinity },
  presetsPerExperience: { free: 3, plus: 10, premium: Infinity },
  savedLocations: { free: 2, plus: 10, premium: Infinity },
};
/** LIMITS key → membership_limits.limit_key. */
export const DB_LIMIT_KEYS = { favouritesPerExperience: "saved_references", collectionsPerExperience: "collections", menuUnlocksPerMonth: "menu_unlocks", presetsPerExperience: "preference_presets", savedLocations: "saved_locations" } as const;
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
export type BenefitId = "favourites" | "profiles" | "passport" | "menuUnlocks" | "nutrition" | "advancedPrefs" | "menuPrices" | "priceCompare" | "allPlus";
export interface Benefit { id: BenefitId; available: boolean; value?: number }
export const BENEFITS: Record<Tier, Benefit[]> = {
  free: [
    { id: "favourites", available: true, value: LIMITS.favouritesPerExperience.free },
    { id: "profiles", available: true },
    { id: "passport", available: true },
    { id: "menuUnlocks", available: false, value: LIMITS.menuUnlocksPerMonth.free },
  ],
  plus: [
    { id: "favourites", available: true, value: LIMITS.favouritesPerExperience.plus },
    { id: "nutrition", available: false },
    { id: "advancedPrefs", available: false },
    { id: "menuUnlocks", available: false, value: LIMITS.menuUnlocksPerMonth.plus },
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

/**
 * Default tier for a signed-in member without an active membership row (no row, or an expired one).
 * PO 2026-11-28: Plus while the product is in development; the PO will switch it back to "free" when development is
 * done. One switch, mirrored in the database (migration 0016 membership_settings.default_tier, used by member_tier()
 * and therefore every quota lookup; a unit test keeps the defaults in step). Founding / test / admin grants (an
 * active user_memberships row) always take precedence. Guests have no tier (public information = Free).
 */
export const DEFAULT_MEMBER_TIER: Tier = "plus";

/** The tier shown for a viewer: guests have none; signed-in users without an active, valid row get the default tier. */
export const effectiveTier = (signedIn: boolean, row: { tier?: unknown; valid_until?: string | null } | null, now = new Date(), defaultTier: Tier = DEFAULT_MEMBER_TIER): Tier | null => {
  if (!signedIn) return null;
  if (!row || !isTier(row.tier)) return defaultTier;
  if (row.valid_until && new Date(row.valid_until) < now) return defaultTier;
  return row.tier;
};

/**
 * Complete menu unlocks (PO 2026-11-28). One unlock = access to ONE establishment's complete available menu prices for
 * the current billing period; reopening a menu already unlocked in that period never consumes quota.
 * Free 5 / Plus 30 / Premium unlimited per period (LIMITS.menuUnlocksPerMonth ↔ membership_limits `menu_unlocks`).
 * Until billing exists the period is the calendar month in Ho Chi Minh City time (DB: menu_unlock_period_start(),
 * migration 0016); later it follows the subscription period. Unlocks are recorded only by the `unlock_menu` RPC.
 */
export const MENU_UNLOCK_POLICY = { scope: "establishment", period: "calendar-month", timeZone: "Asia/Ho_Chi_Minh", futurePeriod: "subscription-period" } as const;
/** Start of the current billing period (YYYY-MM-01, Ho Chi Minh City calendar month), same rule as the database. */
export function menuUnlockPeriodStart(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: MENU_UNLOCK_POLICY.timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-01`;
}
/**
 * State of one establishment's complete menu for a viewer. Guests cannot unlock (they sign in first).
 * `open` = everything shown (limits not enforced, unlimited plan, or already unlocked this period).
 */
export type MenuUnlockState = "open" | "unlockable" | "exhausted" | "sign-in";
export function menuUnlockState(tier: Tier | null, opts: { unlocked: boolean; used: number }, enforced = LIMITS_ENFORCED): MenuUnlockState {
  if (!enforced) return "open";
  if (tier === null) return "sign-in";
  if (LIMITS.menuUnlocksPerMonth[tier] === Infinity || opts.unlocked) return "open";
  return opts.used < LIMITS.menuUnlocksPerMonth[tier] ? "unlockable" : "exhausted";
}

/**
 * Information visibility matrix (PO 2026-11-28): which information each viewer's plan includes, as data.
 *  full = included · limited = included in a reduced form · unlock = included per complete menu unlock (quota) ·
 *  none = not included. This says what a plan *includes*; whether we hold the data is separate (see infoState).
 */
export const VIEWERS = ["guest", "free", "plus", "premium"] as const;
export type Viewer = (typeof VIEWERS)[number];
export const viewerOf = (tier: Tier | null): Viewer => tier ?? "guest";
export const INFO_TYPES = [
  "businessName", "address", "phone", "openingHours", "menuItemNames", "basicPriceRange", "previewPrices", "allergens",
  "completeMenuPrices", "calories", "nutritionBreakdown", "advancedPriceComparison",
] as const;
export type InfoType = (typeof INFO_TYPES)[number];
export type Visibility = "full" | "limited" | "unlock" | "none";
const EVERYONE: Record<Viewer, Visibility> = { guest: "full", free: "full", plus: "full", premium: "full" };
const PLUS_UP: Record<Viewer, Visibility> = { guest: "none", free: "none", plus: "full", premium: "full" };
export const VISIBILITY: Record<InfoType, Record<Viewer, Visibility>> = {
  businessName: EVERYONE, address: EVERYONE, phone: EVERYONE, openingHours: EVERYONE, menuItemNames: EVERYONE,
  basicPriceRange: EVERYONE, previewPrices: EVERYONE, allergens: EVERYONE,
  completeMenuPrices: { guest: "none", free: "unlock", plus: "unlock", premium: "full" },
  calories: PLUS_UP, nutritionBreakdown: PLUS_UP,
  advancedPriceComparison: { guest: "none", free: "none", plus: "limited", premium: "full" },
};
/**
 * What a viewer sees for one piece of information:
 *  unavailable = we hold no data (shown as such, never as restricted, never guessed) ·
 *  restricted = the data exists but the viewer's plan does not include it (or no unlock left this period) ·
 *  available = shown. While limits are not enforced, everything we hold is available to everyone.
 */
export type InfoState = "available" | "restricted" | "unavailable";
export function infoState(type: InfoType, tier: Tier | null, opts: { hasData: boolean; unlocked?: boolean; usedUnlocks?: number }, enforced = LIMITS_ENFORCED): InfoState {
  if (!opts.hasData) return "unavailable";
  if (!enforced) return "available";
  const v = VISIBILITY[type][viewerOf(tier)];
  if (v === "full" || v === "limited") return "available";
  if (v === "none") return "restricted";
  return menuUnlockState(tier, { unlocked: !!opts.unlocked, used: opts.usedUnlocks ?? 0 }, enforced) === "open" ? "available" : "restricted";
}

/**
 * K's Founding Member — early access programme (approved by the PO 2026-11-28; on by default, admins can switch it off).
 * Complimentary Premium for `durationDays` to the first `cap` members who claim it. No automatic billing afterwards:
 * at valid_until the membership simply reverts to the default member tier. Mirrors migration 0016 `founding_programme`
 * defaults (unit-tested). The database switch (founding_programme.enabled) gates claims; the public switch
 * (NEXT_PUBLIC_FOUNDING_PROGRAMME=0) only hides the section.
 */
export const FOUNDING_PROGRAMME = { enabled: true, cap: 100, durationDays: 90, tier: "premium", autoBilling: false } as const satisfies { tier: Tier } & Record<string, unknown>;
export const FOUNDING_BENEFITS = ["unlimitedSaved", "allMenuPrices", "nutrition", "earlyAccess", "feedbackChannel"] as const;
export type FoundingBenefit = (typeof FOUNDING_BENEFITS)[number];
/** Refusal reasons raised by claim_founding_membership() as 'founding_refused:<reason>'. */
export const FOUNDING_REFUSALS = ["disabled", "cap_reached", "already_claimed", "already_member"] as const;
export type FoundingRefusal = (typeof FOUNDING_REFUSALS)[number];
export const foundingRefusalOf = (message: string): FoundingRefusal | null => {
  const r = /founding_refused:(\w+)/.exec(message)?.[1];
  return (FOUNDING_REFUSALS as readonly string[]).includes(r ?? "") ? (r as FoundingRefusal) : null;
};
/** Whether the Founding Member section is shown: on unless NEXT_PUBLIC_FOUNDING_PROGRAMME=0. Display only. */
export const foundingSectionVisible = (flag = process.env.NEXT_PUBLIC_FOUNDING_PROGRAMME) => FOUNDING_PROGRAMME.enabled && flag !== "0";
