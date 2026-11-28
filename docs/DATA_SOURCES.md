# Data sources

Every dataset, where it came from, its licence and its verification status.

| File | Content | Source | Licence | Status |
| --- | --- | --- | --- | --- |
| `data/source/geoBoundaries-VNM-ADM1.geojson` | Raw ADM1 boundaries (63 provinces + Côn Đảo) | geoBoundaries gbOpen, VNM ADM1, boundaryYear 2008, build 12 Dec 2023 — https://github.com/wmgeolab/geoBoundaries/tree/main/releaseData/gbOpen/VNM/ADM1 (downloaded 2026-11-27 via media.githubusercontent.com) | **Public Domain** (per geoBoundaries metadata `boundaryLicense`) | Unmodified source |
| `data/vietnam.geojson` | 63 provinces (our IDs, region) + Hoàng Sa + Trường Sa features | Derived by `scripts/build-geo.ts` | Public Domain (derived) | Generated |
| `data/provinces.json` | 63 provinces: names, ISO 3166-2, region, interior label point, bbox, **current 2025 unit** | Geometry: above. Region assignment: product brief. 2025 mapping: Resolution 202/2025/QH15 (effective 1 Jul 2025, 34 units) — encoded from engineer knowledge in `scripts/geo-master.ts` | — | **2025 mapping needs PM verification against the official resolution text** |
| `data/regions.json` | Six culinary regions | Product brief | — | Confirmed |
| `data/hcmc-boundary.geojson`, `public/geo/hcmc.json` | Current HCMC area = former HCMC + Bình Dương + Bà Rịa–Vũng Tàu | Derived | Public Domain | Confirmed by PO (DECISIONS D6) |
| `public/geo/vietnam.json`, `regions.json`, `vietnam-locator.json` | Simplified geometry for the browser | mapshaper simplification of the above | Public Domain | Generated |
| `data/source/seed-catalogue.json` | 138 seed dishes in the import format | Authored by Claude Code from general culinary knowledge (`scripts/seed-rows.mjs`) | Project-owned | **SEED — not source-verified** |
| `data/vietnamese-dishes.json` | Canonical catalogue (output of the importer) | Importer over the seed file | Project-owned | `dataset: seed`, all `seed-unverified`, **no source references** |
| `data/source/hcmc-restaurants.source.json` | 5 researched HCMC establishments (input to the importer) | Desk research 2026-11-27: MICHELIN Guide listings/articles, Vietnam Airlines travel guide, mia.vn, Báo Quốc tế (each record cites its URLs) | Facts only, no copied text beyond short attributed quotes | Listed by source — **not yet confirmed on site** |
| `data/hcmc-restaurants.json` | Real HCMC establishments (canonical) | `npm run data:restaurants` | — | 5 venues, `lastVerified` = desk-check date |
| `data/dish-restaurant-mapping.json` | Real dish ↔ establishment links | Same importer | — | 5 links, all `unverified` with `published-source` evidence |
| Venue coordinates | Lat/lon | OpenStreetMap Nominatim, 2026-11-27 | ODbL (© OpenStreetMap contributors) | 4 exact (building/POI); Cơm Tấm Ba Ghiền street-level only, flagged approximate |
| `data/source/venue-research/batch-*.json` | Venue research batches (name, address, district, dishes, source URLs) | Published HCMC food guides: mia.vn, VinWonders, Vinpearl, Grab Food blog, toplist.vn, fptshop, mytour, Znews | Facts only | Listed by source; geocoded street-level unless marked exact |
| `data/source/venue-research/geocoded.json` | Geocoding cache | OpenStreetMap Nominatim | ODbL | Ambiguous streets rejected |
| `data/source/dish-photos.json` | 45 dish photos (attached by `npm run data:seed`) | Wikimedia Commons; licence + author from the Commons API, 2026-11-27 | CC BY / CC BY-SA / CC0 / Public domain (per file, shown in UI) | Curated: each shows the named dish; 6 candidates rejected as mismatches. Loaded from Commons at runtime |
| `data/samples/*.sample.json` | 8 fictional venues + 23 links | Fictional, for UI preview | — | **SAMPLE — never real, never recommended** |
| Food illustrations (`src/components/food/illustrations.ts`) | 18 SVG dish-type illustrations | Original work in this repo | Project-owned | Used for map markers and for the 93 dishes without a photo |
| Fonts | Fraunces, Be Vietnam Pro | @fontsource npm packages | SIL Open Font License 1.1 | Self-hosted |
| Nearby basemap (runtime, optional) | Street tiles | OpenFreeMap Positron style (OpenStreetMap data) | ODbL (data) — attribution shown by MapLibre | Only when online; confirmed by PO (DECISIONS D14) |

