# Shared Experience Engine — audit, reuse matrix and plan

_Status 2026-11-27 · Owner: Claude Code (implementation) · Review: Codex (architecture, acceptance, QA) · PO approval needed before any module is enabled._

**Principle:** one discovery engine and six experiences. Every experience uses the same application structure, with different content, attributes and filters.
Vietnamese Food is the reference implementation. Bars, Coffee, Spa, Shopping and Sport will be configured on top of it, not cloned from it.
The pattern for each one is: **discover an item → find HCMC establishments offering it → record it in the passport.**

## 1. What exists now (step D, foundations)

| Done | Where |
| --- | --- |
| Typed registry for 6 modules in Settings order: Food, Bars, Coffee, Spa, Shopping, Sport. Each has EN/VI names, icon, status (`active` / `coming-soon` / `pilot-planned`), feature flag, base path and nav labels per shared slot. It also holds terminology (item, establishment, "where to find it", completed verb, note), map layers, planned categories, filter ids, pricing units and passport terms. | `src/experiences/registry.ts` |
| Sport is `pilot-planned` with Pickleball and Pilates as pilots. Shopping stays `coming-soon`. | registry |
| Feature flags `NEXT_PUBLIC_FEATURE_{BARS,COFFEE,SPA,SPORT}`. `isSelectable` = implemented **and** (active **or** flag on). An unfinished module can never look functional; `getExperience` falls back to Food. | registry, unit tests |
| Settings shows all 6 modes with both language names, the Coming soon / Pilot planned badge and Sport's pilots. The Passport shows all 6 passport modules from the registry. | `settings-view.tsx`, `passport-account.tsx` |
| DB: `pilot-planned` status and a `sport` module row. `establishment_experiences` lets one establishment belong to several modes; it is back-filled with `food` and auto-tagged on insert. Passport tables accept `item_type` `item`/`instructor` and actions `attended`/`completed`. All additive: no renames, drops or data changes. | `supabase/migrations/0005_multi_experience.sql`, `tests/db/rls.sql` |
| The Food passport reads and writes only `experience_id = 'food'` rows. Other experiences' rows on the same account are preserved. | `src/lib/passport/model.ts`, unit + DB tests |
| Sport draft structures: venue extension (courts, surface, indoor/outdoor, rental, Pilates equipment, class size, facilities, languages, booking), offering (formats, levels, equipment, class size, price unit, published schedule) and instructor (certifications). Not wired to any data. | `src/experiences/sport/schema.ts` |
| Dish-at-place photos on the link. Image priority: venue → menu/delivery → generic → icon. This is the template for offering photos in every module. | `src/lib/food/venue-photo.ts` |

## 2. Reuse matrix (audit of the Food implementation)

Legend: ✅ reusable as-is · 🔧 safe generalisation needed (parameterise, keep Food behaviour) · 🍜 Food-only

