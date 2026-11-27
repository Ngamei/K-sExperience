# Shared Experience Engine: audit, reuse matrix and status

_Updated 2026-11-27 · Owner: Claude Code (implementation) · Codex: architecture review, acceptance and QA · Enabling any module needs PO approval._

**Principle:** one discovery engine and six experiences. Every experience uses the same application structure, with different content, attributes and filters.
Vietnamese Food is the reference implementation, and Coffee is the first pilot built on the shared engine.
Each module follows the same pattern: **discover an item → find HCMC establishments offering it → record it in the passport.**
Establishment-first discovery runs through the module's map and Nearby.

## 1. Where things live

| Layer | Shared (engine) | Food (reference + extension) |
| --- | --- | --- |
| Configuration | `src/experiences/registry.ts`: per module, the ID, EN/VI names, icon, status, feature flag, `implemented`, `basePath`, **routes** per slot, **nav labels** + short labels, terminology, categories, **attributes**, **searchable** fields, **catalogue** config, **detail sections**, **map layers**, filter ids, **offerings**, **pricing units**, passport terms. Helpers: `navFor`, `isSelectable`, `getExperience`, `moduleForPath`. | the `food` entry |
| Data model | `src/engine/schema.ts`: `ExperienceItem`, `Establishment` (Food restaurant shape + `experiences[]`), `Offering` (same evidence levels, last-checked rule, price + unit, offering photo), `ExperienceData` | `DishSchema`, `RestaurantSchema`, `DishRestaurantLinkSchema` |
| Logic | `src/engine/offering-index.ts` (best status, samples and candidates excluded), `src/engine/offering-image.ts` (photo priority) | `buildAvailabilityIndex` and `venueCardImage` are thin Food wrappers around these |
| Components | `components/engine/offering-row.tsx` (establishment card: photo, name, address, type, price, evidence, status, last checked, phone, directions); `experience-data.tsx` (`useModuleData`, `ModuleGate`); `module-views.tsx` (`ItemCatalogue`, `ItemCard`, `ItemDetail`, `EstablishmentsView` for map + Nearby + establishment page, `ModuleDiscover` with Surprise me, `ModulePassport`, `ModuleSaved`); `module-page.tsx` | Food dish pages render `OfferingRow`; the shell nav comes from `navFor` for every module; `HcmcMap` serves Food Nearby and every module map |
| Routes | `src/app/[experience]/{,discover,catalogue,item,nearby,passport}/`: **one set of routes** for all non-Food modules, generated only for implemented modules | Food keeps its historical URLs (`/`, `/discover/`, `/catalogue/`, `/dishes/…`, `/nearby/`, `/places/…`, `/passport/`) |
| Data files | `data/experiences/<id>.json` → `/data/experiences/<id>.json`, validated at build and by `npm run data:validate` | `/data/food.json` |
| Database | `establishment_experiences` (0005), `experience_items` + `offerings` with the same evidence, photo and audit rules plus a mode-tag trigger (0006) | `dishes`, `dish_restaurant_links` unchanged |
| Accounts / passport | One account; passport rows keyed by `experience_id`; `Passports` = one `PassportData` per experience; guest → account merge and diff sync per experience (`mergeAllPassports`, `passportsToRows`) | Food slice = the original top-level store fields |
| Shared screens | Saved shows the active mode's items. Settings switches modes and opens the module's map. | — |

## 2. Reuse matrix (audit of the Food implementation, with status)

Legend: ✅ shared now · 🔧 still Food-specific, generalise next · 🍜 Food-only by design

