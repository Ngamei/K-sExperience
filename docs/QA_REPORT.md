# QA report

_Run date: 2026-11-27 (re-run after venue imagery + multi-experience foundations) · Branch `claude/trusting-clarke-44sf7b` · Environment: Linux cloud container, Node 22.23.5, npm 10.9.9,
headless Chromium (Playwright 1.63) with SwiftShader WebGL._ The exact commit is the branch head that contains this file.

## Commands and results (clean checkout)

| # | Command | Result |
| --- | --- | --- |
| 1 | `npm ci` | ✅ installed, **0 vulnerabilities**; postinstall copied MapLibre worker |
| 2 | `npm run typecheck` (`next typegen && tsc --noEmit`) | ✅ exit 0 |
| 3 | `npm run lint` | ✅ exit 0, 0 errors, 0 warnings |
| 4 | `npx vitest run tests/unit` | ✅ **9 files, 73 tests passed** (+ venue photos, registry/nav/routes, passport per experience, shared engine index/image/data files) |
| 5 | `npx vitest run tests/integration` (= `npm run data:validate`) | ✅ **1 file, 17 tests passed** (+ module data files: schema, HCMC boundary, sources, references) |
| 5b | `npm run test:db` (local PostgreSQL 16 + PostGIS 3.4) | ✅ **31 checks** — migrations 0001–0006, shared items/offerings (mode-tag trigger, evidence rule, audit key, anon read-only), link-photo all-or-nothing constraint, six experience modules (Sport pilot-planned last), every establishment tagged Food, Sport history row on the same account, seed ×2 (idempotent), app read columns as anon, RLS (anon/user/editor), candidates hidden, storage, audit, HCMC trigger, evidence constraints, account isolation, own-folder photos, guest-merge upsert, account deletion |
| 6 | `npm run build` | ✅ exit 0 — 164 static pages (138 dishes, 5 real + 8 sample venues, screens, manifest, `/data/food.json`) |
| 7 | `npx playwright test` (against `next start`) | ✅ **64 passed** (32 scenarios × desktop + Pixel 7) |
| 7b | `npm run build:auth-test && npm run test:e2e-auth` (Supabase-mode static build + mock Supabase) | ✅ **18 passed** (9 account scenarios × desktop + Pixel 7); stable over `--repeat-each=2` (36/36) |
| 7c | `npm run build:modules-test && npm run test:e2e-modules` (static build with Coffee pilot flag on) | ✅ **12 passed** (6 scenarios × desktop + Pixel 7) |
| 8 | `STATIC_EXPORT=1 npx next build` | ✅ exit 0 — `out/` 22 MB |
| 9 | `E2E_STATIC=1 E2E_PORT=3200 npx playwright test` (against the static export) | ✅ **64 passed** |
| 10 | `npm run build:preview` | ✅ `preview/ks-experience-preview-<commit>.zip` (~6.4 MB) |

Shortcut: `npm run qa` runs 2 → 3 → 4/5 → 6 → 7 → 7b → 7c (5b needs local PostgreSQL).

## P0 accounts — acceptance criteria evidence
| # | Criterion | Evidence |
| --- | --- | --- |
| 1 | Guests browse without authentication | e2e `guests explore…` (auth build) + all local e2e |
| 2 | Guests create temporary passport progress | e2e `guests explore…`, `Guest passport (local mode)` |
| 3 | Encouraged, not forced, to register | e2e: passport guest CTA; no route requires login except `/profile` |
| 4 | Register and log in | e2e `signup keeps guest progress…`, `wrong password…`, `password recovery and reset` (mock Supabase) |
| 5 | Guest progress survives account creation | e2e `signup keeps guest progress…` (rows verified in mock DB) |
| 6 | Existing + guest progress merge without duplicates | e2e `…merges guest progress without duplicates`; unit `passport-merge` (idempotent, unique keys); DB test `guest merge upsert keeps one row` |
| 7 | Persists after logout + login | e2e `…survives logout + login` |
| 8 | Syncs across devices | e2e two browser contexts |
| 9 | User A cannot access user B's records | DB test (RLS) `user A cannot read user B passport`, `user cannot write rows for another user`; e2e isolation on shared device |
| 10 | Ordinary users cannot use admin functions | DB tests (non-editor update has no effect) + e2e `ordinary users cannot use admin functions` |
| 11 | Logout does not expose previous user's data | e2e isolation + logout tests (passport resets to 0) |
| 12 | Food discovery unchanged | full local e2e suite (50) on server build and static export |
Not yet verified (needs a provisioned project): real Google OAuth, real verification / reset emails, Supabase JWT/refresh behaviour beyond the mock.

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

## Dish-at-place photos (venue cards) — `e2e/venue-photos.spec.ts`, `tests/unit/venue-photo.test.ts`
The real dataset has no venue photos yet, so the e2e test injects one venue-specific photo (Góc Huế, 41 Kỳ Đồng × bánh khoái) into the served `/data/food.json`.
| Requirement | Evidence | Desktop | Mobile |
| --- | --- | --- | --- |
| Venue-specific image shown when present | bánh khoái page: that card `data-kind="venue-specific"`, correct `src`, caption "Photo of this dish at this venue" | ✅ | ✅ |
| Generic dish image fallback | bánh nặm page: every card `generic-dish`, caption "not from this venue" | ✅ | ✅ |
| Icon fallback when no image exists | bánh khoái (no generic photo): other venues show the icon, no credit | ✅ | ✅ |
| Broken image → icon, credit removed | image 404 | ✅ | ✅ |
| No layout break on mobile | no horizontal overflow; square 56/64 px thumbnail inside the card; status + Google Maps CTA inside the card | ✅ | ✅ |
| No wrong-dish image for a different relation | same venue on the bánh nặm page never shows the bánh khoái photo; unit test for link/dish mismatch | ✅ | ✅ |
| Schema / DB | photo needs source, attribution, licence, date (unit); incomplete photo rejected by CHECK (DB); row round-trip (unit) | ✅ | — |

