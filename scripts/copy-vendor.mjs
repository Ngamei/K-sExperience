// Copies the MapLibre web worker into public/ so it is served same-origin (works offline and in static export).
import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("public/vendor", { recursive: true });
copyFileSync("node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", "public/vendor/maplibre-gl-worker.mjs");
console.log("✓ copied maplibre-gl-worker.mjs → public/vendor/");
