# Google Maps venue collection — prompt for a browser agent

**Use with:** Claude in Chrome (or any Claude session that can drive a real browser on the Product Owner's computer). Google Maps cannot be reached from the cloud sessions, so this must run in a local browser.
**Output:** one research batch `research-exchange/inbox/PO-GMAPS-<NNN>.json`, imported with `npm run intake` (dry run, then `--apply`). Hand the file to Claude Code to run the intake.
**Worklist:** `research-exchange/briefs/GMAPS-DISH-VENUES.worklist.md` (A: dishes with 0 venues · B: dishes with 1–4 · C: mia.vn venues that need an exact pin). Claude Code regenerates it from `docs/food-coverage.json` after each import.

---

## Prompt (copy everything below this line into the browser agent)

You are collecting real Ho Chi Minh City restaurants for the K's Experience food atlas. Work only from what Google Maps shows you. Never invent or guess a venue, an address, a dish or opening hours.

**Dishes to cover** (dish id → Vietnamese name). Do them in order and stop when I say so:

```
<paste rows from GMAPS-DISH-VENUES.worklist.md, e.g.>
ca-kho-to → Cá kho tộ
```

For each dish:

1. Open `https://www.google.com/maps/search/?api=1&query=<Vietnamese dish name>, Hồ Chí Minh`. This is the same link as the "Search on Google Maps" button on the dish page at k-s-experience.vercel.app.
2. Pick **3 to 5** venues that meet **all** of these:
   - The listing is not marked "Permanently closed" or "Temporarily closed". Today's hours show the place as operating.
   - Rating **4.0 or higher** from at least **50 reviews**. Use this only to choose venues. Do not write the rating or review count in the output.
   - The venue really serves **this** dish: the dish is in the venue's name, in its Menu tab, or in the owner's description. Results that only match because of a review comment don't count.
   - The address is inside Ho Chi Minh City and has a house number and street. No addresses that are only a market or building name.
   - Branches of one brand count as different venues. Take at most 2 branches of one brand per dish.
   - Regional variants are different dishes. For "Bún chả cá Quy Nhơn", a generic "bún chả cá" shop does not count unless its name or menu says Quy Nhơn.
3. Open each chosen venue and record:
   - `name`: exactly as Google Maps shows it.
   - `fullAddress`: the address line exactly as shown, e.g. `29 Tân Canh, Tân Sơn Hòa, Hồ Chí Minh 700000, Vietnam`.
   - `placeUrl`: the **full URL from the address bar** after the place panel opens (`https://www.google.com/maps/place/…/@10.79…,106.66…,17z/data=…!3d10.79…!4d106.66…`). It contains the venue's exact pin.
   - `shareLink`: Share → Copy link (`https://maps.app.goo.gl/…`).
   - `lat`, `lon`: the numbers after `!3d` (latitude) and `!4d` (longitude) in `placeUrl`. If the URL has no `!3d…!4d…`, leave both empty.
   - `dishEvidence`: where the dish shows, quoting the words, e.g. `Name: "Tiệm Cơm Kho Tộ Quận 3"` or `Menu tab: "Cá kho tộ – 85.000đ"`.
   - `priceVnd` only if the Menu tab shows a price for this dish (`{ "min": 85000, "max": 85000 }`). Otherwise omit it.
4. If you cannot find any venue that meets every rule, write the dish under `notFound` with one line saying why ("only 2 results, both under 20 reviews"). That is a useful result. Do not lower the bar.

**Do not copy** ratings, review counts, review text, opening hours or **photos** from Google Maps. Google's terms do not allow storing them, and the atlas only accepts photos with a licence. Photos come later from the Product Owner's own visits.

**Output** a single JSON file in this exact shape:

```json
{
  "batchId": "PO-GMAPS-001",
  "experience": "food",
  "kind": "venues",
  "agent": "product-owner",
  "researchedOn": "YYYY-MM-DD",
  "method": "Google Maps dish search in a browser; venues open, ≥4.0 rating from ≥50 reviews (selection only, not stored), dish shown in the venue name / Menu tab / owner description. Pins from the place URL (!3d/!4d).",
  "venues": [
    {
      "name": "Tiệm Cơm Kho Tộ Quận 3",
      "address": "114/1 Bàn Cờ",
      "venueType": "eatery",
      "sources": ["https://maps.app.goo.gl/BcUtaYZHyfFtJPz48"],
      "googleMapsUrl": "https://maps.app.goo.gl/BcUtaYZHyfFtJPz48",
      "lat": 10.7671822,
      "lon": 106.6505565,
      "coordinatePrecision": "exact",
      "coordinateSource": "https://www.google.com/maps/place/…",
      "dishes": [
        { "dishId": "ca-kho-to", "evidence": "Google Maps listing name: \"Tiệm Cơm Kho Tộ Quận 3\" (Vietnamese restaurant).", "url": "https://maps.app.goo.gl/BcUtaYZHyfFtJPz48" }
      ],
      "note": "Google Maps address: 114/1 Bàn Cờ, Hồ Chí Minh, Vietnam"
    }
  ],
  "notFound": [
    { "dishId": "o-mai-hang-duong", "reason": "only shops selling packaged ô mai; none list it as a dish" }
  ]
}
```

Rules for the fields:

- `address` is only the house number and street, the part before the first comma. Put the whole Google address line in `note`.
- `venueType` is `eatery` for a street shop or small quán, `restaurant` for a sit-down restaurant.
- One venue that serves two worklist dishes is a single entry with two items in `dishes`.
- The pin above is illustrative. Always read `lat`/`lon` from the venue's own place URL.

---

## Notes for Claude Code (intake)

- The batch shape is checked by `npm run intake`. `notFound` is ignored by the schema; copy it into the intake report or `docs/FOOD_COVERAGE.md` scouting notes.
- Supplied pins (`lat`/`lon` + `coordinatePrecision: exact` + `coordinateSource`) win over Nominatim, so Google's new-ward addresses (2025 wards, no former district) do not need geocoding.
- Links are imported as `source-listed` (evidence type `published-source`). A Menu-tab price is still not a `menu-confirmed` link unless the Product Owner records a menu photo with a licence (`templates/media.json`).
- D22 stands: the Places API is not used and nothing but the place link is stored from Google.
