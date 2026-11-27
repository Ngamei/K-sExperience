/**
 * Builds the geography data files from the public-domain geoBoundaries source.
 *
 *   npm run data:geo
 *
 * Inputs : data/source/geoBoundaries-VNM-ADM1.geojson (gbOpen VNM ADM1, Public Domain)
 * Outputs: data/vietnam.geojson          — canonical, full-precision, our IDs
 *          data/regions.json             — 6 culinary regions
 *          data/provinces.json           — 63 historical provinces + 2025 mapping
 *          data/hcmc-boundary.geojson    — current (2025) HCMC administrative area
 *          public/geo/vietnam.json       — simplified for the browser
 *          public/geo/regions.json       — dissolved region outlines for the browser
 *          public/geo/hcmc.json          — simplified HCMC boundary for the Nearby map
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CURRENT_UNITS, PROVINCES, REGIONS } from "./geo-master";

type Ring = [number, number][];
type Poly = Ring[];
type Feature = { type: "Feature"; properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } };

const root = path.resolve(__dirname, "..");
const src = JSON.parse(readFileSync(path.join(root, "data/source/geoBoundaries-VNM-ADM1.geojson"), "utf8"));

const polysOf = (g: Feature["geometry"]): Poly[] =>
  g.type === "Polygon" ? [g.coordinates as Poly] : (g.coordinates as Poly[]);

const ringArea = (r: Ring) => {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(a / 2);
};

const inRing = (x: number, y: number, r: Ring) => {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const inPoly = (x: number, y: number, p: Poly) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h));

const segDist = (x: number, y: number, a: [number, number], b: [number, number]) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
};

/** Interior label point: grid search for the inside point farthest from the boundary. */
function labelPoint(p: Poly): [number, number] {
  const r = p[0];
  const xs = r.map((c) => c[0]);
  const ys = r.map((c) => c[1]);
  const [minx, maxx, miny, maxy] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  let best: [number, number] = [(minx + maxx) / 2, (miny + maxy) / 2];
  let bestD = -1;
  const N = 40;
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= N; j++) {
      const x = minx + ((maxx - minx) * i) / N;
      const y = miny + ((maxy - miny) * j) / N;
      if (!inPoly(x, y, p)) continue;
      let d = Infinity;
      for (const ring of p) for (let k = 0; k < ring.length - 1; k++) d = Math.min(d, segDist(x, y, ring[k], ring[k + 1]));
      if (d > bestD) {
        bestD = d;
        best = [x, y];
      }
    }
  return [Number(best[0].toFixed(4)), Number(best[1].toFixed(4))];
}

const bboxOf = (polys: Poly[]) => {
  let [a, b, c, d] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of polys) for (const [x, y] of p[0]) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  return [a, b, c, d].map((v) => Number(v.toFixed(4)));
};

// ---- Map source features to our provinces --------------------------------------------------
const byGb = new Map<string, Poly[]>();
for (const f of src.features as Feature[]) {
  const name = String(f.properties.shapeName).trim();
  const key = name === "Côn Đảo" ? "Bà Rịa–Vũng Tàu" : name; // Côn Đảo is a district of BR–VT
  byGb.set(key, [...(byGb.get(key) ?? []), ...polysOf(f.geometry)]);
}

const archipelagos: { id: string; nameVi: string; nameEn: string; parent: string; minLon: number; polys: Poly[] }[] = [
  { id: "hoang-sa", nameVi: "Quần đảo Hoàng Sa", nameEn: "Hoang Sa (Paracel) Archipelago", parent: "da-nang", minLon: 110.5, polys: [] },
  { id: "truong-sa", nameVi: "Quần đảo Trường Sa", nameEn: "Truong Sa (Spratly) Archipelago", parent: "khanh-hoa", minLon: 110.5, polys: [] },
];

