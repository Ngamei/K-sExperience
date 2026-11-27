# PRD — K's Experience (Vietnamese Food MVP)

_Last updated: 2026-11-27 · Owner: Product Owner · Maintained by Claude Code_

## Proposition
**Explore Vietnam. Experience it in Sài Gòn.** A premium, curated, **dish-first** guide: discover Vietnamese dishes
by their culinary origin across the whole country, then find where to eat them in Ho Chi Minh City.

## Confirmed decisions
| Requirement | Decision |
| --- | --- |
| Application | K's Experience — lifestyle discovery platform |
| Initial experience | Vietnamese Food |
| Launch market | Ho Chi Minh City |
| Culinary coverage | All Vietnam, north to south (63 historical provinces as culinary identities) |
| Restaurant coverage | HCMC only |
| Categories | Savory (Món mặn), Sweet (Món ngọt), Snack (Ăn vặt) |
| Signature feature | Illustrated, interactive, portrait map of Vietnam |
| Future experiences | Settings → Experience Mode order: **Vietnamese Food** (active) · Bars · Coffee · Spa · Shopping (coming soon) · **Sport** (pilot planned — Pickleball, Pilates) |
| Multi-experience direction | **[PO, 2026-11-27]** One discovery engine, six experiences: Food is the blueprint; other modules reuse the shell, navigation slots, catalogue → detail → "where in HCMC" → passport pattern, accounts, evidence, media and Admin, with module-specific attributes and filters. Coffee is the first reference pilot. See `docs/EXPERIENCE_ENGINE.md`. |

## Screens (status in `IMPLEMENTATION_PLAN.md`)
1. **Explore Vietnam / Food Map (home page `/`)** — portrait MapLibre map of accurate boundaries; 6 regions, 63 provinces, Hoàng Sa & Trường Sa;
   region/province selection, zoom, pan, dish markers with clustering, progressive disclosure, dynamic filtering.
2. **Discover (`/discover`)** — hero, Surprise me, six regions, categories, representative dishes, passport teaser.
3. **Food Catalogue** — accent-insensitive search, all filters, active chips, result count.
4. **Dish Details** — origin(s) with 2025 administrative mapping, ingredients, taste, spice, dietary, meal time,
   regional variants, sources & verification, HCMC availability.
5. **Nearby** — HCMC establishment map + list with distance, budget, hours, venue type filters.
6. **Establishment Details** — venue info, dishes with status + evidence, hours, directions, delivery.
7. **Saved** — saved dishes + personal collections.
8. **Food Passport** — tried dishes, provinces tasted, per-region completion, stamps.
9. **Settings** — Experience Mode, language (EN/VI), sample-venue toggle, Surprise-me preferences, reset.
10. **Admin** — catalogue stats, import validator, verification queue (local-mode; access control is a release blocker).

## Accounts & Experience Passport (P0, guest-first)
| Feature | Guest | Registered |
| --- | --- | --- |
| Explore map, catalogue, search/filters, Nearby, Surprise me | ✅ | ✅ |
| Save dishes / venues, mark tried, visited venues, ratings & tasting notes | on this device | synced to the account |
| Personal Food Passport | temporary (device) | permanent, all devices |
| Personal food photos | — | private bucket (schema ready; UI later) |
- Pages: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/profile`; Settings → Account. Google + email/password (with email verification); Apple later.
- On sign-in/sign-up, guest progress is merged into the account (no duplicates: unions, earliest dates, newest note wins), **written to the database first**, then adopted; on failure guest data stays and a Retry banner appears. Sign-out clears personal data from the device.
- One account, one **Experience Passport**; Food is active; Bar, Coffee, Wellness, Shopping and Sport passports shown as not yet available. Tables are experience-agnostic (`experience_id`; generic item types/actions since migration 0005). Sport passport (planned): sports tried, studios and courts visited, sessions attended, favourite studios/courts/instructors, training notes, activity photos, milestones.
- Admin permissions are separate (`user_roles`); ordinary accounts are read-only in Admin.

## Map behaviour
- National view: only **representative** dishes (prominence 1). Zooming/selecting a region reveals prominence ≤ 2;
  provincial zoom or province selection reveals all. Thresholds are relative to each device's "fit Vietnam" zoom.
- If filters reduce the set to ≤ 24 dishes, all of them show regardless of zoom.
- Dishes sit at the interior label point of their primary origin province (sunflower fan-out for shared origins);
  region-wide dishes sit at the region anchor.
- Hoàng Sa (Đà Nẵng) and Trường Sa (Khánh Hòa) are always drawn and labelled; the sea is labelled Biển Đông.
- The Vietnam map shows dish **origins**; the separate Nearby map shows HCMC **establishments**.

## Availability statuses
`verified-available` · `unverified` · `temporarily-unavailable` · `none-found` ("No verified HCMC establishment found").
Dishes remain discoverable when none is found.

## Filters
Region, province, category, dish type, ingredient, taste, max spice, dietary, meal time, budget, HCMC neighbourhood,
distance, open now, venue type, HCMC availability, tried/untried, saved — combinable, shown as removable chips with
a live result count. Venue-dependent filters match dishes through establishments in the index.

## Data integrity principles
No fabricated restaurants, prices, reviews or menu availability. Seed and sample data are labelled everywhere.
Sample venues are opt-in and excluded from recommendations.

## Shared experience engine (as implemented)
- Navigation keeps the same positions in every mode; labels follow the mode (Food Map / Café Map / Bar Map …; Food Catalogue / Coffee Catalogue / Drinks Catalogue / Treatment Catalogue / Activity Catalogue; Food / Coffee / Bar / Wellness / Sport Passport). Saved and Settings are shared.
- Non-Food modules: item catalogue (categories, module attributes, accent-insensitive search) → item detail (module sections + "Where to … in Ho Chi Minh City" with the shared establishment cards) → HCMC establishment map / Nearby / establishment page → module passport. Food keeps the Vietnam culinary map.
- **Coffee** is the first pilot: built, but switched off and without data until sourced items and verified cafés exist.

## Sport (pilot planned — not implemented)
Sixth experience mode, directly below Shopping. Pilots: **Pickleball** (courts, clubs, coaches, beginner/group sessions, social games, equipment rental) and **Pilates** (studios, instructors, trial/private/group classes, Reformer, Mat, Cadillac/Chair/Barrel). HCMC only.
Planned filters: sport type, HCMC area, distance, budget, level, opening hours, trial, private/group, facilities (shower, changing room, parking), instructor language and certification, verified information; Pickleball adds equipment rental, indoor/outdoor, court surface, court availability (partner finding later); Pilates adds Reformer, Mat, Cadillac/Chair/Barrel, class size.
This sprint: Settings entry, registry, translations, passport compatibility, schema review, feature flags, docs and regression tests only. No venues, schedules, availability or prices are added until verified data exists.

## Dish-at-place photos
Venue cards on dish pages show a rounded thumbnail: venue photo of this dish → this venue's menu / delivery-listing image of this dish → the dish's generic photo (captioned "not from this venue") → location icon. Photos are stored on the dish–venue link with source, attribution, licence and last-checked date; never a venue photo of another dish.
