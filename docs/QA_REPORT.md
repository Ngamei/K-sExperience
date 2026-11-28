# QA report

_Run date: 2026-11-28 (re-run after PO decisions D55–D58: mobile nav, soft meal time, pastel themes, research exchange) · Branch `claude/trusting-clarke-44sf7b` · Environment: Linux cloud container, Node 22.23.5, npm 10.9.9,
headless Chromium (Playwright 1.63) with SwiftShader WebGL._ The exact commit is the branch head that contains this file.

## Commands and results (clean checkout)

| # | Command | Result |
| --- | --- | --- |
| 1 | `npm ci` | ✅ installed, **0 vulnerabilities**; postinstall copied MapLibre worker |
| 2 | `npm run typecheck` (`next typegen && tsc --noEmit`) | ✅ exit 0 |
| 3 | `npm run lint` | ✅ exit 0, 0 errors, 0 warnings |
| 4–5 | `npx vitest run` (unit + integration; integration = `npm run data:validate`) | ✅ **14 files, 129 tests passed** (+ research exchange validation, evidence guard, platform counts, meal-time ranking) (+ Hôm nay ăn gì? engine/provenance/importer) — + shared engine rows round-trip, module rules (item vs establishment attributes, vocabularies, categories, price units), writes never report false success (failing client), module import (CSV/JSON, merge, duplicates, HCMC boundary, evidence), pilot data sources |
| 5b | `npm run test:db` (local PostgreSQL 16 + PostGIS 3.4) | ✅ **40 checks — re-run 2026-11-28 against the new seed (118 venues, 121 links), not assumed** — migrations 0001–0008 (eating/dining attributes, nutrition must cite a source) + seed ×2 (incl. pilot data); establishment attributes; no implicit Food tag; tag audit; every establishment has an experience tag; seeded coffee offerings readable by anon; items/offerings rules; plus all earlier RLS/account/evidence checks |
| 6 | `npm run build` (production config) | ✅ exit 0 — no sample venues in `/data/food.json` |
| 6b | `npm run build:e2e` (`NEXT_PUBLIC_DEV_DATA=1`) | ✅ exit 0 |
| 7 | `npx playwright test` (against `next start`) | ✅ **91 passed** (incl. 14 Hôm nay ăn gì?, mobile nav, theme and live-count scenarios × desktop + Pixel 7; first run 89/91 — 2 expected failures from the new "1 of 138 dishes" count label, expectation updated and re-run) |
| 7b | `npm run build:auth-test && npm run test:e2e-auth` (**mock** Supabase Auth + REST; Coffee flag on) | ✅ **28 passed** (14 scenarios × desktop + Pixel 7) |
| 7c | `npm run build:modules-test && npm run test:e2e-modules` (production-like static build, Coffee flag on, real pilot data; real service worker in cache.spec) | ✅ **40 passed** (incl. craft-beer live counts, visual parity + per-experience pastel theme check; mobile labels Explore · Catalogue · Nearby · Passport) |
| 8–9 | `NEXT_PUBLIC_DEV_DATA=1 STATIC_EXPORT=1 npx next build` + `E2E_STATIC=1 E2E_PORT=3200 npx playwright test` | ✅ **76 passed** (offline static export) |

**Mock vs real:** every account/passport browser test runs against `e2e-auth/mock-supabase.mjs` (GoTrue + PostgREST subset, owner-only RLS emulated). Real Postgres RLS/constraints are covered by `npm run test:db`. **Not yet tested against a live Supabase project:** Google OAuth round-trip, real verification/recovery emails, network latency — pending provisioning (docs/PREVIEW_CHECKLIST.md).

First `npm run qa` run on CC-30 failed 6 module e2e tests that still expected the old Food nav (no "What to eat"); expectations updated → 36/36. Shortcut: `npm run qa` runs 2 → 3 → 4/5 → 6 → 6b → 7 → 7b → 7c (5b needs local PostgreSQL).

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

