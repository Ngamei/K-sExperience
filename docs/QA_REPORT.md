# QA report

_Run date: 2026-11-27 (re-run after PO update: map home page, EN/VI switch, real venues, photos) · Branch `claude/trusting-clarke-44sf7b` · Environment: Linux cloud container, Node 22.23.5, npm 10.9.9,
headless Chromium (Playwright 1.63) with SwiftShader WebGL._ The exact commit is the branch head that contains this file.

## Commands and results (clean checkout)

| # | Command | Result |
| --- | --- | --- |
| 1 | `npm ci` | ✅ installed, **0 vulnerabilities**; postinstall copied MapLibre worker |
| 2 | `npm run typecheck` (`next typegen && tsc --noEmit`) | ✅ exit 0 |
| 3 | `npm run lint` | ✅ exit 0, 0 errors, 0 warnings |
| 4 | `npx vitest run tests/unit` | ✅ **3 files, 27 tests passed** |
| 5 | `npx vitest run tests/integration` (= `npm run data:validate`) | ✅ **1 file, 15 tests passed** |
| 6 | `npm run build` | ✅ exit 0 — 164 static pages (138 dishes, 5 real + 8 sample venues, screens, manifest, `/data/food.json`) |
| 7 | `npx playwright test` (against `next start`) | ✅ **34 passed** (17 scenarios × desktop 1440×900 + Pixel 7) in 43.6 s — after venue batch 2 |
| 8 | `STATIC_EXPORT=1 npx next build` | ✅ exit 0 — `out/` 22 MB |
| 9 | `E2E_STATIC=1 E2E_PORT=3200 npx playwright test` (against the static export) | ✅ **30 passed** in 37.4 s |
| 10 | `npm run build:preview` | ✅ `preview/ks-experience-preview-<commit>.zip` (~6.4 MB) |

Shortcut: `npm run qa` runs 2 → 3 → 4/5 → 6 → 7.

## What the tests cover
**Unit (26)** — Vietnamese normalisation & accent-insensitive matching; importer (Vietnamese categories, accent-free province
names, region-wide origins, rejection of unknown province/category/duplicates, verified-without-sources warning, CSV quoting);
availability index (samples excluded unless requested); every filter family incl. combined region+category, diet, spice,
venue-dependent filters, tried/saved, chip add/remove; opening hours in Asia/Ho_Chi_Minh incl. past-midnight ranges;
Surprise-me hard constraints; passport maths; map progressive-disclosure tiers and deterministic marker placement.

**Integration (13)** — 63 provinces, 6 regions summing to 63, geometry for each; Hoàng Sa + Trường Sa present; 63 → 34 current units;
every label point inside its province polygon; catalogue schema-valid, unique ids, origins resolve with matching region;
seed labelled seed/unverified; all three categories present; every establishment inside the 2025 HCMC boundary; real venues
require sources + lastVerified; samples labelled `[SAMPLE]` and absent from real files; links reference existing records and
verified real links need evidence; a Hà Nội point is rejected by the HCMC boundary.

**End-to-end (15 scenarios × 2 devices)**
| Scenario | Desktop | Mobile |
| --- | --- | --- |
| **Priority journey**: home page = Explore map → region *Bắc Trung Bộ* + *Sweet* → filtered list (count, chips, only Sweet) → *Kẹo cu đơ Hà Tĩnh* → origin + "not yet verified" → HCMC block = "No verified HCMC establishment found", no samples → Settings (Food active, 4 modules disabled "Coming soon") | ✅ | ✅ |
| Sample venues opt-in, SAMPLE-badged, real status stays "none found", sample place page warns + directions disabled | ✅ | ✅ |
| Map: boundaries loaded, both archipelago labels visible, national view shows exactly the 11 representative dishes | ✅ | ✅ |
| Map: region selection reveals more dishes; clicking Lai Châu selects the province (heading + chip) | ✅ | ✅ |
| Map: dish marker → preview → dish page | ✅ | ✅ |
| Catalogue: "bun bo hue" finds Bún bò Huế; Snack + Tây Nam Bộ combine; chips; clear all restores 138 | ✅ | ✅ |
| Save + tried → Saved list, Passport counts/region progress, Tried filter | ✅ | ✅ |
| Vietnamese localisation (tagline, `<html lang="vi">`) | ✅ | ✅ |
| Surprise me returns a dish | ✅ | ✅ |
| Nearby: 5 real venues, no SAMPLE badges by default; with samples on, 13 cards of which 8 SAMPLE-badged | ✅ | ✅ |
| Dish page (Cơm tấm): licensed photo with author + licence caption (Commons stubbed), real venue row with address, Michelin note, "listed by source" status, Google Maps link; venue page shows approximate-location note + linked sources | ✅ | ✅ |
| Header language switch shows the active language (EN highlighted; VI switches copy and back) | ✅ | ✅ |
| Home page is the culinary map; Discover at `/discover` links back to the map | ✅ | ✅ |
| Admin import validator: 1 valid row, 1 rejected with reason | ✅ | ✅ |
| All 10 screens return 200 with no uncaught page errors | ✅ | ✅ |

## Browser evidence (screenshots, `docs/screenshots/`)
Desktop: `desktop-01-discover`, `02-explore-national` (home page), `03-explore-region-sweet`, `04-explore-mien-bac`, `05-dish-detail`,
`06-catalogue`, `07-settings`, `08-nearby-empty`, `09-nearby-samples`, `10-dish-hcmc-with-samples`, `11-admin`, `12-dish-real-venues`, `13-place-real`.
Mobile (Pixel 7): `mobile-01-discover`, `02-explore`, `03-explore-region`, `04-explore-list`, `05-dish`, `06-settings`.

## Defects found and fixed during this checkpoint
| # | Defect | Fix |
| --- | --- | --- |
| Q1 | Map canvas rendered 300 px tall (MapLibre CSS overrode `absolute inset-0`) | Container sized with `h-full w-full` |
| Q2 | Service worker turned redirected navigations into `net::ERR_FAILED` | Network-first navigations, never cache redirected responses; `trailingSlash: true` everywhere |
| Q3 | On phones, selecting a region still showed only 3 dishes (absolute zoom thresholds) | Disclosure relative to device's fit-Vietnam zoom + selection floors (DECISIONS D12) |
| Q4 | Static export 152 MB (catalogue embedded in every page) | Single `/data/food.json`; compact locator geometry → 22 MB |
| Q5 | Clean-checkout typecheck failed (`PageProps` globals not generated) | `typecheck` runs `next typegen` first |
| Q6 | Hoàng Sa/Trường Sa islands sub-pixel at national zoom | Always-visible island dots + labels |

## Known issues / not verified
- **Dish photos from Wikimedia Commons were not rendered inside the sandbox** (Wikimedia applies its bot policy to automated clients). URLs come from the Commons API; e2e stubs the image. Please confirm photos display in a normal browser; the illustration is shown if a photo fails.
- Google Maps links were checked for correct format, not opened (google.com is not reachable from the sandbox).
- No-WebGL SVG fallback map is implemented but not exercised by e2e.
- Nearby street basemap (OpenFreeMap) could not be tested — host unreachable from the sandbox; the offline fallback (HCMC boundary only) is what the screenshots show.
- Geolocation ("My location") not tested (requires permission prompt).
- Service-worker offline behaviour verified only indirectly (navigations work with SW active); no airplane-mode test.
- No formal accessibility (axe) or Lighthouse performance audit yet.
- Supabase migration is authored but has not been applied to a database.
