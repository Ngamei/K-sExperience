"use client";
import { Search } from "lucide-react";
import { useMemo } from "react";
import { CATEGORIES, DISH_TYPES, MEAL_TIMES, PRICE_RANGES, TASTES, VENUE_TYPES, type AvailabilityStatus } from "@/lib/data/schema";
import { activeChips, DIET_PREFS, type DietPref, type DishFilters, removeChip, toggleIn } from "@/lib/food/filters";
import { HCMC_NEIGHBOURHOODS } from "@/lib/food/hcmc";
import { DIET_LABELS, DISH_TYPE_LABELS, lbl, MEAL_LABELS, SPICE_LABELS, TASTE_LABELS, VENUE_LABELS } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/use-t";
import { useFilters } from "@/lib/store/filters";
import { ActiveFilterBar, FilterDrawer, type FilterDef, type FilterOption } from "@/components/engine/filter-drawer";
import { Chip } from "@/components/ui/chip";
import { useBrowseAvailability, useFoodData } from "./food-data";
import { CATEGORY_COLORS } from "./illustrations";

const AVAIL: AvailabilityStatus[] = ["visit-confirmed", "directly-confirmed", "menu-confirmed", "source-listed", "temporarily-unavailable", "none-found"];

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

/** Food's active filters, rendered by the shared ActiveFilterBar. */
export function ActiveChips({ count, total, className }: { count: number; total?: number; className?: string }) {
  const { t } = useT();
  const filters = useFilters((s) => s.filters);
  const replace = useFilters((s) => s.replace);
  const clear = useFilters((s) => s.clear);
  const label = useChipLabel();
  const chips = useMemo(() => activeChips(filters, label), [filters, label]);
  return (
    <ActiveFilterBar
      className={className}
      countLabel={total !== undefined && count < total ? t("common.resultsOf", { n: count, total }) : t("common.results", { n: count })}
      chips={chips.map((c) => ({ key: `${c.key}-${c.value}`, label: c.label, onRemove: () => replace(removeChip(filters, c)) }))}
      onClear={clear}
      clearLabel={t("common.clearAll")}
    />
  );
}