## Engine completion, pilots, auth gate, cache — acceptance evidence
| Requirement | Evidence |
| --- | --- |
| Food on shared components, no regressions (regions, provinces, Savory/Sweet/Snack, map, URLs, venues, photos, evidence, saved, passport) | all 32 Food scenarios × 2 devices green on server + static builds |
| No consumer seed banner; samples dev-only; provenance in Admin | `priority-journey` (no data-banner), `journeys` production check (no sample venues in data, no toggle, no banners); Admin → Overview `admin-data-quality` |
| Account first in Settings; no header auth buttons | e2e-auth "Settings shows Account first…", "guests browse freely…" |
| Passport gate: immediate prompt, Google + email, mode switching, recovery, cancel returns, success opens the requested passport, guest progress migrated, no repeat prompt, direct URLs, session expiry, Coffee passport gated | e2e-auth gate tests (desktop modal / mobile sheet) |
| One account, separate passports per experience; cross-device | e2e-auth "Coffee progress syncs across devices and never mixes with Food" |
| Mode switching repeatedly; direct URLs; back; refresh | e2e-modules `journeys.spec.ts` |
| Module filters (item + establishment attributes) | journeys: speciality-café filter → pour-over only |
| Disabled flags | journeys: Bars/Spa/Sport unavailable; e2e flag-off build: Coffee unavailable |
| Service-worker cache invalidation + updated data visible | e2e-modules `cache.spec.ts` (real SW) |
| Offering photos honest | engine unit tests; Coffee rows show icon (no photos), Food venue-photo suite |
| Failed writes never report success | unit "writes never report false success"; Admin shows ✗ with the database message |

Screenshots (desktop + Pixel 7) in `docs/screenshots/`: `*-food-map`, `*-food-catalogue`, `*-food-dish`, `*-settings`, `*-settings-account-guest`, `*-passport-gate`, `*-coffee-map`, `*-coffee-catalogue`, `*-coffee-item`, `*-coffee-cafe`.

## KEX-IMPORT-01 + KEX-QA-02 (2026-11-28, review branch `claude/kex-review-2026-11-28`)
- KEX-IMPORT-01: `tests/unit/unknown-spice.test.ts` (10): omitted/blank spice → unknown (not provided, never 0); legacy numbers and numeric strings kept (incl. a real 0); out-of-range clamped with warning; non-numeric → unknown with warning; merge never erases a recorded level; `spiceWithin` + catalogue filter + Surprise me + Hôm nay ăn gì? exclude unknown below "any"; bundled data all recorded; Supabase NULL ↔ absent round trip. DB (`tests/db/rls.sql`, migration 0009): omitted spice stored NULL; NULL excluded by `spice_level <= 0`; 5 rejected by CHECK; seeded legacy levels all non-null. GPT-CAT-001 rows from PR #1 (scratch copy, importer + merge only, no queue/audit change): both dishes import with spice unknown and are excluded from strict no-spice. Seed SQL byte-identical.
- KEX-QA-02: see `research-exchange/reports/KEX-QA-02.md`. e2e `KEX-QA-02: street-level pins are labelled approximate` (desktop + Pixel 7). Intake smoke test for the shared-pin warning (throwaway row, artifacts removed). CC-BARS-003 dry run 2 accepted / 0 rejected (apply held).
- `npm run qa` exit 0: unit **16 files / 142 tests** · Food e2e **91** · account e2e **28** · module e2e **42**; `npm run test:db` **44 checks, ALL PASSED**. Live Supabase: unverified.

## KEX-QA-01 (2026-11-28)
- `src/lib/food/what-to-eat-report.ts`: headline `dishesWithVenue` now uses `recommend(...).withVenue` (was `.eligible` → 138/138); report shows **36 / 138** = public page; `dishesEligible` (138) reported separately. Regression `tests/unit/what-to-eat-report.test.ts` (3 tests): equals unique real linked dishes and `foodStats().itemsWithEstablishments`; an added unlinked dish does not change the headline; sample-only links never count.
- Intake determinism: dry-run geocode snapshot reused by apply; per-run report history; dry run never downgrades an imported queue entry. Smoke test (throwaway batch CC-TEST-998: dry run → apply showed "geocodes reused from the dry run" → `--rollback`, artifacts removed; data and queue identical to HEAD).
- Lint defect found by `npm run qa`: `e2e-modules/journeys.spec.ts` used `require()` (introduced in 9787dc3) — fixed with an ES import.
- `npm run qa` exit 0: typecheck ✓ · lint ✓ · unit+integration **15 files / 132 tests** · build ✓ · build:e2e ✓ · Food e2e **91** · account e2e (mock Supabase) **28** · module e2e **40**; `npm run test:db` **ALL DB TESTS PASSED** (40). Live Supabase still unverified.

