# Intake GPT-CAT-001 — applied

- Experience: food · kind: catalogue · agent: chatgpt · researched 2026-11-28
- Method: Read the original Vietnamese publications. Compare normalized names with the canonical catalogue. Use associated origins where the source describes a local preparation or regional use. This batch contains dishes only.
- Result: **2 accepted, 0 rejected, 0 warnings** (2026-11-28T15:49:42.201Z)

## Catalogue importer output

```
! row 1 (Cơm gà xối mỡ): No primary origin; dish will be placed at its first associated origin
! row 2 (Bún riêu chay): No primary origin; dish will be placed at its first associated origin

Rows: 2  Imported: 2  Skipped: 0
merge: matched 0, added 2, kept 138, orphan links 0 → docs/IMPORT_REPORT.md
✓ wrote data/vietnamese-dishes.json
```

Full merge report: docs/IMPORT_REPORT.md

Next: `npm run db:seed-sql && npm run data:report && npm run data:coverage && npm run data:experiences && npm run data:what-to-eat && npm run exchange:export`, then `npm run qa`.
