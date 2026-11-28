"use client";
import { useEffect, useState } from "react";
import { Check, Clock, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/use-t";
import { settingsDict, type SettingsStrings } from "@/lib/i18n/settings-dict";
import { annualSavingsPct, BENEFITS, FOUNDING_BENEFITS, FOUNDING_PROGRAMME, foundingSectionVisible, LIMITS, PLANS, TIERS, usd, type Benefit, type Tier } from "@/lib/membership/plans";
import { getSupabase } from "@/lib/supabase/client";
import { claimFoundingMembership, loadFoundingPlacesLeft, loadMenuUnlockUsage } from "@/lib/supabase/membership";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EXPERIENCES, isSelectable, loc } from "@/experiences/registry";
import { FOOD } from "@/lib/passport/model";
import { allPassportsOf, useUser } from "@/lib/store/user";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/shell/auth-provider";
import { cn } from "@/lib/utils";
import { SubPageHeader } from "./settings-ui";

const benefitLabel = (b: Benefit, s: SettingsStrings) => {
  if (b.id === "favourites") return b.value === Infinity ? s.b_favouritesUnlimited : s.b_favourites.replace("{n}", String(b.value));
  if (b.id === "menuUnlocks") return s.b_menuUnlocks.replace("{n}", String(b.value));
  return s[`b_${b.id}`];
};

/**
 * K's Membership (KEX-MEM-01): plan comparison with the PO's introductory USD prices and benefits (D71, D72).
 * Benefits not built yet are marked "Coming"; limits are not enforced and there is no checkout.
 */
