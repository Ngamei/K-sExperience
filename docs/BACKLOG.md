# Backlog — Sprint 2 "From prototype to real product"

Owners: **PO** Product Owner · **CX** Codex (PM / tech lead / QA / data integrity) · **CC** Claude Code (implementation). Priority P0 > P1 > P2.
Status: ✅ done · 🔄 in progress · ⬜ todo · ⛔ blocked (reason).

| ID | P | Owner | Item | Acceptance criteria | Status |
| --- | --- | --- | --- | --- | --- |
| CX-01 | P0 | PO/CX | **Supply the master catalogue** in the import format (`docs/DATA_SOURCES.md` → *Catalogue import format*) with source references | File in repo `data/source/master-catalogue.(csv|json)`; `npm run data:import -- <file> --dataset master --dry-run` reviewed | ⛔ input missing |
| CC-01 | P0 | CC | Import master catalogue; dedupe; validation report | 0 importer errors; `npm run data:report` shows dataset=master, duplicates reviewed; seed banner disappears automatically | ⛔ waits CX-01 |
| CC-02 | P0 | CC | Feature audit + regression baseline | `docs/AUDIT.md`, all tests green | ✅ |
| CC-03 | P0 | CC | Automated data completeness report | `npm run data:report` → `docs/DATA_REPORT.md` | ✅ |
| CC-04 | P0 | CC | Restaurant verification plan + priority-50 list | `docs/RESTAURANT_VERIFICATION_PLAN.md`, `data/source/priority-dishes.json` | ✅ |
| CC-05 | P0 | CC | L1 desk research for priority-50 dishes | each priority dish ≥ 1 listed venue or documented "none found" with searches tried | 🔄 after batch 7: 6 at ≥5, 16 at 1–4, 28 none (searches for chả cá Lã Vọng, xôi xéo, bún sứa, bún đỏ, bánh tằm bì found no named HCMC venue) |
| CC-FOOD-010 | P0 | CC | Bulk import every HCMC dish listicle on mia.vn | intake applied; report `research-exchange/reports/CC-FOOD-010.md` | ✅ 2026-11-28: +265 venues (118 → 383), +12 links on existing venues |
| CC-06 | P1 | CC | Dish page: Copy dish name, More from origin province | e2e | ✅ |
| CC-07 | P0 | CC | Evidence levels + confirmation capture | 7 levels in schema/importer/DB/UI; Admin → Evidence editor filters evidence types per level; e2e | ✅ Sprint 3 |
| PO-01 | P0 | PO | Menu-confirm ~20 venues/week via Grab/ShopeeFood/official menus (no visits required) | Admin → Evidence entries with URL + date | ⬜ |
| PO-02 | P0 | PO (+ browser agent) | Google Maps venue collection for dishes with 0–4 HCMC venues and the 60 unpinned mia.vn venues — prompt `research-exchange/briefs/GMAPS-DISH-VENUES.md`, worklist `…worklist.md` (D79) | batch `PO-GMAPS-001.json` in `research-exchange/inbox/`; Claude Code runs intake | ⬜ |
| CC-PHOTO-01 | P1 | CC | `npm run data:seed` drops master dishes (it rebuilds the catalogue from seed only). Make dish photos attach through the master merge (or make `data:seed` merge-safe) and add a test that a seed rebuild never loses master dishes | test proves 180 dishes survive; photo workflow documented | ⬜ |
| CC-08 | P1 | CC | Photo audit tool: list dishes without photo, flag duplicates, show licence; add photos for priority-50 first | report section + ≥ 30/50 priority dishes with accurate licensed photo | ⬜ |
| CC-09 | P1 | CC | Browser check that Commons photos render on the live site | screenshot from a normal browser (needs PO or Codex browser) | ⛔ sandbox blocked |
| CX-02 | P1 | PO | Provision free Supabase project (docs/SUPABASE.md steps 1–6) | Preview env shows "Data mode: Supabase"; editor sign-in works | ⬜ approved, PO to provision |
| CC-10 | P1 | CC | Supabase read path + Auth for Admin | both modes work; DB tests green | ✅ code + local DB tests; live verification waits CX-02 |
| CC-11 | P1 | CC | Admin CMS: dishes, origins, establishments, evidence links, photos, CSV/JSON import, duplicates & missing-data review, audit trail | persisted via Supabase; local mode downloads validated JSON | ✅ code + e2e (local); persistence verification waits CX-02 |
| CC-12 | P1 | CC | e2e for collections, distance filter, open-now, no-WebGL fallback | tests added and green | ⬜ |
| CC-15 | P0 | CC | Master catalogue merge importer (no data loss) | ids/photos/sources/links preserved; only supplied columns change; import report; tests | ✅ Sprint 3 |
| CC-16 | P0 | CC | Re-search chả cá Lã Vọng, xôi xéo, bún sứa, bún đỏ, bánh tằm bì with alternative names; continue priority-28 | documented results, no loosened matching | 🔄 xôi xéo + bún đỏ found (batch-08); bánh tằm bì only Đồng Tháp style (not linked to Bạc Liêu); chả cá Lã Vọng, bún sứa: no confirmed HCMC address |
| CC-17 | P0 | CC | Accounts: guest-first auth, profile, deletion, guest migration, cross-device passport sync, notes/ratings, visited venues, Experience Passport modules | 12 acceptance criteria (see QA_REPORT) | ✅ code + DB + mock e2e; live Google/email verification waits CX-02 |
| CC-18 | P1 | CC | Personal food photos UI (user-media bucket ready) and achievements | upload/view own photos; badges computed from history | ⬜ |
| CC-19 | P1 | CC | Personalised recommendations from account history/notes | Surprise me/Discover use ratings + history | ⬜ |
| CC-20 | P1 | CC | Dish-at-place photos on dish-page venue cards (link-level photo model, priority venue → menu/delivery → generic → icon) | schema + migration 0004 + importer/Admin/seed/read path; unit, DB and e2e (desktop + mobile) tests | ✅ code + tests; no real venue photos yet (see PO-02) |
| PO-02 | P1 | PO | Collect permitted venue photos of exact dishes (venue posts, own menus, delivery listings) with written permission or licence | Admin → Evidence → photo fields filled with source, attribution, licence, date | ⬜ needs permission process (D31) |
| CC-21 | P0 | CC | Sport mode in Settings (pilot planned; Pickleball, Pilates), registry for six modules with feature flags, EN/VI, passport compatibility, schema review (migration 0005, Sport draft schemas), regression tests | Food unaffected; unit/DB/e2e green | ✅ |
| CC-22 | P0 | CC | Shared Experience Engine step B: extract nav-from-slots, ItemCard/CatalogueView, filter definitions, ItemDetail sections, OfferingRow, offering index, passport slices — Food behaviour unchanged | full Food regression suite green after each step; reuse matrix updated | ✅ shared filter drawer, catalogue layout, detail blocks and offerings section; Food migrated (all Food e2e green) |
| CC-23 | P1 | CC | Coffee reference pilot (config, `experience_items` + `offerings`, catalogue, detail, HCMC map layer) behind `NEXT_PUBLIC_FEATURE_COFFEE` | Codex QA before enabling | ✅ code + tests; flag off; sourced pilot data (13 drinks, 4 cafés, 5 offerings) |
| CX-06 | P1 | CX/PO | Coffee pilot data: sourced list of coffee drinks + verified HCMC cafés (evidence, prices with units, licensed photos) | `data/experiences/coffee.json` via validators | ⬜ |
| CC-25 | P1 | CC | Admin configurable per module (fields from registry attributes, offerings evidence/photo editor) + shared CSV/JSON importer + Supabase read path for `experience_items`/`offerings` | e2e + DB tests | ✅ read/write + states; Admin mode selector + editors + import (dry run, duplicates, merge, report); CLI `data:import-module`, `data:research` |
| CC-24 | P2 | CC | Bars, Spa, Sport (Pickleball, Pilates) via configuration + extensions | after CC-23 | ✅ implemented behind flags; sourced catalogues; no venues yet |
| CC-26 | P0 | CC | Settings Account first + one Passport sign-in gate (modal/sheet) for every experience | account e2e (mock) desktop + mobile | ✅ mock-auth tested; live Google/email after provisioning |
| CC-27 | P0 | CC | Remove consumer seed banners; dev-only samples; provenance in Admin | e2e | ✅ |
| CC-28 | P1 | CC | SW cache versioning + cache/mode-switching/back/refresh/isolation/flag tests | e2e | ✅ |
| CC-29 | P1 | CC | Multi-experience visual parity (icons, illustrations, Commons photos, hero, venue fallbacks, markers, visual data report) | e2e visual tests; Codex visual review | ✅ code + tests; Codex review pending |
| CC-30 | P0 | CC | Hôm nay ăn gì? daily recommendation module (`/what-to-eat`): attribute audit, deterministic engine, 12 collections + 6 modes, filters, actions, personalisation, migration 0008, Admin fields + coverage tab, importer columns, report | unit (14 engine + importer) + e2e 12 + DB 5 checks | ✅ MVP; Codex QA pending |
| EAT-01/02/03 | P0 | CC | Recommendations empty with saved Vegan + No pork (root cause: venue required + saved prefs locked on + empty state below the fold) | unit on real data + e2e desktop/mobile + before/after screenshots | ✅ fixed; Codex verification pending |
| EAT-04/05/06 | P1 | CC | Goals (balanced, weight management, high protein, budget, vegetarian, quick), budget presets (any, <30k, <50k, <100k, 100–300k, 300k+, custom; per person/total), occasions (everyday, office lunch, date night, family, special dining) | e2e | ✅ |
| EAT-07/08 | P1 | CC | Pastel sage layout, compact control card, results beside controls on desktop, "Gợi ý món ăn" primary action scrolls to results; no horizontal overflow | e2e + screenshots | ✅ |
| EAT-09 | P2 | CC | Mobile nav: Discover merged into Explore (Map / Discover switch); five Food tabs, four for other modes (D55) | e2e mobile nav | ✅ |
| EAT-10 | P1 | CC | Meal time soft by default + "Only <meal>"; results split with places / without places; unique counts (D56) | unit + e2e | ✅ Codex QA pending |
| UI-01 | P1 | CC | Pastel experience themes as shared tokens; pastel heroes; soft active states (D57) | e2e theme checks per mode + screenshots | ✅ Codex visual review pending |
| DS-01 | P0 | CC | Research exchange: contract export, templates, exports, shared queue, intake (dry run/apply/rollback/audit), evidence guard (D58) | unit (exchange, engine-import) | ✅ |
| DS-02 | P1 | CC | Live counts: catalogue matching/total + places per dish + coverage line; Settings → About summary; Admin coverage by experience | e2e | ✅ |
| DS-03 | P1 | CC | Hôm nay ăn gì? filter-support table + meal×diet zero combinations in docs/WHAT_TO_EAT_REPORT.md | report | ✅ |
| CC-FOOD-009 | P1 | CC | Establishment research: home-style/regional dishes with 0 venues (central districts) | intake report | ✅ 3 imported, 1 withheld (geocode) — Codex spot-check |
| GPT-BARS-001 | P1 | CC | Import ChatGPT craft beer batch (BAR-CRAFT-20261128-01) via exchange:convert + intake; brand attribute; live venue counts on Bars catalogue / item / map | unit + e2e-modules (counts) + screenshots | ✅ 26 imported, 6 rejected — Codex review pending |
| KEX-IMPORT-01 | P0 | CC | Unknown spice preserved through intake/merge/bundled/Supabase (0009); strict spice limits exclude unknown | unit 10 + DB 4 + GPT-CAT-001 rows checked | ✅ on review branch — Codex review; GPT-CAT-001 apply still held by owner |
| KEX-QA-02 | P1 | CC | Xuân Thủy pair kept street precision (no exact pin available) + approximate label in all modes + shared-pin intake warning; Bùi Viện & Phú Mỹ Hưng staged (CC-BARS-003, OSM-mapped, apply held); Hoàng Sa withheld | e2e + intake smoke test | ✅ on review branch — Codex review |
| KEX-QA-03 | P0 | CC | Source-derived pin precision (exact / building / street), supplied pins take precedence, dry-run/apply parity via selected-pin snapshot, migration 0010, building label in UI | unit 6 + DB 2 + intake smoke tests | ✅ on review branch — Codex review; CC-BARS-003 still held |
| NB-01 | P0 | CC | Neighbourhood coverage audit + matrix + Tier 1 gaps (`npm run data:neighbourhoods` → docs/NEIGHBOURHOOD_COVERAGE.md) | report | ✅ (provisional polygons) |
| NB-02 | P0 | PO/Business/Product + CX | Review polygons, wards, publish thresholds, analytics/consent (docs/NEIGHBOURHOODS.md §6) | decisions | ⬜ |
| NB-03 | P1 | CC | Research CC-TD*/CC-SALA*/CC-CBD* batches (queue.json) after NB-02 | intake reports | ⬜ planned |
| NB-04 | P1 | CC | Neighbourhood model in app + `/areas/` pages per docs/NEIGHBOURHOODS.md §5 (after NB-02) | e2e + SEO checks | ⬜ |
| KEX-SEC-01 | P0 | CC | `/admin/` fails closed on public deployments (incl. local-data); offline Admin only in dev / `NEXT_PUBLIC_LOCAL_ADMIN=1` (refused on Vercel); editor tools only for `user_roles` editors; RLS proof that anon/non-editor writes are refused | DB 7 new checks (mutation-tested) + e2e guest/non-editor/editor (auth build) + public-build gate (modules build) | ✅ on review branch `claude/kex-sec-01` — Codex review; release blocker until merged |
| KEX-DB-01 | P0 | CC → PO | Staging runbook for 0009/0010, seed parity SQL (read-only), account/Passport flows (issue #2) — `docs/STAGING_RUNBOOK.md` | local: migrations 0001–0010 + seed ×2 + parity 10/10 + RLS 53/53 | 🟡 staging `aibainipwgqbluhnqepu` migrated 0001–0010 + seeded + parity 10/10 (reported by the PO's operator, commit 8f429f1); next: Vercel Preview env, redirect URLs, access + issue #2 checks |
| KEX-FOOD-COV-01 | P1 | CC | Machine-readable Food coverage (`docs/food-coverage.json`, `npm run data:food-coverage`): 0 / 1–4 / 5+ distinct venues, reconciled; scouting priorities for Thảo Điền, Sala (→ GPT-FOOD-001), Q1, Phú Mỹ Hưng (→ Claude) | integration 3 | ✅ on review branch — no candidates added |
| KEX-GROWTH-01 | P0 | CC → PO | Workplace pilot go/no-go (docs/NEIGHBOURHOODS.md §8) | decision table | ✅ delivered: **no-go for now** — Dreamplex NTN conditional lead, The Hive Thảo Điền fallback, Inspire Hub no-go; gaps listed |
| BAR-02 | P2 | ChatGPT/CC | Craft beer gaps: exact pins for 6 rejected branches; venue-level tap lists (individual beers); prices; licensed venue photos; operating-status confirmation | — | ⬜ |
| GPT-CAT-001 / GPT-FOOD-001 | P0 | ChatGPT | Master catalogue (everyday meals, vegan/vegetarian main meals, office lunch, dinner) and outer-district venue scouting — see research-exchange/queue.json | intake dry run | ⬜ planned |
| CX-09 | P1 | Codex | Source eating attributes (cooking method, portion, allergens) and venue dining data (price range, hours, atmosphere) — coverage in `docs/WHAT_TO_EAT_REPORT.md` | report coverage ↑ | ⬜ |
| CC-31 | P2 | CC | Hôm nay ăn gì? v2: weather/time-aware boosts, weekly variety, optional AI explanations on top of the deterministic engine (after PO approval) | — | ⬜ later |
| CX-07 | P1 | CX/PO | Research verified venues for Bars, Spa, Sport and remaining Coffee items (salt coffee, cold brew, matcha, tea); confirm Cheo Leo coordinates | `npm run data:research -- <module>` clean | 🔄 CC added Bars 2, Spa 4, Sport 5 venues (source-listed); Codex to spot-check sources; confirm Rudal/HitPark/Olaben/Cheo Leo coordinates; find sources for classic cocktails, massage/facial/nails, pickleball coaching, Pilates trial/private |
| PO-03 | P0 | PO | Enable pilots on Preview only (`NEXT_PUBLIC_FEATURE_*`) for Codex QA — see docs/PREVIEW_CHECKLIST.md | checklist complete | ⬜ |
| CX-05 | P0 | CX | Architecture review of `docs/EXPERIENCE_ENGINE.md` reuse matrix | approved / changes requested | ⬜ |
| CX-04 | P0 | CX/PO | Supply `data/source/master-catalogue.csv` (from the ChatGPT conversation — Claude Code has no access to it) | file committed | ⛔ input missing |
| CC-13 | P2 | CC | Server-render dish text for SEO | dish page HTML contains name + description | ⬜ |
| CC-14 | P2 | CC | Discovery engine v2: "what to eat now" (time of day, budget, nearby listed venues, preferences) | Discover shows ranked suggestions with reasons; unit tested | ⬜ |
| CX-03 | P1 | CX | Independent QA on deployed build (which commit is live?) | QA notes in `docs/QA_REPORT.md` → *Independent QA* | ⬜ |
| — | — | — | Bars / Coffee / Spa / Shopping modules | **Out of scope this sprint** (remain "Coming soon") | — |

### 28 Nov 2026 · Audit follow-up

| ID | Priority | Owner | Acceptance and state |
| --- | --- | --- | --- |
| KEX-QA-01 | P0 | Claude Code | Report returns 36/138 from linked dishes, with regression coverage. Review the local fix and deploy only with release approval. |
| KEX-IMPORT-01 | P0 | Claude Code | Unknown spice intensity survives intake and stays out of strict no-spice matches. Merged in 1b6a1be. GPT-CAT-001 passes the updated dry run and awaits separate apply approval. |
| KEX-QA-02 | P1 | Claude Code | Resolve the two Xuân Thủy branch pins and compare the six withheld Craft Beer branches against branch sources. Review cache behavior and preserve usable IDs and evidence. |
| KEX-SET-01 | P0 | CC | **Customer Settings redesign** (Account, Membership, Your experience, App preferences, Help & information; Privacy & Data; no infrastructure/admin/completeness info) | e2e `settings.spec.ts`, `access-control.spec.ts`; screenshots | ✅ branch `claude/gifted-franklin-iltr35` — awaiting Codex review + PO merge |
| KEX-ADM-01 | P0 | CC | **Admin Portal**: existing Admin reorganised into 11 modules (Overview, Business Directory, Catalogue, Menus & Pricing, Nutrition, Research & Imports, Data Quality & Coverage, Users & Memberships, Subscriptions & Billing, System Health, Audit Logs) | e2e 11 modules; live KPIs | ✅ same branch |
| KEX-SEC-02 | P0 | CC → CX | **Staff roles ≠ memberships** (migration 0013, RLS) | `npm run test:db` 0013 checks; auth e2e | ✅ implemented · ⬜ **Codex independent review** · ⬜ PO approval to merge (applies 0013 to production) |
| KEX-MEM-01 | P0 | PO/CC | Define Plus/Premium benefits and limits (D72); confirm prices (D71); currency (D74) | Decision recorded; plans + limits in code; Membership page + Admin billing/projection | ✅ PO decided 2026-11-28 · implemented (limits not enforced) |
| KEX-MEM-03 | P1 | PO | Validate pricing: willingness-to-pay test + payment-fee economics per provider (monthly vs annual) | Evidence before finalising prices | ⬜ |
| KEX-MEM-04 | P1 | CC | Build the membership benefits marked "Coming" (detailed menu views, nutrition display, advanced preferences, menu price access, price comparisons) and switch on `LIMITS_ENFORCED` together with checkout | each benefit e2e-tested; limit + upgrade path tested | ⬜ waits KEX-MEM-02 |
| KEX-MEM-06 | P0 | CC | Server-side quota enforcement foundation (0014, off) + usage meter | DB tests incl. downgrade, per-experience, Premium, expiry; concurrency race | ✅ awaiting Codex review |
| KEX-BIZ-02 | P0 | CC | Standardise business pages: shared `components/business/*` for Food `/places/[id]` and module establishment pages; contact/hours for every experience; honest unknown states | e2e per experience; screenshots | ✅ D77 — awaiting Codex review |
| KEX-BIZ-03 | P0 | CC | Real venue photos in the profile header: data contract, table 0015, credited header with illustration fallback; Commons research for licensed photos | DB + integrity + e2e tests; photos checked one by one | ✅ (see QA_REPORT for photos found) |
| KEX-BIZ-04 | P1 | PO / research | Venue photos with owner permission (most venues have no freely licensed photo) — ask venues or photograph them ourselves | written permission recorded as `Owner permission (…)` | ⬜ |
| KEX-MEM-05 | P1 | PO | Decide what Free/Plus see of venue prices once "unlimited menu price access" is a Premium benefit (today everyone sees recorded VND prices) | Decision recorded | ⬜ |
| KEX-AUTH-01 | P0 | PO/CX | Verify real account creation + cross-device Passport on hosted Supabase (needs test inboxes + independent browser profiles) | 2 real accounts, 2 devices, Passport persists | ⛔ test inboxes/profiles unavailable |
| KEX-MEM-02 | P1 | PO/CC | Subscription payments (provider choice; webhook → `user_memberships.source='billing'` via service role) | PO approval of provider | ⬜ |
| KEX-SET-02 | P1 | PO/CC | Help Centre, feedback, report-incorrect-information, Terms of Service, notifications, appearance, Home & Workplace (currently Coming soon) | content/owners supplied | ⬜ |
| KEX-BIZ-01 | P2 | CC | Business Portal: owner permissions scoped to verified business records (third permission system) | design + RLS tests | ⬜ |

## Sprint 4 — Launch readiness: data quality, retention, launch (PO 2026-11-28, D81)

Three challenges: **data quality, customer retention, launch readiness.** Workstreams run in parallel; auth never blocks research.
Owners: **CC** Claude Code · **CX** Codex · **GPT** ChatGPT · **PO** Product Owner.

| ID | P | Owner | Item | Acceptance | Status |
| --- | --- | --- | --- | --- | --- |
| S4-AUTH-01 | P0 | PO → CC | Production auth: email sign-up (custom SMTP), Google OAuth, redirect URLs, Vercel env | `docs/AUTH_CHECKLIST.md` §B all ✅ | ⬜ PO dashboard steps |
| S4-AUTH-02 | P0 | CX (+ PO inboxes) | Cross-device Passport / references / preferences + account isolation on production with 2 real accounts × 2 devices | `docs/AUTH_CHECKLIST.md` §C1–C7 ✅ with evidence | ⛔ needs test inboxes + browser profiles (= KEX-AUTH-01) |
| S4-SEC-01 | P0 | **CX** | Independent review of migrations 0013, 0014, 0016, 0017: RLS, security-definer functions, entitlements, quota enforcement, Founding cap | review notes in QA_REPORT → *Independent QA*; findings ticketed | ⬜ |
| S4-SEC-02 | P0 | CX | Production read-only checks: migration history = 0001–0017, RLS on all tables, advisors, anon-key write refusal | `docs/AUTH_CHECKLIST.md` §A, §D | ⬜ (CI deploy of 0001–0015 succeeded, run 46158376758 — not yet re-checked by query) |
| S4-DATA-01 | P0 | CC | Profile completeness dashboard vs PO launch standard, per research area + experience; enrichment worklists | `npm run data:profile-completeness`; integration test | ✅ after merging main + CC-ENRICH-001: 491 profiles, **0 launch-ready**; phone 3.7 %, hours 39.5 %, exact/building pins 19.6 %, menus 0 %, prices 5.5 % (was 0 / 31 / 19.5 / 0 / 0.2 % on 435) |
| S4-DATA-02 | P0 | CC | Enrich existing Q1, Q3, Phú Nhuận, Bình Thạnh profiles (phone, hours, status, menu, prices, sources) | batch CC-ENRICH-Q1Q3PNBT-001 through intake; no fabricated values; not-found list | ✅ 001 imported: 52 venues (+18 phones, +26 hours, +21 price ranges, +26 dish prices); 103 left → CC-ENRICH-Q1Q3PNBT-002; Codex to re-check values taken from search extracts (`docs/handover/CC-ENRICH-Q1Q3PNBT-001.md`) |
| S4-DATA-03 | P0 | GPT | Enrich Thảo Điền & An Phú · Sala & Thủ Thiêm · Q7 & Phú Mỹ Hưng | batches GPT-ENRICH-TDAP-001, GPT-ENRICH-SALA-001, GPT-ENRICH-Q7PMH-001 in `research-exchange/inbox/` | ⬜ planned in queue |
| S4-DATA-04 | P0 | GPT | Vietnamese food master catalogue 138 → 500 dishes (PR #12) | intake dry run clean; regional variants separate (`family`) | 🔄 GPT |
| S4-DATA-05 | P0 | CX | Independent source validation of enrichment batches (≥ 20 % of fields) | CX-VALIDATE-ENRICH-001 report | ⬜ |
| S4-MEM-01 | P1 | CC → CX | Menu-unlock entitlements (one unlock = one establishment's full menu per period, idempotent), visibility matrix, unavailable vs restricted, migration 0016 | unit + DB tests; limits still off | ✅ code + tests — Codex review (S4-SEC-01); profile doesn't call `unlock_menu` yet (KEX-MEM-04) |
| S4-MEM-02 | P1 | CC → PO | Founding Member programme (100 users, 90 days Premium, no auto-billing), configurable, **enabled** (PO approved D83) | DB tests (cap, double claim, disabled) | ✅ code + tests — live after merge to main |
| S4-RPT-01 | P1 | CC | Report incorrect information form (9 categories, evidence URL/photo) → restricted Admin review queue; migration 0017 | unit + DB + e2e (local + mock auth) | ✅ Admin → Customer Reports; PO questions in `docs/handover/REPORT-INCORRECT-INFO.md` |
| S4-UX-01 | P1 | GPT + users | Usability QA + simulated users on the six journeys in `docs/QA_HANDOVER.md` §2 | results per journey | ⬜ |
| S4-UX-02 | P1 | CX / PO | Visual fidelity review vs PO mockups (390 px + 1280 px) | deviation list | ⬜ |
| S4-UAT-01 | P1 | PO | Human UAT plan for pilot customers (Founding Members) | survey + interview guide | ⬜ after D83 approval |
| S4-PAY-01 | P2 | CC (later) | Payment integration — provider eligibility for the Vietnamese entity first; **no live payments** | PO approval | ⬜ deferred |
| S4-BIZ-01 | P2 | CC | Merchant portal architecture only (claiming via reports, scoped owner permissions); listings + self-management free (D86) | design note + RLS sketch | ⬜ |
| S4-MEM-03 | P0 | CC → PO | Plus is the default plan during development (D88); switch to Free at end of development (`DEFAULT_MEMBER_TIER` + `membership_settings.default_tier`) | unit + DB tests | ✅ default Plus · ⬜ PO switches to Free before launch |
| S4-ENR-02 | P1 | CC | Enrichment for Coffee/Bars/Spa/Sport venues (intake rejects module enrich batches today) | importer + tests | ⬜ |
| S4-DUP-01 | P1 | CC / CX | Review suspected duplicates flagged by CC-ENRICH-001 (Hồng Phát hủ tiếu ×2, Nhân Quán ×2, O Lê / Quán Xưa at 48 CMT8, `quan-269-de-tham` name) | decision per pair | ⬜ |
| S4-ADS-01 | P3 | — | Advertising / sponsored placements | — | future |
