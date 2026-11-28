"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Bookmark, Check, CircleHelp, FileText, Flag, Gem, Globe, Home, Info, Lock, MessageSquare, Palette, ShieldCheck, SlidersHorizontal, Stamp } from "lucide-react";
import { EXPERIENCES, isPilot, isSelectable, loc, themeVars } from "@/experiences/registry";
import { NAV_ICONS } from "@/components/shell/icons";
import { useT } from "@/lib/i18n/use-t";
import { settingsDict } from "@/lib/i18n/settings-dict";
import { useUser } from "@/lib/store/user";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { AccountCard } from "@/components/auth/account-card";
import { useAuth } from "@/components/shell/auth-provider";
import { cn } from "@/lib/utils";
import { ItemArt } from "@/components/engine/item-art";
import { LOWEST_PAID_MONTHLY, PLANS, usd } from "@/lib/membership/plans";
import { SettingsBlock, SettingsRow, SettingsSection } from "@/components/settings/settings-ui";

/**
 * Customer Settings (KEX-SET-01): Account → Membership → Your experience → App preferences → Help & information.
 * Nothing here exposes infrastructure, data-completeness or administration — those live in the restricted Admin Portal.
 */
export function SettingsView() {
  const { t, locale } = useT();
  const s = settingsDict(locale);
  const u = useUser();
  const router = useRouter();
  const current = EXPERIENCES.find((e) => e.id === u.experience) ?? EXPERIENCES[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-6 md:py-10" data-testid="settings">
      <header>
        <h1 className="font-display text-4xl text-forest">{s.title}</h1>
        <p className="text-sm text-muted">{s.tagline}</p>
      </header>

      <AccountCard />
      <MembershipCard />

      <SettingsSection title={s.yourExperience} id="your-experience">
        <SettingsBlock id="experience-mode">
          <h3 className="mb-1 font-medium">{s.experienceMode}</h3>
          <p className="mb-3 text-xs text-muted">{t("settings.experienceIntro")}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {EXPERIENCES.map((e) => {
              const Icon = NAV_ICONS[e.icon];
              const active = u.experience === e.id;
              const soon = !isSelectable(e);
              const other = locale === "en" ? "vi" : "en";
              return (
                <li key={e.id} style={themeVars(e.id) as React.CSSProperties /* each card previews its own pastel theme */}>
                  <button
                    type="button"
                    disabled={soon}
                    onClick={() => { u.setExperience(e.id); if (u.experience !== e.id) router.push(e.routes.map); }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                      active ? "border-forest bg-sage-soft/60" : "border-line bg-ivory",
                      soon ? "cursor-not-allowed opacity-60" : "hover:border-forest/40",
                    )}
                    data-testid={`experience-${e.id}`}
                    aria-pressed={active}
                  >
                    <span className={cn("flex size-10 items-center justify-center rounded-full", active ? "bg-forest text-ivory" : "bg-sage-soft text-forest")}><Icon className="size-5" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{loc(e.name, locale)}</span>
                      <span className="block text-xs text-muted" lang={other}>{loc(e.name, other)}</span>
                      {e.pilots && (
                        <span className="mt-1 flex flex-wrap gap-1" data-testid={`pilots-${e.id}`} aria-label={t("settings.pilots")}>
                          {e.pilots.map((pl) => <span key={pl.id} className="inline-flex items-center gap-1 rounded-full bg-ivory-deep py-0.5 pl-0.5 pr-2 text-[10.5px] text-charcoal/80" title={loc(pl.offerings, locale)}><ItemArt moduleId={e.id} category={pl.id} accent={e.accent} size={18} />{loc(pl.name, locale)}</span>)}
                        </span>
                      )}
                    </span>
                    {soon ? <Badge tone="outline"><Lock className="size-3" /> {e.status === "pilot-planned" ? t("settings.pilot") : t("settings.soon")}</Badge> : active ? <Badge tone="forest"><Check className="size-3" /> {t("settings.active")}</Badge> : isPilot(e) ? <Badge tone="outline" data-testid={`pilot-badge-${e.id}`}>{t("settings.pilotBadge")}</Badge> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </SettingsBlock>
        <SettingsRow icon={Stamp} title={s.passport} subtitle={s.passportSub} href={current.routes.passport} testId="settings-passport" />
        <SettingsRow icon={Bookmark} title={s.saved} subtitle={s.savedSub} href="/saved/" testId="settings-saved" />
        <SettingsRow icon={SlidersHorizontal} title={s.preferences} subtitle={s.preferencesSub} href="/settings/preferences/" testId="settings-preferences" />
        <SettingsRow icon={Home} title={s.homeWork} subtitle={s.homeWorkSub} soon soonLabel={s.soon} testId="settings-home-work" />
      </SettingsSection>

      <SettingsSection title={s.appPrefs} id="app-preferences">
        <SettingsBlock id="language" className="flex flex-wrap items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-soft text-forest"><Globe className="size-[18px]" aria-hidden /></span>
          <span className="flex-1 font-medium">{s.language}</span>
          <span className="flex gap-2">
            <Chip active={locale === "en"} onClick={() => u.setLocale("en")} data-testid="locale-en">English</Chip>
            <Chip active={locale === "vi"} onClick={() => u.setLocale("vi")} data-testid="locale-vi">Tiếng Việt</Chip>
          </span>
        </SettingsBlock>
        <SettingsRow icon={Bell} title={s.notifications} subtitle={s.notificationsSub} soon soonLabel={s.soon} testId="settings-notifications" />
        <SettingsRow icon={Palette} title={s.appearance} subtitle={s.appearanceSub} soon soonLabel={s.soon} testId="settings-appearance" />
      </SettingsSection>

      <SettingsSection title={s.help} id="help-information">
        <SettingsRow icon={CircleHelp} title={s.helpCentre} soon soonLabel={s.soon} testId="settings-help" />
        <SettingsRow icon={MessageSquare} title={s.feedback} soon soonLabel={s.soon} testId="settings-feedback" />
        <SettingsRow icon={Flag} title={s.report} soon soonLabel={s.soon} testId="settings-report" />
        <SettingsRow icon={ShieldCheck} title={s.privacy} subtitle={s.privacySub} href="/settings/privacy/" testId="settings-privacy" />
        <SettingsRow icon={FileText} title={s.terms} soon soonLabel={s.soon} testId="settings-terms" />
        <SettingsRow icon={Info} title={s.about} href="/about/" testId="settings-about" />
      </SettingsSection>

      <p className="pb-4 text-center text-xs text-muted">{s.footer}</p>
    </div>
  );
}

/** K's Membership teaser (guest) or current plan (signed in). Test entitlements only — no live payments. */
function MembershipCard() {
  const { locale } = useT();
  const s = settingsDict(locale);
  const { status, membership } = useAuth();
  const tier = status === "signed-in" ? membership : null;
  return (
    <Link href="/membership/" className="flex items-center gap-4 rounded-3xl border border-line/80 bg-sage-soft/50 p-5 transition-colors hover:border-forest/40 md:p-6" data-testid="membership-card">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-forest text-ivory"><Gem className="size-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xl text-forest">{s.membership}</span>
        {tier ? (
          <span className="block text-sm text-charcoal/80">{s.yourPlan}: <strong data-testid="membership-tier">{PLANS[tier].name}</strong></span>
        ) : (
          <span className="block text-sm text-charcoal/80">{s.membershipTeaser}</span>
        )}
        <span className="block text-xs text-muted">{s.plansFrom.replace("{price}", usd(LOWEST_PAID_MONTHLY))}</span>
      </span>
      <span className="hidden rounded-full border border-line bg-paper px-3 py-1.5 text-sm sm:inline">{s.viewPlans}</span>
    </Link>
  );
}
