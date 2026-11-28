# Neighbourhood-first growth — audit, data model proposal and page requirements

_Status: search areas **approved by the PO (2026-11-28)**; Thảo Điền research started. Pages/analytics still need §6 decisions._ _(Original: proposal for Business/Product validation, PO request 2026-11-28.) Nothing user-facing is implemented; no existing record is removed. Coverage numbers: `docs/NEIGHBOURHOOD_COVERAGE.md` (`npm run data:neighbourhoods`)._

## 1. Current geographic model (reviewed before any change)

| Layer | What exists today | Limits for neighbourhood-first |
| --- | --- | --- |
| Establishment location | `coordinates` + `coordinatePrecision` (`exact` = mapped POI/house number, `street` = street-segment point) + `neighbourhood` (current ward string from the geocoder) | Street-level pins can sit elsewhere on the street (KEX-QA-02); 15 groups share identical points. |
| "Neighbourhoods" | `HCMC_NEIGHBOURHOODS` in `src/lib/food/hcmc.ts`: 11 former-district **centre points** for "distance from" sorting | Not areas; no membership; former districts were abolished 1 July 2025. |
| Boundary | `data/hcmc-boundary.geojson` (city, 2025) | City level only. |
| Admin geography | Provinces/regions for dish **origins** (culinary atlas) | Unrelated to HCMC venue areas. |

## 2. Proposed neighbourhood model (data-only today: `data/neighbourhoods/neighbourhoods.json`)

```
Neighbourhood {
  id                 canonical slug (thao-dien, sala-thu-thiem, q1-cbd, phu-my-hung, vinhomes-central-park, phan-xich-long, …)
  tier               1 | 2
  name {vi, en}
  currentWards[]     2025 wards — DERIVED from geocoded establishments in the area (audit lists them), confirmed by PO
  historicalDistricts[]  aliases for search ("Quận 2", "Thủ Đức", "Quận 7", …)
  searchArea         GeoJSON polygon — PROVISIONAL rectangles today; must be reviewed (Business/Product + Codex)
  tags[], landmarks[]   from the PO brief
  targets{experience: n}  Phase 1 targets (to recalculate after supply audit)
}
membership(establishment) = pointInPolygon(coordinates, searchArea)   — never from a district name
  · exact pins: member
  · street-level pins: "approximate member" (shown, but flagged; exact pin needed before featuring)
counts = computed live (same method as Settings → About / Admin coverage)
```

Supabase (later, after approval): `neighbourhoods` table (id, names, tier, wards, aliases, `geography(Polygon)`, tags) + a view/RPC computing membership with `ST_Contains`; no establishment column is needed, so establishment IDs, maps and existing coordinates stay untouched.

## 3. Audit headline (2026-11-28, provisional polygons)

- Tier 1 total: **47 unique venues vs 1,135 Phase 1 target total** (Food 19, Coffee 5, Bars 20, Spa 0, Sport 5 across the six areas). The PO's per-area figures sum to 1,135, not the 1,115 quoted in the brief.
- Q1 CBD is the only area with meaningful data (34 venues, 12 dishes with a place). Vinhomes Central Park has **0**, Phan Xích Long **1**, Sala **2** (craft beer only), Thảo Điền **6** (craft beer 4, pickleball 2), Phú Mỹ Hưng **6**.
- Spa (nails, gội đầu, massage) is **0 in every Tier 1 area**; Coffee exists only in Q1 (5).
- 97 of 166 experience × venue records are outside all 12 areas — kept.
- Data quality inside areas: almost no hours or prices; most pins are street-level (see the detail table).

Largest Tier 1 gaps (in order): Q1 Food (137), Phan Xích Long Food (99), Phú Mỹ Hưng Food (95), Thảo Điền Food (100), Vinhomes CP all experiences (125), Spa everywhere (155), Coffee outside Q1 (170).

## 4. Research plan (non-overlapping; existing importer + intake)

| Batch | Agent | Neighbourhood × scope | Notes |
| --- | --- | --- | --- |
| CC-TDCOFFEE-001 · CC-TDSPA-001 · CC-TDSPORT-001 · CC-TDBARS-001 | Claude Code | Thảo Điền — coffee (incl. laptop-friendly), nails / gội đầu / massage, Pilates + pickleball, bars | Food in Thủ Đức stays with GPT-FOOD-001 (ChatGPT) |
| CC-SALACOFFEE-001 · CC-SALASPA-001 · CC-SALASPORT-001 · CC-SALABARS-001 | Claude Code | Sala – Thủ Thiêm — coffee, spa, sport, bars | same |
| CC-CBDFOOD-001 · CC-CBDCOFFEE-001 | Claude Code | Q1 CBD — Food (office lunch, everyday, affordable, special dining; menus + published prices) and coffee | Claude already holds central-district Food (CC-FOOD-009) |
| proposed for ChatGPT | ChatGPT | Thảo Điền + Sala Food are inside GPT-FOOD-001's Thủ Đức claim; Phan Xích Long / Phú Mỹ Hưng / Vinhomes CP all experiences | **Not added to the queue** — ChatGPT/PO to accept; GPT-CAT-001 and GPT-FOOD-001 untouched |

