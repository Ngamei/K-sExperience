import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { geometryToPath, makeProjector, VIETNAM_BBOX } from "./svg";

interface F { properties: { id: string; kind: string; regionId?: string }; geometry: { type: string; coordinates: unknown } }
let cache: { width: number; height: number; paths: { id: string; kind: string; regionId?: string; d: string }[]; project: (p: [number, number]) => [number, number] } | null = null;

/** Pre-projected SVG paths of Vietnam for static locator maps (computed at build time). */
export function getLocatorPaths() {
  if (cache) return cache;
  const geo = JSON.parse(readFileSync(path.join(process.cwd(), "public/geo/vietnam.json"), "utf8")) as { features: F[] };
  const { project, width, height } = makeProjector(VIETNAM_BBOX, 320);
  cache = {
    width, height, project,
    paths: geo.features.map((f) => ({ id: f.properties.id, kind: f.properties.kind, regionId: f.properties.regionId, d: geometryToPath(f.geometry, project) })),
  };
  return cache;
}
