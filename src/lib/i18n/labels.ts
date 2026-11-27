/** Labels for controlled vocabularies (en / vi). */
import type { Locale } from "./dict";
type L = Record<string, { en: string; vi: string }>;

export const DISH_TYPE_LABELS: L = {
  "noodle-soup": { en: "Noodle soup", vi: "Món nước" }, noodles: { en: "Noodles (dry)", vi: "Bún, mì trộn" }, rice: { en: "Rice & sticky rice", vi: "Cơm, xôi" },
  banh: { en: "Bánh (cakes & dumplings)", vi: "Bánh" }, bread: { en: "Bread", vi: "Bánh mì" }, rolls: { en: "Rolls", vi: "Món cuốn" }, hotpot: { en: "Hotpot", vi: "Lẩu" },
  grilled: { en: "Grilled & roasted", vi: "Nướng, quay" }, salad: { en: "Salad", vi: "Gỏi, nộm" }, stew: { en: "Braised & stewed", vi: "Kho, hầm" },
  porridge: { en: "Porridge", vi: "Cháo" }, soup: { en: "Soup", vi: "Canh" }, che: { en: "Chè (sweet soup)", vi: "Chè" }, dessert: { en: "Dessert", vi: "Tráng miệng" },
  fried: { en: "Fried & crispy", vi: "Chiên, rán" }, cured: { en: "Cured & fermented", vi: "Nem, đồ khô" }, seafood: { en: "Seafood", vi: "Hải sản" }, confection: { en: "Sweets & confections", vi: "Kẹo, mứt" },
};
export const TASTE_LABELS: L = {
  savory: { en: "Savoury", vi: "Đậm đà" }, sweet: { en: "Sweet", vi: "Ngọt" }, sour: { en: "Sour", vi: "Chua" }, salty: { en: "Salty", vi: "Mặn" }, spicy: { en: "Spicy", vi: "Cay" },
  bitter: { en: "Bitter", vi: "Đắng" }, umami: { en: "Umami", vi: "Ngọt thịt" }, herbal: { en: "Herbal", vi: "Thơm rau" }, rich: { en: "Rich", vi: "Béo" }, light: { en: "Light", vi: "Thanh" },
  smoky: { en: "Smoky", vi: "Khói" }, fermented: { en: "Fermented", vi: "Lên men" }, fresh: { en: "Fresh", vi: "Tươi mát" }, creamy: { en: "Creamy", vi: "Béo ngậy" },
  crunchy: { en: "Crunchy", vi: "Giòn" }, chewy: { en: "Chewy", vi: "Dai" }, nutty: { en: "Nutty", vi: "Bùi" }, fragrant: { en: "Fragrant", vi: "Thơm" },
};
export const DIET_LABELS: L = {
  vegetarian: { en: "Vegetarian-friendly", vi: "Có thể ăn chay" }, vegan: { en: "Vegan", vi: "Thuần chay" }, "no-pork": { en: "No pork", vi: "Không thịt heo" },
  "no-beef": { en: "No beef", vi: "Không thịt bò" }, "no-seafood": { en: "No fish/seafood", vi: "Không cá, hải sản" }, "no-peanut": { en: "No peanuts", vi: "Không đậu phộng" }, "no-offal": { en: "No offal", vi: "Không nội tạng" },
};
export const DIETARY_TAG_LABELS: L = {
  "contains-pork": { en: "Pork", vi: "Thịt heo" }, "contains-beef": { en: "Beef / buffalo", vi: "Thịt bò / trâu" }, "contains-poultry": { en: "Poultry", vi: "Gia cầm" },
  "contains-seafood": { en: "Seafood", vi: "Hải sản" }, "contains-fish": { en: "Fish", vi: "Cá" }, "contains-egg": { en: "Egg", vi: "Trứng" }, "contains-dairy": { en: "Dairy", vi: "Sữa" },
  "contains-peanut": { en: "Peanuts", vi: "Đậu phộng" }, "contains-offal": { en: "Offal", vi: "Nội tạng" }, "contains-goat": { en: "Goat", vi: "Thịt dê" }, "contains-game": { en: "Horse / game", vi: "Thịt ngựa / thú" },
  vegetarian: { en: "Vegetarian", vi: "Chay" }, vegan: { en: "Vegan", vi: "Thuần chay" }, "vegetarian-version-common": { en: "Vegetarian versions common", vi: "Thường có bản chay" },
};
export const MEAL_LABELS: L = {
  breakfast: { en: "Breakfast", vi: "Bữa sáng" }, lunch: { en: "Lunch", vi: "Bữa trưa" }, afternoon: { en: "Afternoon", vi: "Buổi chiều" },
  dinner: { en: "Dinner", vi: "Bữa tối" }, "late-night": { en: "Late night", vi: "Ăn khuya" },
};
export const VENUE_LABELS: L = {
  "street-stall": { en: "Street stall", vi: "Quán vỉa hè" }, eatery: { en: "Eatery", vi: "Quán ăn" }, restaurant: { en: "Restaurant", vi: "Nhà hàng" },
  "market-stall": { en: "Market stall", vi: "Sạp chợ" }, "cafe-dessert": { en: "Dessert café", vi: "Quán chè, tráng miệng" }, "food-court": { en: "Food court", vi: "Khu ẩm thực" },
};
export const SPICE_LABELS: L = { "0": { en: "Not spicy", vi: "Không cay" }, "1": { en: "Mild", vi: "Cay nhẹ" }, "2": { en: "Spicy", vi: "Cay" }, "3": { en: "Very spicy", vi: "Rất cay" } };

export const lbl = (m: L, k: string, loc: Locale) => m[k]?.[loc] ?? k;