## Multi-experience foundations / Sport — `e2e/experiences.spec.ts`, `tests/unit/experiences.test.ts`
| Check | Result |
| --- | --- |
| Settings lists Food, Bars, Coffee, Spa, Shopping, Sport in order; Food active; EN + VI names; Sport "Pilot planned" with Pickleball + Pilates; VI labels | ✅ e2e desktop + mobile |
| Food regression: nav labels unchanged (Food Map … Saved), catalogue 138 dishes, passport shows 6 modules with only Food active; existing priority journey + passport suites unchanged | ✅ e2e |
| Feature flags cannot enable unimplemented modules; unknown mode falls back to Food; food-only filters/map absent from other modules; nav labels for every module in EN/VI | ✅ unit |
| Food passport ignores/never emits other experiences' rows | ✅ unit + DB |

## Shared Experience Engine / Coffee pilot — `e2e-modules/coffee.spec.ts`, `e2e/experiences.spec.ts`, `tests/unit/engine.test.ts`
| Acceptance criterion | Evidence |
| --- | --- |
| Existing Food functionality intact | all Food suites green (64 server + 64 static e2e, 18 account e2e, unit, DB) |
| Navigation changes when switching modes, and back | Settings → Coffee → `/coffee/`, nav = Café Map … Coffee Passport (desktop) / Map … Passport (mobile); Settings → Food restores Food nav (e2e-modules) |
| Active mode has its own catalogue, discovery, map, filters | Coffee catalogue (categories, attributes, search), item detail, map/Nearby/establishment page (e2e-modules) |
| Shared components reused, not cloned | Food dish pages render the engine `OfferingRow`; Food index = engine index (unit equality on the real dataset); one route set for all modules |
| Food-specific filters never in other modules | no filter panel / region chips on the Coffee catalogue (e2e); registry check (unit) |
| Module attributes render | card + detail attributes (e2e-modules) |
| Records and user history preserved | additive migrations 0005/0006; Food passport unchanged after Coffee activity (e2e-modules, unit, DB) |
| Shared accounts across experiences | per-experience rows, merge and round-trip (unit); same-account Sport/Coffee rows (DB) |
| Evidence attached to the correct offering | offering photo only for its own item (unit + e2e-modules); offering evidence rules (unit + DB) |
| Only HCMC establishments recommended | module files validated against the HCMC boundary (integration); samples/candidates excluded by the shared index (unit + e2e-modules) |
| Feature flags block unfinished modules | flag-off build: `/coffee/…` shows "not available yet" (e2e); unimplemented modules unselectable even with flags (unit) |
| Cross-module tests | added (unit, integration, DB, e2e, e2e-modules) |

## Browser evidence (screenshots, `docs/screenshots/`)
Desktop: `desktop-01-discover`, `02-explore-national` (home page), `03-explore-region-sweet`, `04-explore-mien-bac`, `05-dish-detail`,
`06-catalogue`, `07-settings`, `08-nearby-empty`, `09-nearby-samples`, `10-dish-hcmc-with-samples`, `11-admin`, `12-dish-real-venues`, `13-place-real`.
Mobile (Pixel 7): `mobile-01-discover`, `02-explore`, `03-explore-region`, `04-explore-list`, `05-dish`, `06-settings`.

## Defects found and fixed in Sprint 3
| # | Defect | Fix |
| --- | --- | --- |
| S3-1 | Master import would overwrite existing `spiceLevel`/`prominence` with importer defaults when the CSV lacked those columns (found by CLI dry run) | Importer records supplied fields; merge only updates those; unit test |
| S3-2 | Candidate links never surfaced for admins (rank tie with none-found) | Ranking fix; unit test |
| S3-3 | Admin HCMC boundary check crashed (GeometryCollection vs FeatureCollection) | Handles both; e2e |
| S3-4 | Audit trigger referenced columns absent on some tables | JSON-based key extraction; DB test |

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
- **Local e2e pitfall:** Playwright reuses any server already on port 3100 (`reuseExistingServer` outside CI). A leftover `next-server` from an older build serves 500s for new JS chunks and makes ~40 tests fail. Stop it (`pkill -f next-server`) before `npm run test:e2e`.
- Coffee pilot dataset is intentionally empty; e2e-modules uses a labelled test fixture. Coffee stays off until data + Codex QA + PO approval.
- Admin is not yet configurable per module, and Supabase mode does not yet read `experience_items`/`offerings` (CC-25).
- No real venue-specific dish photos yet (licensing, D31); the venue-photo e2e uses an injected test fixture.
- **Dish photos from Wikimedia Commons were not rendered inside the sandbox** (Wikimedia applies its bot policy to automated clients). URLs come from the Commons API; e2e stubs the image. Please confirm photos display in a normal browser; the illustration is shown if a photo fails.
- Google Maps links were checked for correct format, not opened (google.com is not reachable from the sandbox).
- No-WebGL SVG fallback map is implemented but not exercised by e2e.
- Nearby street basemap (OpenFreeMap) could not be tested — host unreachable from the sandbox; the offline fallback (HCMC boundary only) is what the screenshots show.
- Geolocation ("My location") not tested (requires permission prompt).
- Service-worker offline behaviour verified only indirectly (navigations work with SW active); no airplane-mode test.
- No formal accessibility (axe) or Lighthouse performance audit yet.
- Supabase migration is authored but has not been applied to a database.
