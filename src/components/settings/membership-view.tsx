"use client";
import { Check, Clock } from "lucide-react";
import { useT } from "@/lib/i18n/use-t";
import { settingsDict, type SettingsStrings } from "@/lib/i18n/settings-dict";
import { annualSavingsPct, BENEFITS, LIMITS, PLANS, TIERS, usd, type Benefit, type Tier } from "@/lib/membership/plans";
import { EXPERIENCES, isSelectable, loc } from "@/experiences/registry";
import { FOOD } from "@/lib/passport/model";
import { allPassportsOf, useUser } from "@/lib/store/user";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/shell/auth-provider";
import { cn } from "@/lib/utils";
import { SubPageHeader } from "./settings-ui";

const benefitLabel = (b: Benefit, s: SettingsStrings) => {
  if (b.id === "favourites") return b.value === Infinity ? s.b_favouritesUnlimited : s.b_favourites.replace("{n}", String(b.value));
  if (b.id === "menuViews") return s.b_menuViews.replace("{n}", String(b.value));
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

      <section className="space-y-2 rounded-3xl border border-line/80 bg-paper p-5 text-sm text-muted md:p-6">
        <p data-testid="membership-limits-note">{s.limitsNote}</p>
        <p data-testid="membership-currency-note">{s.currencyNote}</p>
      </section>

      <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6" data-testid="membership-usage">
        <h2 className="font-display text-xl text-forest">{s.usage}</h2>
        {current && <p className="mt-1 text-sm">{s.yourPlan}: <strong data-testid="membership-tier">{PLANS[current].name}</strong></p>}
        <UsageMeters tier={current ?? "free"} />
        <p className="mt-3 text-sm text-muted">{current ? s.usageBody : s.onDevice}</p>
        {current ? <p className="mt-1 text-xs text-muted">{s.subscriptionMgmt}</p> : <p className="mt-1 text-xs text-muted">{s.signInForPlan}</p>}
      </section>
    </div>
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
