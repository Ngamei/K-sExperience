# GPT-BARS-001 (BAR-CRAFT-20261128-01) — dry run 27/5 vs apply 26/6 (KEX-QA-01)

## Runs (from `research-exchange/audit/history.jsonl`)

| Run (UTC) | Mode | Accepted | Rejected | What changed before this run |
| --- | --- | ---: | ---: | --- |
| 05:08:19 | dry run 1 | 31 | 1 | — (only Pasteur Street Phú Mỹ Hưng rejected: no street number) |
| 05:09:19 | dry run 2 | 31 | 1 | report gained pin precision + geocoder match columns |
| 05:10:49 | dry run 3 | **27** | **5** | new rule: street-level pin nearer another district → reject |
| 05:11:34 | apply | **26** | **6** | same code and batch as dry run 3; Nominatim queried again |

## The six rejects (retained in `data/source/experiences/bars/batch-GPT-BARS-001.json` as `excluded`, with reasons; not imported)

| Venue | Reason (stored) | Dry run 3 | Apply |
| --- | --- | --- | --- |
| Pasteur Street Craft Beer – Phú Mỹ Hưng (CR5-01, Crescent Residence 5) | not geocoded: not found (no house number + street) | rejected | rejected |
| Pasteur Street Craft Beer – Bùi Viện (212 Đề Thám) | street-level pin nearer Quận 4 than Quận 1 | rejected (Quận 4) | rejected (Quận 4) |
| Pasteur Street Craft Beer – Hoàng Sa (221 Hoàng Sa) | street-level pin nearer Quận 3 than Quận 1 | rejected — reason said **Quận 10** | rejected — **Quận 3** |
| BiaCraft – Trường Sa (300-304 Trường Sa) | street-level pin nearer Quận 3 than Phú Nhuận | rejected | rejected |
| Deme Brewing Taproom (393/7 Hai Bà Trưng) | street-level pin nearer Quận 1 than Quận 3 | rejected | rejected |
| Tiệm Bia Gà – Tên Lửa (362 Tên Lửa) | street-level pin nearer Quận 6 than Bình Tân | **accepted** | **rejected** |

## Why the counts differ — Nominatim returned different street-level points in dry run 3

- The points stored by the apply (`data/source/experiences/bars/geocoded.json`) are **identical to dry run 1's** (printed in that run's report):
  Tên Lửa 10.741281, 106.61441 · Hoàng Sa 10.78519, 106.675984 (both `precision: street`, house number not located).
- With those points the rule is deterministic: Tên Lửa is 2.34 km from the Quận 6 centre vs 2.92 km from Bình Tân (2.34 + 0.5 < 2.92 → reject, by 0.08 km); Hoàng Sa is nearest Quận 3 (0.91 km; Quận 10 1.67 km).
- Dry run 3 must therefore have received **different** points for these two queries: it named Quận 10 for Hoàng Sa (impossible from the stored point) and accepted Tên Lửa. Dry runs geocode in a scratch copy and did not keep their coordinates, and the apply overwrote `reports/GPT-BARS-001.md`, so dry run 3's exact points were not retained — a process gap, fixed below.
- Correction: on 2026-11-28 I first reported that the *apply* run got a different point for Tên Lửa. The evidence shows the opposite: the apply matched dry run 1; dry run 3 was the outlier.
- All six rejects are conservative (unconfirmed exact location); none was published. Tên Lửa is borderline and should be confirmed with an exact address/pin (BAR-02).

## Fixes (scripts/intake.ts)

1. A dry run saves its geocodes to `research-exchange/geocodes/<batchId>.json`; an apply **reuses** that snapshot instead of querying Nominatim again, so the imported coordinates are the reviewed ones (apply warns if no snapshot exists).
2. Every run's report is kept in `research-exchange/reports/history/<batchId>-<dryrun|apply>-<timestamp>.md` (the top-level report remains "latest").
3. A dry run no longer downgrades an already imported batch in `queue.json`.

## Address normalisation path that was fixed (src/lib/data/exchange.ts)

`normalizeVi` turns "/" and "-" into spaces, so house numbers were split before parsing: "144/3 Pasteur" → "144 3 pasteur" (street read as "3 pasteur", number "144"), "181–185 Lý Tự Trọng" → "181 185 ly tu trong". Consequences: the original Pasteur Street taproom (144/3) did not match the existing record at 144 Pasteur, and street-name checks against the geocoder failed for ranged numbers. Fix: `HOUSE` regex takes the house number from the **raw** first address segment (`/^\s*(\d[\dA-Za-z/\-–—.]*)\s+/`), `streetOf` normalises only the remainder, `numberOf` keeps the base number ("144/3" → "144", "181-185" → "181"); `scripts/exchange-convert.ts` reuses both, and en/em dashes are converted to "-". Tests: `tests/unit/exchange.test.ts`. Result: Pasteur Street – Original merged into `pasteur-street-brewing-pasteur` and East West into `east-west-brewing-ly-tu-trong` (ids, names, evidence kept).
