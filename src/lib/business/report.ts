/**
 * "Report incorrect information" (KEX-BIZ-04) — pure model shared by the profile dialog, the Admin review queue
 * and the tests. A report never changes canonical business data: it is a row in `info_reports` (migration 0017)
 * that staff triage. The limits below mirror the database checks exactly.
 */
import type { ExperienceId } from "@/experiences/registry";

export const REPORT_CATEGORIES = [
  "incorrect-address", "permanently-closed", "incorrect-hours", "incorrect-phone", "outdated-menu",
  "incorrect-price", "incorrect-photo", "missing-information", "other",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export const isReportCategory = (x: unknown): x is ReportCategory => typeof x === "string" && (REPORT_CATEGORIES as readonly string[]).includes(x);

export const REPORT_STATUSES = ["new", "reviewing", "resolved", "rejected"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const isReportStatus = (x: unknown): x is ReportStatus => typeof x === "string" && (REPORT_STATUSES as readonly string[]).includes(x);

export const REPORT_LIMITS = { detailsMin: 5, detailsMax: 2000, urlMax: 500, emailMax: 254, noteMax: 2000, photoMaxBytes: 5 * 1024 * 1024 } as const;
export const REPORT_PHOTO_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
export const REPORT_BUCKET = "report-evidence";

/** The business being reported (what the reporter saw). */
export interface ReportTarget { establishmentId: string; establishmentName: string; experience: ExperienceId; pageUrl?: string }
/** What the reporter typed (raw form state). */
export interface ReportDraft { category: ReportCategory | ""; details: string; evidenceUrl: string; contactEmail: string }
/** A validated report, trimmed; empty optional fields are undefined. */
export interface CleanReport { category: ReportCategory; details: string; evidenceUrl?: string; contactEmail?: string }
export type ReportField = "category" | "details" | "evidenceUrl" | "contactEmail" | "photo";
export type ReportProblem = "required" | "too-short" | "too-long" | "invalid" | "photo-type" | "photo-size";

const URL_RE = /^https?:\/\/\S+$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateReport(d: ReportDraft, photo?: { type: string; size: number } | null):
  { ok: true; value: CleanReport } | { ok: false; errors: Partial<Record<ReportField, ReportProblem>> } {
  const errors: Partial<Record<ReportField, ReportProblem>> = {};
  const details = d.details.trim();
  const evidenceUrl = d.evidenceUrl.trim();
  const contactEmail = d.contactEmail.trim();
  if (!isReportCategory(d.category)) errors.category = "required";
  if (!details) errors.details = "required";
  else if (details.length < REPORT_LIMITS.detailsMin) errors.details = "too-short";
  else if (details.length > REPORT_LIMITS.detailsMax) errors.details = "too-long";
  if (evidenceUrl && (!URL_RE.test(evidenceUrl) || evidenceUrl.length > REPORT_LIMITS.urlMax || !safeUrl(evidenceUrl))) errors.evidenceUrl = "invalid";
  if (contactEmail && (!EMAIL_RE.test(contactEmail) || contactEmail.length > REPORT_LIMITS.emailMax)) errors.contactEmail = "invalid";
  if (photo) {
    if (!(photo.type in REPORT_PHOTO_TYPES)) errors.photo = "photo-type";
    else if (photo.size > REPORT_LIMITS.photoMaxBytes) errors.photo = "photo-size";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { category: d.category as ReportCategory, details, ...(evidenceUrl ? { evidenceUrl } : {}), ...(contactEmail ? { contactEmail } : {}) } };
}
const safeUrl = (u: string) => { try { return ["http:", "https:"].includes(new URL(u).protocol); } catch { return false; } };

/** Storage path of an evidence photo: always inside the reporter's own folder (storage policy, 0017). */
export function reportPhotoPath(userId: string, reportId: string, mime: string): string {
  const ext = REPORT_PHOTO_TYPES[mime as keyof typeof REPORT_PHOTO_TYPES];
  if (!ext) throw new Error("photo: JPEG, PNG or WebP only");
  return `${userId}/${reportId}.${ext}`;
}

/** The `info_reports` insert row. Status / reviewer fields are never sent: the database sets them. */
export function toReportRow(t: ReportTarget, r: CleanReport, o: { id: string; reporterId?: string | null; photoPath?: string | null; locale: "en" | "vi" }) {
  return {
    id: o.id, establishment_id: t.establishmentId, establishment_name: t.establishmentName.slice(0, 200), experience: t.experience,
    category: r.category, details: r.details, evidence_url: r.evidenceUrl ?? null, evidence_photo_path: o.photoPath ?? null,
    reporter_id: o.reporterId ?? null, contact_email: r.contactEmail ?? null, locale: o.locale,
  };
}

/** Plain-text report for the local/static fallback ("Copy report") — nothing is sent from those builds. */
export function formatReportText(t: ReportTarget, r: CleanReport, labels: { heading: string; business: string; category: string; details: string; evidence: string; contact: string; page: string; categoryLabel: string }): string {
  return [
    labels.heading,
    `${labels.business}: ${t.establishmentName} (${t.establishmentId} · ${t.experience})`,
    t.pageUrl ? `${labels.page}: ${t.pageUrl}` : null,
    `${labels.category}: ${labels.categoryLabel} [${r.category}]`,
    `${labels.details}: ${r.details}`,
    r.evidenceUrl ? `${labels.evidence}: ${r.evidenceUrl}` : null,
    r.contactEmail ? `${labels.contact}: ${r.contactEmail}` : null,
  ].filter(Boolean).join("\n");
}

/** Public profile URL of a reported establishment (Admin queue link). */
export function establishmentHref(experience: string, id: string): string {
  const e = encodeURIComponent(id);
  return experience === "food" ? `/places/${e}/` : `/${encodeURIComponent(experience)}/nearby/?id=${e}`;
}

/** Map a database / network error to what the reporter is told. */
export function reportErrorKind(message: string | undefined): "rate-limited" | "unknown-establishment" | "failed" {
  if (message?.includes("report_rate_limited")) return "rate-limited";
  if (message?.includes("unknown_establishment")) return "unknown-establishment";
  return "failed";
}
