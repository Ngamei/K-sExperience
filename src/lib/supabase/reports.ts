"use client";
/**
 * "Report incorrect information" persistence (Supabase, anon/auth client only — never the service role).
 * RLS (migration 0017) decides everything: guests insert but cannot read back (so inserts use return=minimal),
 * reporters read their own, staff read all and triage. A report never writes the listing itself.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { REPORT_BUCKET, REPORT_LIMITS, isReportStatus, reportErrorKind, reportPhotoPath, toReportRow, type CleanReport, type ReportCategory, type ReportStatus, type ReportTarget } from "../business/report";

export type SubmitResult = { ok: true; id: string } | { ok: false; error: "rate-limited" | "unknown-establishment" | "photo-failed" | "failed" };

export async function submitInfoReport(sb: SupabaseClient, t: ReportTarget, r: CleanReport, o: { userId: string | null; photo?: File | null; locale: "en" | "vi" }): Promise<SubmitResult> {
  const id = crypto.randomUUID();
  let photoPath: string | null = null;
  if (o.photo && o.userId) {
    photoPath = reportPhotoPath(o.userId, id, o.photo.type);
    const up = await sb.storage.from(REPORT_BUCKET).upload(photoPath, o.photo, { contentType: o.photo.type, upsert: false });
    if (up.error) return { ok: false, error: "photo-failed" };
  }
  const { error } = await sb.from("info_reports").insert(toReportRow(t, r, { id, reporterId: o.userId, photoPath, locale: o.locale }));
  if (error) return { ok: false, error: reportErrorKind(error.message) };
  return { ok: true, id };
}

/** Admin review queue row (staff only — RLS returns nothing to anyone else). */
export interface InfoReportRow {
  id: string; establishment_id: string; establishment_name: string | null; experience: string; category: ReportCategory; details: string;
  evidence_url: string | null; evidence_photo_path: string | null; reporter_id: string | null; contact_email: string | null; locale: string | null;
  status: ReportStatus; resolution_note: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string;
}
const COLS = "id,establishment_id,establishment_name,experience,category,details,evidence_url,evidence_photo_path,reporter_id,contact_email,locale,status,resolution_note,reviewed_by,reviewed_at,created_at";

export async function listInfoReports(sb: SupabaseClient, f: { status?: ReportStatus | "all"; category?: ReportCategory | "all" } = {}): Promise<InfoReportRow[]> {
  let q = sb.from("info_reports").select(COLS);
  if (f.status && f.status !== "all") q = q.eq("status", f.status);
  if (f.category && f.category !== "all") q = q.eq("category", f.category);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(`reports: ${error.message}`);
  return (data ?? []) as InfoReportRow[];
}

/** Staff triage: only status + resolution note; the database stamps reviewer + time and audits the change. */
export async function updateInfoReport(sb: SupabaseClient, id: string, status: ReportStatus, note: string) {
  if (!isReportStatus(status)) throw new Error("status: unknown");
  const n = note.trim();
  if (n.length > REPORT_LIMITS.noteMax) throw new Error(`resolution note: at most ${REPORT_LIMITS.noteMax} characters`);
  const { error } = await sb.from("info_reports").update({ status, resolution_note: n || null }).eq("id", id);
  if (error) throw new Error(`report: ${error.message}`);
}

/** Short-lived signed URL for a private evidence photo (staff only — the storage policy refuses everyone else). */
export async function reportPhotoUrl(sb: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await sb.storage.from(REPORT_BUCKET).createSignedUrl(path, 600);
  if (error || !data) throw new Error(`photo: ${error?.message ?? "unavailable"}`);
  return data.signedUrl;
}
