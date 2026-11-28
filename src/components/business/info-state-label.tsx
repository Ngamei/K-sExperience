"use client";
/**
 * InfoStateLabel — says plainly why a piece of information is not shown, keeping the two cases apart
 * (plans.ts infoState): "unavailable" = we hold no data (never implies a paid plan would show it) ·
 * "restricted" = the data exists but the viewer's plan does not include it. Available information renders itself.
 */
import { Lock } from "lucide-react";
import { PLANS, TIERS, VISIBILITY, type InfoType, type Tier } from "@/lib/membership/plans";
import type { BusinessStrings } from "@/lib/i18n/business-dict";
import { cn } from "@/lib/utils";

/** The lowest plan whose visibility includes this information (for "Included with K's Plus"). */
export const lowestTierFor = (type: InfoType): Tier | null => TIERS.find((t) => VISIBILITY[type][t] === "full" || VISIBILITY[type][t] === "limited") ?? null;

/** Copy for a restricted item: complete menu prices are per unlock (guests sign in first); others name the plan. */
export function restrictedText(type: InfoType, tier: Tier | null, s: BusinessStrings): string {
  if (type === "completeMenuPrices") return tier === null ? s.infoSignIn : s.infoRestrictedUnlock;
  const t = lowestTierFor(type);
  return t ? s.infoRestricted.replace("{plan}", PLANS[t].name) : s.infoUnavailable;
}

export function InfoStateLabel({ state, children, testid, legacyState, className }: {
  state: "unavailable" | "restricted"; children: React.ReactNode; testid?: string;
  /** Kept for existing selectors (e.g. offering-price data-state="unknown"). */
  legacyState?: string; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted", state === "restricted" && "text-charcoal/80", className)}
      data-testid={testid} data-info={state} data-state={legacyState ?? state}>
      {state === "restricted" && <Lock className="size-3" aria-hidden />}
      {children}
    </span>
  );
}
