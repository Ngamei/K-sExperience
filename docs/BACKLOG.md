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
| CC-06 | P1 | CC | Dish page: Copy dish name, More from origin province | e2e | ✅ |
| CC-07 | P0 | CC | Evidence levels + confirmation capture | 7 levels in schema/importer/DB/UI; Admin → Evidence editor filters evidence types per level; e2e | ✅ Sprint 3 |
| PO-01 | P0 | PO | Menu-confirm ~20 venues/week via Grab/ShopeeFood/official menus (no visits required) | Admin → Evidence entries with URL + date | ⬜ |
| CC-08 | P1 | CC | Photo audit tool: list dishes without photo, flag duplicates, show licence; add photos for priority-50 first | report section + ≥ 30/50 priority dishes with accurate licensed photo | ⬜ |
| CC-09 | P1 | CC | Browser check that Commons photos render on the live site | screenshot from a normal browser (needs PO or Codex browser) | ⛔ sandbox blocked |
| CX-02 | P1 | PO | Provision free Supabase project (docs/SUPABASE.md steps 1–6) | Preview env shows "Data mode: Supabase"; editor sign-in works | ⬜ approved, PO to provision |
| CC-10 | P1 | CC | Supabase read path + Auth for Admin | both modes work; DB tests green | ✅ code + local DB tests; live verification waits CX-02 |
| CC-11 | P1 | CC | Admin CMS: dishes, origins, establishments, evidence links, photos, CSV/JSON import, duplicates & missing-data review, audit trail | persisted via Supabase; local mode downloads validated JSON | ✅ code + e2e (local); persistence verification waits CX-02 |
| CC-12 | P1 | CC | e2e for collections, distance filter, open-now, no-WebGL fallback | tests added and green | ⬜ |
| CC-15 | P0 | CC | Master catalogue merge importer (no data loss) | ids/photos/sources/links preserved; only supplied columns change; import report; tests | ✅ Sprint 3 |
| CC-16 | P0 | CC | Re-search chả cá Lã Vọng, xôi xéo, bún sứa, bún đỏ, bánh tằm bì with alternative names; continue priority-28 | documented results, no loosened matching | ⬜ next |
| CC-17 | P0 | CC | Accounts: guest-first auth, profile, deletion, guest migration, cross-device passport sync, notes/ratings, visited venues, Experience Passport modules | 12 acceptance criteria (see QA_REPORT) | ✅ code + DB + mock e2e; live Google/email verification waits CX-02 |
| CC-18 | P1 | CC | Personal food photos UI (user-media bucket ready) and achievements | upload/view own photos; badges computed from history | ⬜ |
| CC-19 | P1 | CC | Personalised recommendations from account history/notes | Surprise me/Discover use ratings + history | ⬜ |
| CC-20 | P1 | CC | Dish-at-place photos on dish-page venue cards (link-level photo model, priority venue → menu/delivery → generic → icon) | schema + migration 0004 + importer/Admin/seed/read path; unit, DB and e2e (desktop + mobile) tests | ✅ code + tests; no real venue photos yet (see PO-02) |
| PO-02 | P1 | PO | Collect permitted venue photos of exact dishes (venue posts, own menus, delivery listings) with written permission or licence | Admin → Evidence → photo fields filled with source, attribution, licence, date | ⬜ needs permission process (D31) |
| CC-21 | P0 | CC | Sport mode in Settings (pilot planned; Pickleball, Pilates), registry for six modules with feature flags, EN/VI, passport compatibility, schema review (migration 0005, Sport draft schemas), regression tests | Food unaffected; unit/DB/e2e green | ✅ |
| CC-22 | P0 | CC | Shared Experience Engine step B: extract nav-from-slots, ItemCard/CatalogueView, filter definitions, ItemDetail sections, OfferingRow, offering index, passport slices — Food behaviour unchanged | full Food regression suite green after each step; reuse matrix updated | 🔄 nav, OfferingRow, offering index/image, map, passport per experience, Saved done; next: generic filter drawer, Food catalogue/detail onto engine templates |
| CC-23 | P1 | CC | Coffee reference pilot (config, `experience_items` + `offerings`, catalogue, detail, HCMC map layer) behind `NEXT_PUBLIC_FEATURE_COFFEE` | Codex QA before enabling | ✅ code + tests (flag off, empty dataset) |
| CX-06 | P1 | CX/PO | Coffee pilot data: sourced list of coffee drinks + verified HCMC cafés (evidence, prices with units, licensed photos) | `data/experiences/coffee.json` via validators | ⬜ |
| CC-25 | P1 | CC | Admin configurable per module (fields from registry attributes, offerings evidence/photo editor) + shared CSV/JSON importer + Supabase read path for `experience_items`/`offerings` | e2e + DB tests | ⬜ |
| CC-24 | P2 | CC | Bars, Spa, Sport (Pickleball, Pilates) via configuration + extensions | after CC-23 | ⬜ |
| CX-05 | P0 | CX | Architecture review of `docs/EXPERIENCE_ENGINE.md` reuse matrix | approved / changes requested | ⬜ |
| CX-04 | P0 | CX/PO | Supply `data/source/master-catalogue.csv` (from the ChatGPT conversation — Claude Code has no access to it) | file committed | ⛔ input missing |
| CC-13 | P2 | CC | Server-render dish text for SEO | dish page HTML contains name + description | ⬜ |
| CC-14 | P2 | CC | Discovery engine v2: "what to eat now" (time of day, budget, nearby listed venues, preferences) | Discover shows ranked suggestions with reasons; unit tested | ⬜ |
| CX-03 | P1 | CX | Independent QA on deployed build (which commit is live?) | QA notes in `docs/QA_REPORT.md` → *Independent QA* | ⬜ |
| — | — | — | Bars / Coffee / Spa / Shopping modules | **Out of scope this sprint** (remain "Coming soon") | — |