const features: Feature[] = [];
const provinces = PROVINCES.map(([id, nameVi, nameEn, gb, iso, regionId, current, kind]) => {
  let polys = byGb.get(gb);
  if (!polys) throw new Error(`Missing geometry for ${gb}`);
  const arch = archipelagos.find((a) => a.parent === id);
  if (arch) {
    arch.polys = polys.filter((p) => p[0].every(([x]) => x >= arch.minLon));
    polys = polys.filter((p) => !arch.polys.includes(p));
    if (!arch.polys.length) throw new Error(`No island polygons found for ${arch.id}`);
  }
  const main = [...polys].sort((a, b) => ringArea(b[0]) - ringArea(a[0]))[0];
  const unit = CURRENT_UNITS[current];
  if (!unit) throw new Error(`Unknown current unit ${current}`);
  const label = labelPoint(main);
  features.push({
    type: "Feature",
    properties: { id, kind: "province", nameVi, nameEn, regionId, iso },
    geometry: polys.length === 1 ? { type: "Polygon", coordinates: polys[0] } : { type: "MultiPolygon", coordinates: polys },
  });
  return {
    id,
    nameVi,
    nameEn,
    iso,
    regionId,
    kind: kind ?? "province",
    labelPoint: label,
    bbox: bboxOf(polys),
    current: { id: current, nameVi: unit.nameVi, nameEn: unit.nameEn, kind: unit.kind },
  };
});

const archipelagoRecords = archipelagos.map((a) => {
  const xs = a.polys.flatMap((p) => p[0].map((c) => c[0]));
  const ys = a.polys.flatMap((p) => p[0].map((c) => c[1]));
  const label: [number, number] = [
    Number(((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(4)),
    Number(((Math.min(...ys) + Math.max(...ys)) / 2).toFixed(4)),
  ];
  features.push({
    type: "Feature",
    properties: { id: a.id, kind: "archipelago", nameVi: a.nameVi, nameEn: a.nameEn, parentProvinceId: a.parent },
    geometry: { type: "MultiPolygon", coordinates: a.polys },
  });
  return { id: a.id, nameVi: a.nameVi, nameEn: a.nameEn, parentProvinceId: a.parent, labelPoint: label, islandCount: a.polys.length };
});

// ---- Write canonical data ------------------------------------------------------------------
const out = (rel: string, data: unknown) => {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, rel.startsWith("public") ? 0 : 2) + "\n");
};

const meta = {
  source: "geoBoundaries gbOpen VNM ADM1 (boundaryYear 2008, build Dec 12 2023)",
  sourceUrl: "https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/VNM/ADM1",
  license: "Public Domain (per geoBoundaries metadata)",
  note: "63 historical provinces used as culinary identities. Hoàng Sa (Đà Nẵng) and Trường Sa (Khánh Hòa) extracted as labelled features.",
};

if (provinces.length !== 63) throw new Error(`Expected 63 provinces, got ${provinces.length}`);
out("data/vietnam.geojson", { type: "FeatureCollection", metadata: meta, features });
out("data/regions.json", {
  metadata: { note: "Six culinary regions requested by the K's Experience product brief." },
  regions: REGIONS.map((r) => ({ ...r, provinceIds: provinces.filter((p) => p.regionId === r.id).map((p) => p.id) })),
});
out("data/provinces.json", {
  metadata: {
    ...meta,
    currentAdministrativeGeography:
      "`current` maps each historical province to its province-level unit after Resolution 202/2025/QH15 (effective 1 July 2025; 34 units).",
  },
  provinces,
  archipelagos: archipelagoRecords,
});

// HCMC current (2025) boundary = former HCMC + Bình Dương + Bà Rịa–Vũng Tàu
const hcmcIds = provinces.filter((p) => p.current.id === "ho-chi-minh").map((p) => p.id);
const hcmc = {
  type: "FeatureCollection",
  metadata: { ...meta, note: `Union of historical units ${hcmcIds.join(", ")} (HCMC since 1 July 2025).` },
  features: features.filter((f) => hcmcIds.includes(String(f.properties.id))),
};
out("data/hcmc-boundary.geojson", hcmc);

// ---- Simplified browser files via mapshaper ------------------------------------------------
const ms = path.join(root, "node_modules/mapshaper/bin/mapshaper");
const run = (args: string[]) => execFileSync(process.execPath, [ms, ...args], { stdio: "pipe" });
mkdirSync(path.join(root, "public/geo"), { recursive: true });
run(["data/vietnam.geojson", "-simplify", "40%", "keep-shapes", "-o", "public/geo/vietnam.json", "precision=0.0005", "format=geojson"]);
run(["data/vietnam.geojson", "-filter", "kind === 'province'", "-dissolve", "regionId", "-simplify", "30%", "keep-shapes", "-o", "public/geo/regions.json", "precision=0.0005", "format=geojson"]);
run(["data/hcmc-boundary.geojson", "-dissolve", "-simplify", "60%", "-o", "public/geo/hcmc.json", "precision=0.0002", "format=geojson"]);

console.log(`✓ ${provinces.length} provinces, ${archipelagoRecords.length} archipelagos, ${REGIONS.length} regions written.`);
