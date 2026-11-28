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

## 28 Nov 2026 · Independent production baseline

Vercel marked [9787dc3](https://github.com/Ngamei/K-sExperience/commit/9787dc3a3e6e820504f96eb37df22e6e06b4fbcd) current production on `claude/trusting-clarke-44sf7b`. Live Settings showed Local mode and the same item and branch totals as the bundled files below. Supabase migrations and read paths exist, and the current public production app reads bundled JSON. Hosted Supabase row parity, account persistence, and a successful Passport auth round trip remain unverified.

| Experience | Visible items | Bundled seed items | Listed branches | Items with places | Source-listed offerings | In-boundary pins (exact / street) | Priced offerings | Catalogue photos |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| Food | 138 | 138 | 118 | 36 | 121 | 118 (25 / 93) | 1 | 45 |
| Bars | 9 | 9 | 28 | 3 | 28 | 28 (12 / 16) | 0 | 8 |
| Coffee | 13 | 13 | 8 | 5 | 9 | 8 (3 / 5) | 0 | 9 |
| Spa | 8 | 8 | 6 | 5 | 11 | 6 (0 / 6) | 0 | 3 |
| Sport | 7 | 7 | 6 | 5 | 9 | 6 (2 / 4) | 0 | 4 |
| Shopping | 0 | 0 | 0 | 0 | 0 | — | 0 | 0 |

Count method: unique catalogue ID, unique establishment ID, and unique item–establishment pair. Counted non-sample records and tested pins against the HCMC boundary. Seed catalogue items currently render publicly. All listed branches have at least one source. Current operation and a canonical brand roll-up are untracked in the production model. The Craft Beer import has 26 branches across 12 source-labelled brands. Nail and Pilates candidates are outside these totals. Every experience has zero menu-confirmed, directly confirmed and visit-confirmed offerings, and zero offering photos. Venue exteriors have no canonical field.

| Experience | Venues missing hours | Venues missing structured attributes | Exact normalized name/address duplicates | Rejection evidence |
| --- | ---: | ---: | ---: | --- |
| Food | 115 | 118 | 0 | 1 CC-FOOD-009 exclusion and 8 legacy ambiguous-street skips in its report |
| Bars | 28 | 0 | 0 | 6 GPT-BARS-001 rejects. One pair shares a street-level pin. |
| Coffee | 8 | 3 | 0 | 1 explicit source-batch exclusion |
| Spa | 6 | 0 | 0 | 0 explicit source-batch exclusions. Legacy notes mention unresolved addresses. |
| Sport | 6 | 0 | 0 | 4 explicit source-batch exclusions |
| Shopping | — | — | — | No intake |

### Vietnamese Food

- Categories: 92 savory, 22 sweet, 24 snack. Regional memberships count each dish once per region, so totals overlap. Miền Bắc 49, Bắc Trung Bộ 18, Nam Trung Bộ 24, Tây Nguyên 8, Đông Nam Bộ 20, Tây Nam Bộ 24.
- Historical province IDs and dish counts, including associated origins: ha-giang 3, cao-bang 1, bac-kan 2, tuyen-quang 1, lao-cai 1, yen-bai 1, thai-nguyen 0, lang-son 3, bac-giang 1, phu-tho 2, quang-ninh 1, dien-bien 2, lai-chau 1, son-la 3, hoa-binh 1, ha-noi 16, hai-phong 4, vinh-phuc 1, bac-ninh 1, hung-yen 1, hai-duong 2, thai-binh 2, ha-nam 1, nam-dinh 2, ninh-binh 2, thanh-hoa 2, nghe-an 2, ha-tinh 2, quang-binh 2, quang-tri 2, thua-thien-hue 9, da-nang 3, quang-nam 5, quang-ngai 3, binh-dinh 5, phu-yen 2, khanh-hoa 2, ninh-thuan 2, binh-thuan 2, kon-tum 2, gia-lai 2, dak-lak 2, dak-nong 0, lam-dong 4, ho-chi-minh 10, binh-duong 1, binh-phuoc 1, tay-ninh 3, dong-nai 0, ba-ria-vung-tau 2, long-an 1, tien-giang 1, ben-tre 1, tra-vinh 2, vinh-long 1, dong-thap 3, an-giang 3, kien-giang 2, can-tho 1, hau-giang 0, soc-trang 3, bac-lieu 1, ca-mau 1.
- 36 dishes with an HCMC venue, 102 without. Filter coverage includes 46 breakfast, 67 lunch, 50 dinner, 48 snack and 11 late-night dishes. The strict meal-plus-diet cases with zero places include vegan breakfast, lunch, dinner and late night, and vegetarian dinner. This is zero-result potential from the bundled dataset. Traffic frequency is unknown.
- 21 vegan and 5 vegetarian catalogue tags, plus 3 tagged with common vegetarian variants. The app's broader Vegetarian filter includes all 29 and has 4 with places. There are zero sourced complete allergen lists and zero sourced nutrition records. One offering has a recorded price. See [filter-level coverage](WHAT_TO_EAT_REPORT.md) and the headline issue in [QA](QA_REPORT.md).
