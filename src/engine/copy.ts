import type { L } from "@/experiences/registry";

/** Shared engine UI copy (EN/VI). Module-specific nouns come from the registry `terms`. */
export const COPY = {
  comingSoon: { en: "This experience is not available yet.", vi: "Trải nghiệm này chưa sẵn sàng." },
  comingSoonBody: { en: "It is being prepared on the shared K's Experience engine. Vietnamese Food is available now.", vi: "Đang được chuẩn bị trên nền tảng chung của K's Experience. Ẩm thực Việt Nam đã sẵn sàng." },
  backToFood: { en: "Go to Vietnamese Food", vi: "Đến Ẩm thực Việt Nam" },
  pilotBanner: { en: "Pilot — only sourced, verified entries are listed; nothing here is invented.", vi: "Thí điểm — chỉ liệt kê thông tin có nguồn và đã xác minh; không có dữ liệu bịa." },
  emptyItems: { en: "No {items} have been researched yet.", vi: "Chưa có {items} nào được nghiên cứu." },
  emptyEstablishments: { en: "No {establishments} in Ho Chi Minh City have been verified yet.", vi: "Chưa có {establishments} nào tại TP.HCM được xác minh." },
  search: { en: "Search {items}", vi: "Tìm {items}" },
  all: { en: "All", vi: "Tất cả" },
  results: { en: "{n} {items}", vi: "{n} {items}" },
  save: { en: "Save", vi: "Lưu" },
  saved: { en: "Saved", vi: "Đã lưu" },
  noneFound: { en: "No verified establishment in Ho Chi Minh City yet.", vi: "Chưa có địa điểm đã xác minh tại TP.HCM." },
  surprise: { en: "Surprise me", vi: "Gợi ý bất ngờ" },
  categories: { en: "Categories", vi: "Danh mục" },
  offers: { en: "Offers", vi: "Cung cấp" },
  kmAway: { en: "{km} km from the city centre", vi: "cách trung tâm {km} km" },
  visited: { en: "Visited", vi: "Đã ghé" },
  seed: { en: "Seed · unverified", vi: "Dữ liệu mẫu · chưa xác minh" },
  notFound: { en: "Not found.", vi: "Không tìm thấy." },
  loading: { en: "Loading…", vi: "Đang tải…" },
} satisfies Record<string, L>;

export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
