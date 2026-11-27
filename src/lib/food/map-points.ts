import type { Dish, Province, Region } from "../data/schema";
import type { LngLat } from "../geo/geo";

/** Region anchor = mean of its provinces' interior label points. */
export function regionAnchors(regions: Region[], provinces: Province[]): Map<string, LngLat> {
  const m = new Map<string, LngLat>();
  for (const r of regions) {
    const ps = provinces.filter((p) => p.regionId === r.id);
    m.set(r.id, [ps.reduce((a, p) => a + p.labelPoint[0], 0) / ps.length, ps.reduce((a, p) => a + p.labelPoint[1], 0) / ps.length]);
  }
  return m;
}

/** Where a dish sits on the culinary map: primary origin → first associated province → region anchor. */
export function dishAnchor(d: Dish, provinces: Map<string, Province>, anchors: Map<string, LngLat>): { point: LngLat; key: string } {
  const o = d.origins.find((x) => x.role === "primary" && x.provinceId) ?? d.origins.find((x) => x.provinceId);
  if (o?.provinceId) {
    const p = provinces.get(o.provinceId);
    if (p) return { point: p.labelPoint as LngLat, key: p.id };
  }
  return { point: anchors.get(d.origins[0].regionId)!, key: `region:${d.origins[0].regionId}` };
}

/**
 * Deterministic positions: dishes sharing an anchor are fanned out on a sunflower spiral
 * (sorted by prominence so the most representative dish sits at the centre).
 */
export function dishPositions(dishes: Dish[], provinces: Map<string, Province>, anchors: Map<string, LngLat>, spacing = 0.085): Map<string, LngLat> {
  const groups = new Map<string, { point: LngLat; dishes: Dish[] }>();
  for (const d of dishes) {
    const a = dishAnchor(d, provinces, anchors);
    const g = groups.get(a.key) ?? { point: a.point, dishes: [] };
    g.dishes.push(d);
    groups.set(a.key, g);
  }
  const out = new Map<string, LngLat>();
  for (const g of groups.values()) {
    g.dishes.sort((a, b) => a.prominence - b.prominence || a.id.localeCompare(b.id));
    g.dishes.forEach((d, k) => {
      const r = spacing * Math.sqrt(k);
      const th = k * 2.39996;
      out.set(d.id, [g.point[0] + r * Math.cos(th), g.point[1] + r * Math.sin(th)]);
    });
  }
  return out;
}

/**
 * Progressive disclosure: national → representative dishes; regional → more; provincial → all.
 * `baseZoom` is the zoom at which all of Vietnam fits this device's viewport, so phones and
 * desktops disclose at the same *relative* depth. A selected region/province sets a floor.
 */
export function maxTierForZoom(
  zoom: number,
  filteredCount: number,
  opts: { baseZoom?: number; selection?: "none" | "region" | "province" } = {},
): 1 | 2 | 3 {
  if (filteredCount <= 24) return 3;
  const rel = zoom - (opts.baseZoom ?? 4.9);
  const byZoom: 1 | 2 | 3 = rel < 0.6 ? 1 : rel < 1.7 ? 2 : 3;
  const floor = opts.selection === "province" ? 3 : opts.selection === "region" ? 2 : 1;
  return Math.max(byZoom, floor) as 1 | 2 | 3;
}

export const zoomLevelName = (zoom: number, baseZoom: number) => {
  const rel = zoom - baseZoom;
  return rel < 0.6 ? "national" : rel < 1.7 ? "regional" : "provincial";
};
