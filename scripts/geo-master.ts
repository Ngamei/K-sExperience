/**
 * Authoritative geography master list used by scripts/build-geo.ts.
 *
 * - 63 historical provinces (pre-1 July 2025), used as *culinary identities*.
 * - 6 culinary regions requested by the product brief.
 * - `current` = the province-level unit after Resolution 202/2025/QH15
 *   (effective 1 July 2025, 63 → 34 units). See docs/DATA_SOURCES.md.
 * - `gb` = the shapeName used in the geoBoundaries source file.
 */
export type RegionId =
  | "mien-bac"
  | "bac-trung-bo"
  | "nam-trung-bo"
  | "tay-nguyen"
  | "dong-nam-bo"
  | "tay-nam-bo";

export const REGIONS: {
  id: RegionId;
  nameVi: string;
  nameEn: string;
  color: string;
  order: number;
  blurbEn: string;
  blurbVi: string;
}[] = [
  { id: "mien-bac", nameVi: "Miền Bắc", nameEn: "Northern Vietnam", color: "#C9D4C1", order: 1,
    blurbEn: "Clear broths, restrained seasoning and the highland flavours of the north-west.",
    blurbVi: "Nước dùng thanh, nêm nếm tinh tế và hương vị núi rừng Tây Bắc." },
  { id: "bac-trung-bo", nameVi: "Bắc Trung Bộ", nameEn: "North Central Coast", color: "#E3C9B4", order: 2,
    blurbEn: "Bold, salty and spicy cooking shaped by a harsh climate and the imperial kitchens of Huế.",
    blurbVi: "Đậm đà, cay mặn, mang dấu ấn ẩm thực cung đình Huế." },
  { id: "nam-trung-bo", nameVi: "Nam Trung Bộ", nameEn: "South Central Coast", color: "#E9D9B8", order: 3,
    blurbEn: "Fishing-port seafood, turmeric noodles and fiery chilli along the coast.",
    blurbVi: "Hải sản miền biển, mì Quảng và ớt cay nồng dọc duyên hải." },
  { id: "tay-nguyen", nameVi: "Tây Nguyên", nameEn: "Central Highlands", color: "#CFC2A6", order: 4,
    blurbEn: "Highland plateaus of coffee, bamboo-tube rice and grilled meats.",
    blurbVi: "Cao nguyên cà phê, cơm lam và các món nướng núi rừng." },
  { id: "dong-nam-bo", nameVi: "Đông Nam Bộ", nameEn: "Southeast", color: "#D9BFA9", order: 5,
    blurbEn: "Sài Gòn's melting pot: broken rice, bánh mì and late-night street food.",
    blurbVi: "Nơi giao thoa của Sài Gòn: cơm tấm, bánh mì và ẩm thực đường phố." },
  { id: "tay-nam-bo", nameVi: "Tây Nam Bộ", nameEn: "Mekong Delta", color: "#C4D1BE", order: 6,
    blurbEn: "Sweet, abundant river cuisine: fish, coconut, herbs and floating markets.",
    blurbVi: "Ẩm thực sông nước ngọt ngào: cá, dừa, rau và chợ nổi." },
];

type P = [id: string, nameVi: string, nameEn: string, gb: string, iso: string, region: RegionId, current: string, kind?: "city" | "province"];

