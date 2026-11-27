"use client";
import Link from "next/link";
import { Lock } from "lucide-react";
import { EXPERIENCES, isSelectable, loc } from "@/experiences/registry";
import { NAV_ICONS } from "@/components/shell/icons";
import { supabaseEnabled } from "@/lib/supabase/client";
import { authDict } from "@/lib/i18n/auth-dict";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { forceResync, useAuth } from "@/components/shell/auth-provider";

/** One account, one Experience Passport with a module per experience, in registry order (only Food is active). */
export function ExperienceModules() {
  const { locale } = useT();
  return (
    <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto" data-testid="experience-passports" aria-label="My Experience Passport">
      {EXPERIENCES.map((m) => {
        const Icon = NAV_ICONS[m.icon];
        const active = isSelectable(m);
        return (
          <div key={m.id} className={`flex min-w-44 items-center gap-2 rounded-2xl border p-3 ${active ? "border-forest bg-forest/5" : "border-line opacity-60"}`} data-testid={`passport-module-${m.id}`}>
            <Icon className="size-5 text-forest" />
            <div className="text-xs"><strong className="block text-sm">{loc(m.passport.name, locale)}</strong>{loc(m.passport.summary, locale)}</div>
            {!active && <Lock className="ml-auto size-3.5 text-muted" />}
          </div>
        );
      })}
    </div>
  );
}

export function PassportAccountBar({ stats }: { stats: { tried: number; provinces: number; regions: number } }) {
  const { locale } = useT();
  const a = authDict(locale);
  const { status, user, profile, migration } = useAuth();
  const sync = useUser((s) => s.sync);
  const syncError = useUser((s) => s.syncError);

  if (status === "signed-in" && user) {
    return (
      <div className="mb-4 space-y-2" data-testid="passport-account">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Badge tone="forest">{profile?.display_name || user.email}</Badge>
          {migration.state === "running" ? <span data-testid="migration-running">Moving your guest progress to your account…</span> : sync === "saving" ? "Saving…" : "Synced to your account"}
        </p>
        {migration.state === "failed" && (
          <p className="rounded-2xl bg-[#f6e3dc] p-3 text-sm text-[#8a3f26]" data-testid="migration-failed">{a.migrationFailed} <button className="font-semibold underline" onClick={migration.retry}>{a.retry}</button></p>
        )}
        {sync === "error" && (
          <p className="rounded-2xl bg-[#f6e3dc] p-3 text-sm text-[#8a3f26]" data-testid="sync-error">{a.syncError} {syncError ? `(${syncError})` : ""} <button className="font-semibold underline" onClick={() => forceResync(user.id).catch(() => {})}>{a.retry}</button></p>
        )}
      </div>
    );
  }
  // Guest: encourage, never force.
  return (
    <div className="mb-4 flex flex-col gap-4 rounded-3xl border border-terracotta/30 bg-paper p-5 md:flex-row md:items-center" data-testid="passport-guest-cta">
      <div className="flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">{a.guestExplorer} · {stats.tried} tried · {stats.provinces} provinces · {stats.regions} regions</p>
        <h2 className="font-display text-2xl">{a.makeYours}</h2>
        <p className="text-sm text-muted">{a.makeYoursBody}</p>
        {!supabaseEnabled && <p className="mt-1 text-xs text-muted">{a.disabled}</p>}
      </div>
      {supabaseEnabled && (
        <div className="flex flex-col gap-2">
          <Button asChild><Link href="/signup/" data-testid="cta-signup">{a.signup}</Link></Button>
          <Button asChild variant="outline"><Link href="/login/" data-testid="cta-login">{a.haveAccount}</Link></Button>
          <p className="text-[11px] text-muted">{a.guestKept}</p>
        </div>
      )}
    </div>
  );
}