Targets are recalculated after each batch from `docs/NEIGHBOURHOOD_COVERAGE.md`; no duplicates or invented venues to meet a number. Exact pins are required before an establishment is featured on a neighbourhood page.

## 5. Neighbourhood landing pages — requirements (not built)

- Routes `/areas/<id>/` and `/areas/<id>/<collection>/` (e.g. `/areas/thao-dien/lunch/`, `/pilates/`, `/coffee/`, `/nails/`), generated at build time from canonical data — no hand-maintained lists.
- **Publish rule:** a page (or collection) is generated only when it has ≥ N real, source-listed establishments with **exact** pins in the area (N to agree, proposed 5 for an area page, 3 for a collection); otherwise no page, no sitemap entry. Never an empty or misleading page.
- Content: hero in the active experience's pastel theme; experience shortcuts (Eat today, Coffee, Bars, Spa & Nails, Pilates, Pickleball) that keep the experience switcher; "Popular in <area>" collections from presets (lunch under 100k only when prices are recorded); Hôm nay ăn gì? with the area as origin; live counts.
- Personalisation: choose a neighbourhood without changing experience mode; save **home** and **work** neighbourhoods (account preference + guest device storage); no location permission needed to browse.
- Shareable collections: public read-only collection URL from a user's saved items in an area (needs PO decision on privacy/opt-in).
- SEO: per-page `<title>`/description in vi + en, canonical URL, `hreflang`, internal links between area ↔ collection ↔ item ↔ establishment, JSON-LD `ItemList` of `LocalBusiness`/`Restaurant` only with verified fields (no invented ratings, prices or hours), sitemap of published pages only.
- Analytics (needs PO approval of tool + privacy notice; nothing collected today): active users by selected neighbourhood, acquisition source, recommendation success / zero-result rate, catalogue engagement, establishment views, saves, shares, return visits, feedback — reported separately from data coverage.

## 6. Decisions needed before implementation

1. Review/replace the provisional polygons (Business/Product + Codex); confirm current wards per area.
2. Publish threshold N for area and collection pages.
3. Analytics tool and consent model; shareable-collection privacy.
4. ChatGPT assignments for Phan Xích Long, Phú Mỹ Hưng and Vinhomes Central Park.
5. Validate segments and growth channels (Business/Growth) — out of scope for engineering.

## 7. Thảo Điền sprint — round 1 (2026-11-28)

| Batch | Result | Imported | Withheld / not eligible (reason) |
| --- | --- | --- | --- |
| CC-TDCOFFEE-001 | 1 / 3 | Anh Coffee Matcha Bar, 37 Thảo Điền (matcha latte; street-level pin) | Cafe 1/4, 19 Đường số 38 — pin geocoded ~2 km south, outside the approved area (numbered street repeats); The Snap Cafe — source says 32 Trần Ngọc Diện but OSM maps No. 32 as another business and the café ~350 m east |
| CC-TDSPORT-001 | 1 / 2 | UFiTU Pilates+ Thảo Điền, 3/38 Quốc Hương (reformer; street-level pin) | Olaben Studio, 1M Đường số 10 — pin geocoded in Phường Hiệp Bình, outside the area |
| CC-TDSPA-001 | 0 | — | Mộc Hương (61 vs 104 Xuân Thủy conflict); Thao Dien Spa, Mojo Spa, Eggsy Nails (no named treatment or no address) |
| CC-TDBARS-001 | 0 | — | Lost Birds, Dram Bar, 86 Proof (no catalogue drink named in sources) |

New intake rule: a venue stated to be in an approved neighbourhood (`intakeAliases`) must be pinned inside that polygon. Thảo Điền now: 8 venues (craft beer 4, sport 3, coffee 1). The binding constraint is item-level evidence: most Thảo Điền guides give addresses but not services; next round uses official menus/booking pages.

## 8. KEX-GROWTH-01 — workplace pilot go/no-go (2026-11-28)

