# Intake CC-BARS-003 — applied

- Experience: bars · kind: venues · agent: claude-code · researched 2026-11-28
- Method: KEX-QA-02: re-checks the GPT-BARS-001 withheld Pasteur Street branches against the official taproom directory and OpenStreetMap. Coordinates are taken only from a mapped OSM object that matches the official street/building and ward (no interpolation between house numbers, no street-segment points). 221 Hoàng Sa stays withheld: no mapped POI or house number, and its street points span three wards.
- Result: **2 accepted, 0 rejected, 1 warnings** (2026-11-28T06:10:37.814Z)

## Warnings

- pins reused from the dry run of 2026-11-28T05:57:07.392Z (no new Nominatim queries; supplied coordinates verified unchanged)

| Venue | Id | Decision | Action | Offerings | Priced | Pin | Geocoder match | Reasons / warnings |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| Pasteur Street Craft Beer – Bùi Viện | `pasteur-street-craft-beer-bui-vien-212-de-tham` | ✅ accept | new | 1 | 0 | exact · supplied 10.7673944,106.6940607 | https://www.openstreetmap.org/node/13541335701 | — |
| Pasteur Street Craft Beer – Phú Mỹ Hưng | `pasteur-street-craft-beer-phu-my-hung-cr5-01` | ✅ accept | new | 1 | 0 | building · supplied 10.7248058,106.7208204 | https://www.openstreetmap.org/way/1510577907 | — |

## Importer output

```
✓ bars: 4 added, 0 updated, 0 errors, 6 venues skipped — written
  · skipped Pasteur Street Craft Beer – Bùi Viện: intake GPT-BARS-001: coordinates: street-level pin (house number not located) lies nearer Quận 4 than Quận 1 — exact location unconfirmed
  · skipped Pasteur Street Craft Beer – Hoàng Sa: intake GPT-BARS-001: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Quận 1 — exact location unconfirmed
  · skipped Pasteur Street Craft Beer – Phú Mỹ Hưng: intake GPT-BARS-001: coordinates: not geocoded: not found
  · skipped BiaCraft – Trường Sa: intake GPT-BARS-001: coordinates: street-level pin (house number not located) lies nearer Quận 3 than Phú Nhuận — exact location unconfirmed
  · skipped Tiệm Bia Gà – Tên Lửa: intake GPT-BARS-001: coordinates: street-level pin (house number not located) lies nearer Quận 6 than Bình Tân — exact location unconfirmed
  · skipped Deme Brewing Taproom: intake GPT-BARS-001: coordinates: street-level pin (house number not located) lies nearer Quận 1 than Quận 3 — exact location unconfirmed
```

Next: `npm run db:seed-sql && npm run data:report && npm run data:coverage && npm run data:experiences && npm run data:what-to-eat && npm run exchange:export`, then `npm run qa`.