/** [id, nameVi, nameEn, geoBoundaries shapeName, ISO 3166-2, region, current (2025) unit id, kind] */
export const PROVINCES: P[] = [
  // Miền Bắc (25)
  ["ha-giang", "Hà Giang", "Ha Giang", "Hà Giang", "VN-03", "mien-bac", "tuyen-quang"],
  ["cao-bang", "Cao Bằng", "Cao Bang", "Cao Bằng", "VN-04", "mien-bac", "cao-bang"],
  ["bac-kan", "Bắc Kạn", "Bac Kan", "Bắc Kạn", "VN-53", "mien-bac", "thai-nguyen"],
  ["tuyen-quang", "Tuyên Quang", "Tuyen Quang", "Tuyên Quang", "VN-07", "mien-bac", "tuyen-quang"],
  ["lao-cai", "Lào Cai", "Lao Cai", "Lào Cai", "VN-02", "mien-bac", "lao-cai"],
  ["yen-bai", "Yên Bái", "Yen Bai", "Yên Bái", "VN-06", "mien-bac", "lao-cai"],
  ["thai-nguyen", "Thái Nguyên", "Thai Nguyen", "Thái Nguyên", "VN-69", "mien-bac", "thai-nguyen"],
  ["lang-son", "Lạng Sơn", "Lang Son", "Lạng Sơn", "VN-09", "mien-bac", "lang-son"],
  ["bac-giang", "Bắc Giang", "Bac Giang", "Bắc Giang", "VN-54", "mien-bac", "bac-ninh"],
  ["phu-tho", "Phú Thọ", "Phu Tho", "Phú Thọ", "VN-68", "mien-bac", "phu-tho"],
  ["quang-ninh", "Quảng Ninh", "Quang Ninh", "Quảng Ninh", "VN-13", "mien-bac", "quang-ninh"],
  ["dien-bien", "Điện Biên", "Dien Bien", "Điện Biên", "VN-71", "mien-bac", "dien-bien"],
  ["lai-chau", "Lai Châu", "Lai Chau", "Lai Châu", "VN-01", "mien-bac", "lai-chau"],
  ["son-la", "Sơn La", "Son La", "Sơn La", "VN-05", "mien-bac", "son-la"],
  ["hoa-binh", "Hòa Bình", "Hoa Binh", "Hòa Bình", "VN-14", "mien-bac", "phu-tho"],
  ["ha-noi", "Hà Nội", "Hanoi", "Hà Nội", "VN-HN", "mien-bac", "ha-noi", "city"],
  ["hai-phong", "Hải Phòng", "Hai Phong", "Hải Phòng", "VN-HP", "mien-bac", "hai-phong", "city"],
  ["vinh-phuc", "Vĩnh Phúc", "Vinh Phuc", "Vĩnh Phúc", "VN-70", "mien-bac", "phu-tho"],
  ["bac-ninh", "Bắc Ninh", "Bac Ninh", "Bắc Ninh", "VN-56", "mien-bac", "bac-ninh"],
  ["hung-yen", "Hưng Yên", "Hung Yen", "Hưng Yên", "VN-66", "mien-bac", "hung-yen"],
  ["hai-duong", "Hải Dương", "Hai Duong", "Hải Dương", "VN-61", "mien-bac", "hai-phong"],
  ["thai-binh", "Thái Bình", "Thai Binh", "Thái Bình", "VN-20", "mien-bac", "hung-yen"],
  ["ha-nam", "Hà Nam", "Ha Nam", "Hà Nam", "VN-63", "mien-bac", "ninh-binh"],
  ["nam-dinh", "Nam Định", "Nam Dinh", "Nam Định", "VN-67", "mien-bac", "ninh-binh"],
  ["ninh-binh", "Ninh Bình", "Ninh Binh", "Ninh Bình", "VN-18", "mien-bac", "ninh-binh"],
  // Bắc Trung Bộ (6)
  ["thanh-hoa", "Thanh Hóa", "Thanh Hoa", "Thanh Hóa", "VN-21", "bac-trung-bo", "thanh-hoa"],
  ["nghe-an", "Nghệ An", "Nghe An", "Nghệ An", "VN-22", "bac-trung-bo", "nghe-an"],
  ["ha-tinh", "Hà Tĩnh", "Ha Tinh", "Hà Tĩnh", "VN-23", "bac-trung-bo", "ha-tinh"],
  ["quang-binh", "Quảng Bình", "Quang Binh", "Quảng Bình", "VN-24", "bac-trung-bo", "quang-tri"],
  ["quang-tri", "Quảng Trị", "Quang Tri", "Quảng Trị", "VN-25", "bac-trung-bo", "quang-tri"],
  ["thua-thien-hue", "Thừa Thiên Huế", "Thua Thien Hue", "Thừa Thiên Huế", "VN-26", "bac-trung-bo", "hue", "province"],
  // Nam Trung Bộ (8)
  ["da-nang", "Đà Nẵng", "Da Nang", "Đà Nẵng", "VN-DN", "nam-trung-bo", "da-nang", "city"],
  ["quang-nam", "Quảng Nam", "Quang Nam", "Quảng Nam", "VN-27", "nam-trung-bo", "da-nang"],
  ["quang-ngai", "Quảng Ngãi", "Quang Ngai", "Quảng Ngãi", "VN-29", "nam-trung-bo", "quang-ngai"],
  ["binh-dinh", "Bình Định", "Binh Dinh", "Bình Định", "VN-31", "nam-trung-bo", "gia-lai"],
  ["phu-yen", "Phú Yên", "Phu Yen", "Phú Yên", "VN-32", "nam-trung-bo", "dak-lak"],
  ["khanh-hoa", "Khánh Hòa", "Khanh Hoa", "Khánh Hòa", "VN-34", "nam-trung-bo", "khanh-hoa"],
  ["ninh-thuan", "Ninh Thuận", "Ninh Thuan", "Ninh Thuận", "VN-36", "nam-trung-bo", "khanh-hoa"],
  ["binh-thuan", "Bình Thuận", "Binh Thuan", "Bình Thuận", "VN-40", "nam-trung-bo", "lam-dong"],
  // Tây Nguyên (5)
  ["kon-tum", "Kon Tum", "Kon Tum", "Kon Tum", "VN-28", "tay-nguyen", "quang-ngai"],
  ["gia-lai", "Gia Lai", "Gia Lai", "Gia Lai", "VN-30", "tay-nguyen", "gia-lai"],
  ["dak-lak", "Đắk Lắk", "Dak Lak", "Đắk Lắk", "VN-33", "tay-nguyen", "dak-lak"],
  ["dak-nong", "Đắk Nông", "Dak Nong", "Đắk Nông", "VN-72", "tay-nguyen", "lam-dong"],
  ["lam-dong", "Lâm Đồng", "Lam Dong", "Lâm Đồng", "VN-35", "tay-nguyen", "lam-dong"],
  // Đông Nam Bộ (6)
  ["ho-chi-minh", "TP. Hồ Chí Minh", "Ho Chi Minh City", "Ho Chi Minh", "VN-SG", "dong-nam-bo", "ho-chi-minh", "city"],
  ["binh-duong", "Bình Dương", "Binh Duong", "Bình Dương", "VN-57", "dong-nam-bo", "ho-chi-minh"],
  ["binh-phuoc", "Bình Phước", "Binh Phuoc", "Bình Phước", "VN-58", "dong-nam-bo", "dong-nai"],
  ["tay-ninh", "Tây Ninh", "Tay Ninh", "Tây Ninh", "VN-37", "dong-nam-bo", "tay-ninh"],
  ["dong-nai", "Đồng Nai", "Dong Nai", "Đồng Nai", "VN-39", "dong-nam-bo", "dong-nai"],
  ["ba-ria-vung-tau", "Bà Rịa – Vũng Tàu", "Ba Ria – Vung Tau", "Bà Rịa–Vũng Tàu", "VN-43", "dong-nam-bo", "ho-chi-minh"],
  // Tây Nam Bộ (13)
  ["long-an", "Long An", "Long An", "Long An", "VN-41", "tay-nam-bo", "tay-ninh"],
  ["tien-giang", "Tiền Giang", "Tien Giang", "Tiền Giang", "VN-46", "tay-nam-bo", "dong-thap"],
  ["ben-tre", "Bến Tre", "Ben Tre", "Bến Tre", "VN-50", "tay-nam-bo", "vinh-long"],
  ["tra-vinh", "Trà Vinh", "Tra Vinh", "Trà Vinh", "VN-51", "tay-nam-bo", "vinh-long"],
  ["vinh-long", "Vĩnh Long", "Vinh Long", "Vĩnh Long", "VN-49", "tay-nam-bo", "vinh-long"],
  ["dong-thap", "Đồng Tháp", "Dong Thap", "Đồng Tháp", "VN-45", "tay-nam-bo", "dong-thap"],
  ["an-giang", "An Giang", "An Giang", "An Giang", "VN-44", "tay-nam-bo", "an-giang"],
  ["kien-giang", "Kiên Giang", "Kien Giang", "Kiên Giang", "VN-47", "tay-nam-bo", "an-giang"],
  ["can-tho", "Cần Thơ", "Can Tho", "Cần Thơ", "VN-CT", "tay-nam-bo", "can-tho", "city"],
  ["hau-giang", "Hậu Giang", "Hau Giang", "Hậu Giang", "VN-73", "tay-nam-bo", "can-tho"],
  ["soc-trang", "Sóc Trăng", "Soc Trang", "Sóc Trăng", "VN-52", "tay-nam-bo", "can-tho"],
  ["bac-lieu", "Bạc Liêu", "Bac Lieu", "Bạc Liêu", "VN-55", "tay-nam-bo", "ca-mau"],
  ["ca-mau", "Cà Mau", "Ca Mau", "Cà Mau", "VN-59", "tay-nam-bo", "ca-mau"],
];

