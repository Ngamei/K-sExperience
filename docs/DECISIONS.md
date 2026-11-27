# Decision log

Legend: **[PO?]** = needs Product Owner confirmation · **[CONFIRMED by PO]** = approved · **[TECH]** = engineering decision

| # | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D1 | 2026-11-27 | **[TECH]** Fresh Next.js 16.4 project; no previous-session code existed in the repo (empty, no commits). | Nothing to recover. |
| D2 | 2026-11-27 | **[TECH]** Accurate boundaries from **geoBoundaries gbOpen VNM ADM1** (Public Domain, 2008 = 63 provinces). | Matches "63 historical provinces"; licence-clean; includes Hoàng Sa & Trường Sa geometry. GADM/Wikimedia were unreachable and GADM's licence forbids commercial use. |
| D3 | 2026-11-27 | **[TECH]** Côn Đảo merged into Bà Rịa–Vũng Tàu; Hoàng Sa extracted from Đà Nẵng and Trường Sa from Khánh Hòa as separate labelled features (still linked to their parent province). | Correct administrative attribution + always-visible islands. |
| D4 | 2026-11-27 | **[CONFIRMED by PO 2026-11-27]** Culinary regions = the six requested (Miền Bắc as a single region of 25 provinces). | Brief specified six. PO confirmed keeping Miền Bắc as one region. A future split remains possible without schema change. |
| D5 | 2026-11-27 | **[TECH]** Each historical province maps to its post-1-July-2025 unit (Resolution 202/2025/QH15, 34 units); shown as "Since 2025 part of …". | "Appropriate mapping to current administrative geography". |
| D6 | 2026-11-27 | **[CONFIRMED by PO 2026-11-27]** "HCMC only" = the **current (2025) HCMC administrative area**, which now includes former Bình Dương and Bà Rịa–Vũng Tàu. Neighbourhood list currently uses familiar former-district names of the old city. | Legal boundary changed in 2025. PO confirmed the 2025 boundary. |
| D7 | 2026-11-27 | **[TECH]** Seed catalogue of 138 dishes authored from general culinary knowledge, imported through the real importer, labelled `seed-unverified` everywhere (data, banner, dish page). No source references were invented. | Full ChatGPT catalogue not yet supplied. |
| D8 | 2026-11-27 | **[TECH]** No real HCMC establishments shipped. Eight fictional **[SAMPLE]** venues live in `data/samples/`, hidden by default, badged, excluded from recommendations, directions disabled. | PM instruction: leave unverifiable venues out of real recommendations; never fabricate. |
| D9 | 2026-11-27 | **[TECH]** Original SVG food illustrations per dish type until licensed photography is supplied ("Photography pending" label). | No licensed photo source reachable; avoids copyright risk. |
| D10 | 2026-11-27 | **[TECH]** Local mode (JSON + localStorage) as the default runtime; Supabase schema authored but not connected. | No credentials; must not block implementation. |
| D11 | 2026-11-27 | **[TECH]** Catalogue served once as static `/data/food.json` instead of embedding in every page. | Cut static export 152 MB → 22 MB. Trade-off: dish text is client-rendered (titles/descriptions in `<head>` metadata remain server-rendered). |
| D12 | 2026-11-27 | **[TECH]** Progressive disclosure thresholds relative to each device's fit-Vietnam zoom; region selection ⇒ ≥ tier 2, province ⇒ all. | Phones start ~1 zoom level lower than desktops; absolute thresholds hid dishes on mobile (found by e2e). |
| D13 | 2026-11-27 | **[CONFIRMED by PO 2026-11-27]** Default UI language = English, one-tap switch to Tiếng Việt; dish names always shown in Vietnamese. | HCMC visitors + locals. PO confirmed English default. |
| D14 | 2026-11-27 | **[CONFIRMED by PO 2026-11-27]** Nearby street basemap defaults to **OpenFreeMap** (free, no key, OSM data); offline falls back to boundary-only. Configurable via `NEXT_PUBLIC_BASEMAP_STYLE_URL`. | Free service with no account. PO confirmed OpenFreeMap is acceptable. |
| D15 | 2026-11-27 | **[TECH]** Dietary information is labelled "typical preparation" with a "confirm with the venue" note. | Recipes vary; avoid implying guarantees. |
| D16 | 2026-11-27 | **[TECH]** `trailingSlash: true` for all builds; service worker never caches redirected responses. | A redirect + SW combination broke navigations (found by e2e). |