| Area | Existing (Food) | Verdict | Proposed shared component | Module-specific extension |
| --- | --- | --- | --- | --- |
| Header, desktop nav, mobile tab bar | `components/shell/app-shell.tsx` reads `exp.nav` | 🔧 | Build nav from `NAV_SLOTS` + `navLabels` + `basePath` for every module | labels only |
| Settings, language, account card | `pages/settings-view.tsx`, `auth/account-card.tsx` | ✅ | — | Surprise-me preferences are Food-only (diet, spice) → per-module preference sets |
| Auth, profiles, guest → account migration, sync, deletion | `shell/auth-provider.tsx`, `lib/supabase/passport.ts`, migration 0003 | ✅ | — | none (one account for all modules) |
| Passport data model | `lib/passport/model.ts` (Food rows only) | 🔧 | `PassportData` keyed by `experience_id`; store holds one slice per module | completion stats: Food = regions/provinces; Sport = sessions, equipment, instructors |
| Passport screen | `pages/passport-view.tsx` (regions, stamps) | 🔧 | stats + stamps template | Food regional completion; Sport activity history |
| Saved | `pages/saved-view.tsx`, collections | 🔧 | item-type-agnostic saved list | — |
| Catalogue page | `pages/catalogue-view.tsx` + `food/use-filtered.ts` | 🔧 | `CatalogueView<Item>` with config (categories, sort, card fields) | — |
| Catalogue card | `food/dish-card.tsx`, `food/dish-art.tsx` | 🔧 | `ItemCard` with configurable attribute line and illustration set | Food origin line; Bars ABV; Spa duration; Sport level |
| Filters | `lib/food/filters.ts`, `food/filter-panel.tsx` | 🔧 | filter definitions → generic drawer (registry `filters`) | `food:*`, `bars:*`, `coffee:*`, `spa:*`, `sport:*`, `pickleball:*`, `pilates:*` |
| Search | `lib/search/normalize.ts` (accent-insensitive) | ✅ | — | searchable fields per module |
| Detail page | `dish/dish-detail.tsx` | 🔧 | `ItemDetail` with configurable sections + the shared "Where to … in HCMC" block | Food: origin locator, ingredients, taste, dietary; Spa: duration, benefits; Sport: equipment, difficulty, class size |
| Establishment card on detail page | `VenueRow` in `dish-detail.tsx`, `VenueThumb` | ✅ / 🔧 | `OfferingRow` (rename-free extraction; terminology from registry) | price unit |
| Offering photos | `LinkPhoto`, `venueCardImage` | ✅ | same priority for every module | — |
| Evidence / verification | `lib/data/evidence.ts`, link CHECK constraints | ✅ | already item-agnostic ("establishment offers item") | evidence notes per module |
| Availability index | `lib/food/availability.ts` (`linksByDish`) | 🔧 | `buildOfferingIndex(establishments, offerings)` | — |
| HCMC establishment map | `nearby/hcmc-map.tsx` | ✅ | data layer + marker style per module | — |
| Nearby | `nearby/nearby-view.tsx` | 🔧 | establishment list filtered by `establishment_experiences` | — |
| Establishment page | `nearby/place-view.tsx` | 🔧 | shared page listing offerings of the active module | Sport facilities, booking |
| Opening hours, distance, HCMC boundary | `lib/food/hours.ts`, `lib/geo/*`, `lib/food/hcmc.ts` | ✅ | move to `lib/places/` when first reused | — |
| Surprise me / Discover | `lib/food/recommend.ts`, `pages/discover-view.tsx` | 🔧 | ranking engine with per-module hard constraints | Food diet/spice; Sport level/budget |
| Vietnam culinary map | `explore/vietnam-map.tsx`, `svg-vietnam-map.tsx`, geo data | 🍜 | — | Food only (registry `map.layers`) |
| Culinary origins, regions, provinces, ingredients | `data/provinces.json`, `DishSchema` | 🍜 | — | Food extension |
| Admin | `pages/admin-view.tsx`, `admin/admin-forms.tsx` | 🔧 | tabs/forms driven by a field schema per module; shared evidence + photo editors | module field sets |
| Import / validation | `lib/data/importer.ts`, `merge.ts`, scripts | 🔧 | shared CSV/JSON pipeline, Zod schema per module | — |
| Data loading | `/data/food.json`, `food/food-data.tsx`, `lib/supabase/food.ts` | 🔧 | `/data/<module>.json` + provider per module | — |
| Database | `dishes`, `restaurants`, `dish_restaurant_links` | 🔧 | keep tables; `restaurants` = shared establishments (+ `establishment_experiences`); new modules get `experience_items` + `offerings`; `dishes` stays as the Food extension | per-module extension tables |
| Tests | unit, integration, DB, e2e, auth e2e | ✅ | cross-module tests added (`tests/unit/experiences.test.ts`, `e2e/experiences.spec.ts`) | — |

### Concept mapping (no renames, no data loss)

| Food concept | Shared concept | Storage plan |
| --- | --- | --- |
| Dish | Experience item | `dishes` stays; new modules use `experience_items (id, experience_id, category, …)` |
| Restaurant | Establishment | `restaurants` stays the shared table; `establishment_experiences` assigns the modes |
| Dish–restaurant link | Offering | `dish_restaurant_links` stays for Food; `offerings (item_id, establishment_id, evidence, price + unit, photo…)` for the others |
| Dish photo | Item media | `dish_photos` / future `item_media` |
| Link evidence, last checked | Offering verification | same levels and constraints |
| Tried / visited | Completed / attended / visited | `experience_history.action` (0005) |
| Tasting note | Experience note | `tasting_notes` with `experience_id` |

## 3. Sequence (from the PO direction)

| Step | Scope | Status |
| --- | --- | --- |
| A | Audit and reuse matrix (this document) | ✅ |
| B | Extract shared components incrementally, Food first, with no behaviour change. Order: nav from slots → `ItemCard` / `CatalogueView` → filter definitions → `ItemDetail` sections → `OfferingRow` → offering index → passport slices | ⬜ next; every step behind the full Food regression suite |
| C | Validate Food with no regressions (`npm run qa`) | ✅ for foundations |
| D | Registry, feature flags, Settings, passport modules | ✅ (dynamic nav switching becomes visible once a second module is implemented) |
| E | **Coffee** as the first reference pilot: config, `experience_items` + `offerings` tables, catalogue, detail, map layer | ⬜ needs PO go-ahead + a sourced coffee item list (no invented items) |
| F | Bars, Spa and Sport (Pickleball, Pilates) through configuration and extensions | ⬜ |
| G | Verified HCMC data per pilot (evidence levels, licensed photos) | ⬜ PO/Codex data work |
| H | Independent Codex QA before each module's flag is turned on | ⬜ |

## 4. Guard rails
- No sports venues, schedules, court availability, prices, drinks, cafés or treatments are invented. The registry's planned categories are structure only.
- Food-specific filters and the Vietnam origin map never appear in other modules (unit test).
- Only HCMC establishments; samples never recommended. This applies to every module.
- No second application, no wholesale rewrite of Food, no destructive migration.
- No merge to `main` or deploy without PO approval.
