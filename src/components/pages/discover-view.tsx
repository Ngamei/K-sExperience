"use client";
import Link from "next/link";
import { ArrowRight, Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { useFilters } from "@/lib/store/filters";
import { surpriseMe } from "@/lib/food/recommend";
import { passportProgress } from "@/lib/food/passport";
import { CATEGORIES, type Dish } from "@/lib/data/schema";
import { Button } from "@/components/ui/button";
import { DishCard } from "@/components/food/dish-card";
import { DishArt } from "@/components/food/dish-art";
import { CategoryBadge } from "@/components/food/badges";
import { useFoodData, useRealAvailability } from "@/components/food/food-data";
import { CATEGORY_COLORS, dishSvg } from "@/components/food/illustrations";
import { EMPTY_FILTERS } from "@/lib/food/filters";

export function DiscoverView() {
  const { t, locale } = useT();
  const router = useRouter();
  const { dishes, regions, provinceById } = useFoodData();
  const availability = useRealAvailability(); // recommendations never use sample venues
  const prefs = useUser((s) => s.preferences);
  const triedObj = useUser((s) => s.tried);
  const tried = useMemo(() => new Set(Object.keys(triedObj)), [triedObj]);
  const replaceFilters = useFilters((s) => s.replace);
  const [pick, setPick] = useState<Dish | null | undefined>(undefined);

  const representative = dishes.filter((d) => d.prominence === 1);
  const progress = passportProgress(dishes, regions, tried);
  const surprise = () => setPick(surpriseMe(dishes, prefs, { availability, tried }, Math.random, pick?.id));
  const goRegion = (id: string) => { replaceFilters({ ...EMPTY_FILTERS, regions: [id as never] }); router.push("/"); };
  const goCategory = (c: string) => { replaceFilters({ ...EMPTY_FILTERS, categories: [c as never] }); router.push("/catalogue/"); };

  return (
    <div>
      <section className="paper-grain relative overflow-hidden border-b border-line/70 bg-[radial-gradient(ellipse_at_top_right,#efe9dc,transparent_60%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 md:grid-cols-[1.15fr_1fr] md:px-6 md:py-16">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta">K’s Experience · {t("exp.food")}</p>
            <h1 className="font-display text-[42px] leading-[1.02] text-forest md:text-[64px]" data-testid="tagline">{t("tagline")}</h1>
            <p className="mt-5 max-w-xl text-base text-charcoal/80 md:text-lg">{t("discover.hero")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/" data-testid="cta-explore">{t("discover.explore")} <ArrowRight /></Link></Button>
              <Button size="lg" variant="accent" onClick={surprise} data-testid="surprise-me"><Sparkles /> {t("discover.surprise")}</Button>
            </div>
          </div>
          <div className="relative mx-auto grid w-full max-w-md grid-cols-3 gap-3" aria-hidden>
            {representative.slice(0, 9).map((d, i) => (
              <div key={d.id} className="flex aspect-square items-center justify-center rounded-full bg-paper shadow-[0_10px_30px_-16px_rgba(41,45,41,.5)]" style={{ boxShadow: `inset 0 0 0 2px ${CATEGORY_COLORS[d.category]}33`, transform: `translateY(${(i % 3) * 10 - 10}px)` }}
                dangerouslySetInnerHTML={{ __html: dishSvg(d.dishType, 70) }} />
            ))}
          </div>
        </div>
      </section>

      {pick !== undefined && (
        <section className="mx-auto max-w-3xl px-4 pt-8 md:px-6" data-testid="surprise-result">
          {pick ? (
            <div className="flex flex-col gap-4 rounded-3xl border border-terracotta/30 bg-paper p-5 shadow-[0_16px_40px_-24px_rgba(182,107,80,.6)] sm:flex-row sm:items-center">
              <DishArt type={pick.dishType} category={pick.category} size={96} className="bg-ivory" />
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">{t("discover.surprise")}</p>
                <h2 className="font-display text-3xl">{pick.nameVi}</h2>
                <p className="text-sm text-muted">{pick.nameEn} · {pick.origins[0].provinceId ? provinceById.get(pick.origins[0].provinceId)?.nameVi : ""}</p>
                <div className="mt-1"><CategoryBadge category={pick.category} /></div>
                <p className="mt-2 text-sm text-charcoal/80">{pick.description[locale]}</p>
              </div>
              <div className="flex gap-2 sm:flex-col">
                <Button asChild><Link href={`/dishes/${pick.id}/`}>{t("common.viewDish")}</Link></Button>
                <Button variant="outline" onClick={surprise}><Shuffle /> {t("discover.again")}</Button>
              </div>
            </div>
          ) : <p className="rounded-2xl bg-paper p-5 text-sm text-muted">{t("discover.noMatch")}</p>}
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pt-12 md:px-6">
        <h2 className="mb-4 font-display text-3xl text-forest">{t("discover.regions")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {regions.map((r) => {
            const n = dishes.filter((d) => d.regionIds.includes(r.id)).length;
            return (
              <button key={r.id} onClick={() => goRegion(r.id)} className="group rounded-3xl border border-line/80 p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md" style={{ background: `linear-gradient(135deg, ${r.color}, #fffdf8)` }} data-testid={`discover-region-${r.id}`}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-charcoal/60">{r.nameEn} · {n} {t("common.dishes")}</p>
                <h3 className="font-display text-2xl text-forest">{r.nameVi}</h3>
                <p className="mt-1 text-sm text-charcoal/75">{locale === "vi" ? r.blurbVi : r.blurbEn}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-terracotta">{t("nav.exploreShort")} <ArrowRight className="size-4 transition group-hover:translate-x-0.5" /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-12 md:px-6">
        <h2 className="mb-4 font-display text-3xl text-forest">{t("discover.byCategory")}</h2>
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => goCategory(c)} className="rounded-3xl border border-line/80 bg-paper p-4 text-left hover:shadow-md md:p-6" data-testid={`discover-cat-${c}`}>
              <span className="block size-3 rounded-full" style={{ background: CATEGORY_COLORS[c] }} />
              <span className="mt-3 block font-display text-xl md:text-2xl">{t(`cat.${c}`)}</span>
              <span className="text-xs text-muted">{dishes.filter((d) => d.category === c).length} {t("common.dishes")}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-12 md:px-6">
        <h2 className="mb-4 font-display text-3xl text-forest">{t("discover.representative")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{representative.map((d) => <DishCard key={d.id} dish={d} />)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-forest p-6 text-ivory md:flex-row md:items-center md:p-8">
          <div>
            <h2 className="font-display text-3xl">{t("discover.passport")}</h2>
            <p className="mt-1 text-sage">{progress.triedCount} / {progress.total} {t("passport.tried")} · {progress.provincesTried} {t("passport.provinces")}</p>
          </div>
          <Button asChild variant="accent"><Link href="/passport/">{t("discover.passportCta")}</Link></Button>
        </div>
      </section>
    </div>
  );
}
