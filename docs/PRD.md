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
| Future experiences | Bars, Coffee, Spa, Shopping — "coming soon" in Settings → Experience Mode |

## Screens (status in `IMPLEMENTATION_PLAN.md`)
1. **Discover** — hero, Surprise me, six regions, categories, representative dishes, passport teaser.
2. **Explore Vietnam** — portrait MapLibre map of accurate boundaries; 6 regions, 63 provinces, Hoàng Sa & Trường Sa;
   region/province selection, zoom, pan, dish markers with clustering, progressive disclosure, dynamic filtering.
3. **Food Catalogue** — accent-insensitive search, all filters, active chips, result count.
4. **Dish Details** — origin(s) with 2025 administrative mapping, ingredients, taste, spice, dietary, meal time,
   regional variants, sources & verification, HCMC availability.
5. **Nearby** — HCMC establishment map + list with distance, budget, hours, venue type filters.
6. **Establishment Details** — venue info, dishes with status + evidence, hours, directions, delivery.
7. **Saved** — saved dishes + personal collections.
8. **Food Passport** — tried dishes, provinces tasted, per-region completion, stamps.
9. **Settings** — Experience Mode, language (EN/VI), sample-venue toggle, Surprise-me preferences, reset.
10. **Admin** — catalogue stats, import validator, verification queue (local-mode; access control is a release blocker).

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
