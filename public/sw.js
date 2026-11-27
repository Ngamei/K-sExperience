/* K's Experience service worker.
 * - Static assets (/_next/static, /geo, /vendor, icons): cache-first.
 * - Page navigations: network-first, falling back to the cached copy when offline.
 * Redirected or non-OK responses are never cached. */
// The cache is versioned per build (sw.js?v=<build id>): a new deployment installs a new worker, which
// deletes every older cache on activation, so stale assets never outlive an update. Data and pages are network-first.
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = `ksx-${VERSION}`;
const PRECACHE = ["/geo/vietnam.json", "/geo/regions.json", "/geo/hcmc.json", "/vendor/maplibre-gl-worker.mjs", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const cacheable = (r) => r && r.ok && !r.redirected && r.type === "basic";

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;

  if (req.mode === "navigate" || url.pathname.startsWith("/data/")) {
    e.respondWith(
      fetch(req)
        .then((r) => { if (cacheable(r)) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })
        .catch(async () => (await caches.match(req)) || Response.error()),
    );
    return;
  }
  if (/^\/(_next\/static|geo|vendor)\//.test(url.pathname) || url.pathname === "/icon.svg") {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (cacheable(r)) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })),
    );
  }
});
