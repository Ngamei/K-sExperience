"use client";
import { Search, X } from "lucide-react";
import { useMemo } from "react";
import { CATEGORIES, DISH_TYPES, MEAL_TIMES, PRICE_RANGES, TASTES, VENUE_TYPES, type AvailabilityStatus } from "@/lib/data/schema";
import { activeChips, DIET_PREFS, type DietPref, type DishFilters, removeChip, toggleIn } from "@/lib/food/filters";
import { HCMC_NEIGHBOURHOODS } from "@/lib/food/hcmc";
import { DIET_LABELS, DISH_TYPE_LABELS, lbl, MEAL_LABELS, SPICE_LABELS, TASTE_LABELS, VENUE_LABELS } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/use-t";
import { useFilters } from "@/lib/store/filters";
import { Chip } from "@/components/ui/chip";
import { useBrowseAvailability, useFoodData } from "./food-data";
import { CATEGORY_COLORS } from "./illustrations";

const AVAIL: AvailabilityStatus[] = ["verified-available", "unverified", "temporarily-unavailable", "none-found"];

export function SearchBox({ className }: { className?: string }) {
  const { t } = useT();
  const query = useFilters((s) => s.filters.query);
  const set = useFilters((s) => s.set);
  return (
    <label className={"relative flex items-center " + (className ?? "")}>
      <Search className="pointer-events-none absolute left-3.5 size-4 text-muted" />
      <input
        type="search"
        value={query}
        onChange={(e) => set({ query: e.target.value })}
        placeholder={t("common.search")}
        className="h-11 w-full rounded-full border border-line bg-paper pl-10 pr-4 text-sm outline-none placeholder:text-muted/80 focus:border-forest/50"
        data-testid="search-input"
        aria-label={t("common.search")}
      />
    </label>
  );
}

export function CategoryChips({ className }: { className?: string }) {
  const { t } = useT();
  const categories = useFilters((s) => s.filters.categories);
  const set = useFilters((s) => s.set);
  return (
    <div className={"flex gap-2 " + (className ?? "")} role="group" aria-label={t("filters.category")}>
      {CATEGORIES.map((c) => (
        <Chip key={c} active={categories.includes(c)} color={CATEGORY_COLORS[c]} onClick={() => set({ categories: toggleIn(categories, c) })} data-testid={`cat-${c}`}>
          {t(`cat.${c}`)}
        </Chip>
      ))}
    </div>
  );
}

export function RegionChips({ className, onPick }: { className?: string; onPick?: (id: string | null) => void }) {
  const { t, locale } = useT();
  const { regions } = useFoodData();
  const sel = useFilters((s) => s.filters.regions);
  const set = useFilters((s) => s.set);
  return (
    <div className={"no-scrollbar flex gap-2 overflow-x-auto " + (className ?? "")} role="group" aria-label={t("filters.region")}>
      <Chip active={sel.length === 0} onClick={() => { set({ regions: [], provinces: [] }); onPick?.(null); }} data-testid="region-all">
        {t("explore.allVietnam")}
      </Chip>
      {regions.map((r) => (
        <Chip
          key={r.id}
          active={sel.length === 1 && sel[0] === r.id}
          onClick={() => {
            const next = sel.length === 1 && sel[0] === r.id ? [] : [r.id];
            set({ regions: next, provinces: [] });
            onPick?.(next[0] ?? null);
          }}
          data-testid={`region-${r.id}`}
        >
          {r.nameVi}
          <span className="hidden text-[10px] opacity-70 sm:inline">{locale === "en" ? `· ${r.nameEn}` : ""}</span>
        </Chip>
      ))}
    </div>
  );
}

export function useChipLabel() {
  const { t, locale } = useT();
  const { regionById, provinceById } = useFoodData();
  return (k: keyof DishFilters, v?: string) => {
    switch (k) {
      case "query": return `“${v}”`;
      case "regions": return regionById.get(v as never)?.nameVi ?? v!;
      case "provinces": return provinceById.get(v!)?.nameVi ?? v!;
      case "categories": return t(`cat.${v}` as never);
      case "dishTypes": return lbl(DISH_TYPE_LABELS, v!, locale);
      case "ingredient": return `${t("filters.ingredient")}: ${v}`;
      case "tastes": return lbl(TASTE_LABELS, v!, locale);
      case "maxSpice": return `${t("filters.spice")}: ${lbl(SPICE_LABELS, v!, locale)}`;
      case "diet": return lbl(DIET_LABELS, v!, locale);
      case "mealTimes": return lbl(MEAL_LABELS, v!, locale);
      case "budget": return v!;
      case "neighbourhoods": return v!;
      case "venueTypes": return lbl(VENUE_LABELS, v!, locale);
      case "maxDistanceKm": return `≤ ${v} km`;
      case "openNow": return t("filters.openNow");
      case "availability": return t(`status.${v}` as never);
      case "tried": return v === "tried" ? t("filters.triedYes") : t("filters.triedNo");
      case "savedOnly": return t("filters.saved");
    }
  };
}