## Seed catalogue coverage
- 138 dishes: **92 savory, 22 sweet, 24 snack**.
- By region: Miền Bắc 49 · Bắc Trung Bộ 18 · Nam Trung Bộ 24 · Tây Nguyên 8 · Đông Nam Bộ 20 · Tây Nam Bộ 24.
- 59 of 63 provinces have at least one dish. **No dishes yet:** Thái Nguyên, Đắk Nông, Đồng Nai, Hậu Giang.
- Regional-variant families kept as separate dishes: phở (7), bánh cuốn, bánh gai, cơm lam, bún chả cá, bánh xèo/khọt, hủ tiếu.
- Prominence 1 (national-view) dishes: 11.

## Research exchange (parallel research teams)
All new research enters through `research-exchange/` and `npm run intake` (see `research-exchange/README.md`): generated contract (schema, JSON Schemas, vocabularies, id rules), templates, current exports for duplicate checks, the shared queue, per-batch reports and an audit log. Batches are stored next to the legacy batches as `batch-<batchId>.json`.

| Batch | Experience | Status | Records |
| --- | --- | --- | --- |
| GPT-BARS-001 (external BAR-CRAFT-20261128-01, ChatGPT) | bars → Craft beer | imported 2026-11-28 | 32 candidates → 26 establishments (24 new + 2 merged: Pasteur Street original 144/3 Pasteur → `pasteur-street-brewing-pasteur`, East West → `east-west-brewing-ly-tu-trong`); 6 rejected (no street number: Pasteur Street Phú Mỹ Hưng; street-level pin in another district: Pasteur Street Bùi Viện/212 Đề Thám, Pasteur Street Hoàng Sa, BiaCraft Trường Sa, Tiệm Bia Gà Tên Lửa, Deme Brewing). All `source-listed` (official brand directories + saigon-scene.com Sept 2026 guide); brand stored as `attributes.brand`; no individual beers, prices or photos (not established). Raw files: `research-exchange/incoming/BAR-CRAFT-20261128-01/`. |
| CC-FOOD-009 | food | imported 2026-11-28 | Cục Gạch Quán (canh chua cá lóc; hours per Michelin Guide), Bánh canh Trảng Bàng Ba Xi (VnExpress 2011 — operation unconfirmed), Bánh canh Trảng Bàng Ông Cáo (hours per Mytour); withheld: Chè Hiển Khánh (geocode at wrong end of the street) |

## Catalogue import format (for the ChatGPT master catalogue)
JSON (array, or `{ "label", "dataset", "dishes": [...] }`) or CSV with a header row. One row = one dish **or regional variant**.

