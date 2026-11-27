"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Lock, ShieldCheck } from "lucide-react";
import { EXPERIENCES, isSelectable, loc } from "@/experiences/registry";
import { NAV_ICONS } from "@/components/shell/icons";
import { CATEGORIES, MEAL_TIMES } from "@/lib/data/schema";
import { DIET_PREFS, type DietPref, toggleIn } from "@/lib/food/filters";
import { DIET_LABELS, lbl, MEAL_LABELS, SPICE_LABELS } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useFoodData } from "@/components/food/food-data";
import { AccountCard } from "@/components/auth/account-card";
import { cn } from "@/lib/utils";
import { DEV_DATA } from "@/lib/env";

function Card({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6" data-testid={id}>
      <h2 className="mb-4 font-display text-xl text-forest">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsView() {
  const { t, locale } = useT();
  const { regions, source } = useFoodData();
  const u = useUser();
  const p = u.preferences;
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 md:py-10">
      <h1 className="font-display text-4xl text-forest">{t("settings.title")}</h1>

      <AccountCard />

      <Card title={t("settings.experience")} id="experience-mode">
        <p className="-mt-2 mb-3 text-sm text-muted">{t("settings.experienceIntro")}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {EXPERIENCES.map((e) => {
            const Icon = NAV_ICONS[e.icon];
            const active = u.experience === e.id;
            const soon = !isSelectable(e);
            const other = locale === "en" ? "vi" : "en";
            return (
              <li key={e.id}>
                <button
                  type="button"
                  disabled={soon}
                  onClick={() => { u.setExperience(e.id); if (u.experience !== e.id) router.push(e.routes.map); }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                    active ? "border-forest bg-forest/5" : "border-line",
                    soon ? "cursor-not-allowed opacity-60" : "hover:border-forest/40",
                  )}
                  data-testid={`experience-${e.id}`}
                  aria-pressed={active}
                >
                  <span className={cn("flex size-10 items-center justify-center rounded-full", active ? "bg-forest text-ivory" : "bg-ivory-deep text-charcoal")}><Icon className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{loc(e.name, locale)}</span>
                    <span className="block text-xs text-muted" lang={other}>{loc(e.name, other)}</span>
                    {e.pilots && (
                      <span className="mt-1 flex flex-wrap gap-1" data-testid={`pilots-${e.id}`} aria-label={t("settings.pilots")}>
                        {e.pilots.map((pl) => <span key={pl.id} className="rounded-full bg-ivory-deep px-2 py-0.5 text-[10.5px] text-charcoal/80" title={loc(pl.offerings, locale)}>{loc(pl.name, locale)}</span>)}
                      </span>
                    )}
                  </span>
                  {soon ? <Badge tone="outline"><Lock className="size-3" /> {e.status === "pilot-planned" ? t("settings.pilot") : t("settings.soon")}</Badge> : active ? <Badge tone="forest"><Check className="size-3" /> {t("settings.active")}</Badge> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={t("settings.language")} id="language">
        <div className="flex gap-2">
          <Chip active={locale === "en"} onClick={() => u.setLocale("en")} data-testid="locale-en">English</Chip>
          <Chip active={locale === "vi"} onClick={() => u.setLocale("vi")} data-testid="locale-vi">Tiếng Việt</Chip>
        </div>
      </Card>

      {DEV_DATA && <Card title={t("settings.samples")} id="samples">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 size-5 accent-[#294C3D]" checked={u.showSamples} onChange={(e) => u.setShowSamples(e.target.checked)} data-testid="toggle-samples" />
          <span className="text-sm text-charcoal/80">{t("settings.samplesBody")}</span>
        </label>
      </Card>}

      <Card title={t("settings.preferences")} id="preferences">
        <div className="space-y-4 text-sm">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t("filters.category")}</p>
            <div className="flex flex-wrap gap-1.5">{CATEGORIES.map((c) => <Chip key={c} active={p.categories.includes(c)} onClick={() => u.setPreferences({ categories: toggleIn(p.categories, c) })}>{t(`cat.${c}`)}</Chip>)}</div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t("filters.region")}</p>
            <div className="flex flex-wrap gap-1.5">{regions.map((r) => <Chip key={r.id} active={p.regions.includes(r.id)} onClick={() => u.setPreferences({ regions: toggleIn(p.regions, r.id) })}>{r.nameVi}</Chip>)}</div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t("filters.spice")}</p>
            <div className="flex flex-wrap gap-1.5">{[0, 1, 2, 3].map((n) => <Chip key={n} active={p.maxSpice === n} onClick={() => u.setPreferences({ maxSpice: n })} data-testid={`pref-spice-${n}`}>{lbl(SPICE_LABELS, String(n), locale)}</Chip>)}</div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t("filters.diet")}</p>
            <div className="flex flex-wrap gap-1.5">{(Object.keys(DIET_PREFS) as DietPref[]).map((d) => <Chip key={d} active={p.diet.includes(d)} onClick={() => u.setPreferences({ diet: toggleIn(p.diet, d) })}>{lbl(DIET_LABELS, d, locale)}</Chip>)}</div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t("filters.meal")}</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip active={p.mealTime === "any"} onClick={() => u.setPreferences({ mealTime: "any" })}>{t("common.any")}</Chip>
              {MEAL_TIMES.map((m) => <Chip key={m} active={p.mealTime === m} onClick={() => u.setPreferences({ mealTime: m })}>{lbl(MEAL_LABELS, m, locale)}</Chip>)}
            </div>
          </div>
        </div>
      </Card>

      <Card title={t("settings.dataMode")} id="data-mode">
        <p className="text-sm text-charcoal/80">
          {source === "supabase"
            ? "Supabase — catalogue and venues are read live from the database."
            : source === "local-fallback"
              ? "Supabase is configured but could not be reached — showing the bundled data."
              : "Local mode — data is read from the repository's JSON files; your saved dishes and passport live in this browser only."}
        </p>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card title={t("settings.admin")}>
          <Button asChild variant="outline"><Link href="/admin/" data-testid="admin-link"><ShieldCheck /> {t("nav.admin")}</Link></Button>
        </Card>
        <Card title={t("settings.reset")}>
          <p className="mb-3 text-xs text-muted">{t("settings.resetBody")}</p>
          <Button variant="outline" onClick={() => confirm(t("settings.resetBody")) && u.reset()}>{t("settings.reset")}</Button>
        </Card>
      </div>
    </div>
  );
}