export function ActiveChips({ count, className }: { count: number; className?: string }) {
  const { t } = useT();
  const filters = useFilters((s) => s.filters);
  const replace = useFilters((s) => s.replace);
  const clear = useFilters((s) => s.clear);
  const label = useChipLabel();
  const chips = useMemo(() => activeChips(filters, label), [filters, label]);
  return (
    <div className={"flex flex-wrap items-center gap-2 " + (className ?? "")}>
      <span className="text-sm font-medium text-charcoal" data-testid="result-count" aria-live="polite">
        {t("common.results", { n: count })}
      </span>
      {chips.map((c) => (
        <button
          key={`${c.key}-${c.value}`}
          onClick={() => replace(removeChip(filters, c))}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-forest/10 pl-2.5 pr-1.5 text-xs text-forest hover:bg-forest/20"
          data-testid="active-chip"
        >
          {c.label}
          <X className="size-3.5" />
        </button>
      ))}
      {chips.length > 0 && (
        <button onClick={clear} className="text-xs font-medium text-terracotta underline-offset-2 hover:underline" data-testid="clear-filters">
          {t("common.clearAll")}
        </button>
      )}
    </div>
  );
}

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <fieldset className="border-b border-line/70 py-4 first:pt-0 last:border-0">
      <legend className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</legend>
      {note && <p className="-mt-1 mb-2 text-[11.5px] text-muted">{note}</p>}
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

