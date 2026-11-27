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

## Module layout
```
src/experiences/registry.ts     Experience modules (food active; bars/coffee/spa/shopping coming soon) + nav
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
Adding a future experience: add an entry in `src/experiences/registry.ts`, its routes under `src/app/`,
and reuse shell, i18n, Saved, maps and the data-provider pattern.

## Key invariants (tested)
- `buildAvailabilityIndex(..., { includeSamples: false })` for anything presented as a recommendation.
- All establishments inside the 2025 HCMC boundary (integration test + DB trigger in the migration).
- Every dish origin resolves to one of 63 provinces whose region matches.
- Province label points lie inside their polygons (dish markers never land in the wrong province).

## Security
- No secrets in repo; `.env.example` documents variables; only `NEXT_PUBLIC_*` reach the browser.
- Admin is unauthenticated in local mode (clearly flagged in UI) — production requires Supabase Auth + `user_roles`
  RLS policies (in the migration).
