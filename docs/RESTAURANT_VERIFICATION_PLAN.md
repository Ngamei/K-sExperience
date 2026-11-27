# HCMC restaurant verification plan

## Goal
For the 50 priority regional dishes (`data/source/priority-dishes.json`), list real HCMC establishments that serve each dish, then **confirm** them first-hand. Live progress: `docs/DATA_REPORT.md` → *Priority 50* and `docs/VENUE_COVERAGE.md`.

## Evidence levels (Sprint 3 — `src/lib/data/evidence.ts`)
Physical visits are **not** mandatory. Each level only accepts the evidence types listed; this is enforced by the schema, the importers, the Admin evidence editor and a database constraint. Every public level shows a **last-checked date**.

| Status | Shown to users | Evidence types accepted | Typical source |
| --- | --- | --- | --- |
| `candidate` | No (admin only) | search-result, published-source | Unconfirmed mention found during research |
| `source-listed` | "Listed by a published source" | published-source | Guide/article explicitly names the venue for the exact dish (MICHELIN, VnExpress, Znews, Grab Food blog, mia.vn, VinWonders…) |
| `menu-confirmed` | "Menu-confirmed" | official-menu, delivery-listing, menu-photo | Official menu/website, current Grab/ShopeeFood listing, dated menu photo |
| `directly-confirmed` | "Confirmed by the venue" | phone-call, message | Venue confirms by phone or message |
| `visit-confirmed` | "Visit-confirmed" | site-visit, user-visit | Team member or user with credible visit evidence |
| `temporarily-unavailable` | "Temporarily unavailable" | any non-search evidence | Evidence the dish is not currently served |
| (no link) | "No verified HCMC establishment found" + Google Maps search card | — | — |

Ranking when a dish has several venues: visit > direct > menu > source-listed > temporarily unavailable. Recommendations boost confirmed levels.

## Desk research protocol (L1) — implemented
1. Search Vietnamese food guides for "<dish> ngon Sài Gòn địa chỉ".
2. Keep only venues with a **name and street number** in the source; record district when the source states it.
3. Drop conflicting entries (same address for different shops, different addresses for one shop), unnamed entries, and venues outside HCMC.
4. Add to `data/source/venue-research/batch-NN.json` → `node scripts/geocode-venue-research.mjs` (Nominatim; district-bounded; streets matching > 3 km apart without a district are rejected) → `npm run data:restaurants` → `npm run data:coverage` / `data:report`.
5. A generic shop linked to a regional variant is marked "regional style not confirmed".

## Confirmation workflow (menu / direct / visit) — needs a person with a browser or phone
- Weekly batch of ~20 venues, prioritised by dishes with the fewest venues.
- For each: open Google Maps link → check it exists/open → check menu photos or delivery listing for the exact dish → optionally call. Record: date, method, note, photo/URL, price if shown.
- **Menu-confirmed is the cheapest upgrade:** check the venue's Grab/ShopeeFood listing or official menu for the exact dish and record the URL — no visit needed.
- Record in Admin → Evidence (Supabase) or, in local mode, download the validated JSON and hand it to Claude Code.
- Re-check every 6 months; downgrade to L1 if stale > 12 months.

## Known limits
- Many highland/rural specialities likely have no HCMC venue; they keep L0 with transparent empty state.
- OSM/Nominatim street-level pins can be ~1–2 km off; flagged "approximate" in the UI and the Google Maps link uses name + address.
- Google Places API (paid) was declined by the PO (DECISIONS D22).
