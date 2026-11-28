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
