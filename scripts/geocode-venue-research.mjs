// Geocodes venue research batches with OpenStreetMap Nominatim (≤1 req/s, cached).
//   NODE_USE_ENV_PROXY=1 node scripts/geocode-venue-research.mjs [research-dir]
//   default dir: data/source/venue-research (Food); experiences use data/source/experiences/<module>
// Output: data/source/venue-research/geocoded.json  { "<name>|<address>": { lon, lat, precision, ward, displayName } | { failed: true } }
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
const dir = process.argv[2] ?? "data/source/venue-research";
const cacheFile = `${dir}/geocoded.json`;
const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
const UA = { "User-Agent": "KsExperienceGeocode/0.1 (low-volume venue address lookup)" };
const BOX = "106.35,11.20,107.70,10.30"; // current HCMC area (mainland)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Approximate centres of former districts — used ONLY to disambiguate repeated street names when a
// source states the district. Never shown as data.
const DISTRICTS = {
  "Quận 1": [106.700, 10.776], "Quận 3": [106.684, 10.783], "Quận 4": [106.704, 10.759], "Quận 5": [106.667, 10.755],
  "Quận 6": [106.635, 10.747], "Quận 7": [106.722, 10.734], "Quận 8": [106.655, 10.738], "Quận 10": [106.667, 10.773],
  "Quận 11": [106.650, 10.763], "Quận 12": [106.654, 10.867], "Bình Thạnh": [106.709, 10.810], "Phú Nhuận": [106.680, 10.800],
  "Tân Bình": [106.652, 10.801], "Tân Phú": [106.628, 10.791], "Gò Vấp": [106.665, 10.838], "Bình Tân": [106.603, 10.765],
  "Thủ Đức": [106.762, 10.850], "Nhà Bè": [106.730, 10.695], "Bình Chánh": [106.590, 10.730],
};
const boxFor = (d) => { const c = DISTRICTS[d]; if (!c) throw new Error("unknown district " + d); const r = 0.04; return `${c[0]-r},${c[1]+r},${c[0]+r},${c[1]-r}`; };
const km = (a, b) => { const R = 6371, t = (x) => x * Math.PI / 180; const h = Math.sin(t(b[1]-a[1])/2)**2 + Math.cos(t(a[1]))*Math.cos(t(b[1]))*Math.sin(t(b[0]-a[0])/2)**2; return 2*R*Math.asin(Math.sqrt(h)); };

async function searchAll(params, box) {
  await sleep(1100);
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=vn&viewbox=${box}&bounded=1&${params}`;
  const r = await fetch(u, { headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
/** First hit, or null if (without a district hint) matches are spread over > 3 km — i.e. an ambiguous street name. */
async function search(params, district) {
  const hits = await searchAll(params, district ? boxFor(district) : BOX);
  if (!hits.length) return null;
  if (!district) {
    const p0 = [Number(hits[0].lon), Number(hits[0].lat)];
    if (hits.some((h) => km(p0, [Number(h.lon), Number(h.lat)]) > 3)) return { ambiguous: true };
  }
  return hits[0];
}

const venues = readdirSync(dir).filter((f) => /^batch-[\w-]+\.json$/.test(f)).flatMap((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")).venues);
let n = 0;
for (const v of venues) {
  const key = `${v.name}|${v.address}|${v.district ?? ""}`;
  if (cache[key]) continue;
  const street = v.address.split(",")[0].trim();
  const streetOnly = street.replace(/^[\d/A-Za-z]+\s+/, "");
  let hit = await search(`street=${encodeURIComponent(street)}&city=${encodeURIComponent("Hồ Chí Minh")}`, v.district);
  let precision = hit && !hit.ambiguous && (hit.address?.house_number || ["house", "building"].includes(hit.type) || hit.category === "amenity") ? "exact" : "street";
  if (!hit) { hit = await search(`street=${encodeURIComponent(streetOnly)}&city=${encodeURIComponent("Hồ Chí Minh")}`, v.district); precision = "street"; }
  if (!hit || hit.ambiguous) { cache[key] = { failed: true, reason: hit?.ambiguous ? "ambiguous street name, no district in source" : "not found" }; console.log("✗", key, cache[key].reason); continue; }
  const a = hit.address ?? {};
  cache[key] = { lon: Number(Number(hit.lon).toFixed(6)), lat: Number(Number(hit.lat).toFixed(6)), precision, ward: a.suburb || a.quarter || a.city_district || a.town || null, displayName: hit.display_name };
  console.log(precision === "exact" ? "●" : "○", key, "→", cache[key].ward);
  if (++n % 10 === 0) writeFileSync(cacheFile, JSON.stringify(cache, null, 1) + "\n");
}
writeFileSync(cacheFile, JSON.stringify(cache, null, 1) + "\n");
console.log("done");
