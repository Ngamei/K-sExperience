"use client";
/**
 * Business Profile Engine — shared public profile for every business type (KEX-BIZ-02).
 * HeroMedia · BranchIdentity · ContactFacts · ContactActions · OfferingList (+ PriceEntitlement, EvidenceLabel) ·
 * HoursPanel · SourceFreshness · ReportCorrection / ClaimBusiness. Type-specific only through BUSINESS_TYPE_DEFS.
 */
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Bookmark, Check, Clock, ExternalLink, Flag, Globe, Lock, MapPin, Navigation, Phone, Share2, Store, TriangleAlert } from "lucide-react";
import { loc, themeVars } from "@/experiences/registry";
import { BUSINESS_TYPE_DEFS, formatVnd, priceAccess, type BusinessProfileModel, type BusinessTypeDef, type ProfileOffering } from "@/lib/business/profile";
import { businessDict, type BusinessStrings } from "@/lib/i18n/business-dict";
import { isOpenAt } from "@/lib/food/hours";
import { useT } from "@/lib/i18n/use-t";
import { COPY } from "@/engine/copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SampleBadge, StatusDot } from "@/components/food/badges";
import { useAuth } from "@/components/shell/auth-provider";
import { cn } from "@/lib/utils";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** Schematic illustration per business type — always labelled, never presented as the venue. */
function HeroMedia({ def, s }: { def: BusinessTypeDef; s: BusinessStrings }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const art: Record<BusinessTypeDef["art"], React.ReactNode> = {
    plate: <><circle cx="100" cy="50" r="30" {...stroke} /><circle cx="100" cy="50" r="18" {...stroke} /><path d="M52 24v52M46 24v14a6 6 0 0 0 12 0V24M148 24c-8 6-8 26 0 30v22" {...stroke} /></>,
    cups: <>{[40, 85, 130].map((x) => <g key={x}><rect x={x} y="24" width="34" height="54" rx="6" {...stroke} /><path d={`M${x + 34} 38a10 10 0 0 1 0 20`} {...stroke} /><path d={`M${x} 40h34`} {...stroke} /></g>)}</>,
    glass: <>{[50, 92, 134].map((x) => <g key={x}><path d={`M${x} 22h28l-4 56h-20z`} {...stroke} /><path d={`M${x + 2} 36h24`} {...stroke} /></g>)}</>,
    nails: <>{[60, 85, 110, 135].map((x, i) => <rect key={x} x={x} y={30 - (i % 2) * 6} width="16" height="40" rx="8" {...stroke} />)}</>,
    massage: <><rect x="45" y="30" width="110" height="26" rx="8" {...stroke} /><circle cx="64" cy="43" r="8" {...stroke} /><path d="M58 56v22M142 56v22" {...stroke} /></>,
    pilates: <>{[48, 108].map((x) => <g key={x}><path d={`M${x} 20h16M${x} 20v28`} {...stroke} /><rect x={x - 2} y="48" width="48" height="14" rx="5" {...stroke} /><path d={`M${x + 4} 62v16M${x + 40} 62v16`} {...stroke} /></g>)}</>,
    court: <><rect x="50" y="18" width="100" height="62" {...stroke} /><path d="M50 49h100M86 18v62M114 18v62" {...stroke} /></>,
    bags: <>{[55, 90, 125].map((x) => <g key={x}><rect x={x} y="34" width="26" height="44" rx="2" {...stroke} /><path d={`M${x + 6} 34v-6a7 7 0 0 1 14 0v6`} {...stroke} /></g>)}</>,
  };
  return (
    <div className="relative overflow-hidden rounded-2xl bg-sage-soft/70 text-forest" data-testid="hero-media" data-art={def.art}>
      <svg viewBox="0 0 200 100" className="mx-auto h-32 w-full max-w-sm md:h-40" role="img" aria-label={s.illustration}>{art[def.art]}</svg>
      <span className="absolute bottom-2 left-3 rounded-full bg-paper/90 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted">{s.illustration}</span>
    </div>
  );
}

