# Architecture — K's Experience

## Stack (as implemented)
| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16.4 App Router, React 19.3, TypeScript (strict) | `trailingSlash: true`; `STATIC_EXPORT=1` → fully static `out/` |
| Styling | Tailwind CSS 4.3 + shadcn-style primitives (Radix Slot/Dialog + CVA) | Components hand-authored in `src/components/ui` (shadcn registry not needed) |
| Fonts | Fraunces (display) + Be Vietnam Pro (body), self-hosted via @fontsource | Full Vietnamese subsets; no network font fetch |
| Maps | MapLibre GL JS 6.19 + Supercluster | Worker vendored to `public/vendor/` (v6 derives it from `import.meta.url`, which breaks once bundled) |
| Data fetching | TanStack Query 5 | Catalogue + geometry loaded once, cached |
| State | Zustand 5 | `useUser` (persisted to localStorage, hydrated after mount), `useFilters` (session) |
| Validation | Zod 4 | Single schema used by importer, app and tests |
| i18n | In-house dictionary (EN/VI) | `src/lib/i18n` |
| PWA | `app/manifest.ts` + `public/sw.js` | Network-first pages, cache-first static assets |
| Backend | Supabase Postgres + PostGIS, Auth (magic link), Storage | Migrations `0001`–`0002`, seed, RLS; read path + Admin persistence implemented; not provisioned (docs/SUPABASE.md) |
| Tests | Vitest 5 (unit + integration), Playwright 1.63 (desktop + Pixel 7) | |

## Data flow (local mode)
```
data/source/*  ──scripts/build-geo.ts──▶ data/{provinces,regions}.json, data/vietnam.geojson,
                                        data/hcmc-boundary.geojson, public/geo/*.json (simplified)
data/source/seed-catalogue.json ──scripts/import-catalogue.ts (src/lib/data/importer.ts)──▶ data/vietnamese-dishes.json
data/*.json + data/samples/*.json ──src/lib/data/catalogue.ts──▶ /data/food.json (static route, prerendered)
                                                               └─▶ FoodDataProvider (client, TanStack Query)
```
- The dataset is served **once** as `/data/food.json` rather than embedded in every page payload
  (embedding made the static export 152 MB; now 22 MB, dish pages ~26 KB HTML).
- Dish pages are pre-rendered (`generateStaticParams`, `dynamicParams = false`); the origin locator SVG is
  rendered on the server from `public/geo/vietnam-locator.json`.
