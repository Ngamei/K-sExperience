/**
 * Experience registry — the single typed configuration for every K's Experience module.
 *
 * Principle: one discovery engine, six experiences. Every module reuses the same shell, navigation
 * positions, catalogue → detail → "where to find it in HCMC" → passport pattern, accounts and admin;
 * a module only supplies configuration (names, terminology, categories, filters, pricing units,
 * passport terms) plus specialised extensions. Vietnamese Food is the reference implementation.
 *
 * Only modules that are implemented AND enabled can be selected (see isSelectable). Feature flags can
 * never make an unfinished module look functional. See docs/EXPERIENCE_ENGINE.md.
 */
import type { DictKey } from "@/lib/i18n/dict";
import type { Locale } from "@/lib/i18n/dict";

export const EXPERIENCE_IDS = ["food", "bars", "coffee", "spa", "shopping", "sport"] as const;
export type ExperienceId = (typeof EXPERIENCE_IDS)[number];

/** Bilingual text (EN default, VI). */
export interface L { en: string; vi: string }
export const loc = (l: L, locale: Locale) => l[locale];

export type ExperienceStatus = "active" | "coming-soon" | "pilot-planned";

export interface NavItem { href: string; labelKey: DictKey; shortKey?: DictKey; icon: string; mobile?: boolean }

/** Navigation slots shared by every module — same positions, module-specific labels. */
export const NAV_SLOTS = ["map", "discover", "catalogue", "nearby", "passport", "saved"] as const;
export type NavSlot = (typeof NAV_SLOTS)[number];

export interface ExperienceModule {
  id: ExperienceId;
  /** Kept for existing callers (header chip, Settings). */
  labelKey: DictKey;
  name: L;
  status: ExperienceStatus;
  icon: string;
  /** true once the module's screens exist. Unimplemented modules are never selectable, whatever the flag says. */
  implemented: boolean;
  /** Env flag that must be "1" to enable an implemented, not-yet-active module (null = no flag needed). */
  featureFlag: string | null;
  /** Route prefix for the module's screens ("/" for Food; planned prefixes for the others). */
  basePath: string;
  /** Module-specific labels for the shared navigation slots. */
  navLabels: Record<NavSlot, L>;
  /** Terminology used by shared components (catalogue cards, establishment cards, passport). */
  terms: { item: L; items: L; establishment: L; establishments: L; findIn: L; completed: L; note: L };
  /** "vietnam-origins" = culinary origin map (Food only); "hcmc" = HCMC establishment map. */
  map: { layers: ("vietnam-origins" | "hcmc-establishments")[] };
  /** Planned top-level categories (structure only — no items are invented here). */
  categories: { id: string; name: L }[];
  /** Pilot sub-categories (Sport: Pickleball, Pilates). */
  pilots?: { id: string; name: L; offerings: L }[];
  /** Filter definition ids (shared ids where possible; specialised ones prefixed by module). */
  filters: string[];
  /** Price units an offering can be quoted in. */
  pricingUnits: ("item" | "drink" | "cup" | "session" | "hour" | "class" | "package" | "court-hour")[];
  passport: { name: L; summary: L };
  /** Rendered navigation (only the active module's is shown). */
  nav: NavItem[];
}

const FOOD_NAV: NavItem[] = [
  { href: "/", labelKey: "nav.map", shortKey: "nav.exploreShort", icon: "map", mobile: true },
  { href: "/discover", labelKey: "nav.discover", shortKey: "nav.discoverShort", icon: "compass", mobile: true },
  { href: "/catalogue", labelKey: "nav.catalogue", shortKey: "nav.catalogueShort", icon: "book", mobile: true },
  { href: "/nearby", labelKey: "nav.nearby", icon: "pin", mobile: true },
  { href: "/passport", labelKey: "nav.passport", shortKey: "nav.passportShort", icon: "stamp", mobile: true },
  { href: "/saved", labelKey: "nav.saved", icon: "bookmark" },
];

const SHARED_FILTERS = ["search", "category", "hcmc-area", "distance", "budget", "open-now", "verified-only"];
const nav = (map: L, catalogue: L, passport: L): Record<NavSlot, L> => ({
  map, discover: { en: "Discover", vi: "Khám phá" }, catalogue, nearby: { en: "Nearby", vi: "Gần đây" }, passport, saved: { en: "Saved", vi: "Đã lưu" },
});

