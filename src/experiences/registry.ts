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


/** Navigation slots shared by every module — same positions, module-specific labels. */
export const NAV_SLOTS = ["map", "discover", "catalogue", "nearby", "passport", "saved"] as const;
export type NavSlot = (typeof NAV_SLOTS)[number];

/** A module-specific attribute shown on cards, detail pages and filters (values live on items/offerings). */
export interface AttributeDef { id: string; label: L; kind: "text" | "list" | "number" | "boolean"; unit?: L }

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
  /** Module-specific labels for the shared navigation slots (and short labels for the mobile tab bar). */
  navLabels: Record<NavSlot, L>;
  navShort: Partial<Record<NavSlot, L>>;
  /** Routes of the shared slots. Food keeps its historical URLs; other modules live under basePath. */
  routes: Record<NavSlot, string> & { item: string; establishment: string };
  /** Item fields the shared search matches (accent-insensitive). */
  searchable: ("nameVi" | "nameEn" | "altNames" | "description" | `attr:${string}`)[];
  /** Module attributes (definitions; values live on items). */
  attributes: AttributeDef[];
  /** Catalogue configuration: attributes shown on cards, sort options. */
  catalogue: { cardAttributes: string[]; sorts: ("name" | "availability")[] };
  /** Detail-page sections, in order. "offerings" = the shared "where to find it in HCMC" block. */
  detailSections: { id: string; title: L; attributes?: string[] }[];
  /** What establishments offer in this module. */
  offerings: L[];
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
}

/** A rendered navigation entry (built from the shared slots — same positions in every module). */
export interface NavItem { slot: NavSlot; href: string; label: L; short: L; icon: string; mobile: boolean }
const SLOT_ICON: Record<NavSlot, string> = { map: "map", discover: "compass", catalogue: "book", nearby: "pin", passport: "stamp", saved: "bookmark" };

/** The module's navigation: shared slots and icons, module labels and routes. Saved stays shared. */
export const navFor = (m: ExperienceModule): NavItem[] =>
  NAV_SLOTS.map((slot) => ({
    slot, href: m.routes[slot], label: m.navLabels[slot], short: m.navShort[slot] ?? m.navLabels[slot], icon: SLOT_ICON[slot], mobile: slot !== "saved",
  }));


const routesFor = (base: string) => ({
  map: base, discover: `${base}discover/`, catalogue: `${base}catalogue/`, nearby: `${base}nearby/`, passport: `${base}passport/`,
  saved: "/saved/", item: `${base}item/`, establishment: `${base}nearby/`,
});
const SHORT = { map: { en: "Map", vi: "Bản đồ" }, catalogue: { en: "Catalogue", vi: "Danh mục" }, passport: { en: "Passport", vi: "Hộ chiếu" } };
const OFFERINGS_SECTION = (title: L) => ({ id: "offerings", title });

const SHARED_FILTERS = ["search", "category", "hcmc-area", "distance", "budget", "open-now", "verified-only"];
const nav = (map: L, catalogue: L, passport: L): Record<NavSlot, L> => ({
  map, discover: { en: "Discover", vi: "Khám phá" }, catalogue, nearby: { en: "Nearby", vi: "Gần đây" }, passport, saved: { en: "Saved", vi: "Đã lưu" },
});

