"use client";
import { EXPERIENCES, isSelectable, loc } from "@/experiences/registry";
import { NAV_ICONS } from "@/components/shell/icons";
import { useT } from "@/lib/i18n/use-t";
import { settingsDict } from "@/lib/i18n/settings-dict";
import { SubPageHeader } from "./settings-ui";

/** About K's Experience — consumer copy only (no data-completeness statistics; those are in Admin → Overview). */
export function AboutView() {
  const { t, locale } = useT();
  const s = settingsDict(locale);
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 md:py-10" data-testid="about">
      <SubPageHeader back={s.back} title={s.about} />
      <section className="paper-grain space-y-3 rounded-3xl border border-line/80 bg-paper p-5 text-charcoal/85 md:p-6">
        <p className="font-display text-3xl text-forest">K<span className="text-terracotta">’</span>s Experience</p>
        <p>{s.aboutBody1}</p>
        <p className="text-sm text-muted">{s.aboutBody2}</p>
      </section>
      <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6">
        <h2 className="mb-3 font-display text-xl text-forest">{s.aboutExperiences}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {EXPERIENCES.map((e) => {
            const Icon = NAV_ICONS[e.icon];
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-ivory p-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-sage-soft text-forest"><Icon className="size-[18px]" aria-hidden /></span>
                <span className="flex-1">{loc(e.name, locale)}</span>
                {!isSelectable(e) && <span className="text-xs text-muted">{t("settings.soon")}</span>}
              </li>
            );
          })}
        </ul>
      </section>
      <p className="text-center text-xs text-muted">{s.footer}</p>
    </div>
  );
}
