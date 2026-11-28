import type { Locale } from "./dict";

/** Business Profile Engine copy (EN / VI). Unknown values are always said plainly, never filled in. */
const en = {
  illustration: "Illustrative image · not this place", managed: "Managed by K's Experience from public sources",
  address: "Address", phone: "Phone", hours: "Hours", web: "Website & social",
  notPublished: "Not published yet", hoursUnknown: "Not published yet", openNow: "Open now", closedNow: "Closed now",
  call: "Call", noPhone: "No phone yet", directions: "Directions", save: "Save", saved: "Saved", share: "Share", copied: "Link copied",
  visited: "I've been here", visitedOn: "Visited · {d}",
  priceNotRecorded: "Price not recorded", unlockPrice: "Unlock price", premiumPrice: "Premium",
  infoUnavailable: "Not recorded yet", infoRestricted: "Included with {plan}", infoRestrictedUnlock: "Unlock this menu to see all prices", infoSignIn: "Sign in to unlock",
  noOfferings: "Nothing recorded for this place yet.", evidence: "Evidence", lastChecked: "Last checked",
  sources: "Sources", openingHours: "Opening hours", report: "Report incorrect information", claim: "Claim this business", soon: "Coming soon",
  timezone: "Times in Ho Chi Minh City (GMT+7)", photo: "Photo", mapsPhotos: "See photos on Google Maps",
  photoKinds: { exterior: "Outside the venue", interior: "Inside the venue", signage: "The venue sign", "served-here": "Served at this venue" },
  days: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
};
const vi: typeof en = {
  illustration: "Ảnh minh họa · không phải nơi này", managed: "Do K's Experience quản lý từ nguồn công khai",
  address: "Địa chỉ", phone: "Điện thoại", hours: "Giờ mở cửa", web: "Website & mạng xã hội",
  notPublished: "Chưa công bố", hoursUnknown: "Chưa công bố", openNow: "Đang mở cửa", closedNow: "Đang đóng cửa",
  call: "Gọi", noPhone: "Chưa có số", directions: "Chỉ đường", save: "Lưu", saved: "Đã lưu", share: "Chia sẻ", copied: "Đã sao chép liên kết",
  visited: "Tôi đã đến đây", visitedOn: "Đã đến · {d}",
  priceNotRecorded: "Chưa có giá", unlockPrice: "Mở khóa giá", premiumPrice: "Premium",
  infoUnavailable: "Chưa có dữ liệu", infoRestricted: "Có trong gói {plan}", infoRestrictedUnlock: "Mở khóa thực đơn để xem toàn bộ giá", infoSignIn: "Đăng nhập để mở khóa",
  noOfferings: "Chưa có thông tin nào cho nơi này.", evidence: "Bằng chứng", lastChecked: "Kiểm tra lần cuối",
  sources: "Nguồn", openingHours: "Giờ mở cửa", report: "Báo thông tin chưa đúng", claim: "Nhận quản lý cơ sở này", soon: "Sắp ra mắt",
  timezone: "Giờ TP. Hồ Chí Minh (GMT+7)", photo: "Ảnh", mapsPhotos: "Xem ảnh trên Google Maps",
  photoKinds: { exterior: "Bên ngoài cơ sở", interior: "Bên trong cơ sở", signage: "Biển hiệu", "served-here": "Phục vụ tại đây" },
  days: { mon: "T2", tue: "T3", wed: "T4", thu: "T5", fri: "T6", sat: "T7", sun: "CN" },
};
export type BusinessStrings = typeof en;
export const businessDict = (l: Locale): BusinessStrings => (l === "vi" ? vi : en);