- **Supabase mode** (`NEXT_PUBLIC_DATA_MODE=supabase`): `FoodDataProvider` loads `/data/food.json` (samples, archipelago labels) and replaces the catalogue, provinces, real venues and links with Supabase data (`src/lib/supabase/food.ts`, mapping in `src/lib/data/db-rows.ts`). On any error it falls back to the bundled data (`source: "local-fallback"`).
- **Accounts:** `AuthProvider` (in `Providers`) listens to Supabase Auth. Personal data lives in the Zustand `useUser` store with an `ownerId` (null = guest). On sign-in: load account passport → `mergePassports(account, guest)` → upsert → adopt (`ownerId = user.id`). Changes are then synced as diffs (`syncPassportDiff`). Sign-out → `clearPersonal()`. Local mode: no AuthProvider effects; guest only.
- **Evidence levels** live in `src/lib/data/evidence.ts` and are enforced in Zod, importers, Admin and the DB.
- **Catalogue merge** (`src/lib/data/merge.ts`) is shared by the CLI importer and Admin import.
- **Dish-at-place photos** are stored on the dish ↔ establishment link (`DishRestaurantLink.photo`, `LinkPhotoSchema` in
  `src/lib/data/schema.ts`; DB columns `primary_photo_url`, `photo_kind`, `photo_source_url`, `photo_attribution`,
  `photo_license`, `photo_last_checked_at` on `dish_restaurant_links`, migration `0004_link_photos.sql`, all-or-nothing CHECK).
  `photo_kind` ∈ `venue-specific | menu-photo | delivery-listing | generic-dish`. Establishments have no photo field, so a
  venue photo can only ever appear next to the dish it shows.
  The venue cards on a dish page pick their thumbnail with `venueCardImage(dish, link)` (`src/lib/food/venue-photo.ts`):
  link photo of this dish (venue-specific, or the venue's menu / delivery-listing image) → the dish's generic primary photo
  (`dish.photos[0]`, labelled "not from this venue") → `null` = the location icon. A link photo is ignored unless
  `link.dishId === dish.id`. `VenueThumb` (`src/components/food/dish-image.tsx`) renders a 56/64 px square, `rounded-xl`,
  `object-cover`; if the image fails to load the card shows the icon and drops the photo credit.
  Link photos flow through the batch importer (`dishes[].photo` in a curated source), Admin → Evidence editor (optional
  photo fieldset; saving without photo fields keeps the existing photo), `supabase/seed.sql` and the Supabase read path.

## Module layout
```
src/experiences/registry.ts     Typed registry of 6 modules (food active; bars/coffee/spa/shopping coming soon; sport pilot planned):
                                names, nav labels per shared slot, terminology, filters, pricing units, passport terms, feature flags
src/experiences/sport/schema.ts Draft Sport (Pickleball/Pilates) structures — not wired to data
src/components/shell/           AppShell (header, data banners, desktop nav, mobile tab bar), Providers
src/components/food/            FoodDataProvider, DishCard, badges, FilterPanel/chips, illustrations
src/components/explore/         VietnamMap (MapLibre), SvgVietnamMap (no-WebGL fallback), ExploreView
src/components/dish/            DishDetail, OriginLocator (server SVG)
src/components/nearby/          HcmcMap, NearbyView, PlaceView
src/components/pages/           Discover, Catalogue, Saved, Passport, Settings, Admin views
src/lib/data/                   schema.ts (Zod), importer.ts, catalogue.ts (local loader)
src/lib/food/                   filters, availability, hours, recommend, passport, map-points, hcmc
src/lib/search/normalize.ts     Vietnamese accent-insensitive normalisation
src/lib/geo/                    haversine, point-in-polygon, SVG projection, locator
```
**Shared Experience Engine** (`src/engine/`, `src/components/engine/`, `src/app/[experience]/`, `data/experiences/`): see
`docs/EXPERIENCE_ENGINE.md` for the layer table. The active module is taken from the URL (`moduleForPath`), else from the
chosen mode; navigation is `navFor(module)`. Non-Food modules load `/data/experiences/<id>.json` through `ModuleGate`
(shows "not available yet" unless `isSelectable`).

Adding an experience: configure it in `src/experiences/registry.ts` and reuse the shared engine (shell, catalogue,
detail, establishment cards, offering photos, evidence, map, passport, Admin) — see `docs/EXPERIENCE_ENGINE.md` for the
reuse matrix and what still needs extracting. Selectable only when `implemented` and active or flagged on.
Establishments can belong to several modes (`establishment_experiences`, migration 0005).

## Key invariants (tested)
- `buildAvailabilityIndex(..., { includeSamples: false })` for anything presented as a recommendation.
- All establishments inside the 2025 HCMC boundary (integration test + DB trigger in the migration).
- Every dish origin resolves to one of 63 provinces whose region matches.
- Province label points lie inside their polygons (dish markers never land in the wrong province).

## Security
- No secrets in repo; `.env.example` documents variables; only `NEXT_PUBLIC_*` reach the browser.
- Admin is unauthenticated in local mode (clearly flagged in UI) — production requires Supabase Auth + `user_roles`
  RLS policies (in the migration).

## Shared engine — current shape (CC-22 / CC-25)
- **Shared UI:** `components/engine/filter-drawer.tsx` (FilterDrawer, ActiveFilterBar, CatalogueLayout), `detail.tsx` (DetailBlock, OfferingsSection), `offering-row.tsx`, `module-views.tsx`, `module-page.tsx`. Food's `CatalogueView` and `DishDetail` render through them.
- **Data:** `engine/schema.ts` (items, establishments with `attributes`, offerings), `engine/validate.ts` (registry rules; item vs establishment attributes), `engine/filters.ts`, `engine/import.ts` (CSV/JSON → dry run → non-destructive merge → report), `engine/db-rows.ts`.
- **Supabase:** `lib/supabase/modules.ts` (read with fallback; validated writes that throw on any error). Migrations 0006 (items/offerings) and 0007 (establishment attributes, explicit tags). `fetchSupabaseFood` reads only Food-tagged establishments.
- **Accounts:** `components/auth/auth-forms.tsx` `AuthPanel` (one sign-in/sign-up/recovery panel), `auth-gate.tsx` (`AuthDialog`, `PassportGate` for every passport), `account-card.tsx` (Settings, first section).
- **Pipelines:** `npm run data:research -- <module>` (catalogue + researched venue batches + geocoding → module file), `npm run data:import-module -- <module> <file> [--write]`, `npm run data:experiences` (completeness report).
- **Builds:** `NEXT_PUBLIC_FEATURE_{BARS,COFFEE,SPA,SPORT}` enable implemented pilots; `NEXT_PUBLIC_DEV_DATA=1` enables samples/dev notices (tests and designated previews only); `NEXT_PUBLIC_BUILD_ID` versions the service-worker cache.

## Media & visual identity (P1 visual parity)
- `components/food/dish-image.tsx` is the shared media module: `PhotoThumb` (catalogue circle), `HeroPhoto` (detail hero with credit/licence/source; optional fallback), `VenueThumb` (establishment cards; fallback = illustration, then icon). Food and all modules use it.
- `components/engine/item-illustrations.ts` + `item-art.tsx`: one SVG per `<module>:<category>` (Bars, Coffee, Spa, Sport incl. distinct Pickleball/Pilates), reused for cards, category chips, filter drawer, discover, passport stamps, empty states, establishment medallions and HCMC map markers (`HcmcMap` `marker` prop per venue).
- Registry `accent` colours the module's rings, badges and markers.

## Hôm nay ăn gì? (CC-30)
- `lib/food/eating.ts` — `eatingProfile(dish)`: proteins, cooking methods, allergens (+complete), portion, vegetables, occasions, service styles, nutrition, each as `{ value, provenance }` (sourced / estimate / derived / unknown).
- `lib/food/what-to-eat.ts` — `WhatToEatFilters` (budget min/max per person, soft `goals`, `occasion`), `dishBlocker` (hard constraints), `needsVenue`, `explainEmpty` (zero-result diagnostics), `evaluate` (hard constraints → score + reasons + cautions + venues), `recommend` (diverse top 6 + alternatives), `surprise` (weighted, injectable RNG). Pure; tested in `tests/unit/what-to-eat.test.ts`.
- `lib/food/what-to-eat-presets.ts` — 12 collections + 6 modes as filter presets. `lib/food/what-to-eat-report.ts` — completeness (Admin tab + `scripts/what-to-eat-report.ts`).
- UI: `components/food/what-to-eat-view.tsx` (zustand page state; shared `FilterDrawer`, `Sheet`, `DishThumb`, `DishArt`, `Button`, `Chip`; `useUser` for saved/tried/notes/preferences). Nav: registry `extraNav` inserts module-specific entries after a shared slot (`navFor`); mobile tab bar sizes its grid to the entries.
- Data: migration 0008 adds nullable `dishes.eating` and `restaurants.dining` (jsonb; nutrition must name a source); mapped in `db-rows.ts`, `READ_COLUMNS`, seed generator, importer (`cookingMethods`, `proteins`, `allergens`, …) and merge (`eating` overwrites only when provided).
