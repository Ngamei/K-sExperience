# HCMC restaurant verification plan

## Goal
For the 50 priority regional dishes (`data/source/priority-dishes.json`), list real HCMC establishments that serve each dish, then **confirm** them first-hand. Live progress: `docs/DATA_REPORT.md` → *Priority 50* and `docs/VENUE_COVERAGE.md`.

## Evidence levels (maps to `dish-restaurant-mapping.json` → `status`, `menuEvidence.type`)
| Level | Status shown to users | Evidence required | Who |
| --- | --- | --- | --- |
| L0 none | "No verified HCMC establishment found" + Google Maps search card | — | — |
| L1 listed | "Listed by source · not yet confirmed" (`unverified`, `published-source`) | Named venue + full street address in a published guide (MICHELIN, VnExpress, Znews, Grab Food blog, mia.vn, VinWonders, toplist…); geocoded; source URL stored | Claude Code (desk research) |
| L2 confirmed | "Verified available" (`verified-available`) | One of: dated menu photo, official menu/website listing the dish, delivery-app listing (Grab/ShopeeFood) showing the dish, phone call, site visit. Store type + note + URL/photo + date | PO / local verifier (human) |
| L3 temporarily unavailable | "Temporarily unavailable" | Verifier reports dish not currently served | PO / local verifier |

The importer **refuses** `verified-available` when the only evidence is a published source.

## Desk research protocol (L1) — implemented
1. Search Vietnamese food guides for "<dish> ngon Sài Gòn địa chỉ".
2. Keep only venues with a **name and street number** in the source; record district when the source states it.
3. Drop conflicting entries (same address for different shops, different addresses for one shop), unnamed entries, and venues outside HCMC.
4. Add to `data/source/venue-research/batch-NN.json` → `node scripts/geocode-venue-research.mjs` (Nominatim; district-bounded; streets matching > 3 km apart without a district are rejected) → `npm run data:restaurants` → `npm run data:coverage` / `data:report`.
5. A generic shop linked to a regional variant is marked "regional style not confirmed".

## First-hand verification (L2) — needs a human, proposed workflow
- Weekly batch of ~20 venues, prioritised by dishes with the fewest venues.
- For each: open Google Maps link → check it exists/open → check menu photos or delivery listing for the exact dish → optionally call. Record: date, method, note, photo/URL, price if shown.
- Record in a shared sheet (columns = `dishId, restaurantId, method, evidenceUrl, note, priceMin, priceMax, date, verifier`); Claude Code imports it via a new `--verification` importer (backlog CC-07) until the Admin CMS exists.
- Re-check every 6 months; downgrade to L1 if stale > 12 months.

## Known limits
- Many highland/rural specialities likely have no HCMC venue; they keep L0 with transparent empty state.
- OSM/Nominatim street-level pins can be ~1–2 km off; flagged "approximate" in the UI and the Google Maps link uses name + address.
- Google Places API (paid) was declined by the PO (DECISIONS D22).
