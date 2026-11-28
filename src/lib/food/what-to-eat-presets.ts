/**
 * Discovery modes and curated collections for Hôm nay ăn gì? — each is a preset of engine filters,
 * so collections stay in sync with the data (no hand-picked lists that could go stale).
 * Wording avoids health claims the data cannot support (no calorie counts, no "diet" promises).
 */
import type { DishType } from "../data/schema";
import { DEFAULT_WTE, type L, type WhatToEatFilters } from "./what-to-eat";

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
  p("com-trua-van-phong", "Office lunch", "Cơm trưa văn phòng", "Lunch dishes near the centre", "Món trưa gần trung tâm", "rice", { meal: "lunch", maxDistanceKm: 5, budgetPerPersonVnd: 80_000 }, true),
  p("an-ngon-tiet-kiem", "Tasty on a budget", "Ăn ngon tiết kiệm", "Everyday favourites; prices shown only when confirmed", "Món quen hằng ngày; chỉ hiện giá khi đã xác nhận", "noodle-soup", { budgetPerPersonVnd: 50_000, occasion: "everyday" }, true),
  p("an-can-bang", "Balanced eating", "Ăn ngon, ăn cân bằng", "Herbs, vegetables and lighter cooking — by ingredients, not calorie counts", "Nhiều rau, cách nấu nhẹ nhàng — theo thành phần, không tính calo", "salad", { moreVeg: true, cooking: ["simmered", "steamed", "raw-fresh"], avoidCooking: ["fried"] }, true),
  p("giau-protein", "Protein-rich meals", "Bữa ăn giàu protein", "Built around meat, seafood, egg or tofu (by ingredients)", "Có thịt, hải sản, trứng hoặc đậu phụ (theo thành phần)", "grilled", { proteins: ["pork", "beef", "poultry", "seafood", "fish", "egg", "tofu"] }, true),
  p("com-nha", "Home-style meals", "Cơm nhà", "Rice, braised and soup dishes like home", "Cơm, món kho, canh như ở nhà", "stew", { cooking: ["braised", "simmered"], meal: "lunch" }, true),
  p("an-chay", "Vegetarian today", "Hôm nay ăn chay", "Vegetarian dishes or common vegetarian versions", "Món chay hoặc có phiên bản chay phổ biến", "salad", { diet: ["vegetarian"] }, true),
  p("hen-ho", "Date night", "Hẹn hò tối nay", "Dinner for two", "Bữa tối cho hai người", "hotpot", { meal: "dinner", occasion: "special", people: 2, atmosphere: ["romantic", "quiet"] }, true),
  p("ban-be", "Out with friends", "Đi ăn cùng bạn bè", "Sharing dishes for a group", "Món ăn chung cho nhóm", "hotpot", { people: 4, occasion: "special", atmosphere: ["lively"] }, true),
  p("tu-thuong", "Treat yourself", "Tự thưởng cho mình", "Something special", "Một món đặc biệt", "seafood", { occasion: "special" }, true),
  p("mon-la", "Something new", "Hôm nay ăn món lạ", "Dishes you have not tried yet", "Những món bạn chưa thử", "banh", { newOnly: true }, true),
  p("an-khuya", "Late-night Saigon", "Ăn khuya Sài Gòn", "Dishes for late evenings", "Món cho buổi tối muộn", "noodles", { meal: "late-night" }, true),
  p("nhe-nhang", "Light bites", "Món ăn nhẹ nhàng", "Light, gentle dishes", "Món nhẹ, dễ ăn", "rolls", { portion: "light", maxSpice: 1 }, true),
  // ---- further discovery modes
  p("hang-ngay", "Everyday dining", "Ăn hằng ngày", "Convenient everyday food", "Món tiện lợi hằng ngày", "rice", { occasion: "everyday" }),
  p("nhanh-gon", "Quick meals", "Ăn nhanh", "Snack-size and street dishes", "Món ăn vặt, đường phố", "bread", { portion: "light", meal: "snack" }),
  p("gia-dinh", "Family dining", "Ăn cùng gia đình", "Dishes to share with family", "Món ăn chung cả nhà", "hotpot", { people: 4, occasion: "special", atmosphere: ["family-friendly"] }),
  p("cong-viec", "Business dining", "Tiếp khách", "Quieter places for business meals", "Quán yên tĩnh để tiếp khách", "grilled", { occasion: "special", atmosphere: ["quiet", "upscale"] }),
  p("cao-cap", "Premium dining", "Ăn sang", "Higher-end places (when price data exists)", "Quán cao cấp (khi có dữ liệu giá)", "seafood", { occasion: "special", atmosphere: ["upscale"] }),
  p("vung-mien", "Regional exploration", "Khám phá vùng miền", "Regional dishes beyond the south", "Món vùng miền ngoài Nam Bộ", "noodle-soup", { regions: ["mien-bac", "bac-trung-bo", "nam-trung-bo", "tay-nguyen"] }),
];

export const COLLECTIONS = PRESETS.filter((x) => x.collection);
export const MODES = PRESETS.filter((x) => !x.collection);
export const applyPreset = (preset: Preset): WhatToEatFilters => ({ ...DEFAULT_WTE, ...preset.filters });
