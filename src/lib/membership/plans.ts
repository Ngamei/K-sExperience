/**
 * Customer membership (KEX-SEC-02). A membership tier is an *entitlement*, never a permission:
 * nothing in this module grants staff access, and staff access (src/lib/admin/access.ts) never reads a tier.
 *
 * Prices are the Product Owner's proposed USD prices (D70, needs PO confirmation).
 * No live payments: there is no checkout. Tiers are assigned as test entitlements by an admin (user_memberships).
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
  free: { tier: "free", name: "Free", monthly: null, yearly: null },
  plus: { tier: "plus", name: "Plus", monthly: 1.99, yearly: 19.99 },
  premium: { tier: "premium", name: "Premium", monthly: 3.99, yearly: 39.99 },
};
/** Lowest paid monthly price, for the "Plans from …" teaser. */
export const LOWEST_PAID_MONTHLY = Math.min(...TIERS.map((t) => PLANS[t].monthly ?? Infinity));
export const usd = (n: number) => `$${n.toFixed(2)}`;

/**
 * Plan benefits. Today every feature that exists is available on every plan — paid benefits are not defined yet
 * (D71), so the comparison lists what all members get now and marks paid benefits "to be announced"
 * instead of inventing limits.
 */
export const CURRENT_FEATURES = ["discover", "passport", "saved", "sync"] as const;
export type Feature = (typeof CURRENT_FEATURES)[number];
export const entitlements = (tier: Tier): Record<Feature, boolean> => Object.fromEntries(CURRENT_FEATURES.map((f) => [f, isTier(tier)])) as Record<Feature, boolean>;

/** The tier shown for a viewer: guests have none; signed-in users without a row are Free. */
export const effectiveTier = (signedIn: boolean, row: { tier?: unknown; valid_until?: string | null } | null, now = new Date()): Tier | null => {
  if (!signedIn) return null;
  if (!row || !isTier(row.tier)) return "free";
  if (row.valid_until && new Date(row.valid_until) < now) return "free";
  return row.tier;
};
