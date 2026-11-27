"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker as MLMarker, StyleSpecification } from "maplibre-gl";
import type { Restaurant } from "@/lib/data/schema";
import type { LngLat } from "@/lib/geo/geo";
import { HCMC_CENTER } from "@/lib/food/hcmc";

/**
 * HCMC establishment map. Uses an optional street basemap (NEXT_PUBLIC_BASEMAP_STYLE_URL,
 * default OpenFreeMap Positron — free, no key). If it can't be reached (offline preview),
 * falls back to a local style showing the HCMC administrative boundary only.
 */
const BASEMAP = process.env.NEXT_PUBLIC_BASEMAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";

async function loadStyle(): Promise<{ style: StyleSpecification | string; basemap: boolean }> {
  const local: StyleSpecification = { version: 8, sources: {}, layers: [{ id: "bg", type: "background", paint: { "background-color": "#EEF1EA" } }] };
  if (!BASEMAP || BASEMAP === "none") return { style: local, basemap: false };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch(BASEMAP, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) throw new Error();
    return { style: (await r.json()) as StyleSpecification, basemap: true };
  } catch {
    return { style: local, basemap: false };
  }
}

/** Shared HCMC establishment map (Food Nearby and every other module's map slot). */
export interface MarkerVisual { svg: string; accent: string }

export function HcmcMap({ venues, origin, selected, onSelect, marker }: {
  venues: Pick<Restaurant, "id" | "name" | "isSample" | "coordinates">[]; origin: LngLat; selected: string | null; onSelect: (id: string) => void;
  /** Experience-specific marker art per venue (shared engine modules); Food keeps its dot markers. */
  marker?: (id: string) => MarkerVisual;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markers = useRef<MLMarker[]>([]);
  const [ready, setReady] = useState(false);
  const [basemap, setBasemap] = useState(false);
  const onSelectRef = useRef(onSelect);
  const markerRef = useRef(marker);
  useEffect(() => { onSelectRef.current = onSelect; markerRef.current = marker; });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ml, { style, basemap }, boundary] = await Promise.all([
        import("maplibre-gl"),
        loadStyle(),
        fetch("/geo/hcmc.json").then((r) => r.json()),
      ]);
      if (cancelled || !ref.current) return;
      ml.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      mlRef.current = ml;
      setBasemap(basemap);
      const map = new ml.Map({ container: ref.current, style, center: basemap ? HCMC_CENTER : [106.75, 10.75], zoom: basemap ? 11.5 : 8.3, minZoom: 8, maxZoom: 17, attributionControl: { compact: true } });
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        map.addSource("hcmc", { type: "geojson", data: boundary });
        map.addLayer({ id: "hcmc-fill", type: "fill", source: "hcmc", paint: { "fill-color": "#BAC8B5", "fill-opacity": basemap ? 0.12 : 0.55 } });
        map.addLayer({ id: "hcmc-line", type: "line", source: "hcmc", paint: { "line-color": "#294C3D", "line-width": 1.6, "line-dasharray": [2, 1.5] } });
        setReady(true);
      });
      mapRef.current = map;
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!ready || !map || !ml) return;
    markers.current.forEach((m) => m.remove());
    const originEl = document.createElement("div");
    originEl.className = "size-4 rounded-full border-2 border-white bg-[#3b82f6] shadow";
    markers.current = [new ml.Marker({ element: originEl }).setLngLat(origin).addTo(map)];
    for (const v of venues) {
      const el = document.createElement("button");
      el.type = "button";
      el.dataset.testid = "venue-marker";
      el.className = "dish-marker flex flex-col items-center";
      const sel = v.id === selected;
      const vis = markerRef.current?.(v.id);
      el.innerHTML = vis
        ? `<span class="flex size-10 items-center justify-center rounded-full border-2 bg-[#FFFDF8] shadow" style="border-color:${sel ? "#B66B50" : vis.accent}" data-testid="venue-marker-art">${vis.svg}</span>`
        : `<span class="flex size-8 items-center justify-center rounded-full border-2 ${sel ? "border-[#B66B50] bg-[#B66B50] text-white" : "border-[#294C3D] bg-[#FFFDF8] text-[#294C3D]"} text-[11px] font-bold shadow">${v.isSample ? "S" : "●"}</span>`;
      el.title = v.name;
      el.onclick = () => onSelectRef.current(v.id);
      markers.current.push(new ml.Marker({ element: el }).setLngLat(v.coordinates).addTo(map));
    }
  }, [ready, venues, origin, selected]);

  return (
    <div className="relative h-full w-full" data-testid="hcmc-map" data-basemap={basemap ? "1" : "0"}>
      <div ref={ref} className="h-full w-full" />
      {ready && !basemap && (
        <p className="pointer-events-none absolute left-3 top-3 rounded-full bg-paper/90 px-3 py-1 text-[11px] text-muted shadow-sm">Offline map: HCMC boundary only (street basemap unavailable)</p>
      )}
    </div>
  );
}
