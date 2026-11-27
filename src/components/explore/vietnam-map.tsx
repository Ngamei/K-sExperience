"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap, Marker as MLMarker, LngLatBoundsLike, GeoJSONSource } from "maplibre-gl";
import Supercluster from "supercluster";
import type { Dish } from "@/lib/data/schema";
import { dishPositions, maxTierForZoom, regionAnchors, zoomLevelName } from "@/lib/food/map-points";
import { VIETNAM_BBOX } from "@/lib/geo/svg";
import { useT } from "@/lib/i18n/use-t";
import { CATEGORY_COLORS, dishSvg } from "@/components/food/illustrations";
import { useFoodData } from "@/components/food/food-data";
import { SvgVietnamMap } from "./svg-vietnam-map";

export type MapFocus = { kind: "all" } | { kind: "region"; id: string } | { kind: "province"; id: string };

interface Props {
  dishes: Dish[];
  focus: MapFocus;
  focusNonce: number;
  selectedProvince: string | null;
  selectedRegion: string | null;
  onProvinceClick: (id: string) => void;
  onDishClick: (id: string) => void;
}

const fetchJson = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.json(); });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

/** One point per island polygon (archipelago features), for the always-visible island dots. */
function islandPoints(fc: { features: { properties: { kind: string; id: string }; geometry: { type: string; coordinates: number[][][][] } }[] }) {
  const features = fc.features
    .filter((f) => f.properties.kind === "archipelago")
    .flatMap((f) => f.geometry.coordinates.map((poly) => {
      const ring = poly[0];
      const x = ring.reduce((a, c) => a + c[0], 0) / ring.length;
      const y = ring.reduce((a, c) => a + c[1], 0) / ring.length;
      return { type: "Feature" as const, properties: { archipelago: f.properties.id }, geometry: { type: "Point" as const, coordinates: [x, y] } };
    }));
  return { type: "FeatureCollection" as const, features };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function VietnamMap(props: Props) {
  const { t, locale } = useT();
  const { provinces, regions, provinceById, archipelagos, regionById } = useFoodData();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<MLMarker[]>([]);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(5);
  const [baseZoom, setBaseZoom] = useState(4.9);
  const [fallback, setFallback] = useState(false);
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; });

  const geo = useQuery({ queryKey: ["geo", "vietnam"], queryFn: () => fetchJson("/geo/vietnam.json") });
  const regionGeo = useQuery({ queryKey: ["geo", "regions"], queryFn: () => fetchJson("/geo/regions.json") });

  const anchors = useMemo(() => regionAnchors(regions, provinces), [regions, provinces]);
  const positions = useMemo(() => dishPositions(props.dishes, provinceById, anchors), [props.dishes, provinceById, anchors]);

  // ---- Initialise the map once geometry is loaded ------------------------------------------
  useEffect(() => {
    if (!geo.data || !regionGeo.data || mapRef.current || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      if (!hasWebGL()) { setFallback(true); return; }
      const ml = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      ml.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      mlRef.current = ml;
      const colorMatch = ["match", ["get", "regionId"], ...regions.flatMap((r) => [r.id, r.color]), "#ddd"];
      let map: MLMap;
      try {
        map = new ml.Map({
          container: containerRef.current,
          style: {
            version: 8,
            sources: {
              provinces: { type: "geojson", data: geo.data, promoteId: "id" },
              regions: { type: "geojson", data: regionGeo.data },
              islands: { type: "geojson", data: islandPoints(geo.data) },
            },
            layers: [
              { id: "sea", type: "background", paint: { "background-color": "#E4EBE4" } },
              { id: "coast-glow", type: "line", source: "regions", paint: { "line-color": "#C9D5C8", "line-width": 10, "line-blur": 8 } },
              {
                id: "province-fill", type: "fill", source: "provinces", filter: ["==", ["get", "kind"], "province"],
                paint: {
                  "fill-color": ["case", ["boolean", ["feature-state", "hover"], false], "#F3E3D3", colorMatch as never],
                  "fill-opacity": 1,
                },
              },
              { id: "province-line", type: "line", source: "provinces", filter: ["==", ["get", "kind"], "province"], paint: { "line-color": "#FFFDF8", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.4, 8, 1.4] } },
              { id: "region-line", type: "line", source: "regions", paint: { "line-color": "#7E8F79", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 8, 2] } },
              { id: "province-selected", type: "line", source: "provinces", filter: ["==", ["get", "id"], ""], paint: { "line-color": "#B66B50", "line-width": 2.4 } },
              { id: "archipelago-fill", type: "fill", source: "provinces", filter: ["==", ["get", "kind"], "archipelago"], paint: { "fill-color": "#C4923A", "fill-opacity": 0.9 } },
              { id: "archipelago-line", type: "line", source: "provinces", filter: ["==", ["get", "kind"], "archipelago"], paint: { "line-color": "#8a6420", "line-width": 1.2 } },
              // Islands are sub-pixel at national zoom: draw a visible dot per island so Hoàng Sa and Trường Sa always read.
              { id: "island-dots", type: "circle", source: "islands", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2.2, 9, 4], "circle-color": "#C4923A", "circle-stroke-color": "#FFFDF8", "circle-stroke-width": 1 } },
            ],
          },
          bounds: VIETNAM_BBOX as LngLatBoundsLike,
          fitBoundsOptions: { padding: 16 },
          maxBounds: [[96, 4], [121, 27]],
          minZoom: 3.6,
          maxZoom: 10,
          attributionControl: { compact: true, customAttribution: "Boundaries: geoBoundaries (Public Domain)" },
          dragRotate: false,
          pitchWithRotate: false,
          renderWorldCopies: false,
        });
      } catch {
        setFallback(true);
        return;
      }
      map.touchZoomRotate.disableRotation();
      map.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      mapRef.current = map;
      // Exposed for end-to-end tests (read-only use).
      (window as unknown as { __ksxMap?: MLMap }).__ksxMap = map;

      let hoverId: string | null = null;
      map.on("mousemove", "province-fill", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (hoverId && hoverId !== id) map.setFeatureState({ source: "provinces", id: hoverId }, { hover: false });
        if (id) { hoverId = id; map.setFeatureState({ source: "provinces", id }, { hover: true }); map.getCanvas().style.cursor = "pointer"; }
      });
      map.on("mouseleave", "province-fill", () => {
        if (hoverId) map.setFeatureState({ source: "provinces", id: hoverId }, { hover: false });
        hoverId = null;
        map.getCanvas().style.cursor = "";
      });
      map.on("click", "province-fill", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (id) propsRef.current.onProvinceClick(id);
      });
      map.on("zoom", () => setZoom(map.getZoom()));
      map.on("moveend", () => setZoom(map.getZoom()));
      map.on("load", () => { setZoom(map.getZoom()); setBaseZoom(map.getZoom()); setReady(true); });
      map.on("error", (e) => console.warn("[map]", e.error?.message));
    })();
    return () => { cancelled = true; };
  }, [geo.data, regionGeo.data, regions]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  // ---- Static labels (regions, provinces, archipelagos, East Sea) --------------------------
  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!ready || !map || !ml) return;
    const labels: MLMarker[] = [];
    const add = (lngLat: [number, number], html: string, cls: string) => {
      const el = document.createElement("div");
      el.className = cls;
      el.innerHTML = html;
      el.style.pointerEvents = "none";
      labels.push(new ml.Marker({ element: el, anchor: "center" }).setLngLat(lngLat).addTo(map));
    };
    for (const r of regions) {
      const a = anchors.get(r.id)!;
      add([a[0] - (r.id === "tay-nguyen" ? 0.2 : 0.9), a[1] + 0.35], `<div class="font-display text-[13px] italic text-forest/80 whitespace-nowrap drop-shadow-[0_1px_0_#fffdf8]">${esc(r.nameVi)}</div>`, "map-label map-label-region");
    }
    for (const p of provinces) {
      add(p.labelPoint as [number, number], `<div class="text-[10px] font-medium tracking-wide text-charcoal/60 whitespace-nowrap" style="text-shadow:0 0 3px #fffdf8,0 0 3px #fffdf8">${esc(p.nameVi)}</div>`, "map-label map-label-province");
    }
    for (const a of archipelagos) {
      add([a.labelPoint[0] - (a.id === "truong-sa" ? 0.9 : 0), a.labelPoint[1] + 0.9], `<div class="text-center text-[10.5px] font-semibold leading-tight text-[#6b4e10] whitespace-nowrap" style="text-shadow:0 0 3px #E4EBE4">${esc(a.nameVi)}<br/><span class="font-normal opacity-75">(${esc(provinceById.get(a.parentProvinceId)?.nameVi ?? "")})</span></div>`, "map-label map-label-arch");
    }
    add([112.6, 13.0], `<div class="font-display text-[14px] italic tracking-[0.18em] text-[#7d9a95]/80 whitespace-nowrap">${esc(t("explore.eastSea"))}</div>`, "map-label map-label-sea");
    return () => labels.forEach((m) => m.remove());
  }, [ready, regions, provinces, archipelagos, anchors, provinceById, t]);

  // ---- Selection highlight ------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setFilter("province-selected", ["==", ["get", "id"], props.selectedProvince ?? ""]);
    const colorMatch = ["match", ["get", "regionId"], ...regions.flatMap((r) => [r.id, r.color]), "#ddd"];
    map.setPaintProperty("province-fill", "fill-opacity",
      props.selectedRegion ? ["case", ["==", ["get", "regionId"], props.selectedRegion], 1, 0.38] : 1);
    map.setPaintProperty("province-fill", "fill-color", ["case", ["boolean", ["feature-state", "hover"], false], "#F3E3D3", colorMatch as never]);
  }, [ready, props.selectedProvince, props.selectedRegion, regions]);

  // ---- Camera focus -----------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const f = props.focus;
    let b: [number, number, number, number] = VIETNAM_BBOX;
    if (f.kind === "province") b = provinceById.get(f.id)!.bbox as typeof b;
    if (f.kind === "region") {
      const ps = provinces.filter((p) => p.regionId === f.id);
      b = [Math.min(...ps.map((p) => p.bbox[0])), Math.min(...ps.map((p) => p.bbox[1])), Math.max(...ps.map((p) => p.bbox[2])), Math.max(...ps.map((p) => p.bbox[3]))];
    }
    map.fitBounds(b as LngLatBoundsLike, { padding: f.kind === "all" ? 16 : 40, maxZoom: f.kind === "province" ? 8.6 : 7.4, duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, props.focusNonce]);

  // ---- Dish markers with clustering + progressive disclosure -----------------------------------
  const tier = maxTierForZoom(zoom, props.dishes.length, {
    baseZoom,
    selection: props.selectedProvince ? "province" : props.selectedRegion ? "region" : "none",
  });
  const zInt = Math.floor(zoom);
  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!ready || !map || !ml) return;
    const visible = props.dishes.filter((d) => d.prominence <= tier);
    const index = new Supercluster<{ id: string }>({ radius: 46, maxZoom: 11, minPoints: 2 });
    index.load(visible.map((d) => ({ type: "Feature", properties: { id: d.id }, geometry: { type: "Point", coordinates: positions.get(d.id)! } })));
    const clusters = index.getClusters([96, 4, 121, 27], zInt);
    markersRef.current.forEach((m) => m.remove());
    const byId = new Map(visible.map((d) => [d.id, d]));
    const showNames = zoom - baseZoom >= 0.9;
    markersRef.current = clusters.map((c) => {
      const el = document.createElement("button");
      el.type = "button";
      const [lng, lat] = c.geometry.coordinates as [number, number];
      if ("cluster" in c.properties && c.properties.cluster) {
        const clusterId = (c.properties as { cluster_id: number }).cluster_id;
        const leaves = index.getLeaves(clusterId, 3).map((l) => byId.get(l.properties.id)!);
        const count = (c.properties as { point_count: number }).point_count;
        el.className = "dish-marker relative flex items-center";
        el.setAttribute("aria-label", `${count} dishes — zoom in`);
        el.dataset.testid = "dish-cluster";
        el.innerHTML = `<span class="flex -space-x-3">${leaves.map((d) => `<span class="inline-flex size-9 items-center justify-center rounded-full bg-[#FFFDF8] shadow-[0_2px_6px_rgba(41,45,41,.25)]" style="box-shadow:0 0 0 2px ${CATEGORY_COLORS[d.category]},0 2px 6px rgba(41,45,41,.25)">${dishSvg(d.dishType, 26)}</span>`).join("")}</span><span class="absolute -right-2 -top-2 rounded-full bg-[#294C3D] px-1.5 text-[11px] font-semibold leading-5 text-[#F8F5EE]">${count}</span>`;
        el.onclick = (ev) => {
          ev.stopPropagation();
          const z = Math.min(index.getClusterExpansionZoom(clusterId) + 0.3, 10);
          map.easeTo({ center: [lng, lat], zoom: z, duration: 500 });
        };
      } else {
        const d = byId.get((c.properties as { id: string }).id)!;
        const big = d.prominence === 1;
        el.className = "dish-marker flex flex-col items-center";
        el.dataset.testid = "dish-marker";
        el.dataset.dishId = d.id;
        el.setAttribute("aria-label", `${d.nameVi} — ${d.nameEn}`);
        el.title = `${d.nameVi} · ${d.nameEn}`;
        const size = big ? 46 : 38;
        el.innerHTML = `<span class="inline-flex items-center justify-center rounded-full bg-[#FFFDF8]" style="width:${size}px;height:${size}px;box-shadow:0 0 0 2.5px ${CATEGORY_COLORS[d.category]},0 3px 8px rgba(41,45,41,.28)">${dishSvg(d.dishType, Math.round(size * 0.74))}</span>${showNames || big ? `<span class="mt-1 rounded-full bg-[#FFFDF8]/95 px-1.5 text-[10.5px] font-medium leading-4 text-[#292D29] whitespace-nowrap shadow-sm">${esc(d.nameVi)}</span>` : ""}`;
        el.onclick = (ev) => { ev.stopPropagation(); propsRef.current.onDishClick(d.id); };
      }
      return new ml.Marker({ element: el, anchor: "top", offset: [0, -20] }).setLngLat([lng, lat]).addTo(map);
    });
  }, [ready, props.dishes, positions, tier, zInt, zoom - baseZoom >= 0.9]); // eslint-disable-line react-hooks/exhaustive-deps

  const level = zoomLevelName(zoom, baseZoom);

  if (fallback && geo.data) {
    return (
      <SvgVietnamMap geo={geo.data} dishes={props.dishes} positions={positions} selectedProvince={props.selectedProvince} selectedRegion={props.selectedRegion}
        onProvinceClick={props.onProvinceClick} onDishClick={props.onDishClick} regionById={regionById} />
    );
  }

  return (
    <div className="paper-grain relative h-full w-full overflow-hidden" data-testid="vietnam-map" data-zoom-level={level} data-ready={ready ? "1" : "0"}>
      <div ref={containerRef} className={`h-full w-full zoom-${level}`} />
      <style>{`
        .zoom-national .map-label-province { display:none }
        .zoom-provincial .map-label-region { display:none }
        .zoom-regional .map-label-province div { font-size:9px }
      `}</style>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">{locale === "vi" ? "Đang tải bản đồ…" : "Loading map…"}</div>
      )}
      {ready && tier < 3 && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full lg:bottom-auto lg:top-3 bg-paper/90 px-3 py-1 text-[11px] text-muted shadow-sm">
          {t("explore.zoomHint")}
        </div>
      )}
    </div>
  );
}

export type { GeoJSONSource };