| Area | Before | Now | Next |
| --- | --- | --- | --- |
| Header, desktop nav, mobile tab bar | Food-only `nav` array | ✅ `navFor(module)`: same slots, positions and icons; module labels and routes. The active module comes from the URL (deep links) or the chosen mode on shared pages. | — |
| Settings, language, account | shared | ✅ mode switch navigates to the module | per-module Surprise-me preferences |
| Auth, profiles, migration, sync, deletion | shared | ✅ per-experience passports through the same code | — |
| Passport | Food only | ✅ `Passports` per experience; `ModulePassport` | Sport milestones, instructors (needs pilot) |
| Saved | Food only | ✅ follows the active mode | collections for modules |
| Catalogue page / cards | Food | ✅ engine `ItemCatalogue` / `ItemCard` (registry categories, card attributes, searchable fields) | 🔧 move Food's catalogue onto it once filter definitions are generic |
| Filters | `lib/food/filters.ts`, `FilterPanel` (Food) | category + accent-insensitive search in the engine; Food filters never shown in modules (e2e) | 🔧 generic filter-definition drawer (distance, budget, open now, verified only, module filters) |
| Search | `normalize.ts` | ✅ reused | — |
| Detail page | `DishDetail` | ✅ engine `ItemDetail` with registry `detailSections` + shared offerings block | 🔧 Food sections onto the template (origin locator stays a Food section) |
| Establishment card | `VenueRow` in Food | ✅ `OfferingRow`, used by Food and modules | — |
| Offering photos | Food links | ✅ `offeringImage` for all modules | — |
| Evidence / verification | Food links | ✅ same levels in Zod, Postgres and UI for offerings | — |
| Availability index | Food | ✅ `buildOfferingIndex` (Food wraps it) | — |
| HCMC map | Food Nearby | ✅ `HcmcMap` shared; module map + Nearby + establishment page | module marker styles |
| Surprise me / Discover | Food | ✅ engine `ModuleDiscover` (categories, Surprise me) | ranking with module constraints |
| Vietnam culinary map, origins, provinces | — | 🍜 Food only (registry `map.layers`, unit-tested) | — |
| Admin | Food fields | 🔧 not yet configurable per module | field sets from registry `attributes`; shared evidence + photo editors for offerings |
| Import / validation | Food importer | module files validated by Zod + integration test (schema, HCMC boundary, sources, references, categories) | 🔧 shared CSV/JSON importer with module validation |
| Supabase read path | Food | tables ready (0006) | 🔧 read `experience_items` / `offerings` in Supabase mode |
| Tests | Food | ✅ cross-module unit, integration, DB and e2e (flag-off build + Coffee-flag build) | — |

### Concept mapping (no renames, no data loss)

| Food | Shared | Storage |
| --- | --- | --- |
| Dish | Experience item | `dishes` (Food) · `experience_items` (other modules) |
| Restaurant | Establishment | `restaurants` (shared) + `establishment_experiences` |
| Dish–restaurant link | Offering | `dish_restaurant_links` (Food) · `offerings` |
| Dish photo / link photo | Item media / offering photo | `dish_photos`, link and offering photo columns |
| Tried / visited | Completed / attended / visited | `experience_history` (`experience_id`, generic item types) |
| Tasting note | Experience note | `tasting_notes` (`experience_id`) |

## 3. Sequence

| Step | Status |
| --- | --- |
| A. Audit and reuse matrix | ✅ |
| B. Extract shared components | 🔄 Done: nav, establishment card, offering index, offering image, map, passport, saved, data gate. Next: generic filter drawer, then move Food catalogue and detail onto the engine templates (Food regression suite after each). |
| C. Food regression | ✅ every existing suite green |
| D. Registry and dynamic navigation | ✅ (mode switching verified in the Coffee-flag build) |
| E. Coffee reference pilot | ✅ screens, routes, data file, tables, tests. **Dataset intentionally empty**: needs a sourced item list and verified cafés (G). Flag `NEXT_PUBLIC_FEATURE_COFFEE` stays off until Codex QA and PO approval. |
| F. Bars, Spa, Sport | ⬜ configuration exists; set `implemented: true` + add `data/experiences/<id>.json` once their extensions are reviewed |
| G. Verified HCMC data per pilot | ⬜ PO/Codex research (no invented items, cafés, prices or schedules) |
| H. Independent QA before enabling | ⬜ Codex |

## 4. Guard rails
- `isSelectable` requires `implemented` **and** (active **or** flag "1"). Shopping, Bars, Spa and Sport cannot be enabled by a flag yet. Coffee is off by default, and its URLs then show "not available yet".
- Food filters and the Vietnam origin map never appear in other modules (unit + e2e).
- Only HCMC establishments are recommended: the boundary is validated for every module file, and samples and candidates are excluded by the shared index.
- An offering photo is shown only for its own item (unit + e2e in Food and Coffee).
- Each experience's passport is isolated; Food rows are never touched by other modules (unit + DB + e2e).
- No second application, no wholesale rewrite, no destructive migration, and no merge to `main` or deploy without PO approval.
