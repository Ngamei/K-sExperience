# Intake GPT-CAT-003 — applied

- Experience: food · kind: catalogue · agent: chatgpt · researched 2026-11-28
- Method: Web search excerpts explicitly naming dishes; full source and regional associations pending review. Region-only values are provisional associations, not birthplace claims. No unsupported diet, prices, nutrition or venue links. Exact normalized name deduplication against main and GPT-CAT-002; semantic overlap (especially fish stews) must be reviewed.
- Result: **20 accepted, 0 rejected, 0 warnings** (2026-11-28T15:49:47.982Z)

## Catalogue importer output

```
! row 20 (Gỏi cà đắng): No primary origin; dish will be placed at its first associated origin

Rows: 20  Imported: 20  Skipped: 0
merge: matched 0, added 20, kept 160, orphan links 0 → docs/IMPORT_REPORT.md
✓ wrote data/vietnamese-dishes.json
```

Full merge report: docs/IMPORT_REPORT.md

Next: `npm run db:seed-sql && npm run data:report && npm run data:coverage && npm run data:experiences && npm run data:what-to-eat && npm run exchange:export`, then `npm run qa`.