export const EXPERIENCES: ExperienceModule[] = [
  {
    id: "food", labelKey: "exp.food", name: { en: "Vietnamese Food", vi: "Ẩm thực Việt Nam" }, status: "active", icon: "utensils",
    implemented: true, featureFlag: null, basePath: "/",
    navLabels: nav({ en: "Food Map", vi: "Bản đồ ẩm thực" }, { en: "Food Catalogue", vi: "Danh mục món ăn" }, { en: "Food Passport", vi: "Hộ chiếu ẩm thực" }),
    terms: {
      item: { en: "dish", vi: "món" }, items: { en: "dishes", vi: "món ăn" }, establishment: { en: "restaurant", vi: "quán" }, establishments: { en: "restaurants", vi: "quán ăn" },
      findIn: { en: "Where to eat it in Ho Chi Minh City", vi: "Ăn ở đâu tại TP.HCM" }, completed: { en: "Tried", vi: "Đã thử" }, note: { en: "Tasting note", vi: "Ghi chú nếm thử" },
    },
    map: { layers: ["vietnam-origins", "hcmc-establishments"] },
    categories: [{ id: "savory", name: { en: "Savory", vi: "Món mặn" } }, { id: "sweet", name: { en: "Sweet", vi: "Món ngọt" } }, { id: "snack", name: { en: "Snack", vi: "Ăn vặt" } }],
    filters: [...SHARED_FILTERS, "food:region", "food:province", "food:dish-type", "food:taste", "food:spice", "food:dietary", "food:meal-time"],
    pricingUnits: ["item"],
    passport: { name: { en: "Food Passport", vi: "Hộ chiếu ẩm thực" }, summary: { en: "Dishes tried · culinary regions", vi: "Món đã thử · vùng ẩm thực" } },
    nav: FOOD_NAV,
  },
  {
    id: "bars", labelKey: "exp.bars", name: { en: "Bars", vi: "Quán bar" }, status: "coming-soon", icon: "wine",
    implemented: false, featureFlag: "NEXT_PUBLIC_FEATURE_BARS", basePath: "/bars/",
    navLabels: nav({ en: "Bar Map", vi: "Bản đồ quán bar" }, { en: "Drinks Catalogue", vi: "Danh mục đồ uống" }, { en: "Bar Passport", vi: "Hộ chiếu quán bar" }),
    terms: {
      item: { en: "drink", vi: "đồ uống" }, items: { en: "drinks", vi: "đồ uống" }, establishment: { en: "bar", vi: "quán bar" }, establishments: { en: "bars", vi: "quán bar" },
      findIn: { en: "Where to drink it in Ho Chi Minh City", vi: "Uống ở đâu tại TP.HCM" }, completed: { en: "Tasted", vi: "Đã thử" }, note: { en: "Tasting note", vi: "Ghi chú nếm thử" },
    },
    map: { layers: ["hcmc-establishments"] },
    categories: [{ id: "cocktail", name: { en: "Cocktails", vi: "Cocktail" } }, { id: "beer", name: { en: "Beer", vi: "Bia" } }, { id: "wine", name: { en: "Wine", vi: "Rượu vang" } }, { id: "spirits", name: { en: "Spirits", vi: "Rượu mạnh" } }, { id: "zero-proof", name: { en: "Zero-proof", vi: "Không cồn" } }],
    filters: [...SHARED_FILTERS, "bars:drink-type", "bars:taste", "bars:alcohol-content", "bars:atmosphere"],
    pricingUnits: ["drink"],
    passport: { name: { en: "Bar Passport", vi: "Hộ chiếu quán bar" }, summary: { en: "Drinks tasted · bars visited", vi: "Đồ uống đã thử · quán đã ghé" } },
    nav: [],
  },
  {
    id: "coffee", labelKey: "exp.coffee", name: { en: "Coffee", vi: "Cà phê" }, status: "coming-soon", icon: "coffee",
    implemented: false, featureFlag: "NEXT_PUBLIC_FEATURE_COFFEE", basePath: "/coffee/",
    navLabels: nav({ en: "Café Map", vi: "Bản đồ cà phê" }, { en: "Coffee Catalogue", vi: "Danh mục cà phê" }, { en: "Coffee Passport", vi: "Hộ chiếu cà phê" }),
    terms: {
      item: { en: "coffee", vi: "món cà phê" }, items: { en: "coffees", vi: "món cà phê" }, establishment: { en: "café", vi: "quán cà phê" }, establishments: { en: "cafés", vi: "quán cà phê" },
      findIn: { en: "Where to try it in Ho Chi Minh City", vi: "Thưởng thức ở đâu tại TP.HCM" }, completed: { en: "Tried", vi: "Đã thử" }, note: { en: "Tasting note", vi: "Ghi chú nếm thử" },
    },
    map: { layers: ["hcmc-establishments"] },
    categories: [{ id: "vietnamese-coffee", name: { en: "Vietnamese coffee", vi: "Cà phê Việt" } }, { id: "espresso", name: { en: "Espresso-based", vi: "Pha máy" } }, { id: "tea", name: { en: "Tea", vi: "Trà" } }],
    filters: [...SHARED_FILTERS, "coffee:drink-type", "coffee:preparation", "coffee:work-friendly", "coffee:ambience"],
    pricingUnits: ["cup"],
    passport: { name: { en: "Coffee Passport", vi: "Hộ chiếu cà phê" }, summary: { en: "Coffees tried · cafés visited", vi: "Cà phê đã thử · quán đã ghé" } },
    nav: [],
  },
  {
    id: "spa", labelKey: "exp.spa", name: { en: "Spa", vi: "Spa & chăm sóc sức khỏe" }, status: "coming-soon", icon: "flower",
    implemented: false, featureFlag: "NEXT_PUBLIC_FEATURE_SPA", basePath: "/spa/",
    navLabels: nav({ en: "Spa Map", vi: "Bản đồ spa" }, { en: "Treatment Catalogue", vi: "Danh mục liệu trình" }, { en: "Wellness Passport", vi: "Hộ chiếu chăm sóc" }),
    terms: {
      item: { en: "treatment", vi: "liệu trình" }, items: { en: "treatments", vi: "liệu trình" }, establishment: { en: "spa", vi: "spa" }, establishments: { en: "spas", vi: "spa" },
      findIn: { en: "Where to experience it in Ho Chi Minh City", vi: "Trải nghiệm ở đâu tại TP.HCM" }, completed: { en: "Experienced", vi: "Đã trải nghiệm" }, note: { en: "Personal note", vi: "Ghi chú cá nhân" },
    },
    map: { layers: ["hcmc-establishments"] },
    categories: [{ id: "massage", name: { en: "Massage", vi: "Massage" } }, { id: "hair-wash", name: { en: "Hair wash & scalp care", vi: "Gội đầu dưỡng sinh" } }, { id: "facial", name: { en: "Facial", vi: "Chăm sóc da mặt" } }],
    filters: [...SHARED_FILTERS, "spa:treatment-type", "spa:duration", "spa:package"],
    pricingUnits: ["session", "package"],
    passport: { name: { en: "Wellness Passport", vi: "Hộ chiếu chăm sóc" }, summary: { en: "Treatments · spas visited", vi: "Liệu trình · spa đã ghé" } },
    nav: [],
  },
  {
    id: "shopping", labelKey: "exp.shopping", name: { en: "Shopping", vi: "Mua sắm" }, status: "coming-soon", icon: "bag",
    implemented: false, featureFlag: null, basePath: "/shopping/",
    navLabels: nav({ en: "Shopping Map", vi: "Bản đồ mua sắm" }, { en: "Shopping Catalogue", vi: "Danh mục mua sắm" }, { en: "Shopping Passport", vi: "Hộ chiếu mua sắm" }),
    terms: {
      item: { en: "product", vi: "sản phẩm" }, items: { en: "products", vi: "sản phẩm" }, establishment: { en: "store", vi: "cửa hàng" }, establishments: { en: "stores", vi: "cửa hàng" },
      findIn: { en: "Where to find it in Ho Chi Minh City", vi: "Tìm ở đâu tại TP.HCM" }, completed: { en: "Discovered", vi: "Đã khám phá" }, note: { en: "Personal note", vi: "Ghi chú cá nhân" },
    },
    map: { layers: ["hcmc-establishments"] },
    categories: [],
    filters: SHARED_FILTERS,
    pricingUnits: ["item"],
    passport: { name: { en: "Shopping Passport", vi: "Hộ chiếu mua sắm" }, summary: { en: "Stores discovered", vi: "Cửa hàng đã khám phá" } },
    nav: [],
  },
  {
    id: "sport", labelKey: "exp.sport", name: { en: "Sport", vi: "Thể thao" }, status: "pilot-planned", icon: "activity",
    implemented: false, featureFlag: "NEXT_PUBLIC_FEATURE_SPORT", basePath: "/sport/",
    navLabels: nav({ en: "Sport Map", vi: "Bản đồ thể thao" }, { en: "Activity Catalogue", vi: "Danh mục hoạt động" }, { en: "Sport Passport", vi: "Hộ chiếu thể thao" }),
    terms: {
      item: { en: "activity", vi: "hoạt động" }, items: { en: "activities", vi: "hoạt động" }, establishment: { en: "studio or court", vi: "phòng tập hoặc sân" }, establishments: { en: "studios and courts", vi: "phòng tập và sân" },
      findIn: { en: "Where to practise it in Ho Chi Minh City", vi: "Tập ở đâu tại TP.HCM" }, completed: { en: "Attended", vi: "Đã tham gia" }, note: { en: "Training note", vi: "Ghi chú tập luyện" },
    },
    map: { layers: ["hcmc-establishments"] },
    categories: [{ id: "pickleball", name: { en: "Pickleball", vi: "Pickleball" } }, { id: "pilates", name: { en: "Pilates", vi: "Pilates" } }],
    pilots: [
      { id: "pickleball", name: { en: "Pickleball", vi: "Pickleball" }, offerings: { en: "Courts · Coaching · Social games · Equipment rental", vi: "Sân · Huấn luyện · Giao lưu · Thuê dụng cụ" } },
      { id: "pilates", name: { en: "Pilates", vi: "Pilates" }, offerings: { en: "Studios · Instructors · Classes · Trial sessions", vi: "Studio · Huấn luyện viên · Lớp học · Buổi tập thử" } },
    ],
    filters: [
      ...SHARED_FILTERS, "sport:type", "sport:level", "sport:trial", "sport:private-or-group", "sport:facilities", "sport:instructor-language", "sport:instructor-certification",
      "pickleball:equipment-rental", "pickleball:indoor-outdoor", "pickleball:court-surface", "pickleball:court-availability",
      "pilates:reformer", "pilates:mat", "pilates:cadillac-chair-barrel", "pilates:class-size",
    ],
    pricingUnits: ["session", "class", "package", "court-hour"],
    passport: { name: { en: "Sport Passport", vi: "Hộ chiếu thể thao" }, summary: { en: "Sports tried · studios & courts", vi: "Môn đã thử · phòng tập & sân" } },
    nav: [],
  },
];

/** Reads a public feature flag (only NEXT_PUBLIC_* flags reach the browser). */
function flagOn(name: string | null): boolean {
  if (!name) return false;
  const v: Record<string, string | undefined> = {
    NEXT_PUBLIC_FEATURE_BARS: process.env.NEXT_PUBLIC_FEATURE_BARS,
    NEXT_PUBLIC_FEATURE_COFFEE: process.env.NEXT_PUBLIC_FEATURE_COFFEE,
    NEXT_PUBLIC_FEATURE_SPA: process.env.NEXT_PUBLIC_FEATURE_SPA,
    NEXT_PUBLIC_FEATURE_SPORT: process.env.NEXT_PUBLIC_FEATURE_SPORT,
  };
  return v[name] === "1";
}

/** A module can be chosen only when it is implemented and either active or switched on by its flag. */
export const isSelectable = (e: ExperienceModule, flags: (name: string | null) => boolean = flagOn) =>
  e.implemented && (e.status === "active" || flags(e.featureFlag));

/** The module to render: falls back to Food if the stored id is unknown or not selectable. */
export const getExperience = (id: ExperienceId | string) => {
  const e = EXPERIENCES.find((x) => x.id === id);
  return e && isSelectable(e) ? e : EXPERIENCES[0];
};
