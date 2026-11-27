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

Run: `npm run data:import -- master.csv --dataset master` (add `--dry-run` to validate only). The importer rejects
unknown provinces/categories/types and duplicate ids, warns on unknown vocabulary, missing translations, and
`verified` rows without sources; it exits non-zero on any error. The Admin screen runs the same validator in-browser.

## Establishment data requirements (before any real venue is added)
`name, address, neighbourhood, coordinates (inside HCMC boundary), venueType, sources[], lastVerified` and, per dish
link, `status` + `menuEvidence {type, note, url?}` + `lastVerified` for `verified-available`. Enforced by
`tests/integration/data-integrity.test.ts` and by DB constraints/trigger in `supabase/migrations/0001_init.sql`.