export function FilterPanel() {
  const { t, locale } = useT();
  const { regions, provinces } = useFoodData();
  const f = useFilters((s) => s.filters);
  const set = useFilters((s) => s.set);
  const originId = useFilters((s) => s.originId);
  const setOrigin = useFilters((s) => s.setOrigin);
  const availability = useBrowseAvailability();
  /** Neighbourhoods come from the venues themselves (current wards since the 2025 reform), most venues first. */
  const neighbourhoods = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of availability.restaurants.values()) count.set(r.neighbourhood, (count.get(r.neighbourhood) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi")).map(([n]) => n);
  }, [availability]);
  const provinceOptions = useMemo(
    () => provinces.filter((p) => !f.regions.length || f.regions.includes(p.regionId)).sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi")),
    [provinces, f.regions],
  );

  return (
    <div className="text-sm" data-testid="filter-panel">
      <Section title={t("filters.category")}>
        <CategoryChips />
      </Section>
      <Section title={t("filters.region")}>
        {regions.map((r) => (
          <Chip key={r.id} active={f.regions.includes(r.id)} onClick={() => set({ regions: toggleIn(f.regions, r.id) })}>
            {r.nameVi}
          </Chip>
        ))}
      </Section>
      <Section title={t("filters.province")}>
        <select
          className="h-9 w-full rounded-xl border border-line bg-paper px-3 text-sm"
          value=""
          onChange={(e) => e.target.value && set({ provinces: toggleIn(f.provinces, e.target.value) })}
          data-testid="province-select"
          aria-label={t("filters.province")}
        >
          <option value="">+ {t("filters.province")}…</option>
          {provinceOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {f.provinces.includes(p.id) ? "✓ " : ""}{p.nameVi}
            </option>
          ))}
        </select>
      </Section>
      <Section title={t("filters.dishType")}>
        {DISH_TYPES.map((d) => (
          <Chip key={d} active={f.dishTypes.includes(d)} onClick={() => set({ dishTypes: toggleIn(f.dishTypes, d) })}>
            {lbl(DISH_TYPE_LABELS, d, locale)}
          </Chip>
        ))}
      </Section>
      <Section title={t("filters.ingredient")}>
        <input
          value={f.ingredient}
          onChange={(e) => set({ ingredient: e.target.value })}
          placeholder={locale === "vi" ? "vd. sả, tôm, dừa" : "e.g. lemongrass, shrimp, coconut"}
          className="h-9 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-forest/50"
          aria-label={t("filters.ingredient")}
        />
      </Section>
      <Section title={t("filters.taste")}>
        {TASTES.map((x) => (
          <Chip key={x} active={f.tastes.includes(x)} onClick={() => set({ tastes: toggleIn(f.tastes, x) })}>
            {lbl(TASTE_LABELS, x, locale)}
          </Chip>
        ))}
      </Section>
      <Section title={t("filters.spice")}>
        <Chip active={f.maxSpice === null} onClick={() => set({ maxSpice: null })}>{t("common.any")}</Chip>
        {[0, 1, 2, 3].map((n) => (
          <Chip key={n} active={f.maxSpice === n} onClick={() => set({ maxSpice: n })}>
            {"🌶".repeat(Math.max(n, 0)) || "○"} {lbl(SPICE_LABELS, String(n), locale)}
          </Chip>
        ))}
      </Section>
      <Section title={t("filters.diet")} note={t("dish.dietaryNote")}>
        {(Object.keys(DIET_PREFS) as DietPref[]).map((d) => (
          <Chip key={d} active={f.diet.includes(d)} onClick={() => set({ diet: toggleIn(f.diet, d) })}>
            {lbl(DIET_LABELS, d, locale)}
          </Chip>
        ))}
      </Section>
      <Section title={t("filters.meal")}>
        {MEAL_TIMES.map((m) => (
          <Chip key={m} active={f.mealTimes.includes(m)} onClick={() => set({ mealTimes: toggleIn(f.mealTimes, m) })}>
            {lbl(MEAL_LABELS, m, locale)}
          </Chip>
        ))}
      </Section>

      <h4 className="mb-1 mt-5 font-display text-base text-forest">{t("filters.hcmcSection")}</h4>
      <p className="mb-2 text-[11.5px] text-muted">{t("filters.venueNote")}</p>
      <Section title={t("filters.availability")}>
        {AVAIL.map((a) => (
          <Chip key={a} active={f.availability.includes(a)} onClick={() => set({ availability: toggleIn(f.availability, a) })} data-testid={`avail-${a}`}>
            {t(`status.${a}`)}
          </Chip>
        ))}
      </Section>
      <Section title={t("filters.budget")}>
        {PRICE_RANGES.map((p) => (
          <Chip key={p} active={f.budget.includes(p)} onClick={() => set({ budget: toggleIn(f.budget, p) })}>{p}</Chip>
        ))}
      </Section>
      <Section title={t("filters.neighbourhood")}>
        {neighbourhoods.map((n) => (
          <Chip key={n} active={f.neighbourhoods.includes(n)} onClick={() => set({ neighbourhoods: toggleIn(f.neighbourhoods, n) })}>{n}</Chip>
        ))}
      </Section>
      <Section title={t("filters.distance")}>
        <select
          className="h-8 rounded-full border border-line bg-paper px-3 text-xs"
          value={originId}
          onChange={(e) => {
            if (e.target.value === "me" && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((p) => setOrigin("me", [p.coords.longitude, p.coords.latitude]));
            } else setOrigin(e.target.value);
          }}
          aria-label={t("nearby.from")}
        >
          <option value="me">{t("nearby.myLocation")}</option>
          {HCMC_NEIGHBOURHOODS.map((n) => <option key={n.id} value={n.id}>{t("nearby.from")}: {n.name}</option>)}
        </select>
        {[1, 3, 5, 10].map((km) => (
          <Chip key={km} active={f.maxDistanceKm === km} onClick={() => set({ maxDistanceKm: f.maxDistanceKm === km ? null : km })}>≤ {km} km</Chip>
        ))}
      </Section>
      <Section title={t("filters.venueType")}>
        {VENUE_TYPES.map((v) => (
          <Chip key={v} active={f.venueTypes.includes(v)} onClick={() => set({ venueTypes: toggleIn(f.venueTypes, v) })}>{lbl(VENUE_LABELS, v, locale)}</Chip>
        ))}
        <Chip active={f.openNow} onClick={() => set({ openNow: !f.openNow })} data-testid="open-now">{t("filters.openNow")}</Chip>
      </Section>

      <h4 className="mb-1 mt-5 font-display text-base text-forest">{t("filters.personal")}</h4>
      <Section title={t("filters.tried")}>
        {(["any", "tried", "untried"] as const).map((v) => (
          <Chip key={v} active={f.tried === v} onClick={() => set({ tried: v })}>
            {v === "any" ? t("filters.triedAny") : v === "tried" ? t("filters.triedYes") : t("filters.triedNo")}
          </Chip>
        ))}
        <Chip active={f.savedOnly} onClick={() => set({ savedOnly: !f.savedOnly })}>{t("filters.saved")}</Chip>
      </Section>
    </div>
  );
}
