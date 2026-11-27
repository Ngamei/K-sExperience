"use client";
import { useMemo } from "react";
import type { Dish, Region } from "@/lib/data/schema";
import { geometryToPath, makeProjector, VIETNAM_BBOX } from "@/lib/geo/svg";
import type { LngLat } from "@/lib/geo/geo";
import { CATEGORY_COLORS } from "@/components/food/illustrations";

interface GeoFC { features: { properties: { id: string; kind: string; regionId?: string }; geometry: { type: string; coordinates: unknown } }[] }

/** No-WebGL fallback: static, clickable SVG of the same accurate boundaries. */
export function SvgVietnamMap({ geo, dishes, positions, selectedProvince, selectedRegion, onProvinceClick, onDishClick, regionById }: {
  geo: GeoFC; dishes: Dish[]; positions: Map<string, LngLat>; selectedProvince: string | null; selectedRegion: string | null;
  onProvinceClick: (id: string) => void; onDishClick: (id: string) => void; regionById: Map<string, Region>;
}) {
  const proj = useMemo(() => makeProjector(VIETNAM_BBOX, 600), []);
  const paths = useMemo(() => geo.features.map((f) => ({ ...f.properties, d: geometryToPath(f.geometry, proj.project) })), [geo, proj]);
  const shown = dishes.filter((d) => d.prominence <= (dishes.length <= 24 ? 3 : 2));
  return (
    <div className="paper-grain flex h-full w-full items-center justify-center overflow-auto bg-sea p-2" data-testid="vietnam-map" data-fallback="svg">
      <svg viewBox={`0 0 ${proj.width} ${proj.height}`} className="h-full max-h-full w-auto" role="img" aria-label="Map of Vietnam">
        {paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            fill={p.kind === "archipelago" ? "#C4923A" : regionById.get(p.regionId as never)?.color}
            opacity={selectedRegion && p.regionId !== selectedRegion && p.kind === "province" ? 0.4 : 1}
            stroke={selectedProvince === p.id ? "#B66B50" : "#FFFDF8"}
            strokeWidth={selectedProvince === p.id ? 2 : 0.6}
            className="cursor-pointer"
            onClick={() => p.kind === "province" && onProvinceClick(p.id)}
          />
        ))}
        {shown.map((d) => {
          const [x, y] = proj.project(positions.get(d.id)!);
          return (
            <circle key={d.id} cx={x} cy={y} r={d.prominence === 1 ? 6 : 4} fill="#FFFDF8" stroke={CATEGORY_COLORS[d.category]} strokeWidth={2.2} className="cursor-pointer" onClick={() => onDishClick(d.id)}>
              <title>{d.nameVi}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}
