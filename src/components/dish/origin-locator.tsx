import type { Dish, Province, Region } from "@/lib/data/schema";
import { getLocatorPaths } from "@/lib/geo/locator";

/** Static portrait locator highlighting the dish's origin provinces (compact server-rendered SVG). */
export function OriginLocator({ dish, provinces, regions }: { dish: Dish; provinces: Province[]; regions: Region[] }) {
  const { width, height, paths, project } = getLocatorPaths();
  const primary = new Set(dish.origins.filter((o) => o.role === "primary" && o.provinceId).map((o) => o.provinceId));
  const assoc = new Set(dish.origins.filter((o) => o.role === "associated" && o.provinceId).map((o) => o.provinceId));
  const regionWide = new Set(dish.origins.filter((o) => !o.provinceId).map((o) => o.regionId));
  const fill = (p: (typeof paths)[number]) =>
    primary.has(p.id) ? "#B66B50" : assoc.has(p.id) ? "#D79D86" : p.regionId && regionWide.has(p.regionId as never) ? "#E9C9A8" : null;
  const base = paths.filter((p) => p.kind === "province" && !fill(p)).map((p) => p.d).join("");
  const islands = paths.filter((p) => p.kind === "archipelago").map((p) => p.d).join("");
  const pins = provinces.filter((p) => primary.has(p.id) || assoc.has(p.id));
  void regions;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-auto" role="img" aria-label={`Origin of ${dish.nameVi}`} data-testid="origin-locator">
      <path d={base} fill="#C9D4C1" stroke="#FFFDF8" strokeWidth={0.4} />
      <path d={islands} fill="#C4923A" stroke="#C4923A" strokeWidth={1.5} />
      {paths.filter((p) => fill(p)).map((p) => <path key={p.id} d={p.d} fill={fill(p)!} stroke="#FFFDF8" strokeWidth={0.4} />)}
      {pins.map((p) => {
        const [x, y] = project(p.labelPoint as [number, number]);
        return <circle key={p.id} cx={x.toFixed(0)} cy={y.toFixed(0)} r={primary.has(p.id) ? 4 : 2.5} fill="#FFFDF8" stroke="#B66B50" strokeWidth={1.8} />;
      })}
    </svg>
  );
}
