# Intake CC-TDSPORT-001 — applied

- Experience: sport · kind: venues · agent: claude-code · researched 2026-11-28
- Method: Neighbourhood-first research (Thảo Điền, approved search area). Desk research from guides/official pages naming the venue AND the exact item (search-result excerpts; direct fetches blocked — spot-check). Coordinates: OpenStreetMap; venues with conflicting addresses withheld.
- Result: **1 accepted, 1 rejected, 1 warnings** (2026-11-28T05:43:20.638Z)

## Warnings

- geocodes reused from the dry run of 2026-11-28T05:43:12.299Z (no new Nominatim queries for this batch's venues)

| Venue | Id | Decision | Action | Offerings | Priced | Pin | Geocoder match | Reasons / warnings |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| UFiTU Pilates+ (Thảo Điền) | `ufitu-pilates-thao-dien-3-38-quoc-huong` | ✅ accept | new | 1 | 0 | street 10.80738,106.73089 | Quốc Hương, Khu phố 7, Phường An Khánh, Thành phố Hồ Chí Minh, 71108, Việt Nam | — |
| Olaben Studio | `olaben-studio-1m-duong-so-10` | ❌ reject | none | 3 | 0 | street 10.82473,106.72767 | Đường số 10, Khu phố 33, Phường Hiệp Bình, Thành phố Hồ Chí Minh, 71318, Việt Nam | coordinates: pin (Đường số 10, Khu phố 33, Phường Hiệp Bình, Thành phố Hồ Chí Minh, 71318, Việt Nam) is outside the approved Thảo Điền area — street name likely repeats elsewhere |

## Importer output

```
✓ sport: 2 added, 0 updated, 0 errors, 5 venues skipped — written
  · skipped Rudal Pickleball Center: Geocoding ambiguous: numbered street (Đường số …) matched a different ward. Not published until coordinates are confirmed (official listing or first-hand).
  · skipped HitPark Pickleball: Geocoding ambiguous: numbered street (Đường số …) matched a different ward. Not published until coordinates are confirmed (official listing or first-hand).
  · skipped Olaben Studio: Geocoding ambiguous: numbered street (Đường số …) matched a different ward. Not published until coordinates are confirmed (official listing or first-hand).
  · skipped Kira Pilates: Geocoding matched an unrelated business (7 Bùi Bằng Đoàn), not the Hưng Phúc Premier shophouse. Not published until coordinates are confirmed (official listing or first-hand).
  · skipped Olaben Studio: intake CC-TDSPORT-001: coordinates: pin (Đường số 10, Khu phố 33, Phường Hiệp Bình, Thành phố Hồ Chí Minh, 71318, Việt Nam) is outside the approved Thảo Điền area — street name likely repeats elsewhere
```

Next: `npm run db:seed-sql && npm run data:report && npm run data:coverage && npm run data:experiences && npm run data:what-to-eat && npm run exchange:export`, then `npm run qa`.
