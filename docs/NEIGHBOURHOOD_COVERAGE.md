# Neighbourhood coverage audit

Generated 2026-11-28 by `npm run data:neighbourhoods` from the canonical data. Do not edit by hand.

**Method.** An establishment belongs to a neighbourhood only if its coordinates fall inside the neighbourhood's **provisional** search polygon (`data/neighbourhoods/neighbourhoods.json`), never because of a district name. *Exact* = mapped POI/house number; *approx* = street-level pin (house number not located — may sit elsewhere on the street, so membership near an edge is uncertain). Real records only (no samples, no candidates). Targets are the PO's Phase 1 proposals; gaps compare against **all** in-area records, the exact count is the conservative figure.

## Tier 1 — coverage vs targets (establishments per experience)

| Neighbourhood | Food | Coffee | Bars | Spa | Sport | Unique venues | Target total |
| --- | --- | --- | --- | --- | --- | ---: | ---: |
| Thảo Điền | 0/100 (gap 100) | 1/40 (gap 39) | 4/20 (gap 16) | 0/25 (gap 25) | 3/15 (gap 12) | 8 | 200 |
| Sala – Thủ Thiêm | 0/50 (gap 50) | 0/25 (gap 25) | 2/10 (gap 8) | 0/15 (gap 15) | 0/10 (gap 10) | 2 | 110 |
| Quận 1 – Trung tâm | 32/150 (gap 118) | 5/60 (gap 55) | 14/40 (gap 26) | 0/30 (gap 30) | 3/15 (gap 12) | 54 | 295 |
| Phú Mỹ Hưng | 21/100 (gap 79) | 0/40 (gap 40) | 2/15 (gap 13) | 0/35 (gap 35) | 0/20 (gap 20) | 23 | 210 |
| Vinhomes Central Park – Nguyễn Hữu Cảnh | 0/60 (gap 60) | 0/25 (gap 25) | 0/10 (gap 10) | 0/20 (gap 20) | 0/10 (gap 10) | 0 | 125 |
| Phan Xích Long – Phú Nhuận | 3/100 (gap 97) | 0/40 (gap 40) | 0/15 (gap 15) | 0/30 (gap 30) | 0/10 (gap 10) | 3 | 195 |

## All neighbourhoods — detail

| Neighbourhood | Tier | Food | Coffee | Bars | Spa | Sport | Dishes with a place here | Priced links | Venues with hours | Current wards (from geocoded records) |
| --- | ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |
| Thảo Điền | 1 | 0 | 1 (0 exact · 1 approx) | 4 (1 exact · 3 approx) | 0 | 3 (0 exact · 3 approx) | 0 | 0 | 0 | Phường An Khánh |
| Sala – Thủ Thiêm | 1 | 0 | 0 | 2 (1 exact · 1 approx) | 0 | 0 | 0 | 0 | 0 | Phường An Khánh |
| Quận 1 – Trung tâm | 1 | 32 (10 exact · 22 approx) | 5 (3 exact · 2 approx) | 14 (8 exact · 6 approx) | 0 | 3 (2 exact · 1 approx) | 17 | 7 | 15 | Phường Bến Thành, Phường Sài Gòn, Phường Xuân Hòa, Quận 1 |
| Phú Mỹ Hưng | 1 | 21 (5 exact · 16 approx) | 0 | 2 (0 exact · 1 approx) | 0 | 0 | 10 | 0 | 6 | Phường Tân Hưng, Phường Tân Thuận, Quận 7, Xã Nhà Bè |
| Vinhomes Central Park – Nguyễn Hữu Cảnh | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | — |
| Phan Xích Long – Phú Nhuận | 1 | 3 (1 exact · 2 approx) | 0 | 0 | 0 | 0 | 3 | 1 | 1 | Phường Cầu Kiệu, Phường Gia Định |
| Phạm Viết Chánh | 2 | 2 (1 exact · 1 approx) | 0 | 2 (1 exact · 1 approx) | 0 | 0 | 2 | 0 | 0 | Phường Sài Gòn, Phường Thạnh Mỹ Tây |
| An Phú – An Khánh | 2 | 0 | 1 (0 exact · 1 approx) | 0 | 0 | 0 | 0 | 0 | 0 | Phường An Khánh |
| Hồ Con Rùa – Quận 3 | 2 | 15 (4 exact · 11 approx) | 0 | 1 (0 exact · 1 approx) | 0 | 1 (0 exact · 1 approx) | 10 | 2 | 8 | Phường Sài Gòn, Phường Tân Định, Phường Xuân Hòa |
| Bến Vân Đồn – Quận 4 | 2 | 37 (6 exact · 31 approx) | 0 | 1 (0 exact · 1 approx) | 0 | 0 | 10 | 1 | 15 | Phường Cầu Ông Lãnh, Phường Khánh Hội, Phường Vĩnh Hội, Phường Xóm Chiếu |
| Hồ Thị Kỷ – Quận 10 | 2 | 13 (3 exact · 10 approx) | 0 | 0 | 0 | 0 | 11 | 0 | 5 | Phường Bàn Cờ, Phường Chợ Quán, Phường Cầu Ông Lãnh, Phường Vườn Lài |
| Ba Son – Golden River | 2 | 2 (1 exact · 1 approx) | 0 | 1 (1 exact · 0 approx) | 0 | 0 | 2 | 1 | 1 | Phường Sài Gòn |

## Category-level coverage (establishments offering ≥1 item in the category)

| Neighbourhood | Spa categories | Sport categories | Bars categories | Coffee categories |
| --- | --- | --- | --- | --- |
| Thảo Điền | — | pickleball 2, pilates 1 | beer 4 | matcha 1 |
| Sala – Thủ Thiêm | — | — | beer 2 | — |
| Quận 1 – Trung tâm | — | pickleball 2, pilates 1 | signature-cocktail 1, beer 13 | vietnamese-coffee 3, specialty 1, tea 1 |
| Phú Mỹ Hưng | — | — | beer 2 | — |
| Vinhomes Central Park – Nguyễn Hữu Cảnh | — | — | — | — |
| Phan Xích Long – Phú Nhuận | — | — | — | — |
| Phạm Viết Chánh | — | — | beer 2 | — |
| An Phú – An Khánh | — | — | — | matcha 1 |
| Hồ Con Rùa – Quận 3 | — | pickleball 1 | beer 1 | — |
| Bến Vân Đồn – Quận 4 | — | — | beer 1 | — |
| Hồ Thị Kỷ – Quận 10 | — | — | — | — |
| Ba Son – Golden River | — | — | signature-cocktail 1 | — |

## Outside all 12 areas and overlaps

- Establishment records (experience × venue) inside at least one area: **160 / 491**; outside all areas: 331 (kept — nothing outside the priority areas is removed).
- Overlap: Thảo Điền ∩ An Phú – An Khánh: 1 records (provisional polygons touch; resolve when boundaries are reviewed).
- Overlap: Quận 1 – Trung tâm ∩ Hồ Con Rùa – Quận 3: 3 records (provisional polygons touch; resolve when boundaries are reviewed).
- Overlap: Quận 1 – Trung tâm ∩ Ba Son – Golden River: 1 records (provisional polygons touch; resolve when boundaries are reviewed).
- Overlap: Phạm Viết Chánh ∩ Ba Son – Golden River: 1 records (provisional polygons touch; resolve when boundaries are reviewed).

