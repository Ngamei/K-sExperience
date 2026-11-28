"use client";
import { Check } from "lucide-react";
import { useT } from "@/lib/i18n/use-t";
import { settingsDict } from "@/lib/i18n/settings-dict";
import { PLANS, TIERS, usd } from "@/lib/membership/plans";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/shell/auth-provider";
import { cn } from "@/lib/utils";
import { SubPageHeader } from "./settings-ui";

/**
 * K's Membership (KEX-MEM-01): plan comparison, current plan, usage & limits. No checkout — paid plans are not on sale,
 * and paid benefits are not defined yet (D71), so nothing is promised that the app doesn't do.
 */
export function MembershipView() {
  const { locale } = useT();
  const s = settingsDict(locale);
  const { status, membership } = useAuth();
  const current = status === "signed-in" ? membership : null;
  const features = [s.featDiscover, s.featPassport, s.featSaved, s.featSync];
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 md:px-6 md:py-10" data-testid="membership">
      <SubPageHeader back={s.back} title={s.membership} intro={s.membershipIntro} />
      <p className="rounded-2xl border border-[#e9d9a6] bg-[#fbf3d9] p-3 text-sm text-[#5f4a0f]" data-testid="membership-not-on-sale">{s.notOnSale}</p>

      <ul className="grid gap-3 md:grid-cols-3">
        {TIERS.map((tier) => {
          const p = PLANS[tier];
          const mine = current === tier;
          return (
            <li key={tier} className={cn("rounded-3xl border bg-paper p-5", mine ? "border-forest" : "border-line/80")} data-testid={`membership-plan-${tier}`} data-current={mine || undefined}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-2xl text-forest">{p.name}</h2>
                {mine && <Badge tone="forest" data-testid="membership-current"><Check className="size-3" /> {s.currentPlan}</Badge>}
              </div>
              {p.monthly === null ? (
                <p className="mt-2 font-display text-3xl">{s.free}</p>
              ) : (
                <>
                  <p className="mt-2 font-display text-3xl">{usd(p.monthly)}<span className="text-base text-muted">{s.perMonth}</span></p>
                  <p className="text-sm text-muted">{usd(p.yearly!)}{s.perYear}</p>
                </>
              )}
            </li>
          );
        })}
      </ul>

      <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6">
        <p className="text-sm font-medium">{s.allFeatures}</p>
        <ul className="mt-2 space-y-1 text-sm text-charcoal/80">{features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden /> {f}</li>)}</ul>
        <p className="mt-3 text-sm text-muted">{s.paidTba}</p>
      </section>

      <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6" data-testid="membership-usage">
        <h2 className="font-display text-xl text-forest">{s.usage}</h2>
        {current ? (
          <>
            <p className="mt-1 text-sm">{s.yourPlan}: <strong data-testid="membership-tier">{PLANS[current].name}</strong></p>
            <p className="text-sm text-muted">{s.usageBody}</p>
            <p className="mt-2 text-xs text-muted">{s.subscriptionMgmt}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">{s.signInForPlan}</p>
        )}
      </section>
    </div>
  );
}
