# Implementation plan & checklist

_Last updated: 2026-11-27 · Branch `claude/trusting-clarke-44sf7b`_

Legend: ✅ done and verified by automated test and/or browser evidence · 🟡 partial · ⬜ not started · ⛔ blocked

## Phase 1 — Inspect & recover
- ✅ Inspected repo: empty (no commits, no previous-session code). Nothing to recover → fresh project (DECISIONS D1).

## Phase 2 — Environment
- ✅ Node 22, npm; dependencies install cleanly (`npm ci`, 0 vulnerabilities).
- ✅ Geographic data downloaded (geoBoundaries via GitHub). GADM, Wikimedia and tile servers are **not reachable** from the build sandbox.
- ✅ App runs locally (`npm run dev`), production build, static export, offline preview zip.

## Phase 3 — Design system, navigation, experience selector
- ✅ Tokens (ivory/forest/terracotta/sage/charcoal + ochre for Snack), Fraunces + Be Vietnam Pro, primitives (Button, Badge, Chip, Sheet).
- ✅ App shell: desktop top nav, mobile bottom tab bar, seed/sample data banners.
- ✅ Experience registry; Settings → Experience Mode (Food active; Bars/Coffee/Spa/Shopping "Coming soon", disabled) — e2e.
- ✅ EN/VI localisation of UI chrome — e2e.

## Phase 4 — Catalogue, import, search, filters
- ✅ Zod schema for regions, provinces, dishes, restaurants, links.
- ✅ Importer (JSON + CSV, Vietnamese category names, accent-insensitive province names, variant families, strict errors) — 6 unit tests + Admin e2e.
- ✅ Seed catalogue: 138 dishes through the importer, labelled seed everywhere.
- ⛔ **Master catalogue (500+ target)** — awaiting ChatGPT export in the documented import format.
- ✅ Accent-insensitive search; all 17 filter groups; chips; result counts — unit + e2e.

## Phase 5 — Vietnam culinary map
- ✅ Accurate boundaries (63 provinces), 6 region outlines, Hoàng Sa + Trường Sa drawn and labelled, Biển Đông label.
- ✅ 2025 administrative mapping shown on province selection and dish origins.
- ✅ Region chips (fit region), province click (select + filter), zoom, pan, clustering, progressive disclosure, filter-driven markers, dish preview — e2e desktop + mobile.
- ✅ No-WebGL SVG fallback (same geometry). 🟡 Not covered by e2e (headless has WebGL).
- ✅ 45 dishes have a licensed Wikimedia Commons photo with author/licence caption (e2e with stubbed image). 🟡 93 dishes still illustration-only; photo rendering from Commons not verifiable inside the sandbox (bot policy) — check in a real browser.
- ✅ Culinary map is the home page (`/`) — e2e.

## Phase 6 — HCMC establishments
- ✅ Separate entities, many-to-many links with status + evidence + lastVerified; HCMC-boundary rule enforced in tests (+ DB trigger in migration).
- ✅ Four statuses incl. "No verified HCMC establishment found"; dishes remain discoverable.
- ✅ Nearby (map + list, distance from neighbourhood/geolocation, budget, venue type, open now), Establishment details (hours, directions, delivery, evidence).
- ✅ Sample venues: opt-in, badged, directions disabled, excluded from recommendations — e2e.
- ✅ **5 real HCMC establishments** from published sources (Phở Hòa Pasteur, Bánh Mì Huỳnh Hoa, Cơm Tấm Ba Ghiền, Bánh Xèo 46A, Hủ Tiếu Hồng Phát) with addresses, OSM coordinates, Google Maps links, cited sources — integration + e2e.
- ✅ Every dish has a "Find on Google Maps (HCMC)" search button (live Google results, labelled as unchecked) — e2e.
- 🟡 **PO request: ≥ 5 venues per dish** — in progress via batch manual research (D22/D23). Progress tracked in `docs/VENUE_COVERAGE.md` (after batch 7: 113 venues, 32 dishes covered, 10 dishes at ≥ 5). Some regional dishes may never reach 5 real venues in HCMC.
- ⛔ **On-site/phone confirmation** of availability (to upgrade links to `verified-available`) — not done.

## Phase 7 — Saved, recommendations, passport
- ✅ Save + collections; tried dishes; Food Passport (tried, provinces, per-region completion, stamps) — e2e.
- ✅ Surprise me (weighted by preferences; hard constraints for diet/spice/category; never uses samples) — unit + e2e.

## Phase 8 — Admin
- ✅ Stats, coverage gaps, in-browser import validator + canonical JSON download, verification queue (local overrides, export; "verified" disabled without sources).
- ⛔ Auth/role protection (Supabase Auth) — blocked on credentials.

## Phase 9 — QA & deployment prep
- ✅ Typecheck, lint, 39 unit/integration tests, production build, 24 e2e (12 scenarios × desktop + mobile) on server build **and** static export.
- ✅ PWA manifest + service worker.
- ✅ Offline preview zip.
- ⬜ Vercel deployment — **not done; requires PO approval** (out of scope for this checkpoint).

## Release blockers (must be resolved before a public launch)
1. **Master catalogue** not imported; current data is unverified seed (no source references).
2. **HCMC venues are desk-researched only** (5 venues, all "listed by source · not yet confirmed"); only 5 of 138 dishes have a venue. Needs many more venues and on-site/phone confirmation.
3. **Supabase not connected** — no accounts/sync; saved data is per-browser. Needs project + anon key (PO approval for any paid tier).
4. **Admin is unauthenticated** in local mode — must be gated by Supabase Auth + `user_roles` before any hosted deployment that exposes it.
5. **Dish photography** — 45/138 dishes have licensed Commons photos (hot-linked); the rest need photos. Consider self-hosting photos in Supabase Storage for performance and offline use.
6. **2025 administrative mapping** (63 → 34) encoded from engineer knowledge — PM should verify against Resolution 202/2025/QH15.
7. ~~PO decisions pending~~ — all resolved 2026-11-27: D4 (single Miền Bắc region), D6 (HCMC = 2025 boundary incl. Bình Dương/BR-VT), D13 (English default), D14 (OpenFreeMap basemap).
8. Accessibility audit (keyboard on map markers is supported via buttons; full WCAG review not done) and performance budget review on real devices.
9. SEO: dish body text is client-rendered after `/data/food.json` loads (metadata is server-rendered). Consider server-rendering dish text if organic search matters.

## Next actions (proposed)
1. ChatGPT exports the master catalogue in the import format → `npm run data:import -- master.csv --dataset master --dry-run`, fix, import.
2. ~~PO decisions~~ — done (D4, D6, D13, D14 confirmed).
3. Extend HCMC venues (add via `data/source/hcmc-restaurants.source.json` + `npm run data:restaurants`) and confirm availability on site/by phone to upgrade links.
4. Create Supabase project (PO approval), apply migration, implement `SupabaseRepository` behind the `FoodData` shape, add Auth for Saved/Passport/Admin.
5. Source licensed photography; add Supabase Storage upload in Admin.
6. Fill the 4 provinces without dishes (Thái Nguyên, Đắk Nông, Đồng Nai, Hậu Giang) from the master catalogue.
