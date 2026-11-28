# Intake CC-BARS-003 — dry run

- Experience: bars · kind: venues · agent: claude-code · researched 2026-11-28
- Method: KEX-QA-02: re-checks the GPT-BARS-001 withheld Pasteur Street branches against the official taproom directory and OpenStreetMap. Coordinates are taken only from a mapped OSM object that matches the official street/building and ward (no interpolation between house numbers, no street-segment points). 221 Hoàng Sa stays withheld: no mapped POI or house number, and its street points span three wards.
- Result: **2 accepted, 0 rejected, 0 warnings** (2026-11-28T05:31:34.411Z)

| Venue | Id | Decision | Action | Offerings | Priced | Pin | Geocoder match | Reasons / warnings |
| --- | --- | --- | --- | ---: | ---: | --- | --- | --- |
| Pasteur Street Craft Beer – Bùi Viện | `pasteur-street-craft-beer-bui-vien-212-de-tham` | ✅ accept | new | 1 | 0 | exact 10.76739,106.69406 | researcher-supplied coordinates | — |
| Pasteur Street Craft Beer – Phú Mỹ Hưng | `pasteur-street-craft-beer-phu-my-hung-cr5-01` | ✅ accept | new | 1 | 0 | exact 10.72481,106.72082 | researcher-supplied coordinates | — |

Dry run only — nothing was written. Re-run with `--apply` to import the accepted records.