/** The 34 province-level units in force since 1 July 2025 (Resolution 202/2025/QH15). */
export const CURRENT_UNITS: Record<string, { nameVi: string; nameEn: string; kind: "city" | "province" }> = {
  "ha-noi": { nameVi: "Thành phố Hà Nội", nameEn: "Hanoi", kind: "city" },
  "hue": { nameVi: "Thành phố Huế", nameEn: "Hue City", kind: "city" },
  "hai-phong": { nameVi: "Thành phố Hải Phòng", nameEn: "Hai Phong", kind: "city" },
  "da-nang": { nameVi: "Thành phố Đà Nẵng", nameEn: "Da Nang", kind: "city" },
  "ho-chi-minh": { nameVi: "Thành phố Hồ Chí Minh", nameEn: "Ho Chi Minh City", kind: "city" },
  "can-tho": { nameVi: "Thành phố Cần Thơ", nameEn: "Can Tho", kind: "city" },
  "lai-chau": { nameVi: "Lai Châu", nameEn: "Lai Chau", kind: "province" },
  "dien-bien": { nameVi: "Điện Biên", nameEn: "Dien Bien", kind: "province" },
  "son-la": { nameVi: "Sơn La", nameEn: "Son La", kind: "province" },
  "lang-son": { nameVi: "Lạng Sơn", nameEn: "Lang Son", kind: "province" },
  "quang-ninh": { nameVi: "Quảng Ninh", nameEn: "Quang Ninh", kind: "province" },
  "thanh-hoa": { nameVi: "Thanh Hóa", nameEn: "Thanh Hoa", kind: "province" },
  "nghe-an": { nameVi: "Nghệ An", nameEn: "Nghe An", kind: "province" },
  "ha-tinh": { nameVi: "Hà Tĩnh", nameEn: "Ha Tinh", kind: "province" },
  "cao-bang": { nameVi: "Cao Bằng", nameEn: "Cao Bang", kind: "province" },
  "tuyen-quang": { nameVi: "Tuyên Quang", nameEn: "Tuyen Quang", kind: "province" },
  "lao-cai": { nameVi: "Lào Cai", nameEn: "Lao Cai", kind: "province" },
  "thai-nguyen": { nameVi: "Thái Nguyên", nameEn: "Thai Nguyen", kind: "province" },
  "phu-tho": { nameVi: "Phú Thọ", nameEn: "Phu Tho", kind: "province" },
  "bac-ninh": { nameVi: "Bắc Ninh", nameEn: "Bac Ninh", kind: "province" },
  "hung-yen": { nameVi: "Hưng Yên", nameEn: "Hung Yen", kind: "province" },
  "ninh-binh": { nameVi: "Ninh Bình", nameEn: "Ninh Binh", kind: "province" },
  "quang-tri": { nameVi: "Quảng Trị", nameEn: "Quang Tri", kind: "province" },
  "quang-ngai": { nameVi: "Quảng Ngãi", nameEn: "Quang Ngai", kind: "province" },
  "gia-lai": { nameVi: "Gia Lai", nameEn: "Gia Lai", kind: "province" },
  "khanh-hoa": { nameVi: "Khánh Hòa", nameEn: "Khanh Hoa", kind: "province" },
  "lam-dong": { nameVi: "Lâm Đồng", nameEn: "Lam Dong", kind: "province" },
  "dak-lak": { nameVi: "Đắk Lắk", nameEn: "Dak Lak", kind: "province" },
  "dong-nai": { nameVi: "Đồng Nai", nameEn: "Dong Nai", kind: "province" },
  "tay-ninh": { nameVi: "Tây Ninh", nameEn: "Tay Ninh", kind: "province" },
  "vinh-long": { nameVi: "Vĩnh Long", nameEn: "Vinh Long", kind: "province" },
  "dong-thap": { nameVi: "Đồng Tháp", nameEn: "Dong Thap", kind: "province" },
  "ca-mau": { nameVi: "Cà Mau", nameEn: "Ca Mau", kind: "province" },
  "an-giang": { nameVi: "An Giang", nameEn: "An Giang", kind: "province" },
};
