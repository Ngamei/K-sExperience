"use client";
/**
 * Admin → Customer Reports (KEX-BIZ-04): the review queue for "Report incorrect information".
 * Staff only — the Admin Portal gate fails closed and RLS (0017) returns rows only to staff. Triage changes only the
 * report (status + resolution note, audited); fixing the listing itself is a normal, sourced catalogue edit.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ImageIcon } from "lucide-react";
import { useState } from "react";
import { REPORT_CATEGORIES, REPORT_LIMITS, REPORT_STATUSES, establishmentHref, type ReportCategory, type ReportStatus } from "@/lib/business/report";
import { reportDict } from "@/lib/i18n/report-dict";
import { getSupabase } from "@/lib/supabase/client";
import { listInfoReports, reportPhotoUrl, updateInfoReport, type InfoReportRow } from "@/lib/supabase/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { field, label } from "./admin-forms";
import { cn } from "@/lib/utils";

const CAT = reportDict("en").categories;
const STATUS_TONE: Record<ReportStatus, "warn" | "forest" | "outline"> = { new: "warn", reviewing: "outline", resolved: "forest", rejected: "outline" };

export function ReportsQueue({ enabled }: { enabled: boolean }) {
  const [status, setStatus] = useState<ReportStatus | "all">("new");
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const q = useQuery({ queryKey: ["info-reports", status, category], queryFn: () => listInfoReports(getSupabase()!, { status, category }), enabled });
  if (!enabled) {
    return (
      <p className="rounded-2xl border border-line bg-paper p-3 text-sm text-muted" data-testid="admin-reports-local">
        Customer reports are stored in Supabase (table <code>info_reports</code>, private bucket <code>report-evidence</code>) and shown here to signed-in staff.
        Builds without the database send nothing: the customer is told the report was not sent and can only copy it.
      </p>
    );
  }
  return (
    <section className="space-y-4" data-testid="admin-reports">
      <p className="text-sm text-muted">Reports from customers and guests. A report never changes a listing: verify it against a source, correct the listing in Business Directory / Menus if needed, then resolve it here. Every status change is audited.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm"><span className={label}>Status</span>
          <select className={field} value={status} onChange={(e) => setStatus(e.target.value as ReportStatus | "all")} data-testid="reports-filter-status">
            <option value="all">All</option>{REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></label>
        <label className="text-sm"><span className={label}>Category</span>
          <select className={field} value={category} onChange={(e) => setCategory(e.target.value as ReportCategory | "all")} data-testid="reports-filter-category">
            <option value="all">All</option>{REPORT_CATEGORIES.map((c) => <option key={c} value={c}>{CAT[c]}</option>)}
          </select></label>
        <span className="pb-2 text-sm text-muted" data-testid="reports-count">{q.data ? `${q.data.length} report${q.data.length === 1 ? "" : "s"}` : q.isLoading ? "Loading…" : ""}</span>
      </div>
      {q.error && <p role="alert" className="text-sm text-[#8a3f26]">{(q.error as Error).message}</p>}
      {q.data && q.data.length === 0 && <p className="rounded-2xl bg-paper p-4 text-sm text-muted" data-testid="reports-empty">No reports match these filters.</p>}
      <ul className="space-y-3">{(q.data ?? []).map((r) => <ReportItem key={r.id} r={r} />)}</ul>
    </section>
  );
}

function ReportItem({ r }: { r: InfoReportRow }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>(r.status);
  const [note, setNote] = useState(r.resolution_note ?? "");
  const [msg, setMsg] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const save = async () => {
    try { await updateInfoReport(getSupabase()!, r.id, status, note); setMsg("Saved ✓"); await qc.invalidateQueries({ queryKey: ["info-reports"] }); }
    catch (e) { setMsg((e as Error).message); }
  };
  const viewPhoto = async () => {
    try { setPhoto(await reportPhotoUrl(getSupabase()!, r.evidence_photo_path!)); } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <li className="space-y-2 rounded-2xl border border-line/80 bg-paper p-4 text-sm" data-testid="report-row" data-status={r.status} data-category={r.category} data-report={r.id}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[r.status]} data-testid="report-row-status">{r.status}</Badge>
        <strong>{CAT[r.category] ?? r.category}</strong>
        <span className="text-muted">· {r.experience} ·</span>
        <a href={establishmentHref(r.experience, r.establishment_id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline hover:text-forest" data-testid="report-row-business">
          {r.establishment_name || r.establishment_id} <ExternalLink className="size-3" />
        </a>
        <span className="ml-auto text-xs text-muted">{new Date(r.created_at).toLocaleString()}</span>
      </div>
      <p className="whitespace-pre-wrap break-words" data-testid="report-row-details">{r.details}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {r.evidence_url && <a href={r.evidence_url} target="_blank" rel="noreferrer nofollow" className="underline" data-testid="report-row-evidence-url">Evidence link ↗</a>}
        {r.evidence_photo_path && (photo
          ? <a href={photo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline" data-testid="report-photo-link"><ImageIcon className="size-3" /> Open photo (link expires in 10 min)</a>
          : <button type="button" className="inline-flex items-center gap-1 underline" onClick={viewPhoto} data-testid="report-view-photo"><ImageIcon className="size-3" /> View photo</button>)}
        <span>Reporter: {r.reporter_id ? <code>{r.reporter_id.slice(0, 8)}</code> : "guest"}</span>
        {r.contact_email && <span data-testid="report-row-email">Contact: {r.contact_email}</span>}
        {r.locale && <span>Language: {r.locale}</span>}
        {r.reviewed_at && <span>Reviewed {new Date(r.reviewed_at).toLocaleString()} by <code>{r.reviewed_by?.slice(0, 8)}</code></span>}
      </div>
      {photo && /* eslint-disable-next-line @next/next/no-img-element -- private evidence via short-lived signed URL */
        <img src={photo} alt="Evidence photo submitted with the report" className="max-h-64 rounded-xl border border-line" data-testid="report-photo-img" />}
      <div className="flex flex-wrap items-end gap-2 border-t border-line/60 pt-2">
        <label><span className={label}>Status</span>
          <select className={cn(field, "w-36")} value={status} onChange={(e) => setStatus(e.target.value as ReportStatus)} data-testid="report-status-select">
            {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></label>
        <label className="min-w-56 flex-1"><span className={label}>Resolution note</span>
          <input className={field} value={note} maxLength={REPORT_LIMITS.noteMax} onChange={(e) => setNote(e.target.value)} placeholder="What was checked / changed" data-testid="report-note" /></label>
        <Button size="sm" onClick={save} data-testid="report-save">Save</Button>
        {msg && <span className="text-xs" data-testid="report-message">{msg}</span>}
      </div>
    </li>
  );
}
