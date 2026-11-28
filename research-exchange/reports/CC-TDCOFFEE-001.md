# Intake CC-TDCOFFEE-001 — applied

- Experience: coffee · kind: venues · agent: claude-code · researched 2026-11-28
- Method: Neighbourhood-first research (Thảo Điền, approved search area). Desk research from guides/official pages naming the venue AND the exact item (search-result excerpts; direct fetches blocked — spot-check). Coordinates: OpenStreetMap; venues with conflicting addresses withheld.
- Result: **1 accepted, 2 rejected, 1 warnings** (2026-11-28T05:43:19.520Z)

## Warnings

- geocodes reused from the dry run of 2026-11-28T05:43:08.058Z (no new Nominatim queries for this batch's venues)

| Venue | Id | Decision | Action | Offerings | Priced | Pin | Geocoder match | Reasons / warnings |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| Anh Coffee Matcha Bar | `anh-coffee-matcha-bar-37-thao-dien` | ✅ accept | new | 1 | 0 | street 10.80132,106.73825 | Thảo Điền, Khu phố 3, Phường An Khánh, Thành phố Hồ Chí Minh, 71108, Việt Nam | — |
| Cafe 1/4 (Oishi Town) | `cafe-1-4-oishi-town-19-duong-so-38` | ❌ reject | none | 1 | 0 | street 10.78812,106.72620 | Đường Số 38, Khu phố 21, Phường An Khánh, Thành phố Hồ Chí Minh, 71108, Việt Nam | coordinates: pin (Đường Số 38, Khu phố 21, Phường An Khánh, Thành phố Hồ Chí Minh, 71108, Việt Nam) is outside the approved Thảo Điền area — street name likely repeats elsewhere |
| The Snap Cafe | `the-snap-cafe-32-tran-ngoc-dien` | ❌ reject | none | 0 | 0 | — | — | excluded by researcher: Address conflict: the source gives 32 Trần Ngọc Diện, but OpenStreetMap maps No. 32 as a different business (node 5388501721) and places 'The Snap Cafe' ~350 m east (node 9587618750). Not published until the location is confirmed. |

## Importer output

```
✓ coffee: 2 added, 0 updated, 0 errors, 3 venues skipped — written
  · skipped Cà phê Vợt Cheo Leo: Geocoding ambiguous: Nominatim matched Nguyễn Thiện Thuật in Bình Thạnh, not the former Quận 3 street. Not published until coordinates are confirmed (first-hand or official listing).
  · skipped Cafe 1/4 (Oishi Town): intake CC-TDCOFFEE-001: coordinates: pin (Đường Số 38, Khu phố 21, Phường An Khánh, Thành phố Hồ Chí Minh, 71108, Việt Nam) is outside the approved Thảo Điền area — street name likely repeats elsewhere
  · skipped The Snap Cafe: Address conflict: the source gives 32 Trần Ngọc Diện, but OpenStreetMap maps No. 32 as a different business (node 5388501721) and places 'The Snap Cafe' ~350 m east (node 9587618750). Not published until the location is confirmed.
```

Next: `npm run db:seed-sql && npm run data:report && npm run data:coverage && npm run data:experiences && npm run data:what-to-eat && npm run exchange:export`, then `npm run qa`.
