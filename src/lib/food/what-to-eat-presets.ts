/**
 * Collections and discovery modes for Hôm nay ăn gì? — each is a preset of engine filters, so lists stay in
 * sync with the data (no hand-picked lists that could go stale). Goals and occasions are soft preferences;
 * only diet, meal and explicit place requirements are hard. Wording avoids health claims the data cannot
 * support (no calorie counts, no "diet" promises).
 */
import type { DishType } from "../data/schema";
import { DEFAULT_WTE, type Goal, type L, type Occasion, type WhatToEatFilters } from "./what-to-eat";

export interface Preset {
  id: string;
  name: L;
  blurb: L;
  /** Dish illustration used for the preset card. */
  art: DishType;
  filters: Partial<WhatToEatFilters>;
  /** Shown as a quick collection on the page (the 12 named collections). */
  collection?: boolean;
}

const p = (id: string, en: string, vi: string, blurbEn: string, blurbVi: string, art: DishType, filters: Partial<WhatToEatFilters>, collection = false): Preset =>
  ({ id, name: { en, vi }, blurb: { en: blurbEn, vi: blurbVi }, art, filters, collection });

export const PRESETS: Preset[] = [
  // ---- the 12 collections
  p("com-trua-van-phong", "Office lunch", "Cơm trưa văn phòng", "Easy lunch dishes, places nearby first", "Món trưa gọn, ưu tiên quán gần", "rice", { meal: "lunch", occasion: "office-lunch" }, true),
  p("an-ngon-tiet-kiem", "Tasty on a budget", "Ăn ngon tiết kiệm", "Everyday favourites; prices shown only when confirmed", "Món bình dân; chỉ hiện giá khi đã xác nhận", "noodle-soup", { goals: ["budget"], budgetMaxVnd: 50_000 }, true),
  p("an-can-bang", "Balanced eating", "Ăn ngon, ăn cân bằng", "Herbs, vegetables and lighter cooking — by ingredients, not calorie counts", "Nhiều rau, cách nấu nhẹ — theo thành phần, không tính calo", "salad", { goals: ["balanced"] }, true),
  p("giau-protein", "Protein-rich meals", "Bữa ăn giàu protein", "Built around meat, seafood, egg or tofu (by ingredients)", "Có thịt, hải sản, trứng hoặc đậu phụ (theo thành phần)", "grilled", { goals: ["protein"] }, true),
  p("com-nha", "Home-style meals", "Cơm nhà", "Rice, braised and soup dishes like home", "Cơm, món kho, canh như ở nhà", "stew", { cooking: ["braised", "simmered"], meal: "lunch" }, true),
  p("an-chay", "Vegetarian today", "Hôm nay ăn chay", "Vegetarian dishes or common vegetarian versions", "Món chay hoặc có phiên bản chay phổ biến", "salad", { diet: ["vegetarian"] }, true),
  p("hen-ho", "Date night", "Hẹn hò tối nay", "Dinner for two at a listed place", "Bữa tối cho hai người ở quán có trong dữ liệu", "hotpot", { meal: "dinner", occasion: "date", people: 2 }, true),
  p("ban-be", "Out with friends", "Đi ăn cùng bạn bè", "Sharing dishes for a group", "Món ăn chung cho nhóm", "hotpot", { people: 4 }, true),
  p("tu-thuong", "Treat yourself", "Tự thưởng cho mình", "Something special at a listed place", "Một món đặc biệt ở quán có trong dữ liệu", "seafood", { occasion: "special" }, true),
  p("mon-la", "Something new", "Hôm nay ăn món lạ", "Dishes you have not tried yet", "Những món bạn chưa thử", "banh", { newOnly: true }, true),
  p("an-khuya", "Late-night Saigon", "Ăn khuya Sài Gòn", "Dishes for late evenings", "Món cho buổi tối muộn", "noodles", { meal: "late-night" }, true),
  p("nhe-nhang", "Light bites", "Món ăn nhẹ nhàng", "Light, gentle dishes", "Món nhẹ, dễ ăn", "rolls", { portion: "light", maxSpice: 1 }, true),
  // ---- further discovery modes
  p("hang-ngay", "Everyday meals", "Ăn hằng ngày", "Convenient everyday food", "Món tiện lợi hằng ngày", "rice", { occasion: "everyday" }),
  p("nhanh-gon", "Quick meals", "Ăn nhanh", "Street-food and quick dishes", "Món đường phố, ăn nhanh", "bread", { goals: ["quick"] }),
  p("giu-dang", "Weight management", "Giữ dáng lành mạnh", "Satisfying meals with vegetables and lighter cooking — no calorie counting", "Món no bụng, nhiều rau, cách nấu nhẹ — không đếm calo", "salad", { goals: ["weight"] }),
  p("gia-dinh", "Family dining", "Ăn cùng gia đình", "Dishes to share at a listed place", "Món ăn chung ở quán có trong dữ liệu", "hotpot", { people: 4, occasion: "family" }),
  p("cao-cap", "Special dining", "Ăn sang", "Higher-end places (when price data exists)", "Quán cao cấp (khi có dữ liệu giá)", "seafood", { occasion: "special", budgetMinVnd: 300_000 }),
  p("vung-mien", "Regional exploration", "Khám phá vùng miền", "Regional dishes beyond the south", "Món vùng miền ngoài Nam Bộ", "noodle-soup", { regions: ["mien-bac", "bac-trung-bo", "nam-trung-bo", "tay-nguyen"] }),
];

export const COLLECTIONS = PRESETS.filter((x) => x.collection);
export const MODES = PRESETS.filter((x) => !x.collection);
export const applyPreset = (preset: Preset): WhatToEatFilters => ({ ...DEFAULT_WTE, ...preset.filters });

export const OCCASION_L: Record<Occasion, L> = {
  everyday: { en: "Everyday", vi: "Hằng ngày" }, "office-lunch": { en: "Office lunch", vi: "Cơm văn phòng" },
  date: { en: "Date night", vi: "Hẹn hò" }, family: { en: "Family", vi: "Gia đình" }, special: { en: "Special dining", vi: "Dịp đặc biệt" },
};
export const GOAL_L: Record<Goal, L> = {
  balanced: { en: "Balanced eating", vi: "Ăn cân bằng" }, weight: { en: "Weight management", vi: "Giữ dáng" },
  protein: { en: "High protein", vi: "Giàu đạm" }, budget: { en: "Budget friendly", vi: "Tiết kiệm" }, quick: { en: "Quick meal", vi: "Ăn nhanh" },
};