export function MembershipView() {
  const { locale } = useT();
  const s = settingsDict(locale);
  const { status, membership } = useAuth();
  const current = status === "signed-in" ? membership : null;
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-6 md:py-10" data-testid="membership">
      <SubPageHeader back={s.back} title={s.membership} intro={s.membershipIntro} />
      <p className="rounded-2xl border border-[#e9d9a6] bg-[#fbf3d9] p-3 text-sm text-[#5f4a0f]" data-testid="membership-not-on-sale">{s.notOnSale}</p>

      <ul className="grid gap-3 md:grid-cols-3">
        {TIERS.map((tier) => {
          const p = PLANS[tier];
          const mine = current === tier;
          const pct = annualSavingsPct(tier);
          return (
            <li key={tier} className={cn("flex flex-col rounded-3xl border bg-paper p-5", mine ? "border-forest" : "border-line/80", tier === "plus" && "bg-sage-soft/40")} data-testid={`membership-plan-${tier}`} data-current={mine || undefined}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-2xl text-forest">{p.name}</h2>
                {mine && <Badge tone="forest" data-testid="membership-current"><Check className="size-3" /> {s.currentPlan}</Badge>}
              </div>
              {p.monthly === null ? (
                <>
                  <p className="mt-2 font-display text-4xl">$0</p>
                  <p className="text-sm text-muted">{s.freeForever}</p>
                </>
              ) : (
                <>
                  <p className="mt-2 font-display text-4xl">{usd(p.monthly)}<span className="text-base text-muted">{s.perMonth}</span></p>
                  <p className="text-sm text-muted" data-testid={`membership-yearly-${tier}`}>{s.orYearly.replace("{price}", usd(p.yearly!))} · <span className="text-forest">{s.save.replace("{pct}", String(pct))}</span></p>
                </>
              )}
              <ul className="mt-4 space-y-1.5 border-t border-line/60 pt-3 text-sm">
                {BENEFITS[tier].map((b) => (
                  <li key={b.id} className={cn("flex items-start gap-2", !b.available && "text-charcoal/70")} data-testid={`benefit-${tier}-${b.id}`} data-available={b.available}>
                    {b.available ? <Check className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden /> : <Clock className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />}
                    <span className="flex-1">{benefitLabel(b, s)}</span>
                    {!b.available && <Badge tone="outline">{s.coming}</Badge>}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      {foundingSectionVisible() && <FoundingSection />}

      <section className="space-y-2 rounded-3xl border border-line/80 bg-paper p-5 text-sm text-muted md:p-6">
        <p data-testid="membership-limits-note">{s.limitsNote}</p>
        <p data-testid="membership-currency-note">{s.currencyNote}</p>
      </section>

      <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6" data-testid="membership-usage">
        <h2 className="font-display text-xl text-forest">{s.usage}</h2>
        {current && <p className="mt-1 text-sm">{s.yourPlan}: <strong data-testid="membership-tier">{PLANS[current].name}</strong></p>}
        <UsageMeters tier={current ?? "free"} />
        {current && <MenuUnlockMeter tier={current} />}
        <p className="mt-3 text-sm text-muted">{current ? s.usageBody : s.onDevice}</p>
        {current ? <p className="mt-1 text-xs text-muted">{s.subscriptionMgmt}</p> : <p className="mt-1 text-xs text-muted">{s.signInForPlan}</p>}
      </section>
    </div>
  );
}

/**
 * Complete menu unlocks used this billing period (RPC menu_unlock_usage, migration 0016). Signed-in members only —
 * guests cannot unlock. If the count cannot be read it is shown as unknown ("—"), never as 0.
 */
function MenuUnlockMeter({ tier }: { tier: Tier }) {
  const { locale } = useT();
  const s = settingsDict(locale);
  const [used, setUsed] = useState<number | null>(null);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let live = true;
    loadMenuUnlockUsage(sb).then((u) => { if (live) setUsed(u.used); }).catch(() => { if (live) setUsed(null); });
    return () => { live = false; };
  }, [tier]);
  const lim = LIMITS.menuUnlocksPerMonth[tier];
  return (
    <div className="mt-3 rounded-2xl bg-ivory p-3 text-sm" data-testid="usage-menu-unlocks">
      <div className="flex justify-between gap-2"><span className="font-medium">{s.menuUnlocksLbl}</span><span className="tabular-nums" data-testid="usage-menu-unlocks-count">{used ?? "—"} / {lim === Infinity ? s.unlimited : lim}</span></div>
      <p className="mt-1 text-xs text-muted">{s.menuUnlocksNote}</p>
    </div>
  );
}

/**
 * K's Founding Member (approved by the PO 2026-11-28; NEXT_PUBLIC_FOUNDING_PROGRAMME=0 hides it). Signed-in members
 * claim a place through claim_founding_membership() (the database enforces the switch, the cap and one claim per
 * member); guests are asked to sign in. Remaining places come from founding_places_left() — a count only.
 * Complimentary; nothing is charged afterwards.
 */
function FoundingSection() {
  const { locale } = useT();
  const s = settingsDict(locale);
  const { status, refreshMembership } = useAuth();
  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: true; validUntil: string } | { ok: false; reason: string } | null>(null);
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let live = true;
    loadFoundingPlacesLeft(sb).then((n) => { if (live) setLeft(n); });
    return () => { live = false; };
  }, [result]);
  const claim = async () => {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const r = await claimFoundingMembership(sb);
    setResult(r.ok ? r : { ok: false, reason: r.reason });
    if (r.ok) await refreshMembership();
    setBusy(false);
  };
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
  const action = result?.ok ? <p className="text-sm font-medium text-forest" data-testid="founding-joined">{s.foundingJoined.replace("{date}", date(result.validUntil))}</p>
    : status === "signed-in" ? <Button onClick={claim} disabled={busy} data-testid="founding-join">{s.foundingJoin}</Button>
    : status === "guest" ? <Button asChild variant="outline"><Link href="/login/?next=/membership/" data-testid="founding-sign-in">{s.foundingSignIn}</Link></Button>
    : status === "disabled" ? <p className="text-xs text-muted" data-testid="founding-no-accounts">{s.foundingNoAccounts}</p> : null;
  return (
    <section className="rounded-3xl border border-forest/40 bg-sage-soft/40 p-5 md:p-6" data-testid="founding-programme">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-forest"><Sparkles className="size-3.5" aria-hidden /> {s.foundingTag}</p>
      <h2 className="mt-1 font-display text-2xl text-forest">{s.foundingTitle}</h2>
      <p className="mt-1 text-sm">{s.foundingLead}</p>
      <p className="mt-2 text-sm text-muted">{s.foundingBody.replace("{days}", String(FOUNDING_PROGRAMME.durationDays)).replace("{cap}", String(FOUNDING_PROGRAMME.cap))}</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {FOUNDING_BENEFITS.map((b) => <li key={b} className="flex items-start gap-2" data-testid={`founding-benefit-${b}`}><Check className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden /><span>{s[`fb_${b}`]}</span></li>)}
      </ul>
      <p className="mt-3 text-sm font-medium text-forest" data-testid="founding-no-charge">{s.foundingNoCharge}</p>
      {left !== null && <p className="mt-1 text-xs text-muted" data-testid="founding-places-left">{s.foundingPlacesLeft.replace("{n}", String(left)).replace("{cap}", String(FOUNDING_PROGRAMME.cap))}</p>}
      <div className="mt-3" data-testid="founding-action">{action}</div>
      {result && !result.ok && <p className="mt-2 text-sm text-terracotta" role="alert" data-testid="founding-error" data-reason={result.reason}>{s[`foundingErr_${result.reason as "error"}`] ?? s.foundingErr_error}</p>}
    </section>
  );
}

/** UsageMeter: saved references and collections per experience against the plan's quota (not enforced yet). */
function UsageMeters({ tier }: { tier: Tier }) {
  const { locale } = useT();
  const s = settingsDict(locale);
  const state = useUser();
  const passports = allPassportsOf(state);
  const exps = EXPERIENCES.filter((e) => e.implemented && isSelectable(e));
  const fmt = (n: number) => (n === Infinity ? s.unlimited : String(n));
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="usage-meters">
      {exps.map((e) => {
        const p = passports[e.id === "food" ? FOOD : e.id];
        const refs = new Set([...(p?.saved ?? []).map((x) => `i:${x}`), ...(p?.savedVenues ?? []).map((x) => `e:${x}`)]).size;
        const cols = p?.collections.length ?? 0;
        const lim = LIMITS.favouritesPerExperience[tier];
        const pct = lim === Infinity ? 0 : Math.min(100, (refs / lim) * 100);
        return (
          <li key={e.id} className="rounded-2xl bg-ivory p-3 text-sm" data-testid={`usage-${e.id}`}>
            <div className="flex justify-between gap-2"><span className="font-medium">{loc(e.name, locale)}</span><span className="tabular-nums" data-testid={`usage-${e.id}-refs`}>{refs} / {fmt(lim)}</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/70" role="meter" aria-label={`${loc(e.name, locale)} · ${s.savedRefs}`} aria-valuemin={0} aria-valuemax={lim === Infinity ? undefined : lim} aria-valuenow={refs}>
              <span className={cn("block h-full rounded-full", pct >= 100 ? "bg-terracotta" : "bg-forest/70")} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted">{s.collectionsLbl}: {cols} / {fmt(LIMITS.collectionsPerExperience[tier])}</p>
          </li>
        );
      })}
    </ul>
  );
}