**Scope (PM/PO):** decide one first pilot + one fallback from the founder's existing list only — The Hive Thảo Điền, Inspire Hub (Sala), Dreamplex Nguyễn Trung Ngạn. First user: a coworking member or nearby office worker choosing a **weekday Vietnamese lunch ≤ 70,000 VND within ~10 minutes on foot**. Guest-accessible, existing K's data only; no feature build, redesign, outreach, signup or production change. Food near Thảo Điền/Sala is inside ChatGPT's GPT-FOOD-001 (Thủ Đức) claim: audited only, no venue batch created or applied anywhere.

**Method.** Workplace pins from OpenStreetMap. Pedestrian routing: **unavailable in this environment** (routing.openstreetmap.de and router.project-osrm.org both unreachable), so every walk is **UNVERIFIED** and screened by straight-line distance ≤ 0.65 km (≈ 10 min at 5 km/h with a 1.3 detour factor). "Catalogue link" = existing K's dish–venue record (source-listed); "research evidence" = public page found today, **not imported**. Prices in K's data: none for these venues; the prices below are diner reviews or guides, mostly undated (weak).

| Criterion | **Dreamplex Nguyễn Trung Ngạn (Q1)** | **The Hive Thảo Điền** | **Inspire Hub — Sala** |
| --- | --- | --- | --- |
| Operator / location | ✅ Official page: Levels 9–11, Miss Áo Dài Building, 21 Nguyễn Trung Ngạn, Sài Gòn Ward; weekdays 9:00–18:00 (private offices 24/7) — [dreamplex.co](https://dreamplex.co/en/locations/ho-chi-minh-city/district-1/nguyen-trung-ngan/). Pin: OSM way 503730840 "Miss Áo Dài", house 21 (exact). | 🟡 94 Xuân Thủy in third-party listings only ([coworker.com](https://www.coworker.com/vietnam/ho-chi-minh-city/the-hive-thao-dien/review), [CBRE](https://www.cbrevietnam.com/properties/serviced-office-and-coworking/ho-chi-minh/the-hive/thao-dien), [office-hub](https://www.office-hub.com/vn/buildings/94-xuan-thuy-ho-chi-minh-city-thao-dien-a363m000001Ss4bAAC)); one Hive Life page gives a different address. Official current listing **not verified**. Pin: OSM house 94 Xuân Thủy (shared by other businesses). | 🔴 "3 / 03 Nguyễn Cơ Thạch, Sala" in broker listings ([Maison Office](https://maisonoffice.vn/en/serviced-office/ho-chi-minh/inspire-hub-sala), [coworker.com](https://www.coworker.com/vietnam/ho-chi-minh-city/inspire-hub/review), [offices.co](https://offices.co/vietnam/ho-chi-minh-city/62101)); Maison Office names it **"Inspire Hub II – Sala"**, not Hub 1; wards differ (An Khánh / An Lợi Đông). Official page not verified. Pin: street-level only. |
| Public route to community manager | 🟡 Official general hotline 0909 90 34 99 and weekday hours; no named community-manager contact found. | 🔴 Leasing enquiry line on CBRE only; no community contact found. | 🔴 None verified. |
| Product coverage (current branch) | 🟡 Official page: coworking + private offices at this branch. Member numbers: **not claimed**. | 🟡 Listings: private offices 2–6 people, coworking, business lounge (third-party, may be dated). | 🟡 Listings: serviced office / coworking (third-party). |
| Catalogue links within ≤ 0.65 km (straight line) | **4**: Bún Chả Hà Nội 26 (8A/9C2 Thái Văn Lung, 0.41 km, street pin) · Cơm Tấm Phúc Lộc Thọ (236 Đinh Tiên Hoàng, 0.43 km, street pin) · Bún Riêu Gánh Chợ Bến Thành (163 Lê Thánh Tôn, 0.62 km by **street-level pin — actual address near Bến Thành market is likely ~1 km+**) · Phở Cao Vân (25 Mạc Đĩnh Chi, 0.63 km, exact). Next: Bánh Xèo Bếp Mẹ Ỉn 0.78 km. | **0** food records within 1.2 km. | **0** food records within 1.2 km. |
| Sourced price ≤ 70k | Bún chả 42–45k (Foody diner comments, undated — [foody](https://www.foody.vn/ho-chi-minh/bun-cha-ha-noi-26)) · Phở Cao Vân 55k (Foody diner review — [foody](https://foody.vn/ho-chi-minh/pho-cao-van)) · Bún riêu 55–60k (guides — [mia.vn](https://mia.vn/cam-nang-du-lich/bun-rieu-ganh-cho-ben-thanh-17591)) · Cơm tấm: chain-wide 35–39k, **not branch-specific** ([Grab blog](https://www.grab.com/vn/food-blog/talk-of-the-town/tphcm-com-tam-tran-dia-no-cang-bua-sang/)) · Bếp Mẹ Ỉn: no price. → **2–3 weak, 0 menu-confirmed** | — | — |
| Weekday lunch hours | Phở Cao Vân 6:00–21:00 daily (Grab); Phúc Lộc Thọ chain 6:00–22:00 (Foody); others unknown. | — | — |
| Pedestrian route | ⚠️ UNVERIFIED (routing unavailable). | ⚠️ UNVERIFIED. | ⚠️ UNVERIFIED. |
| Target ≥ 5 qualifying branches | 🔴 **Not met** (≤ 3 with a weak price; routes unverified; one pin unreliable). | 🔴 Not met (0; GPT-FOOD-001 scope). | 🔴 Not met (0; GPT-FOOD-001 scope). |
| **Decision** | **No-go for now — conditional lead** | **No-go for now — fallback** | **No-go** (identity/address unresolved) |

**Recommendation:** no pilot starts yet. **Dreamplex Nguyễn Trung Ngạn is the conditional lead** (verified operator page, exact pin, four existing lunch links nearby); **The Hive Thảo Điền is the fallback** (credible location, no food coverage). Exact gaps to close for Dreamplex: (1) a public or operator-confirmed route to the community manager (today: general hotline only); (2) ≥ 5 distinct branches within a verified ~10-minute walk with a **menu-level** weekday lunch price ≤ 70,000 VND — need one more branch plus menu/delivery-listing prices for the existing four (diner reviews are not enough); (3) pedestrian routes measured with a routing service or on foot; (4) exact pin for Bún Riêu Gánh (163 Lê Thánh Tôn) — its street-level pin understates the walk. For The Hive: official current listing + community route, and GPT-FOOD-001 coverage of Xuân Thủy lunch options (ChatGPT). Inspire Hub: confirm which hub (I vs II) and the official address first.

### Proposed two-week pilot (only after the go criteria are met)

- **Artifact:** a shareable, Vietnamese-first lunch guide for the chosen workplace ("Ăn trưa quanh Dreamplex Nguyễn Trung Ngạn — dưới 70k, đi bộ 10 phút"), generated from existing K's records (dish, venue, price source, walking time, Google Maps link), guest-accessible link; shared in the operator's community channel **only if the operator approves**.
- **Participants:** ≥ 20 consenting pilot users (members or nearby office workers), informed what is measured.
- **Proposed decision gates (not results):** ≥ 40 % of pilot users open a restaurant or route from the guide; ≥ 25 % return within 7 days. Supporting: zero-result / "nothing fits" feedback < 10 %; reported price or route mismatches logged per venue.
- **Measurement:** needs a privacy-reviewed, consented method (no analytics is installed today — decision in §6). Without it, use a short opt-in check-in form at day 3 and day 10.

### Five-person usability test script (moderated, 20 min, Vietnamese first)

1. Context: "Hôm nay là thứ Ba, 11:45. Bạn có 45 phút và tối đa 70.000đ." Open the guide link (no account).
2. Task A — "Chọn một món ăn trưa trong 10 phút đi bộ." Observe time-to-choice, what they read first (price, distance, dish photo, reasons).
3. Task B — "Mở đường đi tới quán." Does the route/Maps link work; is the walking time believable?
4. Task C — "Bạn ăn chay / không ăn thịt heo hôm nay." Can they filter; do they trust the 'not recorded' labels?
5. Task D — "Gửi hướng dẫn này cho đồng nghiệp." Share flow.
6. Debrief: confidence in price/hours (1–5); what was missing; would they use it again tomorrow; where do they normally decide lunch (Grab, Zalo group, walking past)?
Success signals: ≥ 4/5 choose a meal in < 2 minutes without help; ≥ 4/5 open a route; no one is misled by an unknown price or hours.

### Evidence that would justify building saved workplaces later

Build "home/work neighbourhood" saving only if, in the pilot: ≥ 25 % return within 7 days **and** ≥ 30 % of returners open the guide from the same workplace context ≥ 2 times; usability debriefs show people re-finding the guide as friction (≥ 3/5); and at least one more workplace passes the same go criteria (so the feature serves more than one location). Until then, the shareable guide link is the workplace experience.

**Later wave:** expand toward the founder's 100-anchor directory only after the first pilot's gates are evaluated; no directory research now (superseded shortlist request not run).