| Column | Required | Example | Notes |
| --- | --- | --- | --- |
| `nameVi` | ✓ | `Phở bò Nam Định` | Unique per variant; id is slugified from it unless `id` given |
| `nameEn` | ✓ | `Nam Định beef phở` | |
| `altNames` | | `Phở Nam Định; Phở Vân Cù` | `;`-separated |
| `category` | ✓ | `Món mặn` / `Savory` | Món mặn · Món ngọt · Ăn vặt (or English) |
| `dishType` | ✓ | `noodle-soup` | noodle-soup, noodles, rice, banh, bread, rolls, hotpot, grilled, salad, stew, porridge, soup, che, dessert, fried, cured, seafood, confection |
| `family` | | `pho` | Groups regional variants |
| `origins` | ✓ | `Nam Định; ~Hà Nội; region:Tây Nam Bộ` | First plain province = primary; `~` = associated; `region:` = region-wide. Names are accent-insensitive; use the **63 historical** provinces |
| `ingredients` | | `rice noodles; beef` | |
| `taste` | | `umami; rich` | savory, sweet, sour, salty, spicy, bitter, umami, herbal, rich, light, smoky, fermented, fresh, creamy, crunchy, chewy, nutty, fragrant |
| `spiceLevel` | | `0`–`3` | |
| `dietary` | | `contains-beef` | contains-pork/beef/poultry/seafood/fish/egg/dairy/peanut/offal/goat/game, vegetarian, vegan, vegetarian-version-common |
| `mealTimes` | | `breakfast; lunch` | breakfast, lunch, afternoon, dinner, late-night |
| `prominence` | | `1`–`3` | 1 = shown at national zoom (keep ~1–3 per region) |
| `descriptionEn`, `descriptionVi` | | | |
| `sources` | for `verified` | `https://…; Book title p.12` | `;`-separated; URLs detected |
| `verificationStatus` | | `pending-review` | seed-unverified, pending-review, verified, rejected |
| `cookingMethods` | | `simmered; grilled` | Hôm nay ăn gì? (optional, empty = unknown): grilled, fried, simmered, steamed, braised, stir-fried, raw-fresh, baked |
| `proteins` | | `beef` | pork, beef, poultry, seafood, fish, egg, tofu, goat, offal |
| `allergens`, `allergensComplete` | | `peanut; shellfish`, `yes` | peanut, egg, dairy, fish, shellfish, soy, gluten, sesame; `allergensComplete=yes` only with a cited source |
| `portion`, `vegetables` | | `hearty`, `high` | light/regular/hearty; low/medium/high |
| `occasions`, `serviceStyles`, `customisation` | | `office-lunch; family`, `takeaway` | everyday, office-lunch, date, family, group, business, celebration, late-night; dine-in, takeaway, delivery, home-cooking |
| `kcal`, `proteinG`, `nutritionSource`, `nutritionConfidence` | source required with values | `520`, `28`, `Viện Dinh dưỡng table`, `estimate` | per serving; sourced or estimate |
| `eatingSource`, `eatingSourceUrl`, `eatingConfidence` | recommended | `Cookbook p.40`, `https://…`, `sourced` | where the eating attributes come from; without it they show as estimates |

Run: `npm run data:import -- master.csv --dataset master` (add `--dry-run` to validate only). Master imports **merge** into the existing catalogue (ids, photos, sources and venue links preserved; only columns present in the file overwrite) and write `docs/IMPORT_REPORT.md`; the import refuses to write if any venue link would be orphaned. The importer rejects
unknown provinces/categories/types and duplicate ids, warns on unknown vocabulary, missing translations, and
`verified` rows without sources; it exits non-zero on any error. The Admin screen runs the same validator in-browser.

## Establishment data requirements (before any real venue is added)
`name, address, neighbourhood, coordinates (inside HCMC boundary), venueType, sources[], lastVerified` and, per dish
link, `status` + `menuEvidence {type, note, url?}` + `lastVerified` for `verified-available`. Enforced by
`tests/integration/data-integrity.test.ts` and by DB constraints/trigger in `supabase/migrations/0001_init.sql`.

## 28 Nov 2026 · Research handoff reconciliation

