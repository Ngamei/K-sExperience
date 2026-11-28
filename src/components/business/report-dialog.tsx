"use client";
/**
 * ReportCorrection (KEX-BIZ-04): "Report incorrect information" on every business profile.
 * Desktop: centred modal · Mobile: bottom sheet (same Radix pattern as the Passport sign-in gate).
 * Supabase mode → the report is inserted for staff review (anon/auth client, RLS 0017). Local/static builds →
 * nothing can be sent, so the dialog says so and offers "Copy report" instead. A report never edits the listing.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Copy, Flag, Send, X } from "lucide-react";
import { useId, useState } from "react";
import { REPORT_CATEGORIES, REPORT_LIMITS, formatReportText, validateReport, type CleanReport, type ReportDraft, type ReportField, type ReportProblem, type ReportTarget } from "@/lib/business/report";
import { reportDict } from "@/lib/i18n/report-dict";
import { useT } from "@/lib/i18n/use-t";
import { getSupabase, supabaseEnabled } from "@/lib/supabase/client";
import { submitInfoReport } from "@/lib/supabase/reports";
import { useAuth } from "@/components/shell/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EMPTY: ReportDraft = { category: "", details: "", evidenceUrl: "", contactEmail: "" };
const input = "w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-forest/50";

type Phase = { kind: "form" } | { kind: "sending" } | { kind: "sent" } | { kind: "copied"; text: string; auto: boolean };

export function ReportButton({ target, disabled }: { target: ReportTarget; disabled?: boolean }) {
  const { locale } = useT();
  const r = reportDict(locale);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={disabled} data-testid="action-report"
        className="flex w-full items-center gap-2 rounded-xl py-1 text-left text-sm hover:text-forest disabled:opacity-50">
        <Flag className="size-4" aria-hidden /> {r.open}
      </button>
      {open && <ReportDialog target={target} open={open} onOpenChange={setOpen} />}
    </>
  );
}

export function ReportDialog({ target, open, onOpenChange }: { target: ReportTarget; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { locale } = useT();
  const r = reportDict(locale);
  const { status, user } = useAuth();
  const ids = useId();
  const [d, setD] = useState<ReportDraft>(EMPTY);
  const [photo, setPhoto] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<ReportField, ReportProblem>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const signedIn = status === "signed-in" && Boolean(user);
  const canPhoto = supabaseEnabled && signedIn;
  const set = (k: keyof ReportDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });

  const validate = (): CleanReport | null => {
    const v = validateReport(d, canPhoto && photo ? { type: photo.type, size: photo.size } : null);
    setErrors(v.ok ? {} : v.errors);
    return v.ok ? v.value : null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailure(null);
    const clean = validate();
    if (!clean) return;
    if (!supabaseEnabled) return copy(clean);
    const sb = getSupabase();
    if (!sb) return copy(clean);
    setPhase({ kind: "sending" });
    try {
      const res = await submitInfoReport(sb, target, clean, { userId: signedIn ? user!.id : null, photo: canPhoto ? photo : null, locale });
      if (res.ok) { setPhase({ kind: "sent" }); return; }
      setFailure(res.error === "rate-limited" ? r.rateLimited : res.error === "unknown-establishment" ? r.unknownEstablishment : res.error === "photo-failed" ? r.photoFailed : r.failed);
    } catch { setFailure(r.failed); }
    setPhase({ kind: "form" });
  };

  const copy = async (clean: CleanReport) => {
    const text = formatReportText({ ...target, pageUrl: target.pageUrl ?? window.location.href }, clean, {
      heading: r.textHeading, business: r.textBusiness, category: r.textCategory, details: r.textDetails, evidence: r.textEvidence,
      contact: r.textContact, page: r.textPage, categoryLabel: r.categories[clean.category],
    });
    let auto = false;
    try { await navigator.clipboard.writeText(text); auto = true; } catch { /* clipboard blocked: the text is shown to copy by hand */ }
    setPhase({ kind: "copied", text, auto });
  };

  const err = (k: ReportField) => errors[k] ? <p className="mt-1 text-xs text-[#8a3f26]" data-testid={`report-error-${k}`}>{r.errors[errors[k]!]}</p> : null;
  const labelCls = "mb-1 block text-sm font-medium text-charcoal";
  const hint = "mt-1 text-xs text-muted";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal/35 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-ivory p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl outline-none md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[88dvh] md:w-[520px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:p-7"
          onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).focus(); }}
          tabIndex={-1} style={{ outline: "none" }}
          data-testid="report-dialog" data-mode={supabaseEnabled ? "supabase" : "local"} data-phase={phase.kind}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-display text-xl text-forest">{r.title}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted">{r.subtitle}</Dialog.Description>
            </div>
            <Dialog.Close className="-m-1 rounded-full p-2 hover:bg-ivory-deep" aria-label={r.close} data-testid="report-close"><X className="size-5" /></Dialog.Close>
          </div>
          <p className="mb-4 rounded-xl bg-paper px-3 py-2 text-sm" data-testid="report-target">{r.about}: <strong>{target.establishmentName}</strong></p>

          {phase.kind === "sent" ? (
            <div className="space-y-4" data-testid="report-sent">
              <p className="flex gap-2 rounded-2xl bg-sage-soft p-3 text-sm text-forest" role="status"><CheckCircle2 className="size-5 shrink-0" aria-hidden /><span data-testid="report-success">{r.success}</span></p>
              <Dialog.Close asChild><Button className="w-full" data-testid="report-done">{r.done}</Button></Dialog.Close>
            </div>
          ) : phase.kind === "copied" ? (
            <div className="space-y-3" data-testid="report-copied" data-auto={phase.auto}>
              <p className="rounded-2xl bg-[#fff1c2] p-3 text-sm text-[#5f4a0f] ring-1 ring-[#e4c35a]" role="status" data-testid="report-not-sent">{phase.auto ? r.copied : r.copyFailed}</p>
              <textarea readOnly value={phase.text} rows={8} className={cn(input, "py-2 font-mono text-xs")} data-testid="report-copy-text" onFocus={(e) => e.currentTarget.select()} aria-label={r.copy} />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setPhase({ kind: "form" })} data-testid="report-edit">{r.edit}</Button>
                <Dialog.Close asChild><Button className="flex-1" data-testid="report-done">{r.done}</Button></Dialog.Close>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit} noValidate data-testid="report-form">
              <fieldset>
                <legend className={labelCls}>{r.categoryLegend}</legend>
                <div className="grid gap-1.5 sm:grid-cols-2" role="radiogroup">
                  {REPORT_CATEGORIES.map((c) => (
                    <label key={c} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm", d.category === c ? "border-forest bg-sage-soft text-forest" : "border-line bg-paper hover:border-forest/40")} data-testid={`report-category-${c}`}>
                      <input type="radio" name={`${ids}-category`} value={c} checked={d.category === c} onChange={() => setD({ ...d, category: c })} className="accent-forest" />
                      {r.categories[c]}
                    </label>
                  ))}
                </div>
                {err("category")}
              </fieldset>
              <div>
                <label htmlFor={`${ids}-details`} className={labelCls}>{r.details}</label>
                <textarea id={`${ids}-details`} rows={4} maxLength={REPORT_LIMITS.detailsMax} value={d.details} onChange={set("details")} placeholder={r.detailsHint} className={cn(input, "py-2")} data-testid="report-details" aria-invalid={Boolean(errors.details)} />
                <p className="mt-0.5 text-right text-[11px] text-muted">{d.details.trim().length} / {REPORT_LIMITS.detailsMax}</p>
                {err("details")}
              </div>
              <div>
                <label htmlFor={`${ids}-url`} className={labelCls}>{r.evidenceUrl}</label>
                <input id={`${ids}-url`} type="url" inputMode="url" value={d.evidenceUrl} onChange={set("evidenceUrl")} placeholder="https://" className={cn(input, "h-10")} data-testid="report-evidence-url" aria-invalid={Boolean(errors.evidenceUrl)} />
                <p className={hint}>{r.evidenceUrlHint}</p>
                {err("evidenceUrl")}
              </div>
              <div data-testid="report-photo-field" data-enabled={canPhoto}>
                <span className={labelCls}>{r.photo}</span>
                {canPhoto ? (
                  <>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="text-sm" data-testid="report-photo" aria-label={r.photo} />
                    <p className={hint}>{r.photoHint}</p>
                  </>
                ) : <p className={hint} data-testid="report-photo-unavailable">{supabaseEnabled ? r.photoSignIn : r.photoLocal}</p>}
                {err("photo")}
              </div>
              <div>
                <label htmlFor={`${ids}-email`} className={labelCls}>{r.email}</label>
                <input id={`${ids}-email`} type="email" inputMode="email" autoComplete="email" value={d.contactEmail} onChange={set("contactEmail")} className={cn(input, "h-10")} data-testid="report-email" aria-invalid={Boolean(errors.contactEmail)} />
                <p className={hint}>{r.emailHint}</p>
                {err("contactEmail")}
              </div>
              {supabaseEnabled
                ? <p className="text-xs text-muted" data-testid="report-notice">{r.notice}</p>
                : <p className="rounded-2xl bg-[#fff1c2] p-3 text-sm text-[#5f4a0f] ring-1 ring-[#e4c35a]" data-testid="report-local-notice">{r.localNotice}</p>}
              {failure && <p role="alert" className="rounded-xl bg-[#fde8e4] p-2 text-sm text-[#7a2e1f]" data-testid="report-error">{failure}</p>}
              <div className="flex gap-2">
                <Dialog.Close asChild><Button type="button" variant="outline" className="flex-1">{r.cancel}</Button></Dialog.Close>
                {supabaseEnabled
                  ? <Button type="submit" className="flex-1" disabled={phase.kind === "sending"} data-testid="report-submit"><Send /> {phase.kind === "sending" ? r.sending : r.submit}</Button>
                  : <Button type="submit" className="flex-1" data-testid="report-copy"><Copy /> {r.copy}</Button>}
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