## Craft beer batch GPT-BARS-001 (BAR-CRAFT-20261128-01) — 2026-11-28
- Converted with `npm run exchange:convert` (field mapping printed; 2 existing venues matched), dry run → apply via `npm run intake`; report `research-exchange/reports/GPT-BARS-001.md` (per venue: decision, pin precision, geocoder match, reasons).
- Result: 32 received · 2 existing duplicates merged (ids, names, evidence kept; sources + brand added) · 24 new establishments · 6 rejected with reasons · 24 new offering links (craft-beer) · Bars: 28 unique venues, Craft beer: 26 venues · 0 prices · 0 photos.
- Dry run 27/5 vs apply 26/6: Nominatim returned different street-level points in dry run 3; the apply's points equal dry run 1's (correction of my first note). Analysis + fixes (snapshot reuse, per-run report history) in `research-exchange/reports/GPT-BARS-001-dryrun-vs-apply.md`.
- Tests: `e2e-modules/journeys.spec.ts` "Bars craft beer batch: live venue counts" (catalogue coverage, item places, item venue rows, map list count = data) desktop + Pixel 7; module suite 40/40; Food 91/91; unit 129/129. Screenshots `docs/screenshots/bars-craft/`.
- Copy fix: the pilot banner said "verified entries"; now "every entry cites a published source; most are not yet independently verified".

