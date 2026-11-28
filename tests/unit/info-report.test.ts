import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REPORT_CATEGORIES, REPORT_STATUSES, establishmentHref, formatReportText, reportErrorKind, reportPhotoPath, toReportRow, validateReport, type ReportDraft } from "@/lib/business/report";
import { reportDict } from "@/lib/i18n/report-dict";

const draft = (p: Partial<ReportDraft> = {}): ReportDraft => ({ category: "incorrect-hours", details: "Closes at 21:00, not 22:00.", evidenceUrl: "", contactEmail: "", ...p });
const target = { establishmentId: "pho-hoa-pasteur", establishmentName: "Phở Hòa Pasteur", experience: "food" as const };

describe("report validation (mirrors migration 0017)", () => {
  it("accepts a minimal report and trims it; empty optionals are dropped", () => {
    const v = validateReport(draft({ details: "  Wrong hours here  ", evidenceUrl: "  ", contactEmail: "" }));
    expect(v).toEqual({ ok: true, value: { category: "incorrect-hours", details: "Wrong hours here" } });
  });
  it("requires a known category and 5–2000 characters of details", () => {
    expect(validateReport(draft({ category: "" }))).toMatchObject({ ok: false, errors: { category: "required" } });
    expect(validateReport(draft({ category: "hacked" as never }))).toMatchObject({ ok: false, errors: { category: "required" } });
    expect(validateReport(draft({ details: "   " }))).toMatchObject({ ok: false, errors: { details: "required" } });
    expect(validateReport(draft({ details: "abcd" }))).toMatchObject({ ok: false, errors: { details: "too-short" } });
    expect(validateReport(draft({ details: "x".repeat(2001) }))).toMatchObject({ ok: false, errors: { details: "too-long" } });
    expect(validateReport(draft({ details: "x".repeat(2000) })).ok).toBe(true);
  });
  it("evidence link must be http(s); email must look like an email", () => {
    expect(validateReport(draft({ evidenceUrl: "javascript:alert(1)" }))).toMatchObject({ ok: false, errors: { evidenceUrl: "invalid" } });
    expect(validateReport(draft({ evidenceUrl: "example.com" }))).toMatchObject({ ok: false, errors: { evidenceUrl: "invalid" } });
    expect(validateReport(draft({ evidenceUrl: `https://x.test/${"a".repeat(500)}` }))).toMatchObject({ ok: false, errors: { evidenceUrl: "invalid" } });
    expect(validateReport(draft({ contactEmail: "not-an-email" }))).toMatchObject({ ok: false, errors: { contactEmail: "invalid" } });
    expect(validateReport(draft({ evidenceUrl: "https://facebook.com/venue/posts/1", contactEmail: "me@example.com" }))).toEqual({
      ok: true, value: { category: "incorrect-hours", details: "Closes at 21:00, not 22:00.", evidenceUrl: "https://facebook.com/venue/posts/1", contactEmail: "me@example.com" },
    });
  });
  it("photo: JPEG/PNG/WebP up to 5 MB", () => {
    expect(validateReport(draft(), { type: "image/gif", size: 10 })).toMatchObject({ ok: false, errors: { photo: "photo-type" } });
    expect(validateReport(draft(), { type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toMatchObject({ ok: false, errors: { photo: "photo-size" } });
    expect(validateReport(draft(), { type: "image/webp", size: 1000 }).ok).toBe(true);
  });
  it("categories and statuses match the database check constraints", () => {
    const sql = readFileSync("supabase/migrations/0017_info_reports.sql", "utf8");
    for (const c of REPORT_CATEGORIES) expect(sql).toContain(`'${c}'`);
    expect(sql).toContain(`status in (${REPORT_STATUSES.map((s) => `'${s}'`).join(", ")})`);
    expect(REPORT_CATEGORIES).toHaveLength(9);
  });
});

describe("report payload", () => {
  it("insert row never carries status or reviewer fields", () => {
    const v = validateReport(draft({ contactEmail: "me@example.com" }));
    if (!v.ok) throw new Error("invalid");
    const row = toReportRow(target, v.value, { id: "r1", reporterId: null, locale: "vi" });
    expect(row).toEqual({ id: "r1", establishment_id: "pho-hoa-pasteur", establishment_name: "Phở Hòa Pasteur", experience: "food", category: "incorrect-hours", details: "Closes at 21:00, not 22:00.", evidence_url: null, evidence_photo_path: null, reporter_id: null, contact_email: "me@example.com", locale: "vi" });
    for (const k of ["status", "reviewed_by", "reviewed_at", "resolution_note", "created_at"]) expect(row).not.toHaveProperty(k);
  });
  it("photo path is inside the reporter's own folder", () => {
    expect(reportPhotoPath("uid-1", "r1", "image/png")).toBe("uid-1/r1.png");
    expect(() => reportPhotoPath("uid-1", "r1", "image/gif")).toThrow();
  });
  it("copy-fallback text names the business, category, details and says NOT SENT", () => {
    const v = validateReport(draft({ evidenceUrl: "https://x.test/p" }));
    if (!v.ok) throw new Error("invalid");
    const r = reportDict("en");
    const text = formatReportText({ ...target, pageUrl: "https://ks.test/places/pho-hoa-pasteur/" }, v.value, { heading: r.textHeading, business: r.textBusiness, category: r.textCategory, details: r.textDetails, evidence: r.textEvidence, contact: r.textContact, page: r.textPage, categoryLabel: r.categories[v.value.category] });
    expect(text.split("\n")).toEqual([
      "K's Experience — report incorrect information (NOT SENT)",
      "Business: Phở Hòa Pasteur (pho-hoa-pasteur · food)",
      "Page: https://ks.test/places/pho-hoa-pasteur/",
      "Category: Incorrect opening hours [incorrect-hours]",
      "Details: Closes at 21:00, not 22:00.",
      "Supporting link: https://x.test/p",
    ]);
  });
  it("Vietnamese copy covers every category and the required strings", () => {
    const en = reportDict("en"), vi = reportDict("vi");
    expect(en.title).toBe("Report incorrect information");
    expect(en.subtitle).toBe("Help us keep K's Experience accurate.");
    expect(en.success).toBe("Thanks — our team will review it. Your report does not change the listing directly.");
    for (const c of REPORT_CATEGORIES) { expect(vi.categories[c]).toBeTruthy(); expect(vi.categories[c]).not.toBe(en.categories[c]); }
  });
  it("admin link and error mapping", () => {
    expect(establishmentHref("food", "pho-hoa-pasteur")).toBe("/places/pho-hoa-pasteur/");
    expect(establishmentHref("sport", "pickoland-thao-dien")).toBe("/sport/nearby/?id=pickoland-thao-dien");
    expect(reportErrorKind("report_rate_limited:reporter")).toBe("rate-limited");
    expect(reportErrorKind("unknown_establishment")).toBe("unknown-establishment");
    expect(reportErrorKind("boom")).toBe("failed");
  });
});
