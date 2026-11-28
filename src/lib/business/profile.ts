/**
 * Business Profile Engine (KEX-BIZ-02, PO design catalogue 28 Nov 2026).
 * One profile model + one set of components render every business type; the type only changes the theme
 * (via the experience), the offering section title, the illustration and the type label. No per-type page architecture.
 *
 * Data rules: unknown values are shown as unknown (never guessed); contact details and basic price range are free;
 * sources and last-checked dates accompany published facts; all profiles are platform-managed until merchant claiming exists.
 */
import type { ExperienceId } from "@/experiences/registry";
import type { AvailabilityStatus, OpeningHours } from "@/lib/data/schema";
import { LIMITS_ENFORCED, menuUnlockState, type Tier } from "@/lib/membership/plans";

type L = { en: string; vi: string };
export const BUSINESS_TYPES = ["restaurant", "cafe", "bar", "nail-salon", "spa", "head-spa", "pilates", "pickleball", "boutique"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export interface BusinessTypeDef {
  id: BusinessType;
  experience: ExperienceId;
  label: L;
  offeringsTitle: L;
  /** Illustration key for HeroMedia (schematic placeholder, never presented as the venue). */
  art: "plate" | "cups" | "glass" | "nails" | "massage" | "pilates" | "court" | "bags";
  /** Future scope: rendered but not activated (Shopping). */
  future?: boolean;
  /** Default header image (PO-supplied, illustrative — never this venue) when the venue has no photo of its own. */
  defaultImage?: string;
}
export const BUSINESS_TYPE_DEFS: Record<BusinessType, BusinessTypeDef> = {
  restaurant: { id: "restaurant", experience: "food", label: { en: "Vietnamese restaurant", vi: "Quán ăn Việt" }, offeringsTitle: { en: "Menu", vi: "Thực đơn" }, defaultImage: "/images/business-defaults/restaurant.webp", art: "plate" },
  cafe: { id: "cafe", experience: "coffee", label: { en: "Café", vi: "Quán cà phê" }, offeringsTitle: { en: "Drinks & food", vi: "Đồ uống & món ăn" }, defaultImage: "/images/business-defaults/cafe.webp", art: "cups" },
  bar: { id: "bar", experience: "bars", label: { en: "Bar & craft beer", vi: "Quán bar & bia thủ công" }, offeringsTitle: { en: "Drinks menu", vi: "Thực đơn đồ uống" }, defaultImage: "/images/business-defaults/bar.webp", art: "glass" },
  "nail-salon": { id: "nail-salon", experience: "spa", label: { en: "Nail salon", vi: "Tiệm nail" }, offeringsTitle: { en: "Services & portfolio", vi: "Dịch vụ & mẫu" }, defaultImage: "/images/business-defaults/nail-salon.webp", art: "nails" },
  spa: { id: "spa", experience: "spa", label: { en: "Spa & massage", vi: "Spa & massage" }, offeringsTitle: { en: "Treatment menu", vi: "Liệu trình" }, defaultImage: "/images/business-defaults/spa.webp", art: "massage" },
  "head-spa": { id: "head-spa", experience: "spa", label: { en: "Head spa · gội đầu dưỡng sinh", vi: "Gội đầu dưỡng sinh" }, offeringsTitle: { en: "Service menu", vi: "Dịch vụ" }, defaultImage: "/images/business-defaults/head-spa.webp", art: "massage" },
  pilates: { id: "pilates", experience: "sport", label: { en: "Pilates studio", vi: "Studio Pilates" }, offeringsTitle: { en: "Classes & memberships", vi: "Lớp học & gói tập" }, defaultImage: "/images/business-defaults/pilates.webp", art: "pilates" },
  pickleball: { id: "pickleball", experience: "sport", label: { en: "Pickleball venue", vi: "Sân pickleball" }, offeringsTitle: { en: "Courts & services", vi: "Sân & dịch vụ" }, defaultImage: "/images/business-defaults/pickleball.webp", art: "court" },
  boutique: { id: "boutique", experience: "shopping", label: { en: "Boutique", vi: "Cửa hàng" }, offeringsTitle: { en: "Product catalogue", vi: "Danh mục sản phẩm" }, defaultImage: "/images/business-defaults/boutique.webp", art: "bags", future: true },
};

/**
 * The business type of an establishment, from its experience, venue type and what it offers (category ids).
 * Deterministic; falls back to the experience's general type.
 */
export function businessTypeOf(experience: ExperienceId, venueType: string, categories: string[]): BusinessType {
  const v = venueType.toLowerCase();
  const only = (c: string) => categories.length > 0 && categories.every((x) => x === c);
  switch (experience) {
    case "food": return "restaurant";
    case "coffee": return "cafe";
    case "bars": return "bar";
    case "shopping": return "boutique";
    case "sport": return v.includes("pilates") || only("pilates") ? "pilates" : "pickleball";
    case "spa":
      if (v.includes("nail") || only("nails")) return "nail-salon";
      if (v.includes("hair") || v.includes("head") || only("head-spa")) return "head-spa";
      return "spa";
  }
}

/** One row of the offering list (dish, drink, treatment, class, court…). */
export interface ProfileOffering {
  id: string;
  name: string;
  /** Secondary line: translation, size/duration/format — only from recorded data. */
  detail?: string;
  href?: string;
  /** Recorded price in VND (never estimated). */
  priceVnd?: { min: number; max: number };
  priceUnit?: string;
  status: AvailabilityStatus;
  evidence?: { note: string; url?: string };
  lastVerified?: string;
}

export interface BusinessProfileModel {
  id: string;
  type: BusinessType;
  name: string;
  /** Neighbourhood / area. */
  area?: string;
  address: string;
  chips: string[];
  /** Basic price range (free information). */
  priceRange?: string;
  phone?: string;
  website?: string;
  social?: string;
  hours?: OpeningHours;
  mapsUrl: string;
  /** Published ordering / booking links (delivery apps, booking pages). */
  links?: { label: string; url: string }[];
  precision?: "exact" | "building" | "street";
  isSample: boolean;
  closure?: { status: "temporarily-closed" | "permanently-closed"; reportedOn: string };
  sources: { title: string; url?: string; note?: string }[];
  lastVerified?: string;
  offerings: ProfileOffering[];
  /** All profiles are platform-managed today (merchant claiming is future scope). */
  management: "platform";
}

export const formatVnd = (p: { min: number; max: number }) =>
  p.min === p.max ? `${p.min.toLocaleString("vi-VN")}₫` : `${p.min.toLocaleString("vi-VN")}–${p.max.toLocaleString("vi-VN")}₫`;

/**
 * Complete-menu price access (PriceEntitlement), on the menu unlock model (plans.ts MENU_UNLOCK_POLICY): one unlock
 * opens one establishment's complete menu prices for the billing period. Centralised so the rule changes in one place.
 * While limits are not enforced (D72/D76) every viewer sees every recorded price. When enforced: Premium sees all;
 * Free/Plus see the prices of a menu they unlocked this period, or may unlock while quota remains (recorded only by the
 * `unlock_menu` RPC, migration 0016 — prices must then leave the public payload); guests see none (sign in first).
 * Public preview prices and the basic price range are not governed by this (VISIBILITY: everyone).
 */
export function priceAccess(tier: Tier | null, opts: { unlocked: boolean; usedUnlocks: number }, enforced = LIMITS_ENFORCED): "full" | "unlockable" | "locked" {
  const s = menuUnlockState(tier, { unlocked: opts.unlocked, used: opts.usedUnlocks }, enforced);
  return s === "open" ? "full" : s === "unlockable" ? "unlockable" : "locked";
}
