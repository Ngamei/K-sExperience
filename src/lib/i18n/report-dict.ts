import type { Locale } from "./dict";
import type { ReportCategory, ReportProblem } from "@/lib/business/report";

/** "Report incorrect information" copy (EN / VI). Never claims a report was sent when it was not. */
const en = {
  open: "Report incorrect information",
  title: "Report incorrect information",
  subtitle: "Help us keep K's Experience accurate.",
  about: "About",
  categoryLegend: "What is wrong?",
  categories: {
    "incorrect-address": "Incorrect address", "permanently-closed": "Business permanently closed", "incorrect-hours": "Incorrect opening hours",
    "incorrect-phone": "Incorrect phone number", "outdated-menu": "Outdated menu", "incorrect-price": "Incorrect price",
    "incorrect-photo": "Incorrect photograph", "missing-information": "Missing information", other: "Other",
  } satisfies Record<ReportCategory, string>,
  details: "Details", detailsHint: "What is wrong, and what is correct if you know it?",
  evidenceUrl: "Supporting link (optional)", evidenceUrlHint: "e.g. the venue's own page or a recent post",
  photo: "Supporting photograph (optional)", photoHint: "JPEG, PNG or WebP · up to 5 MB · seen only by our review team",
  photoSignIn: "Sign in to attach a photograph. You can still report without one.",
  photoLocal: "Photos cannot be attached in this preview.",
  email: "Your email for follow-up (optional)", emailHint: "Only our review team sees it. Leave blank to stay anonymous.",
  notice: "Your report goes to our review team. It does not change the listing directly.",
  submit: "Send report", sending: "Sending…", cancel: "Cancel", edit: "Edit report", close: "Close", done: "Done",
  success: "Thanks — our team will review it. Your report does not change the listing directly.",
  localNotice: "This version of K's Experience is not connected to our review system, so this report will not be sent. Copy it and send it to the K's Experience team yourself.",
  copy: "Copy report", copied: "Copied — not sent. Paste it into a message to the K's Experience team.",
  copyFailed: "Could not copy automatically — select the text below and copy it. It has not been sent.",
  errors: {
    required: "Required", "too-short": "Please add a few more words", "too-long": "Too long (2,000 characters at most)",
    invalid: "Not valid", "photo-type": "JPEG, PNG or WebP only", "photo-size": "Photo is larger than 5 MB",
  } satisfies Record<ReportProblem, string>,
  failed: "Your report could not be sent. Please try again.", rateLimited: "Too many reports from here recently. Please try again later.",
  unknownEstablishment: "This listing cannot receive reports yet.", photoFailed: "The photograph could not be uploaded. Remove it or try again.",
  textHeading: "K's Experience — report incorrect information (NOT SENT)", textBusiness: "Business", textCategory: "Category",
  textDetails: "Details", textEvidence: "Supporting link", textContact: "Contact email", textPage: "Page",
};
const vi: typeof en = {
  open: "Báo thông tin chưa đúng",
  title: "Báo thông tin chưa đúng",
  subtitle: "Giúp K's Experience luôn chính xác.",
  about: "Về",
  categoryLegend: "Thông tin nào chưa đúng?",
  categories: {
    "incorrect-address": "Sai địa chỉ", "permanently-closed": "Cơ sở đã đóng cửa vĩnh viễn", "incorrect-hours": "Sai giờ mở cửa",
    "incorrect-phone": "Sai số điện thoại", "outdated-menu": "Thực đơn đã cũ", "incorrect-price": "Sai giá",
    "incorrect-photo": "Sai hình ảnh", "missing-information": "Thiếu thông tin", other: "Khác",
  },
  details: "Chi tiết", detailsHint: "Thông tin nào chưa đúng, và thông tin đúng là gì (nếu bạn biết)?",
  evidenceUrl: "Đường dẫn minh chứng (không bắt buộc)", evidenceUrlHint: "vd. trang của chính cơ sở hoặc bài đăng gần đây",
  photo: "Ảnh minh chứng (không bắt buộc)", photoHint: "JPEG, PNG hoặc WebP · tối đa 5 MB · chỉ nhóm kiểm duyệt xem được",
  photoSignIn: "Đăng nhập để đính kèm ảnh. Bạn vẫn có thể báo mà không cần ảnh.",
  photoLocal: "Bản xem thử này không đính kèm được ảnh.",
  email: "Email để chúng tôi liên hệ lại (không bắt buộc)", emailHint: "Chỉ nhóm kiểm duyệt xem được. Để trống nếu muốn ẩn danh.",
  notice: "Báo cáo được gửi tới nhóm kiểm duyệt. Báo cáo không trực tiếp thay đổi thông tin hiển thị.",
  submit: "Gửi báo cáo", sending: "Đang gửi…", cancel: "Hủy", edit: "Sửa báo cáo", close: "Đóng", done: "Xong",
  success: "Cảm ơn bạn — nhóm của chúng tôi sẽ xem xét. Báo cáo không trực tiếp thay đổi thông tin hiển thị.",
  localNotice: "Phiên bản K's Experience này chưa kết nối với hệ thống kiểm duyệt nên báo cáo sẽ không được gửi. Hãy sao chép và tự gửi cho nhóm K's Experience.",
  copy: "Sao chép báo cáo", copied: "Đã sao chép — chưa gửi. Hãy dán vào tin nhắn gửi nhóm K's Experience.",
  copyFailed: "Không sao chép tự động được — hãy chọn và sao chép nội dung bên dưới. Báo cáo chưa được gửi.",
  errors: {
    required: "Bắt buộc", "too-short": "Vui lòng viết thêm vài chữ", "too-long": "Quá dài (tối đa 2.000 ký tự)",
    invalid: "Không hợp lệ", "photo-type": "Chỉ nhận JPEG, PNG hoặc WebP", "photo-size": "Ảnh lớn hơn 5 MB",
  },
  failed: "Chưa gửi được báo cáo. Vui lòng thử lại.", rateLimited: "Có quá nhiều báo cáo từ đây gần đây. Vui lòng thử lại sau.",
  unknownEstablishment: "Cơ sở này chưa nhận báo cáo.", photoFailed: "Chưa tải được ảnh lên. Hãy bỏ ảnh hoặc thử lại.",
  textHeading: "K's Experience — báo thông tin chưa đúng (CHƯA GỬI)", textBusiness: "Cơ sở", textCategory: "Loại",
  textDetails: "Chi tiết", textEvidence: "Đường dẫn minh chứng", textContact: "Email liên hệ", textPage: "Trang",
};
export type ReportStrings = typeof en;
export const reportDict = (l: Locale): ReportStrings => (l === "vi" ? vi : en);
