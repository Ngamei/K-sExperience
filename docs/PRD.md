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

## Pilot modules (open to everyone as pilots — PO decision 2026-11-27, D47)
Bars, Coffee, Spa and Sport are selectable in Settings with a "Pilot" badge; Shopping stays Coming soon. Items show "Not yet verified"; venues show their evidence level and last-checked date.

| Module | Catalogue categories | Establishment characteristics (separate from items) | Data today |
| --- | --- | --- | --- |
| Coffee | Traditional Vietnamese coffee, Espresso-based, Speciality, Cold brew, Matcha, Tea, Non-coffee | Café type (book, working, garden, concept, scenic, speciality, traditional), Wi-Fi, power sockets, seating, noise, smoking policy, opening hours | 13 sourced drinks; 4 HCMC cafés; 5 drink offerings (source-listed, each with evidence) |
| Bars | Classic cocktails, Signature cocktails, Wine, Beer, Mocktails | Bar type, atmosphere, smoking | 7 sourced items; no venues yet |
| Spa | Massage, Head spa, Facial, Nails, Hair, Body care, Wellness | Venue type, private / couples' rooms, shower | 8 sourced treatments; no venues yet |
| Sport | Pickleball (court rental, coaching, social play, equipment rental), Pilates (Reformer, Mat, Cadillac/Chair/Barrel; trial, private, group) | Venue kind, indoor/outdoor, court surface, facilities, instructor languages | 7 sourced activities; no venues yet |

Every module uses the same screens (catalogue with module filters, item page with "Where to … in HCMC", HCMC map/Nearby, establishment page with characteristics and hours, passport). Offering photos follow one rule everywhere: the establishment's own photo of this offering → its menu/service/listing image → a reference photo labelled "not from this venue" → icon.

## Consumer UI and data provenance
- No development/seed banners in the consumer interface. Dataset provenance and seed counts are in Admin → Overview (data quality) and `docs/EXPERIENCE_DATA_REPORT.md`.
- Items show a concise "Not yet verified" label and a Sources & verification block; establishment cards keep evidence level and last-checked date.
- Fictional sample venues exist only in development/test builds (`NEXT_PUBLIC_DEV_DATA=1`) and are stripped from production data.

## Accounts UX (P0, revised)
- Settings: **Account first** (guest: Sign in / Sign up + benefits; signed in: avatar, name, email, Manage account, Log out). No sign-in buttons in the header.
- Every Passport (Food, Bar, Coffee, Wellness, Sport; Shopping later) is behind one sign-in gate: modal on desktop, bottom sheet on mobile; Google first, email sign-in/sign-up and password recovery in the same panel; cancel returns to the previous page; signing in opens the requested Passport with guest progress migrated. Direct passport URLs are protected; an expired session shows the prompt again. Browsing (map, discover, catalogue, Nearby, establishment pages) never requires an account.
- Local demo builds without an account service keep the on-device guest passport (accounts cannot exist there) — see D44.

## Sport (pilot)
Sixth experience mode, directly below Shopping. Pilots: **Pickleball** (courts, clubs, coaches, beginner/group sessions, social games, equipment rental) and **Pilates** (studios, instructors, trial/private/group classes, Reformer, Mat, Cadillac/Chair/Barrel). HCMC only.
Planned filters: sport type, HCMC area, distance, budget, level, opening hours, trial, private/group, facilities (shower, changing room, parking), instructor language and certification, verified information; Pickleball adds equipment rental, indoor/outdoor, court surface, court availability (partner finding later); Pilates adds Reformer, Mat, Cadillac/Chair/Barrel, class size.
This sprint: Settings entry, registry, translations, passport compatibility, schema review, feature flags, docs and regression tests only. No venues, schedules, availability or prices are added until verified data exists.

## Dish-at-place photos
Venue cards on dish pages show a rounded thumbnail: venue photo of this dish → this venue's menu / delivery-listing image of this dish → the dish's generic photo (captioned "not from this venue") → location icon. Photos are stored on the dish–venue link with source, attribution, licence and last-checked date; never a venue photo of another dish.

## Hôm nay ăn gì? (What to eat today) — Vietnamese Food
Route `/what-to-eat/`, in Food navigation right after Discover ("What to eat" / mobile "Eat today"). Uses the Food catalogue, HCMC establishments and dish–venue links; no separate mode or database.
- **Quick controls:** meal (defaults from HCMC time), everyday / special occasion, people, budget per person or total group budget, diet chips; **More filters** (shared FilterDrawer): known allergens, excluded ingredients, taste, protein, cooking method, meal size, more vegetables, max spice, distance from an HCMC area, open now, dine-in / takeaway / delivery / cook at home, atmosphere, skip recently eaten (3/7/14 days), not tried yet, saved only. Nothing is required.
- **Results:** up to 6 diverse dishes, each with "Why this dish" reasons, "Good to know" cautions (unconfirmed prices/hours, incomplete allergen data, unverified description, ask for vegetarian version), nearest real venue with distance. Actions: Save, Ate this (Passport), Not today, Find places (dish page HCMC block), details; Surprise me; Show alternatives; Reset.
- **12 collections:** Cơm trưa văn phòng · Ăn ngon tiết kiệm · Ăn ngon, ăn cân bằng · Bữa ăn giàu protein · Cơm nhà · Hôm nay ăn chay · Hẹn hò tối nay · Đi ăn cùng bạn bè · Tự thưởng cho mình · Hôm nay ăn món lạ · Ăn khuya Sài Gòn · Món ăn nhẹ nhàng. **More ways to choose:** everyday, quick, family, business, premium, regional exploration. Each is a filter preset, so lists never go stale.
- **Special occasions** boost places with recorded atmosphere/occasion and sharing dishes for groups; where dining data is missing the card says so.
- **Personalisation:** Settings diet + max spice always applied; saved, tried dates and ratings shape ranking; guests can use everything.
- **Safety & honesty:** no calorie targets, no food-shaming; allergy filtering is best-effort and every page says to confirm with the venue; prices, hours, nutrition shown only when recorded.
- **Admin:** dish "Hôm nay ăn gì? attributes" and establishment "Dining attributes" (optional, need a source); Recommendations tab with completeness; importer columns (DATA_SOURCES.md); `npm run data:what-to-eat` → `docs/WHAT_TO_EAT_REPORT.md`.
