"use client";
/** Platform data summary (Settings → About, concise) and coverage table (Admin → Overview, detailed). Counts are computed live. */
import { useQueries } from "@tanstack/react-query";
import { EXPERIENCES, isSelectable, loc, type ExperienceId } from "@/experiences/registry";
import { foodStats, moduleStats, uniqueEstablishments, type CoverageStats } from "@/lib/data/platform-stats";
import { useT } from "@/lib/i18n/use-t";
import { useFoodData } from "@/components/food/food-data";
import { fetchExperienceData } from "./experience-data";

const L = {
  items: { en: "Catalogue items", vi: "Mục trong danh mục" }, places: { en: "Establishments", vi: "Cơ sở" }, offerings: { en: "Item–place links", vi: "Liên kết món–quán" },
  covered: { en: "Items with places", vi: "Mục có cơ sở" }, priced: { en: "With price", vi: "Có giá" }, photos: { en: "With photo", vi: "Có ảnh" },
  provinces: { en: "Provinces", vi: "Tỉnh" }, regions: { en: "Regions", vi: "Vùng" }, total: { en: "Unique establishments, all experiences", vi: "Tổng cơ sở (không trùng)" },
  loading: { en: "Loading…", vi: "Đang tải…" },
};

export function usePlatformStats() {
  const food = useFoodData();
  const mods = EXPERIENCES.filter((m) => m.id !== "food" && m.implemented && isSelectable(m));
  const qs = useQueries({ queries: mods.map((m) => ({ queryKey: ["platform-stats", m.id], queryFn: () => fetchExperienceData(m.id as ExperienceId), staleTime: Infinity })) });
  const rows: { id: string; name: { en: string; vi: string }; stats: CoverageStats | null }[] = [
    { id: "food", name: EXPERIENCES[0].name, stats: foodStats(food) },
    ...mods.map((m, i) => ({ id: m.id, name: m.name, stats: qs[i].data ? moduleStats(qs[i].data!) : null })),
  ];
  const loaded = qs.every((q) => q.data);
  const unique = loaded ? uniqueEstablishments([food.restaurants, ...qs.map((q) => q.data!.establishments)]) : null;
  return { rows, unique };
}

export function PlatformSummary({ detailed = false }: { detailed?: boolean }) {
  const { locale } = useT();
  const { rows, unique } = usePlatformStats();
  const l = (x: { en: string; vi: string }) => loc(x, locale);
  const cols: [keyof typeof L, (s: CoverageStats) => React.ReactNode][] = [
    ["items", (s) => s.items], ["places", (s) => s.establishments], ["covered", (s) => `${s.itemsWithEstablishments}/${s.items}`],
    ...(detailed ? ([["offerings", (s: CoverageStats) => s.offerings], ["priced", (s: CoverageStats) => s.pricedOfferings], ["photos", (s: CoverageStats) => s.photographedOfferings]] as [keyof typeof L, (s: CoverageStats) => React.ReactNode][]) : []),
  ];
  const food = rows[0].stats!;
  return (
    <div data-testid={detailed ? "admin-coverage" : "platform-summary"}>
      <p className="mb-2 text-sm text-charcoal/80">
        {l(EXPERIENCES[0].name)}: <strong data-testid="stat-food-items">{food.items}</strong> {locale === "vi" ? "món" : "dishes"} · {l(L.provinces)} <strong data-testid="stat-provinces">{food.provinces!.covered}/{food.provinces!.total}</strong> · {l(L.regions)} <strong>{food.regions!.covered}/{food.regions!.total}</strong>
        {unique !== null && <> · {l(L.total)}: <strong data-testid="stat-unique-places">{unique}</strong></>}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted"><th className="py-1 pr-3 font-semibold">&nbsp;</th>{cols.map(([k]) => <th key={k} className="py-1 pr-3 text-right font-semibold">{l(L[k])}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line/60" data-testid={`stat-row-${r.id}`}>
                <td className="py-1.5 pr-3">{l(r.name)}</td>
                {cols.map(([k, f]) => <td key={k} className="py-1.5 pr-3 text-right tabular-nums">{r.stats ? f(r.stats) : <span className="text-muted">{l(L.loading)}</span>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