function Fact({ icon: Icon, label, children, testid, known }: { icon: typeof Phone; label: string; children: React.ReactNode; testid: string; known: boolean }) {
  return (
    <div className="flex gap-2.5" data-testid={testid} data-known={known}>
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0 text-sm"><dt className="text-xs text-muted">{label}</dt><dd className={cn("break-words", !known && "text-muted")}>{children}</dd></div>
    </div>
  );
}

/** PriceEntitlement: the one place that decides what a viewer sees of a detailed price. */
function PriceEntitlement({ o, s }: { o: ProfileOffering; s: BusinessStrings }) {
  const { membership, status } = useAuth();
  const access = priceAccess(status === "signed-in" ? membership : null, { unlocked: false, usedUnlocks: 0 });
  if (!o.priceVnd) return <span className="text-xs text-muted" data-testid="offering-price" data-state="unknown">{s.priceNotRecorded}</span>;
  if (access === "full") return <span className="font-semibold tabular-nums text-forest" data-testid="offering-price" data-state="shown">{formatVnd(o.priceVnd)}{o.priceUnit ? <span className="block text-right text-[11px] font-normal text-muted">{o.priceUnit}</span> : null}</span>;
  // Enforcement path (KEX-MEM-04): unlocking is recorded server-side; until that exists the control is inert.
  return <Button size="sm" variant="outline" disabled data-testid="offering-price" data-state={access}><Lock /> {access === "unlockable" ? s.unlockPrice : s.premiumPrice}</Button>;
}

