# Neighbourhood coverage audit

Generated 2026-11-28 by `npm run data:neighbourhoods` from the canonical data. Do not edit by hand.

**Method.** An establishment belongs to a neighbourhood only if its coordinates fall inside the neighbourhood's **provisional** search polygon (`data/neighbourhoods/neighbourhoods.json`), never because of a district name. *Exact* = mapped POI/house number; *approx* = street-level pin (house number not located — may sit elsewhere on the street, so membership near an edge is uncertain). Real records only (no samples, no candidates). Targets are the PO's Phase 1 proposals; gaps compare against **all** in-area records, the exact count is the conservative figure.

## Tier 1 — coverage vs targets (establishments per experience)

| Neighbourhood | Food | Coffee | Bars | Spa | Sport | Unique venues | Target total |
| --- | --- | --- | --- | --- | --- | ---: | ---: |
| Thảo Điền | 0/100 (gap 100) | 1/40 (gap 39) | 4/20 (gap 16) | 0/25 (gap 25) | 3/15 (gap 12) | 8 | 200 |
| Sala – Thủ Thiêm | 0/50 (gap 50) | 0/25 (gap 25) | 2/10 (gap 8) | 0/15 (gap 15) | 0/10 (gap 10) | 2 | 110 |
| Quận 1 – Trung tâm | 13/150 (gap 137) | 5/60 (gap 55) | 13/40 (gap 27) | 0/30 (gap 30) | 3/15 (gap 12) | 34 | 295 |
| Phú Mỹ Hưng | 5/100 (gap 95) | 0/40 (gap 40) | 1/15 (gap 14) | 0/35 (gap 35) | 0/20 (gap 20) | 6 | 210 |
| Vinhomes Central Park – Nguyễn Hữu Cảnh | 0/60 (gap 60) | 0/25 (gap 25) | 0/10 (gap 10) | 0/20 (gap 20) | 0/10 (gap 10) | 0 | 125 |
| Phan Xích Long – Phú Nhuận | 1/100 (gap 99) | 0/40 (gap 40) | 0/15 (gap 15) | 0/30 (gap 30) | 0/10 (gap 10) | 1 | 195 |

## All neighbourhoods — detail

| Neighbourhood | Tier | Food | Coffee | Bars | Spa | Sport | Dishes with a place here | Priced links | Venues with hours | Current wards (from geocoded records) |
| --- | ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| Thảo Điền | 1 | 0 | 1 (0 exact · 1 approx) | 4 (1 exact · 3 approx) | 0 | 3 (0 exact · 3 approx) | 0 | 0 | 0 | Phường An Khánh |
| Sala – Thủ Thiêm | 1 | 0 | 0 | 2 (1 exact · 1 approx) | 0 | 0 | 0 | 0 | 0 | Phường An Khánh |
| Quận 1 – Trung tâm | 1 | 13 (3 exact · 10 approx) | 5 (3 exact · 2 approx) | 13 (7 exact · 6 approx) | 0 | 3 (2 exact · 1 approx) | 12 | 1 | 1 | Phường Bến Thành, Phường Sài Gòn, Phường Xuân Hòa |
| Phú Mỹ Hưng | 1 | 5 (1 exact · 4 approx) | 0 | 1 (0 exact · 1 approx) | 0 | 0 | 4 | 0 | 0 | Phường Tân Hưng, Phường Tân Thuận, Xã Nhà Bè |
| Vinhomes Central Park – Nguyễn Hữu Cảnh | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| Phan Xích Long – Phú Nhuận | 1 | 1 (1 exact · 0 approx) | 0 | 0 | 0 | 0 | 1 | 0 | 0 | Phường Cầu Kiệu |
| Phạm Viết Chánh | 2 | 1 (0 exact · 1 approx) | 0 | 2 (1 exact · 1 approx) | 0 | 0 | 1 | 0 | 0 | Phường Thạnh Mỹ Tây |
| An Phú – An Khánh | 2 | 0 | 1 (0 exact · 1 approx) | 0 | 0 | 0 | 0 | 0 | 0 | Phường An Khánh |
| Hồ Con Rùa – Quận 3 | 2 | 5 (2 exact · 3 approx) | 0 | 1 (0 exact · 1 approx) | 0 | 1 (0 exact · 1 approx) | 4 | 0 | 1 | Phường Sài Gòn, Phường Xuân Hòa |
| Bến Vân Đồn – Quận 4 | 2 | 8 (1 exact · 7 approx) | 0 | 1 (0 exact · 1 approx) | 0 | 0 | 4 | 0 | 0 | Phường Khánh Hội, Phường Xóm Chiếu |
| Hồ Thị Kỷ – Quận 10 | 2 | 3 (2 exact · 1 approx) | 0 | 0 | 0 | 0 | 3 | 0 | 0 | Phường Bàn Cờ, Phường Chợ Quán |
| Ba Son – Golden River | 2 | 0 | 0 | 1 (1 exact · 0 approx) | 0 | 0 | 0 | 0 | 0 | Phường Sài Gòn |

## Category-level coverage (establishments offering ≥1 item in the category)

| Neighbourhood | Spa categories | Sport categories | Bars categories | Coffee categories |
| --- | --- | --- | --- | --- |
| Thảo Điền | — | pickleball 2, pilates 1 | beer 4 | matcha 1 |
| Sala – Thủ Thiêm | — | — | beer 2 | — |
| Quận 1 – Trung tâm | — | pickleball 2, pilates 1 | signature-cocktail 1, beer 12 | vietnamese-coffee 3, specialty 1, tea 1 |
| Phú Mỹ Hưng | — | — | beer 1 | — |
| Vinhomes Central Park – Nguyễn Hữu Cảnh | — | — | — | — |
| Phan Xích Long – Phú Nhuận | — | — | — | — |
| Phạm Viết Chánh | — | — | beer 2 | — |
| An Phú – An Khánh | — | — | — | matcha 1 |
| Hồ Con Rùa – Quận 3 | — | pickleball 1 | beer 1 | — |
| Bến Vân Đồn – Quận 4 | — | — | beer 1 | — |
| Hồ Thị Kỷ – Quận 10 | — | — | — | — |
| Ba Son – Golden River | — | — | signature-cocktail 1 | — |

## Outside all 12 areas and overlaps

- Establishment records (experience × venue) inside at least one area: **71 / 168**; outside all areas: 97 (kept — nothing outside the priority areas is removed).
- Overlap: Thảo Điền ∩ An Phú – An Khánh: 1 records (provisional polygons touch; resolve when boundaries are reviewed).
- Overlap: Quận 1 – Trung tâm ∩ Hồ Con Rùa – Quận 3: 2 records (provisional polygons touch; resolve when boundaries are reviewed).
- Overlap: Quận 1 – Trung tâm ∩ Ba Son – Golden River: 1 records (provisional polygons touch; resolve when boundaries are reviewed).

