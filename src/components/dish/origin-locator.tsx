import type { Dish, Province, Region } from "@/lib/data/schema";
import { getLocatorPaths } from "@/lib/geo/locator";

/** Static portrait locator: highlights the dish's origin provinces (server-rendered SVG). */
export function OriginLocator({ dish, provinces, regions }: { dish: Dish; provinces: Province[]; regions: Region[] }) {
  const { width, height, paths, project } = getLocatorPaths();
  const primary = new Set(dish.origins.filter((o) => o.role === "primary" && o.provinceId).map((o) => o.provinceId));
  const assoc = new Set(dish.origins.filter((o) => o.role === "associated" && o.provinceId).map((o) => o.provinceId));
  const regionWide = new Set(dish.origins.filter((o) => !o.provinceId).map((o) => o.regionId));
  const color = new Map(regions.map((r) => [r.id, r.color]));
  const pins = provinces.filter((p) => primary.has(p.id) || assoc.has(p.id));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-auto" role="img" aria-label={`Origin of ${dish.nameVi}`} data-testid="origin-locator">
      {paths.map((p) => {
        const hit = primary.has(p.id) ? "#B66B50" : assoc.has(p.id) ? "#D79D86" : regionWide.has(p.regionId as never) ? "#E9C9A8" : undefined;
        return (
          <path key={p.id} d={p.d} fill={hit ?? (p.kind === "archipelago" ? "#C4923A" : color.get(p.regionId as never) ?? "#ddd")} opacity={hit || p.kind === "archipelago" ? 1 : 0.55} stroke="#FFFDF8" strokeWidth={0.5} />
        );
      })}
      {pins.map((p) => {
        const [x, y] = project(p.labelPoint as [number, number]);
        return <circle key={p.id} cx={x} cy={y} r={primary.has(p.id) ? 4.5 : 3} fill="#FFFDF8" stroke="#B66B50" strokeWidth={2} />;
      })}
    </svg>
  );
}