function OfferingList({ items, s, testid, thumb }: { items: ProfileOffering[]; s: BusinessStrings; testid: string; thumb?: (id: string) => React.ReactNode }) {
  if (!items.length) return <p className="rounded-2xl bg-ivory p-4 text-sm text-muted" data-testid="offerings-empty">{s.noOfferings}</p>;
  return (
    <ol className="divide-y divide-line/70" data-testid="offering-list">
      {items.map((o, i) => {
        const name = o.href ? <Link href={o.href} className="font-medium hover:text-forest hover:underline">{o.name}</Link> : <span className="font-medium">{o.name}</span>;
        return (
          <li key={o.id} className="flex gap-3 py-3" data-testid={testid} data-offering={o.id}>
            {thumb ? <span className="shrink-0">{thumb(o.id)}</span> : <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sage-soft text-sm font-semibold text-forest">{i + 1}</span>}
            <div className="min-w-0 flex-1">
              {name}
              {o.detail && <p className="text-xs text-muted">{o.detail}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
                <StatusDot status={o.status} />
                {o.evidence && <span>{s.evidence}: {o.evidence.note}{o.evidence.url && <> <a href={o.evidence.url} target="_blank" rel="noreferrer" className="underline">↗</a></>}</span>}
                {o.lastVerified && <span>· {s.lastChecked} {o.lastVerified}</span>}
              </div>
            </div>
            <div className="shrink-0 text-right text-sm"><PriceEntitlement o={o} s={s} /></div>
          </li>
        );
      })}
    </ol>
  );
}

export interface ProfileActions {
  saved: boolean; onSave: () => void; saveTestId: string;
  visitedOn?: string; onVisited: () => void; visitedTestId: string;
  mapsTestId?: string;
}

export function BusinessProfile({ model: m, back, actions, offeringTestId = "offering-row", testid, thumb, children }: {
  model: BusinessProfileModel; back: { href: string; label: string }; actions: ProfileActions; offeringTestId?: string; testid: string; children?: React.ReactNode;
  /** Optional offering thumbnail (credited photo or illustration) in place of the row number. */
  thumb?: (offeringId: string) => React.ReactNode;
}) {
  const { locale } = useT();
  const s = businessDict(locale);
  const def = BUSINESS_TYPE_DEFS[m.type];
  const [shared, setShared] = useState(false);
  const open = isOpenAt(m.hours, new Date());
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: m.name, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 2500); }
    } catch { /* user cancelled */ }
  };
  const action = "h-11 justify-center rounded-xl";
  return (
    <article className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-6 md:py-10" style={themeVars(def.experience) as React.CSSProperties} data-testid={testid} data-business-type={m.type}>
      <Link href={back.href} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest"><ArrowLeft className="size-4" /> {back.label}</Link>
      {m.isSample && (
        <div className="flex gap-2 rounded-2xl bg-[#fff1c2] p-3 text-sm text-[#5f4a0f] ring-1 ring-[#e4c35a]" data-testid="sample-warning"><TriangleAlert className="size-5 shrink-0" /> {locale === "vi" ? "Đây là quán mẫu hư cấu dùng để minh họa giao diện. Đừng tìm đến — nơi này không tồn tại." : "This is a fictional sample venue used to demonstrate the interface. Do not visit — it does not exist."}</div>
      )}
      {m.closure && (
        <div className="flex gap-2 rounded-2xl bg-[#fde8e4] p-3 text-sm text-[#7a2e1f] ring-1 ring-[#e7a596]" data-testid="closure-notice" data-status={m.closure.status}>
          <TriangleAlert className="size-5 shrink-0" />
          <span>{m.closure.status === "permanently-closed" ? (locale === "vi" ? "Đã đóng cửa vĩnh viễn" : "Permanently closed") : (locale === "vi" ? "Đang tạm đóng cửa" : "Temporarily closed")}
            {" · "}{locale === "vi" ? "ghi nhận" : "reported"} {m.closure.reportedOn}. {locale === "vi" ? "Không còn được gợi ý." : "No longer recommended."}</span>
        </div>
      )}

      <section className="space-y-4 rounded-3xl border border-line/80 bg-paper p-4 md:p-5">
        <HeroMedia def={def} s={s} />
        <header data-testid="branch-identity">
          <h1 className="font-display text-3xl text-forest md:text-4xl">{m.name}</h1>
          <p className="mt-1 text-sm text-muted">{[m.area, loc(def.label, locale)].filter(Boolean).join(" · ")}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted" data-testid="profile-management"><Store className="size-3.5" aria-hidden /> {s.managed}</p>
          {(m.priceRange || m.chips.length > 0 || m.isSample) && (
            <ul className="mt-3 flex flex-wrap gap-1.5" data-testid="profile-chips">
              {m.isSample && <li><SampleBadge /></li>}
              {m.priceRange && <li><Badge tone="forest" data-testid="profile-price-range">{m.priceRange}</Badge></li>}
              {m.chips.map((c) => <li key={c}><Badge tone="forest">{c}</Badge></li>)}
            </ul>
          )}
        </header>

        <dl className="grid gap-3 border-t border-line/70 pt-4 sm:grid-cols-2" data-testid="contact-facts">
          <Fact icon={MapPin} label={s.address} testid="fact-address" known>{m.address}</Fact>
          <Fact icon={Phone} label={s.phone} testid="fact-phone" known={Boolean(m.phone)}>{m.phone ?? s.notPublished}</Fact>
          <Fact icon={Clock} label={s.hours} testid="fact-hours" known={Boolean(m.hours)}>{m.hours ? (open === null ? s.hoursUnknown : open ? s.openNow : s.closedNow) : s.hoursUnknown}</Fact>
          <Fact icon={Globe} label={s.web} testid="fact-web" known={Boolean(m.website || m.social)}>
            {m.website || m.social ? <span className="flex flex-wrap gap-x-3">{m.website && <a href={m.website} target="_blank" rel="noreferrer" className="underline">{new URL(m.website).host}</a>}{m.social && <a href={m.social} target="_blank" rel="noreferrer" className="underline">{new URL(m.social).host}</a>}</span> : s.notPublished}
          </Fact>
        </dl>
        {m.precision === "street" && <p className="text-xs text-[#8a6420]" data-testid="approx-location">{loc(COPY.approxLocation, locale)}</p>}
        {m.precision === "building" && <p className="text-xs text-[#8a6420]" data-testid="building-location">{loc(COPY.buildingLocation, locale)}</p>}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="contact-actions">
          {m.phone ? <Button asChild variant="subtle" className={action}><a href={`tel:${m.phone.replace(/\s/g, "")}`} data-testid="action-call"><Phone /> {s.call}</a></Button>
            : <Button variant="subtle" className={action} disabled data-testid="action-call" title={s.noPhone}><Phone /> {s.noPhone}</Button>}
          {m.isSample ? <Button variant="subtle" className={action} disabled><Navigation /> {s.directions}</Button>
            : <Button asChild variant="subtle" className={action}><a href={m.mapsUrl} target="_blank" rel="noreferrer" data-testid={actions.mapsTestId ?? "action-directions"}><Navigation /> {s.directions}</a></Button>}
          <Button variant={actions.saved ? "primary" : "subtle"} className={action} onClick={actions.onSave} aria-pressed={actions.saved} disabled={m.isSample} data-testid={actions.saveTestId}><Bookmark className={actions.saved ? "fill-current" : ""} /> {actions.saved ? s.saved : s.save}</Button>
          <Button variant="subtle" className={action} onClick={share} data-testid="action-share"><Share2 /> {shared ? s.copied : s.share}</Button>
        </div>
        {m.links && m.links.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="profile-links">{m.links.map((l) => <Button key={l.url} asChild variant="outline" size="sm"><a href={l.url} target="_blank" rel="noreferrer"><ExternalLink /> {l.label}</a></Button>)}</div>
        )}
        {!m.isSample && (
          <Button variant={actions.visitedOn ? "primary" : "outline"} size="sm" onClick={actions.onVisited} aria-pressed={Boolean(actions.visitedOn)} data-testid={actions.visitedTestId}>
            <Check /> {actions.visitedOn ? s.visitedOn.replace("{d}", actions.visitedOn) : s.visited}
          </Button>
        )}
      </section>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-3xl border border-line/80 bg-paper p-4 md:p-5" data-testid="section-profile-offerings">
          <h2 className="mb-1 font-display text-2xl text-forest">{loc(def.offeringsTitle, locale)}</h2>
          <OfferingList items={m.offerings} s={s} testid={offeringTestId} thumb={thumb} />
        </section>
        <aside className="space-y-4">
          {children}
          <div className="rounded-3xl border border-line/80 bg-paper p-5" data-testid="hours-panel">
            <h3 className="mb-2 flex items-center gap-2 font-display text-lg"><Clock className="size-4" /> {s.openingHours}</h3>
            {m.hours ? (
              <dl className="grid grid-cols-[44px_1fr] gap-y-0.5 text-sm">
                {DAYS.map((k) => <div key={k} className="contents"><dt className="text-muted">{s.days[k]}</dt><dd>{m.hours![k].length ? m.hours![k].map((x) => x.join("–")).join(", ") : "—"}</dd></div>)}
              </dl>
            ) : <p className="text-sm text-muted">{s.hoursUnknown}</p>}
            <p className="mt-2 text-[11px] text-muted">{s.timezone}</p>
          </div>
          <div className="rounded-3xl border border-line/80 bg-paper p-5 text-sm" data-testid="source-freshness">
            <h3 className="mb-1 font-display text-lg">{s.sources}</h3>
            <p className="text-xs text-muted">{s.lastChecked}: {m.lastVerified ?? "—"}</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted" data-testid="place-sources">
              {m.sources.map((src, i) => <li key={i}>{src.url ? <a href={src.url} target="_blank" rel="noreferrer" className="underline hover:text-forest">{src.title} <ExternalLink className="inline size-3" /></a> : src.title}{src.note ? ` — ${src.note}` : ""}</li>)}
            </ul>
          </div>
          <div className="space-y-2 rounded-3xl border border-line/80 bg-paper p-5 text-sm" data-testid="profile-footer-actions">
            {[[Flag, s.report, "action-report"], [Store, s.claim, "action-claim"]].map(([Icon, label, id]) => {
              const I = Icon as typeof Flag;
              return <div key={id as string} className="flex items-center justify-between gap-2 opacity-70" data-testid={id as string} aria-disabled><span className="flex items-center gap-2"><I className="size-4" aria-hidden /> {label as string}</span><Badge tone="outline">{s.soon}</Badge></div>;
            })}
          </div>
        </aside>
      </div>
    </article>
  );
}
