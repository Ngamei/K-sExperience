# KEX-QA-02 — Xuân Thủy shared pin and withheld Pasteur Street branches (2026-11-28)

## Xuân Thủy pair (published, unchanged — precision kept honest)

| Establishment | Address | Published pin | Precision | Independent check |
| --- | --- | --- | --- | --- |
| `pasteur-street-craft-beer-thao-dien-120-xuan-thuy` | 120 Xuân Thủy | 10.803753, 106.734706 | street | Address confirmed by directory listings (e.g. Saigoneer brand listing). OSM has **no** POI and **no** house number 120; Nominatim `street=120 Xuân Thủy` returns only street segments. |
| `tiem-bia-ga-thao-dien-26b-xuan-thuy` | 26B Xuân Thủy | 10.803753, 106.734706 | street | Only the original guide + brand page; no independent listing found. OSM has no POI and no house number 26B. |

- Why identical: the geocoder caches per `name|address|district`, but when a house number is not mapped Nominatim returns the same **street segment** for any number on that street, so both keys resolve to one point. This is not a cache collision; it is the street-level result.
- OSM does map neighbouring numbers on Xuân Thủy (50 → 106.73114, 56 → 106.73183, 84 → 106.73411, 90 BiaCraft → 106.73453, 100 → 106.73531, 106 → 106.73591), so 120 lies east of 106 and 26B west of 50. That would only be an **interpolated estimate**, so it was **not** used: both stay `street` precision.
- Changes: module establishment pages now show "Approximate location — only the street could be matched…" for street-level pins (Food pages already did); intake warns when an accepted venue shares an identical street-level point with another venue (smoke-tested on a throwaway row: it flagged both Xuân Thủy branches).
- Systemic: 15 groups of establishments across experiences share identical street-level points (e.g. Lê Thánh Tôn, Đồng Nai, Võ Văn Tần) — same cause; all are labelled approximate. Exact pins need a mapped POI/house number or a first-hand check.
- Related: Pasteur Street – Lê Thánh Tôn (26A, published at street level) has an OSM node "Pasteur Street Brewing Co" on Lê Thánh Tôn (node 10801196205, 10.7800098, 106.7041427) — candidate for an exact pin in a later batch; not changed here (out of scope). Pasteur Original's published pin (10.775184, 106.700746, exact, Phường Sài Gòn) is ~17 m from OSM node 13666620601 "Pasteur Street Brewing Co., Hẻm 144 Pasteur"; the "Phường Xuân Hòa" match in the GPT-BARS-001 report was the discarded intake geocode, not the published record.

## Withheld GPT-BARS-001 Pasteur Street branches

| Branch | Official directory (pasteurstreet.com/taprooms) | Mapped location (OSM) | Decision |
| --- | --- | --- | --- |
| Bùi Viện — 212 Đề Thám | Listed: Bùi Viện Taproom & Restaurant, 212 Đề Thám, Bến Thành Ward | node 13541335701 "Pasteur Street Craft Beer" (amenity=bar), Đề Thám, Phường Bến Thành — 10.7673944, 106.6940607 (no house number on the node) | **Staged** in CC-BARS-003 with these coordinates — dry run 2/0, apply **held** |
| Phú Mỹ Hưng — CR5-01, Crescent Residence 5 | Listed: Phu My Hung Taproom & Restaurant, CR5-01 Crescent Residence 5 | way 1510577907 "Crescent Residence 5" (building, 8 Trần Văn Trà, Phường Tân Mỹ) — 10.7248058, 106.7208204 (building-level pin for the unit) | **Staged** in CC-BARS-003 — apply **held** |
| Hoàng Sa — 221 Hoàng Sa | Not shown in the directory snapshot read here; Vietcetera (Sept 2022) reports it opened at 221 Hoàng Sa, Tân Định Ward | No POI, no house number; street points span Nhiêu Lộc, Xuân Hòa and Tân Định | **Still withheld** — no exact pin, current listing not confirmed |

No guessed coordinates are published. CC-BARS-003 is in `research-exchange/inbox/` with its dry-run report `research-exchange/reports/CC-BARS-003.md`; apply waits for Codex/PO approval.