## PO decisions D55–D58 + data scaling (2026-11-28)
- **Mobile nav (D55):** `e2e/what-to-eat.spec.ts` "Food: five tabs; Explore switches between Map and Discover" (Pixel 7): bottom bar = Explore · Eat today · Catalogue · Nearby · Passport; Explore stays active on Discover; deep link `/discover/` selects Discover. Module modes: Explore · Catalogue · Nearby · Passport (`e2e-modules/coffee.spec.ts`, `journeys.spec.ts`). Desktop nav unchanged (`e2e/experiences.spec.ts`).
- **Meal time (D56):** unit "meal time ranks by default and is strict only when asked"; e2e zero-result test now needs "Only late night"; results split (`wte-results` with places, `wte-unplaced` without) with eligible = with places + without places and unique place count (unit compares with deduplicated links).
- **Themes (D57):** `e2e-modules/visual.spec.ts` checks `--forest` per mode (bars #5e4b78, coffee #6e4f35, spa #2e6664, sport #22665a); Food `--ivory` #f3f5ef. Screenshots `docs/screenshots/themes/`.
- **Counts:** catalogue "1 of 138 dishes", coverage line and per-dish place counts; Settings → About and Admin coverage (e2e "live data counts").
- **Research exchange:** `tests/unit/exchange.test.ts` (schema, unknown ids, outside HCMC, duplicate vs legacy id merge, module items, photo metadata, geocode sanity incl. the Kira Pilates wrong-business case, queue overlap); `engine-import.test.ts` evidence guard. Intake end-to-end: CC-FOOD-009 dry run → apply → **rollback (12 files restored, data identical to git)** → re-apply with Chè Hiển Khánh excluded → 118 venues / 121 links; reports regenerated.
- **Supabase:** real project still not provisioned — **live Supabase integration remains unverified**; DB behaviour verified on local PostgreSQL only.

## Hôm nay ăn gì? P0 fix (EAT-01…08) — reproduced, root-caused, fixed
**Reproduced** on the deployed commit (`60bb14f`, production build, Pixel 7 + desktop, clock 12:00 HCMC) with saved preferences Vegan + No pork: **0 cards**, empty state below a full-screen panel, 0 console errors → `docs/screenshots/what-to-eat/p0/before-*`.
**Root cause** (real bundled data): 21/138 dishes are tagged vegan but only 1 has a listed HCMC place and none is a lunch dish; the engine required a place for every suggestion; saved diet chips were locked on (no per-meal override); the empty message gave no reason. Also found: the page used the browse availability index (could include sample venues when enabled) — now `useRealAvailability`; on mobile the pill rows widened the page (horizontal overflow) — fixed with a `minmax(0,1fr)` grid track and an e2e guard.
**After**: same setup → vegan suggestions (Cơm lam Hòa Bình, Xôi ngũ sắc) labelled "No HCMC place listed yet"; default lunch → 6 suggestions (67 eligible, 19 with a place); zero-result example (late night + vegetarian + no pork + no seafood) lists Meal time → 27 dishes, Vegetarian → 3, No pork → 1, No fish/seafood → 0 → `docs/screenshots/what-to-eat/p0/after-*`.
Tests: `tests/unit/what-to-eat.test.ts` (16, all on the real dataset: PO scenario table — no filters, lunch + <50k, weight management, vegan, saved Vegan + No pork, zero-result explanation, special dining, surprise, missing restaurant data), `e2e/what-to-eat.spec.ts` (10 × desktop + Pixel 7: guest default + scroll to results + no overflow, saved-preference bug, explained zero results, budget presets/validation/group total/reset, goals + special dining, surprise/not today/alternatives, advanced filters/save/find nearby, eaten + skip recent, Vietnamese, Admin). Supabase mode uses the same `useFoodData` path; not exercised live (project not provisioned).

## Hôm nay ăn gì? (CC-30) — `tests/unit/what-to-eat.test.ts`, `e2e/what-to-eat.spec.ts`, `tests/db/rls.sql` (0008)
| Acceptance | Evidence |
| --- | --- |
| Works for guests without completing filters; small diverse result set with reasons | unit "small, diverse set"; e2e "guest gets suggestions with reasons" (desktop + Pixel 7) |
| Hard constraints (meal, diet, spice, region, known allergens, ingredient words, recent / not-interested / new / saved) | unit tests ×4; e2e "filters change the results", "marking as eaten with skip-recent" |
| Unknown price / hours never exclude, they add cautions | unit "never excludes on unknown price/hours" |
| Only real (non-sample) HCMC venues; distance respected | unit tests |
| All 12 collections + 6 modes return suggestions, bilingual reasons | unit; `docs/WHAT_TO_EAT_REPORT.md` (0 empty presets) |
| Surprise / alternatives / save / find places / not today | e2e "collection preset, surprise, save and find places", "alternatives differ" |
| Settings preferences applied (no pork removes Cơm tấm) | e2e "saved preferences are applied" |
| Provenance: nothing recorded without a source is called sourced; nutrition needs a source | unit "eating profile provenance"; importer test; DB "nutrition without source rejected" |
| Admin eating/dining fields + Recommendations completeness tab | e2e "Admin shows recommendation data completeness"; typecheck |
Screenshots: `docs/screenshots/what-to-eat/{desktop,mobile,desktop-filters,mobile-filters}.png` (clock fixed to 12:00 HCMC). Defect found and fixed: eating attributes saved without a source were labelled "sourced" (now "estimate").

## P1 visual parity — `e2e-modules/visual.spec.ts` + screenshots
| Criterion | Evidence |
| --- | --- |
| Catalogue cards are not text-only (all four modules) | every card has a photo thumbnail or category illustration + illustrated category badge |
| Every category has an icon (chips, filter drawer, discover, badges) | category chips contain `item-art` |
| Detail pages support hero imagery | item page shows the reference photo (credit, licence, source) or a labelled illustration |
| Establishment cards prioritise offering photos; no misleading images | venue thumb kinds limited to offering photo / labelled reference / illustration; reference photos captioned "not from this venue" |
| No broken image elements | no loaded `<img>` with zero natural width; all 69 Commons files verified via the API (`npm run data:experiences -- --check-images`) |
| Sport: distinct Pickleball / Pilates identity | Settings pilot chips, establishment medallions and map markers differ |
| Map markers carry module identity | `venue-marker-art` on module maps |
| Food unaffected | all Food suites green; Food venue fallback is now its dish illustration (was a pin) |

Before/after screenshots for Bars, Coffee, Spa and Sport (catalogue, item, map; Sport discover; Food catalogue for comparison), desktop and Pixel 7: `docs/screenshots/parity/before-*` and `after-*`. **Known:** inside this sandbox Wikimedia refuses automated image downloads, so screenshots show the illustration fallback where a real browser shows the Commons photo (same as Food's photos).

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
