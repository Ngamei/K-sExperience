# Sprint 2 — Baseline feature audit

_Audited 2026-11-27 by Claude Code on branch `claude/trusting-clarke-44sf7b` (commit at the time of writing: see `git log`). Evidence = automated tests in this repo; "verified" means a passing test or browser screenshot, never code inspection alone. The deployed Vercel site was **not** inspected by Claude Code (no access from the sandbox) — which commit it serves must be confirmed by the PO/Codex._

**Regression baseline (clean build):** typecheck ✅ · lint ✅ · unit 27/27 ✅ · integration 15/15 ✅ · production build ✅ (267 static pages) · e2e 34/34 ✅ at audit start → 36/36 after CC-06 (18 scenarios × desktop + Pixel 7). Commands in `docs/QA_REPORT.md`.

Legend: ✅ Implemented & verified · 🟡 Implemented but unverified · 🟠 Partially implemented · ⬜ Missing · ⛔ Blocked

## Screens & journeys
| Feature (PRD) | Status | Evidence / gap |
| --- | --- | --- |
| Food Map is the home page (`/`) | ✅ | e2e `home page is the culinary map` |
| Accurate boundaries, 63 provinces, 6 regions, Hoàng Sa + Trường Sa, Biển Đông label | ✅ | e2e `renders accurate boundaries…`; integration geography tests |
| Region selection, province click/selection, zoom, pan | ✅ | e2e `selecting a region reveals more dishes; clicking a province selects it` |
| Dish markers, clustering, progressive disclosure, dynamic filtering | ✅ | e2e (11 representative dishes at national view; more on region) + unit tiers |
| Map dish preview → dish page | ✅ | e2e `clicking a dish marker…` |
| No-WebGL SVG fallback map | 🟡 | implemented, never exercised by a test |
| Food Catalogue: accent-insensitive search, combined filters, chips, result count | ✅ | e2e catalogue spec + unit filter tests |
| All 17 filter groups | 🟠 | logic unit-tested for every group; UI e2e covers category, region, tried, saved; budget filter has almost no data (1 price) |
| Dish Details: origin + 2025 admin mapping, ingredients, taste, dietary, meal, variants, sources/verification | ✅ | e2e priority journey; screenshots |
| Dish photo with author/licence | 🟡 | e2e with stubbed image; real Commons rendering not verifiable from sandbox (bot policy) |
| HCMC availability block (listed venues, statuses, empty state) | ✅ | e2e (Cơm tấm venues; Thắng cố empty state) |
| Google Maps search card, Copy dish name, More from origin province | ✅ | e2e |
| Nearby map + list (distance, open now, budget, venue type) | 🟠 | e2e lists real venues and samples; distance/open-now UI not e2e (unit only); street basemap untested (host unreachable) |
| Establishment details (hours, sources, Google Maps, approximate-pin note) | ✅ | e2e `dish page lists real HCMC venues…` |
| Directions | 🟠 | Google Maps search link per venue (e2e checks href); no in-app routing (by design) |
| Saved dishes | ✅ | e2e |
| Saved collections | 🟡 | implemented, no test |
| Food Passport (tried, provinces, regional completion, stamps) | ✅ | e2e |
| Surprise me (preferences, never uses samples) | ✅ | e2e + unit |
| Settings → Experience Mode (Food active; Bars/Coffee/Spa/Shopping disabled "Coming soon") | ✅ | e2e priority journey |
| EN/VI switch (active language highlighted) | ✅ | e2e |
| Sample venues opt-in, labelled, never recommended | ✅ | e2e + unit |
| Admin CMS (overview, review, dishes, establishments, evidence, photos, import, audit) | 🟠 | Sprint 3: editors + validation + review e2e-tested in local mode; Supabase auth/persistence implemented and DB-tested locally, **not verified against a live project** (not provisioned) |
| PWA manifest + service worker | 🟡 | SW active during e2e; offline mode not tested |
| Offline static preview | ✅ | e2e run against static export |

## Data
| Item | Status | Detail |
| --- | --- | --- |
| Master catalogue (500+) | ⛔ | **Not supplied.** 138 seed dishes, 0 with sources — see `docs/DATA_REPORT.md` |
| Catalogue importer (JSON/CSV, VI categories, variants, multiple origins) | ✅ | unit tests; ready for the master file |
| Dish photography | 🟠 | 45/138 licensed Commons photos; 93 illustration-only |
| HCMC establishments | 🟠 | 108 real venues, 111 links, all "listed by source"; **0 first-hand confirmed** |
| Production database (Supabase) | 🟠 | migrations + seed + RLS tested on local PostgreSQL/PostGIS (`npm run test:db`); project not provisioned (PO) |
| Accounts / cross-device sync | ⛔ | depends on Supabase |

## Highest-risk gaps for "open it when I don't know what to eat"
1. Catalogue is seed and unsourced → credibility.
2. Venue coverage: 28/138 dishes have any venue; none confirmed first-hand.
3. Admin cannot persist edits → PO cannot maintain data without code.
