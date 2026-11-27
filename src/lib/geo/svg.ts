/** Tiny equirectangular projector for static SVG maps (origin locator, no-WebGL fallback). */
type Ring = [number, number][];
export interface SvgFeature { id: string; d: string; props: Record<string, unknown> }

export function makeProjector(bbox: [number, number, number, number], width: number) {
  const [minX, minY, maxX, maxY] = bbox;
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
  const sx = width / ((maxX - minX) * k);
  const height = (maxY - minY) * sx;
  const project = ([x, y]: [number, number]): [number, number] => [(x - minX) * k * sx, (maxY - y) * sx];
  return { project, width, height };
}

export function geometryToPath(geom: { type: string; coordinates: unknown }, project: (p: [number, number]) => [number, number], digits = 1): string {
  const polys = (geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates) as Ring[][];
  return polys
    .map((poly) =>
      poly
        .map((ring) => "M" + ring.map((p) => project(p).map((v) => v.toFixed(digits)).join(",")).join("L") + "Z")
        .join(""),
    )
    .join("");
}

/** Bounds of mainland Vietnam + Hoàng Sa + Trường Sa. */
export const VIETNAM_BBOX: [number, number, number, number] = [102.1, 8.2, 115.2, 23.45];
