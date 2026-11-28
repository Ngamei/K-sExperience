# Intake GPT-CAT-003 — dry run

- Experience: food · kind: catalogue · agent: chatgpt · researched 2026-11-28
- Method: Web search excerpts explicitly naming dishes; full source and regional associations pending review. Region-only values are provisional associations, not birthplace claims. No unsupported diet, prices, nutrition or venue links. Exact normalized name deduplication against main and GPT-CAT-002; semantic overlap (especially fish stews) must be reviewed.
- Result: **20 accepted, 0 rejected, 1 warnings** (2026-11-28T15:48:28.897Z)

## Warnings

- batch GPT-CAT-003 is not in queue.json — add it (scope, assignee, claims) before importing

## Catalogue importer output

```
! row 20 (Gỏi cà đắng): No primary origin; dish will be placed at its first associated origin

Rows: 20  Imported: 20  Skipped: 0
merge: matched 0, added 20, kept 138, orphan links 0 → docs/IMPORT_REPORT.md
```

Full merge report: docs/IMPORT_REPORT.md

Dry run only — nothing was written. Re-run with `--apply` to import the accepted records.