| Batch | Evidence and disposition |
| --- | --- |
| KE-FOOD-RESEARCH-001 | Legacy unwrapped JSON bypasses the exchange envelope. The existing catalogue importer accepts all 12 rows in a dry run, with 12 adds, zero existing matches and zero orphan links. Single-member family warnings need review. If later applied, the origins would fill the four uncovered historical province IDs. No production attempt or rejection log for this file was found. |
| BAR-CRAFT-20261128-01 / GPT-BARS-001 | The flat CSV was converted to exchange JSON. The applied report reconciles 32 rows to 24 new branches, 2 merges and 6 coordinate rejects. Original Pasteur Street 144/3 versus a legacy 144 record exposed house-number normalization. The observed 27/5 trial changed to 26/6 when Nominatim returned a different street-level point for Tiệm Bia Gà Tên Lửa. Independent source checks and a shared-pin exception appear below. |
| Nail scouting CSV | 23 rows, 13 brands, all 23 named Nail care, with empty coords, price and photo. 16 official-site, 6 directory, 1 owner-post source labels. Reviewed the Fame Nails branch directory and menu. The exact locations are supported for its three rows. The brand menu lists classic manicure and pedicure from 130,000 VND each, but branch applicability needs support before attaching prices. All 23 held as research candidates. |
| Pilates scouting CSV | 28 rows, 9 brands, 26 official-site and 2 directory source labels. 24 use generic Pilates, 3 say Reformer Pilates, and 1 combines Reformer and Matwork. All lack coords and prices. Official CHI booking confirms the two addresses and advertises a Reformer group trial for 499,000 VND. Confirm which branch offers that trial before recording a branch price. MBS official branch pages corroborate 92 Nguyễn Hữu Cảnh and 205 Lạc Long Quân. All 28 held as research candidates. |
| GPT-CAT-001 | First new slice, Cơm gà xối mỡ and Bún riêu chay. Two accepted by intake dry run with zero conflicts and zero orphaned links. Catalogue only. Chợ Lớn and the HCMC listing support associated geography. The importer defaults missing spice intensity to 0. Hold apply until strict no-spice filtering treats unknown accurately. |
| GPT-FOOD-001 | Candidate only. [Chay Quán Âm, 210 Nguyễn Thái Bình](https://fptshop.com.vn/tin-tuc/dien-may/quan-chay-tan-binh-166331) appears in a dated guide with bún riêu chay. Exact coordinates, current status, and price need confirmation. No venue offering record was submitted. |

### Craft Beer source spot checks

- The [official taproom directory](https://www.pasteurstreet.com/taprooms) supports 212 Đề Thám for Bùi Viện, 221 Hoàng Sa, and CR5-01 Crescent Residence 5 for Phú Mỹ Hưng. The corresponding withheld rows have anchor evidence for a follow-up, with exact pins still needing validation.
- Pasteur Street Thảo Điền at 120 Xuân Thủy and Tiệm Bia Gà Thảo Điền at 26B Xuân Thủy share the same street-level point in the bundled data. Verify each address pin before treating it as exact. Other accepted street-level pins need the same scrutiny, especially Pasteur Original, whose intake match names Phường Xuân Hòa.
- Official directory links to individual dining menus were found. The imported branch-level craft-beer links remain source-listed until the menus themselves are reviewed for individual drinks and prices.

### Intake mapping

- Food catalogue and venue data use SQL tables `dishes`, `dish_origins`, `restaurants` and `dish_restaurant_links`. Data for the other experiences adds `experience_items`, `establishment_experiences` and `offerings` on the shared premises model. Food source tables and offering `menu_evidence` store provenance. Catalogue photos use source/credit/licence metadata, and offering photos carry a photo kind and provenance.
- Intake requires batch ID, lowercase experience, agent, date, method, and the relevant rows. A venue needs name, street address, source URLs and a known item with offering-level evidence. Former district disambiguates addresses. Either supply both validated coordinates or allow the geocoder to resolve them. Prices, hours, media and module-specific attributes are optional with evidence.
- Spa uses the `nails` category with separate `manicure` and `pedicure` catalogue IDs. Sport uses `pilates` with `reformer-pilates`, `mat-pilates` and `pilates-apparatus`. A branch label alone cannot establish those offerings. Map one branch to multiple canonical items only where source evidence names each. The prior CSV item text does not satisfy those references. No production import attempt for the Nail/Pilates sheets was found.
- The generated [contract and templates](../research-exchange/README.md) contain exact enums, pricing units, attribute keys, slug ID rules and evidence levels. Validate boundary and branch pin, then review duplicate signals, sources, applicability of prices and media reuse. The intake dry run verifies structure and merges without publishing.
