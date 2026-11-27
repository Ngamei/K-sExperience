"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { passportProgress } from "@/lib/food/passport";
import { DishArt } from "@/components/food/dish-art";
import { PassportAccountBar, ExperienceModules } from "@/components/auth/passport-account";
import { useFoodData } from "@/components/food/food-data";

export function PassportView() {
  const { t } = useT();
  const { dishes, regions, regionById, dishById } = useFoodData();
  const triedObj = useUser((s) => s.tried);
  const visited = useUser((s) => s.visited);
  const savedCount = useUser((s) => s.saved.length + s.savedVenues.length);
  const notes = useUser((s) => s.notes);
  const tried = useMemo(() => new Set(Object.keys(triedObj)), [triedObj]);
  const p = passportProgress(dishes, regions, tried);
  const stamps = Object.entries(triedObj).sort((a, b) => b[1].localeCompare(a[1]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <ExperienceModules />
      <PassportAccountBar stats={{ tried: p.triedCount, provinces: p.provincesTried, regions: p.regionsExplored }} />
      <div className="paper-grain rounded-[2rem] bg-forest p-6 text-ivory md:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sage">K’s Experience</p>
        <h1 className="font-display text-4xl md:text-5xl">{t("passport.title")}</h1>
        <p className="mt-1 text-sage">{t("passport.subtitle")}</p>
        <dl className="mt-6 grid grid-cols-3 gap-4" data-testid="passport-stats">
          <div><dt className="text-xs text-sage">{t("passport.tried")}</dt><dd className="font-display text-4xl" data-testid="passport-tried">{p.triedCount}<span className="text-lg text-sage">/{p.total}</span></dd></div>
          <div><dt className="text-xs text-sage">{t("passport.provinces")}</dt><dd className="font-display text-4xl">{p.provincesTried}<span className="text-lg text-sage">/63</span></dd></div>
          <div><dt className="text-xs text-sage">{t("passport.regionsDone")}</dt><dd className="font-display text-4xl">{p.regionsCompleted}<span className="text-lg text-sage">/6</span></dd></div>
        </dl>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-ivory/15 pt-4 text-sm sm:grid-cols-4" data-testid="passport-more-stats">
          <div><dt className="text-xs text-sage">Regions explored</dt><dd className="font-display text-2xl" data-testid="passport-regions-explored">{p.regionsExplored}/6</dd></div>
          <div><dt className="text-xs text-sage">Venues visited</dt><dd className="font-display text-2xl" data-testid="passport-visited">{Object.keys(visited).length}</dd></div>
          <div><dt className="text-xs text-sage">Saved</dt><dd className="font-display text-2xl">{savedCount}</dd></div>
          <div><dt className="text-xs text-sage">Tasting notes</dt><dd className="font-display text-2xl" data-testid="passport-notes">{Object.keys(notes).length}</dd></div>
        </dl>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {p.perRegion.map((r) => {
          const reg = regionById.get(r.regionId as never)!;
          return (
            <div key={r.regionId} className="rounded-3xl border border-line/80 bg-paper p-5" data-testid={`passport-region-${r.regionId}`}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl">{reg.nameVi}</h2>
                <span className="text-sm text-muted">{r.tried}/{r.total}</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ivory-deep">
                <div className="h-full rounded-full bg-terracotta transition-all" style={{ width: `${r.pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">{r.pct}%</p>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 font-display text-2xl text-forest">Stamps</h2>
      {stamps.length === 0 ? (
        <p className="mt-3 rounded-3xl border border-dashed border-line p-8 text-center text-muted">{t("passport.empty")}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stamps.map(([id, date], i) => {
            const d = dishById.get(id);
            if (!d) return null;
            return (
              <Link key={id} href={`/dishes/${id}/`} className="flex flex-col items-center rounded-3xl border-2 border-dashed border-terracotta/40 bg-paper p-4 text-center hover:border-terracotta" style={{ transform: `rotate(${((i * 37) % 7) - 3}deg)` }}>
                <DishArt type={d.dishType} category={d.category} size={60} className="bg-ivory" />
                <span className="mt-2 font-display text-sm leading-tight">{d.nameVi}</span>
                <span className="text-[10px] uppercase tracking-wider text-terracotta">{date}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
