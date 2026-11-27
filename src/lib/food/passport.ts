import type { Dish, Region } from "../data/schema";

export interface RegionProgress { regionId: string; tried: number; total: number; pct: number }

export function passportProgress(dishes: Dish[], regions: Region[], tried: Set<string>) {
  const perRegion: RegionProgress[] = regions.map((r) => {
    const inRegion = dishes.filter((d) => d.regionIds.includes(r.id));
    const t = inRegion.filter((d) => tried.has(d.id)).length;
    return { regionId: r.id, tried: t, total: inRegion.length, pct: inRegion.length ? Math.round((t / inRegion.length) * 100) : 0 };
  });
  const triedCount = dishes.filter((d) => tried.has(d.id)).length;
  const provincesTried = new Set(dishes.filter((d) => tried.has(d.id)).flatMap((d) => d.origins.map((o) => o.provinceId).filter(Boolean)));
  return {
    perRegion,
    triedCount,
    total: dishes.length,
    pct: dishes.length ? Math.round((triedCount / dishes.length) * 100) : 0,
    provincesTried: provincesTried.size,
    regionsCompleted: perRegion.filter((r) => r.total > 0 && r.tried === r.total).length,
  };
}
