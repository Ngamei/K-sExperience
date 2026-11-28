"use client";
import { CATEGORIES, MEAL_TIMES } from "@/lib/data/schema";
import { DIET_PREFS, type DietPref, toggleIn } from "@/lib/food/filters";
import { DIET_LABELS, lbl, MEAL_LABELS, SPICE_LABELS } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/use-t";
import { settingsDict } from "@/lib/i18n/settings-dict";
import { useUser } from "@/lib/store/user";
import { Chip } from "@/components/ui/chip";
import { useFoodData } from "@/components/food/food-data";
import { SubPageHeader } from "./settings-ui";

const heading = "mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted";

/** Settings → Personal Preferences (moved from the Settings page; same store, same behaviour). */
export function PreferencesView() {
  const { t, locale } = useT();
  const s = settingsDict(locale);
  const { regions } = useFoodData();
  const u = useUser();
  const p = u.preferences;
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 md:py-10">
      <SubPageHeader back={s.back} title={s.preferences} intro={s.prefsIntro} />
      <section className="space-y-5 rounded-3xl border border-line/80 bg-paper p-5 text-sm md:p-6" data-testid="preferences">
        <div>
          <p className={heading}>{t("filters.category")}</p>
          <div className="flex flex-wrap gap-1.5">{CATEGORIES.map((c) => <Chip key={c} active={p.categories.includes(c)} onClick={() => u.setPreferences({ categories: toggleIn(p.categories, c) })}>{t(`cat.${c}`)}</Chip>)}</div>
        </div>
        <div>
          <p className={heading}>{t("filters.region")}</p>
          <div className="flex flex-wrap gap-1.5">{regions.map((r) => <Chip key={r.id} active={p.regions.includes(r.id)} onClick={() => u.setPreferences({ regions: toggleIn(p.regions, r.id) })}>{r.nameVi}</Chip>)}</div>
        </div>
        <div>
          <p className={heading}>{t("filters.spice")}</p>
          <div className="flex flex-wrap gap-1.5">{[0, 1, 2, 3].map((n) => <Chip key={n} active={p.maxSpice === n} onClick={() => u.setPreferences({ maxSpice: n })} data-testid={`pref-spice-${n}`}>{lbl(SPICE_LABELS, String(n), locale)}</Chip>)}</div>
        </div>
        <div>
          <p className={heading}>{t("filters.diet")}</p>
          <div className="flex flex-wrap gap-1.5">{(Object.keys(DIET_PREFS) as DietPref[]).map((d) => <Chip key={d} active={p.diet.includes(d)} onClick={() => u.setPreferences({ diet: toggleIn(p.diet, d) })} data-testid={`pref-diet-${d}`}>{lbl(DIET_LABELS, d, locale)}</Chip>)}</div>
        </div>
        <div>
          <p className={heading}>{t("filters.meal")}</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip active={p.mealTime === "any"} onClick={() => u.setPreferences({ mealTime: "any" })}>{t("common.any")}</Chip>
            {MEAL_TIMES.map((m) => <Chip key={m} active={p.mealTime === m} onClick={() => u.setPreferences({ mealTime: m })}>{lbl(MEAL_LABELS, m, locale)}</Chip>)}
          </div>
        </div>
      </section>
    </div>
  );
}