/** Food's filter definitions (a configurable extension), rendered by the shared FilterDrawer. */
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
  const chips = <K extends keyof DishFilters>(id: string, title: string, key: K, options: FilterOption[], note?: string): FilterDef => ({
    kind: "chips", id, title, note, options, selected: f[key] as unknown as string[],
    onToggle: (v) => set({ [key]: toggleIn(f[key] as unknown as string[], v) } as Partial<DishFilters>),
  });

  const defs: FilterDef[] = [
    { kind: "custom", id: "category", title: t("filters.category"), render: <CategoryChips /> },
    chips("region", t("filters.region"), "regions", regions.map((r) => ({ value: r.id, label: r.nameVi }))),
    {
      kind: "custom", id: "province", title: t("filters.province"),
      render: (
        <select className="h-9 w-full rounded-xl border border-line bg-paper px-3 text-sm" value=""
          onChange={(e) => e.target.value && set({ provinces: toggleIn(f.provinces, e.target.value) })} data-testid="province-select" aria-label={t("filters.province")}>
          <option value="">+ {t("filters.province")}…</option>
          {provinceOptions.map((p) => <option key={p.id} value={p.id}>{f.provinces.includes(p.id) ? "✓ " : ""}{p.nameVi}</option>)}
        </select>
      ),
    },
    chips("dish-type", t("filters.dishType"), "dishTypes", DISH_TYPES.map((d) => ({ value: d, label: lbl(DISH_TYPE_LABELS, d, locale) }))),
    {
      kind: "custom", id: "ingredient", title: t("filters.ingredient"),
      render: (
        <input value={f.ingredient} onChange={(e) => set({ ingredient: e.target.value })} placeholder={locale === "vi" ? "vd. sả, tôm, dừa" : "e.g. lemongrass, shrimp, coconut"}
          className="h-9 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-forest/50" aria-label={t("filters.ingredient")} />
      ),
    },
    chips("taste", t("filters.taste"), "tastes", TASTES.map((x) => ({ value: x, label: lbl(TASTE_LABELS, x, locale) }))),
    {
      kind: "single", id: "spice", title: t("filters.spice"), value: f.maxSpice === null ? "any" : String(f.maxSpice),
      onPick: (v) => set({ maxSpice: v === "any" ? null : Number(v) }),
      options: [{ value: "any", label: t("common.any") }, ...[0, 1, 2, 3].map((n) => ({ value: String(n), label: `${"🌶".repeat(n) || "○"} ${lbl(SPICE_LABELS, String(n), locale)}` }))],
    },
    chips("diet", t("filters.diet"), "diet", (Object.keys(DIET_PREFS) as DietPref[]).map((d) => ({ value: d, label: lbl(DIET_LABELS, d, locale) })), t("dish.dietaryNote")),
    chips("meal", t("filters.meal"), "mealTimes", MEAL_TIMES.map((m) => ({ value: m, label: lbl(MEAL_LABELS, m, locale) }))),
    { kind: "heading", id: "hcmc", title: t("filters.hcmcSection"), note: t("filters.venueNote") },
    chips("availability", t("filters.availability"), "availability", AVAIL.map((a) => ({ value: a, label: t(`status.${a}`), testid: `avail-${a}` }))),
    chips("budget", t("filters.budget"), "budget", PRICE_RANGES.map((p) => ({ value: p, label: p }))),
    chips("neighbourhood", t("filters.neighbourhood"), "neighbourhoods", neighbourhoods.map((n) => ({ value: n, label: n }))),
    {
      kind: "custom", id: "distance", title: t("filters.distance"),
      render: (
        <>
          <select className="h-8 rounded-full border border-line bg-paper px-3 text-xs" value={originId} aria-label={t("nearby.from")}
            onChange={(e) => {
              if (e.target.value === "me" && navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => setOrigin("me", [p.coords.longitude, p.coords.latitude]));
              else setOrigin(e.target.value);
            }}>
            <option value="me">{t("nearby.myLocation")}</option>
            {HCMC_NEIGHBOURHOODS.map((n) => <option key={n.id} value={n.id}>{t("nearby.from")}: {n.name}</option>)}
          </select>
          {[1, 3, 5, 10].map((km) => <Chip key={km} active={f.maxDistanceKm === km} onClick={() => set({ maxDistanceKm: f.maxDistanceKm === km ? null : km })}>≤ {km} km</Chip>)}
        </>
      ),
    },
    {
      kind: "custom", id: "venue-type", title: t("filters.venueType"),
      render: (
        <>
          {VENUE_TYPES.map((v) => <Chip key={v} active={f.venueTypes.includes(v)} onClick={() => set({ venueTypes: toggleIn(f.venueTypes, v) })}>{lbl(VENUE_LABELS, v, locale)}</Chip>)}
          <Chip active={f.openNow} onClick={() => set({ openNow: !f.openNow })} data-testid="open-now">{t("filters.openNow")}</Chip>
        </>
      ),
    },
    { kind: "heading", id: "personal", title: t("filters.personal") },
    {
      kind: "custom", id: "tried", title: t("filters.tried"),
      render: (
        <>
          {(["any", "tried", "untried"] as const).map((v) => (
            <Chip key={v} active={f.tried === v} onClick={() => set({ tried: v })}>{v === "any" ? t("filters.triedAny") : v === "tried" ? t("filters.triedYes") : t("filters.triedNo")}</Chip>
          ))}
          <Chip active={f.savedOnly} onClick={() => set({ savedOnly: !f.savedOnly })}>{t("filters.saved")}</Chip>
        </>
      ),
    },
  ];
  return <FilterDrawer defs={defs} />;
}
