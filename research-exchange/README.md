# Research exchange — K's Experience

Shared hand-off point between **Claude Code** (establishment-first research, menus, prices, offering evidence; importer owner), the **ChatGPT Research Team** (master Food catalogue, everyday meals, assigned establishment batches) and **Codex** (independent data-quality review). One pipeline: everything enters through `npm run intake`, which wraps the existing importers and validators.

## What is here

| Path | What | How it is produced |
| --- | --- | --- |
| `contract/schema.sql` | Current database schema (all migrations in order) | `npm run exchange:export` |
| `contract/json-schema/*.json` | JSON Schemas: dish, dish-eating, restaurant, opening-hours, dish-restaurant-link, link-photo, experience-item, establishment, offering, **research-batch** | generated from the app's Zod schemas |
| `contract/vocabularies.json` | Every valid value: categories, dish types, tastes, dietary tags, meal times, regions + 63 provinces, eating attributes, venue types, price ranges, link statuses + allowed evidence per status, photo kinds, module categories/attributes/pricing units/item ids, **identifier rules** | generated |
| `templates/` | `venues-batch.json`, `catalogue-batch.json`, `catalogue-import.csv`, `module-*.csv`, `media.json` | generated |
| `samples/` | Real, already-imported batches (Food, Bars, Coffee) | copied |
| `exports/*.csv` | Current dishes, establishments (all experiences), offerings (dish/item × establishment) and module items — **check these for duplicates before researching** | generated |
| `briefs/<batchId>.md` | Research brief for a handed-over batch (scope, priorities, leads to confirm) | assigning agent |
| `queue.json` / `QUEUE.md` | Shared research queue (batch id, experience, scope, claims, assignee, status, sources, import status, validation) | edit `queue.json`; intake updates it |
| `inbox/` | Put submitted batches here (`<batchId>.json`) | researchers |
| `reports/<batchId>.md` | Intake report: accepted / rejected / warnings per venue | `npm run intake` |
| `audit/history.jsonl` | Batch-level audit trail (dry runs, applies, rollbacks) | `npm run intake` |
| `backups/<batchId>/` | Canonical files as they were before that batch (for rollback) | `npm run intake -- … --apply` (git-ignored) |

## Workflow

1. **Claim** — add a `queue.json` entry with `status: "planned"`, your `assignedTo`, a precise `scope` and `claims` (`items` = dish/item ids, `districts` = former district names). Intake warns when another agent's active claim covers the same item in the same district. Current split: Claude Code = central districts (Quận 1/3/5/10, Phú Nhuận) + menus/prices + Coffee/Spa/Bars/Sport; ChatGPT = master catalogue (GPT-CAT-*) and outer districts (GPT-FOOD-*).
2. **Research** — one batch file per queue entry, from `templates/`. Batch id `<AGENT>-<SCOPE>-<NNN>` (CC, GPT, CX, PO), e.g. `GPT-FOOD-001`.
3. **Dry run** — `npm run intake -- research-exchange/inbox/GPT-FOOD-001.json`. Validates schema, ids, sources, prices, photo metadata, HCMC boundary, duplicates against `exports/`, claims overlap, and geocodes in a scratch copy (street must match, ≤ 6 km from the stated district). Writes `reports/<batchId>.md`. Nothing canonical changes.
4. **Apply** (Claude Code or PO) — `npm run intake -- … --apply`. Backs up canonical files, stores the batch next to the legacy batches (rejected venues kept as `excluded` with the reason), runs the existing importer, verifies that **no existing id disappeared** (user saved items, history, passports and notes reference them) and restores automatically on any failure.
5. **Rollback** — `npm run intake -- --rollback <batchId>` restores the backup and removes the stored batch.
6. **After each applied batch** — `npm run db:seed-sql && npm run data:report && npm run data:coverage && npm run data:experiences && npm run data:what-to-eat && npm run exchange:export`, then `npm run qa`; Codex reviews `reports/<batchId>.md`.

## Rules (non-negotiable)

- Never fabricate dishes, venues, prices, hours, menus, reviews, dietary attributes or photos. Omit unknown fields — unknown is a valid value.
- Every venue cites at least one https source that names it; every offering cites a source naming **this venue AND this exact item**. Menu-confirmed status needs an official menu / delivery listing / menu photo (see `allowedEvidencePerStatus`).
- Prices only from a menu, delivery listing or dated article (VND per item, `priceVnd {min,max}` for Food; `price {minVnd,maxVnd,unit}` for modules).
- Supplied coordinates must state `coordinatePrecision` (`exact` = mapped POI of this venue or its house number · `building` = the building that contains the unit · `street`) and `coordinateSource` (e.g. the OSM object URL). They always win over geocoder results; a building pin is never shown as the unit.
- Addresses must be inside current Ho Chi Minh City (2025 boundary). Give house number + street and the former district; coordinates are geocoded and checked — wrong-ward matches are rejected, never guessed.
- Evidence only moves up: a weaker status never overwrites a stronger one (except a dated `temporarily-unavailable`).
- Regional variants are separate dishes linked by `family`. Existing ids never change; nothing is deleted by an import.
- Photos: only of this exact item at this venue (or a licensed reference labelled "not from this venue"), with licence, attribution, source page and last-checked date (`templates/media.json`).

## Identifier conventions

See `contract/vocabularies.json → identifiers`: dish = slug of `nameVi`; establishment = slug of `<name> <house number + street>`; offering = `<item>@<establishment>`; batch = `<AGENT>-<SCOPE>-<NNN>`.