export const EXPERIENCES: ExperienceModule[] = [
  {
    id: "food", labelKey: "exp.food", name: { en: "Vietnamese Food", vi: "Ẩm thực Việt Nam" }, status: "active", icon: "utensils",
    implemented: true, featureFlag: null, basePath: "/",
    navLabels: nav({ en: "Food Map", vi: "Bản đồ ẩm thực" }, { en: "Food Catalogue", vi: "Danh mục món ăn" }, { en: "Food Passport", vi: "Hộ chiếu ẩm thực" }),
    navShort: { map: { en: "Explore", vi: "Bản đồ" }, catalogue: { en: "Catalogue", vi: "Món ăn" }, passport: SHORT.passport },
    routes: { map: "/", discover: "/discover/", catalogue: "/catalogue/", nearby: "/nearby/", passport: "/passport/", saved: "/saved/", item: "/dishes/", establishment: "/places/" },
    searchable: ["nameVi", "nameEn", "altNames", "attr:ingredients"],
    attributes: [
      { id: "ingredients", label: { en: "Ingredients", vi: "Nguyên liệu" }, kind: "list" },
      { id: "taste", label: { en: "Taste", vi: "Hương vị" }, kind: "list" },
      { id: "spice", label: { en: "Spice", vi: "Độ cay" }, kind: "number" },
      { id: "dietary", label: { en: "Dietary", vi: "Chế độ ăn" }, kind: "list" },
      { id: "origin", label: { en: "Origin", vi: "Xuất xứ" }, kind: "text" },
    ],
    catalogue: { cardAttributes: ["origin"], sorts: ["name", "availability"] },
    detailSections: [
      { id: "origin", title: { en: "Origin", vi: "Xuất xứ" }, attributes: ["origin"] },
      { id: "profile", title: { en: "Ingredients & taste", vi: "Nguyên liệu & hương vị" }, attributes: ["ingredients", "taste", "spice", "dietary"] },
      OFFERINGS_SECTION({ en: "Where to eat it in Ho Chi Minh City", vi: "Ăn ở đâu tại TP.HCM" }),
    ],
    offerings: [{ en: "Dishes served", vi: "Món phục vụ" }],
    terms: {
      item: { en: "dish", vi: "món" }, items: { en: "dishes", vi: "món ăn" }, establishment: { en: "restaurant", vi: "quán" }, establishments: { en: "restaurants", vi: "quán ăn" },
      findIn: { en: "Where to eat it in Ho Chi Minh City", vi: "Ăn ở đâu tại TP.HCM" }, completed: { en: "Tried", vi: "Đã thử" }, note: { en: "Tasting note", vi: "Ghi chú nếm thử" },
    },
    map: { layers: ["vietnam-origins", "hcmc-establishments"] },
    categories: [{ id: "savory", name: { en: "Savory", vi: "Món mặn" } }, { id: "sweet", name: { en: "Sweet", vi: "Món ngọt" } }, { id: "snack", name: { en: "Snack", vi: "Ăn vặt" } }],
    filters: [...SHARED_FILTERS, "food:region", "food:province", "food:dish-type", "food:taste", "food:spice", "food:dietary", "food:meal-time"],
    pricingUnits: ["item"],
    passport: { name: { en: "Food Passport", vi: "Hộ chiếu ẩm thực" }, summary: { en: "Dishes tried · culinary regions", vi: "Món đã thử · vùng ẩm thực" } },
  },
  {
    id: "bars", labelKey: "exp.bars", name: { en: "Bars", vi: "Quán bar" }, status: "coming-soon", icon: "wine",
    implemented: false, featureFlag: "NEXT_PUBLIC_FEATURE_BARS", basePath: "/bars/",
    navLabels: nav({ en: "Bar Map", vi: "Bản đồ quán bar" }, { en: "Drinks Catalogue", vi: "Danh mục đồ uống" }, { en: "Bar Passport", vi: "Hộ chiếu quán bar" }),
    navShort: SHORT,
    routes: routesFor("/bars/"),
    searchable: ["nameVi", "nameEn", "altNames", "attr:ingredients"],
    attributes: [
      { id: "ingredients", label: { en: "Ingredients", vi: "Thành phần" }, kind: "list" },
      { id: "taste", label: { en: "Taste", vi: "Hương vị" }, kind: "list" },
      { id: "abv", label: { en: "Alcohol content", vi: "Nồng độ cồn" }, kind: "number", unit: { en: "% ABV", vi: "% cồn" } },
      { id: "atmosphere", label: { en: "Atmosphere", vi: "Không khí" }, kind: "list" },
    ],
    catalogue: { cardAttributes: ["taste", "abv"], sorts: ["name", "availability"] },
    detailSections: [
      { id: "profile", title: { en: "Ingredients & taste", vi: "Thành phần & hương vị" }, attributes: ["ingredients", "taste", "abv"] },
      OFFERINGS_SECTION({ en: "Where to drink it in Ho Chi Minh City", vi: "Uống ở đâu tại TP.HCM" }),
    ],
    offerings: [{ en: "Drinks", vi: "Đồ uống" }],
    terms: {
      item: { en: "drink", vi: "đồ uống" }, items: { en: "drinks", vi: "đồ uống" }, establishment: { en: "bar", vi: "quán bar" }, establishments: { en: "bars", vi: "quán bar" },
      findIn: { en: "Where to drink it in Ho Chi Minh City", vi: "Uống ở đâu tại TP.HCM" }, completed: { en: "Tasted", vi: "Đã thử" }, note: { en: "Tasting note", vi: "Ghi chú nếm thử" },
    },
    map: { layers: ["hcmc-establishments"] },
    categories: [{ id: "cocktail", name: { en: "Cocktails", vi: "Cocktail" } }, { id: "beer", name: { en: "Beer", vi: "Bia" } }, { id: "wine", name: { en: "Wine", vi: "Rượu vang" } }, { id: "spirits", name: { en: "Spirits", vi: "Rượu mạnh" } }, { id: "zero-proof", name: { en: "Zero-proof", vi: "Không cồn" } }],
    filters: [...SHARED_FILTERS, "bars:drink-type", "bars:taste", "bars:alcohol-content", "bars:atmosphere"],
    pricingUnits: ["drink"],
    passport: { name: { en: "Bar Passport", vi: "Hộ chiếu quán bar" }, summary: { en: "Drinks tasted · bars visited", vi: "Đồ uống đã thử · quán đã ghé" } },
  },
  {
    id: "coffee", labelKey: "exp.coffee", name: { en: "Coffee", vi: "Cà phê" }, status: "coming-soon", icon: "coffee",
    // Reference pilot of the shared engine: screens exist; selectable only with NEXT_PUBLIC_FEATURE_COFFEE=1.
    implemented: true, featureFlag: "NEXT_PUBLIC_FEATURE_COFFEE", basePath: "/coffee/",
    navLabels: nav({ en: "Café Map", vi: "Bản đồ cà phê" }, { en: "Coffee Catalogue", vi: "Danh mục cà phê" }, { en: "Coffee Passport", vi: "Hộ chiếu cà phê" }),
    navShort: SHORT,
    routes: routesFor("/coffee/"),
    searchable: ["nameVi", "nameEn", "altNames", "attr:preparation"],
    attributes: [
      { id: "coffeeType", label: { en: "Coffee type", vi: "Loại cà phê" }, kind: "text" },
      { id: "flavour", label: { en: "Flavour", vi: "Hương vị" }, kind: "list" },
      { id: "preparation", label: { en: "Preparation", vi: "Cách pha" }, kind: "text" },
      { id: "served", label: { en: "Served", vi: "Phục vụ" }, kind: "list" },
    ],
    catalogue: { cardAttributes: ["coffeeType", "preparation"], sorts: ["name", "availability"] },
    detailSections: [
      { id: "profile", title: { en: "Coffee type & flavour", vi: "Loại & hương vị" }, attributes: ["coffeeType", "flavour"] },
      { id: "preparation", title: { en: "Preparation", vi: "Cách pha" }, attributes: ["preparation", "served"] },
      OFFERINGS_SECTION({ en: "Where to try it in Ho Chi Minh City", vi: "Thưởng thức ở đâu tại TP.HCM" }),
    ],
    offerings: [{ en: "Coffee drinks", vi: "Đồ uống cà phê" }, { en: "Work-friendly seating", vi: "Chỗ ngồi làm việc" }],
    terms: {
      item: { en: "coffee", vi: "món cà phê" }, items: { en: "coffees", vi: "món cà phê" }, establishment: { en: "café", vi: "quán cà phê" }, establishments: { en: "cafés", vi: "quán cà phê" },
      findIn: { en: "Where to try it in Ho Chi Minh City", vi: "Thưởng thức ở đâu tại TP.HCM" }, completed: { en: "Tried", vi: "Đã thử" }, note: { en: "Tasting note", vi: "Ghi chú nếm thử" },
    },
    map: { layers: ["hcmc-establishments"] },
    categories: [{ id: "vietnamese-coffee", name: { en: "Vietnamese coffee", vi: "Cà phê Việt" } }, { id: "espresso", name: { en: "Espresso-based", vi: "Pha máy" } }, { id: "tea", name: { en: "Tea", vi: "Trà" } }],
    filters: [...SHARED_FILTERS, "coffee:drink-type", "coffee:preparation", "coffee:work-friendly", "coffee:ambience"],
    pricingUnits: ["cup"],
    passport: { name: { en: "Coffee Passport", vi: "Hộ chiếu cà phê" }, summary: { en: "Coffees tried · cafés visited", vi: "Cà phê đã thử · quán đã ghé" } },
  },
  {
    id: "spa", labelKey: "exp.spa", name: { en: "Spa", vi: "Spa & chăm sóc sức khỏe" }, status: "coming-soon", icon: "flower",
    implemented: false, featureFlag: "NEXT_PUBLIC_FEATURE_SPA", basePath: "/spa/",
    navLabels: nav({ en: "Spa Map", vi: "Bản đồ spa" }, { en: "Treatment Catalogue", vi: "Danh mục liệu trình" }, { en: "Wellness Passport", vi: "Hộ chiếu chăm sóc" }),
    navShort: SHORT,
    routes: routesFor("/spa/"),
    searchable: ["nameVi", "nameEn", "altNames", "description"],
    attributes: [
      { id: "treatmentType", label: { en: "Treatment", vi: "Liệu trình" }, kind: "text" },
      { id: "durationMin", label: { en: "Duration", vi: "Thời lượng" }, kind: "number", unit: { en: "min", vi: "phút" } },
      { id: "benefits", label: { en: "Benefits", vi: "Lợi ích" }, kind: "list" },
    ],
    catalogue: { cardAttributes: ["treatmentType", "durationMin"], sorts: ["name", "availability"] },
    detailSections: [
      { id: "treatment", title: { en: "Treatment", vi: "Liệu trình" }, attributes: ["treatmentType", "durationMin", "benefits"] },
      OFFERINGS_SECTION({ en: "Where to experience it in Ho Chi Minh City", vi: "Trải nghiệm ở đâu tại TP.HCM" }),
    ],
    offerings: [{ en: "Treatments", vi: "Liệu trình" }, { en: "Packages", vi: "Gói dịch vụ" }],
    terms: {
      item: { en: "treatment", vi: "liệu trình" }, items: { en: "treatments", vi: "liệu trình" }, establishment: { en: "spa", vi: "spa" }, establishments: { en: "spas", vi: "spa" },
      findIn: { en: "Where to experience it in Ho Chi Minh City", vi: "Trải nghiệm ở đâu tại TP.HCM" }, completed: { en: "Experienced", vi: "Đã trải nghiệm" }, note: { en: "Personal note", vi: "Ghi chú cá nhân" },
    },
    map: { layers: ["hcmc-establishments"] },
    categories: [{ id: "massage", name: { en: "Massage", vi: "Massage" } }, { id: "hair-wash", name: { en: "Hair wash & scalp care", vi: "Gội đầu dưỡng sinh" } }, { id: "facial", name: { en: "Facial", vi: "Chăm sóc da mặt" } }],
    filters: [...SHARED_FILTERS, "spa:treatment-type", "spa:duration", "spa:package"],
    pricingUnits: ["session", "package"],
    passport: { name: { en: "Wellness Passport", vi: "Hộ chiếu chăm sóc" }, summary: { en: "Treatments · spas visited", vi: "Liệu trình · spa đã ghé" } },
  },
  {
    id: "shopping", labelKey: "exp.shopping", name: { en: "Shopping", vi: "Mua sắm" }, status: "coming-soon", icon: "bag",
    implemented: false, featureFlag: null, basePath: "/shopping/",
    navLabels: nav({ en: "Shopping Map", vi: "Bản đồ mua sắm" }, { en: "Shopping Catalogue", vi: "Danh mục mua sắm" }, { en: "Shopping Passport", vi: "Hộ chiếu mua sắm" }),
    navShort: SHORT,
    routes: routesFor("/shopping/"),
    searchable: ["nameVi", "nameEn", "altNames"],
    attributes: [],
    catalogue: { cardAttributes: [], sorts: ["name"] },
    detailSections: [OFFERINGS_SECTION({ en: "Where to find it in Ho Chi Minh City", vi: "Tìm ở đâu tại TP.HCM" })],
    offerings: [],
    terms: {
      item: { en: "product", vi: "sản phẩm" }, items: { en: "products", vi: "sản phẩm" }, establishment: { en: "store", vi: "cửa hàng" }, establishments: { en: "stores", vi: "cửa hàng" },
      findIn: { en: "Where to find it in Ho Chi Minh City", vi: "Tìm ở đâu tại TP.HCM" }, completed: { en: "Discovered", vi: "Đã khám phá" }, note: { en: "Personal note", vi: "Ghi chú cá nhân" },
    },
    map: { layers: ["hcmc-establishments"] },
    categories: [],
    filters: SHARED_FILTERS,
    pricingUnits: ["item"],
    passport: { name: { en: "Shopping Passport", vi: "Hộ chiếu mua sắm" }, summary: { en: "Stores discovered", vi: "Cửa hàng đã khám phá" } },
  },
  {
    id: "sport", labelKey: "exp.sport", name: { en: "Sport", vi: "Thể thao" }, status: "pilot-planned", icon: "activity",
    implemented: false, featureFlag: "NEXT_PUBLIC_FEATURE_SPORT", basePath: "/sport/",
    navLabels: nav({ en: "Sport Map", vi: "Bản đồ thể thao" }, { en: "Activity Catalogue", vi: "Danh mục hoạt động" }, { en: "Sport Passport", vi: "Hộ chiếu thể thao" }),
    navShort: SHORT,
    routes: routesFor("/sport/"),
    searchable: ["nameVi", "nameEn", "altNames", "attr:equipment"],
    attributes: [
      { id: "sport", label: { en: "Sport", vi: "Môn" }, kind: "text" },
      { id: "equipment", label: { en: "Equipment", vi: "Dụng cụ" }, kind: "list" },
      { id: "difficulty", label: { en: "Difficulty", vi: "Độ khó" }, kind: "text" },
      { id: "classSize", label: { en: "Class size", vi: "Sĩ số lớp" }, kind: "text" },
    ],
    catalogue: { cardAttributes: ["sport", "difficulty"], sorts: ["name", "availability"] },
    detailSections: [
      { id: "activity", title: { en: "Equipment & difficulty", vi: "Dụng cụ & độ khó" }, attributes: ["equipment", "difficulty", "classSize"] },
      OFFERINGS_SECTION({ en: "Where to practise it in Ho Chi Minh City", vi: "Tập ở đâu tại TP.HCM" }),
    ],
    offerings: [{ en: "Courts", vi: "Sân" }, { en: "Coaching", vi: "Huấn luyện" }, { en: "Classes", vi: "Lớp học" }, { en: "Trial sessions", vi: "Buổi tập thử" }],
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

/** The non-Food module whose basePath starts this path (e.g. "/coffee/catalogue/" → coffee), if any. */
export const moduleForPath = (path: string) => EXPERIENCES.find((e) => e.basePath !== "/" && path.startsWith(e.basePath));

/** The module to render: falls back to Food if the stored id is unknown or not selectable. */
export const getExperience = (id: ExperienceId | string) => {
  const e = EXPERIENCES.find((x) => x.id === id);
  return e && isSelectable(e) ? e : EXPERIENCES[0];
};
