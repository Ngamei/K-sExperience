# K's Experience

**Explore Vietnam. Experience it in Sài Gòn.**

A dish-first lifestyle discovery platform. The first experience, **Vietnamese Food**, maps dishes from every
region of Vietnam to their culinary origins on an illustrated interactive map, and shows where to taste them in
Ho Chi Minh City. Bars, Coffee, Spa and Shopping are planned modules (Settings → Experience Mode).

> **Checkpoint status:** runnable MVP in local mode. Catalogue = 138 clearly-labelled **seed** dishes (45 with licensed photos).
> 5 real HCMC venues from published sources (not yet confirmed on site) — see `docs/IMPLEMENTATION_PLAN.md` → *Release blockers*.

## Quick start

```bash
npm install        # also copies the MapLibre worker into public/vendor
npm run dev        # http://localhost:3000
```

No credentials are needed: the app runs in **local mode** from the JSON files in `data/`.

## Offline preview (no install needed by the reviewer)

```bash
npm run build:preview   # → preview/ks-experience-preview-<commit>.zip
```

Unzip, run `node serve.mjs` inside the folder, open http://localhost:4173 (Node 18+, works offline).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server (Vercel-compatible) |
| `npm run build:preview` | Static export to `out/` + offline zip in `preview/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next/core-web-vitals + TypeScript) |
| `npm test` | Vitest unit + integration tests |
| `npm run test:e2e` | Playwright (desktop + Pixel 7) against the production build — run `npm run build` first |
| `npm run qa` | All of the above in order |
| `npm run data:geo` | Rebuild geography files from the geoBoundaries source |
| `npm run data:seed` | Regenerate the seed catalogue through the importer (attaches curated photos) |
| `npm run data:restaurants` | Import researched HCMC venues (curated list + research batches; validates sources + HCMC boundary) |
| `npm run data:coverage` | Regenerate `docs/VENUE_COVERAGE.md` (venues per dish, target ≥ 5) |
| `npm run build:auth-test` / `npm run test:e2e-auth` | Build in Supabase mode against a mock Supabase and run the account-flow e2e |
| `npm run build:modules-test` / `npm run test:e2e-modules` | Build with the Coffee pilot flag on and run the cross-module e2e (mode switching, shared engine screens; fixtures injected) |
| `npm run data:research -- <module>` | Build a pilot dataset from `data/source/experiences/<module>/` (catalogue + researched venue batches + geocoding) |
| `npm run data:import-module -- <module> <file> [--kind …] [--write]` | CSV/JSON import into a module (dry run by default; report in `docs/imports/`) |
| `npm run data:experiences` | Data completeness report by experience → `docs/EXPERIENCE_DATA_REPORT.md` |
| `npm run build:e2e` | Build with development data (sample venues) for the e2e suite |
| `npm run test:db` | Apply Supabase migrations + seed to a throwaway local PostgreSQL/PostGIS DB and run RLS/integrity tests |
| `npm run db:seed-sql` | Regenerate `supabase/seed.sql` from the repository data |
| `npm run db:export` | Export the live Supabase catalogue to `backups/` (needs public URL + anon key) |
| `npm run exchange:export` | Regenerate the research contract, templates and duplicate-check exports in `research-exchange/` |
| `npm run intake -- <batch.json> [--apply]` / `-- --rollback <batchId>` | Validate (dry run) / import / roll back a research batch (see `research-exchange/README.md`) |
| `npm run data:what-to-eat` | Hôm nay ăn gì? attribute completeness → `docs/WHAT_TO_EAT_REPORT.md` |
| `npm run data:report` | Regenerate `docs/DATA_REPORT.md` (catalogue, photo, venue completeness; priority-50 progress) |
| `npm run data:import -- <file.json\|csv> --dataset master` | Import the master catalogue |
| `npm run data:validate` | Integrity checks across all data files (incl. HCMC-only rule) |

## Repository map

```
data/                    canonical datasets (see docs/DATA_SOURCES.md)
  source/                raw inputs (geoBoundaries, seed import file)
  samples/               fictional SAMPLE venues for UI preview only
scripts/                 geo build, importer CLI, preview packaging
src/app/                 Next.js App Router routes (one folder per screen)
src/components/          UI: shell, food, explore (map), dish, nearby, pages
src/experiences/         experience-module registry (food active; 4 coming soon)
src/lib/                 schema (Zod), importer, filters, search, availability, hours, recommend, passport, i18n, stores
supabase/migrations/     PostgreSQL + PostGIS schema with RLS (not yet applied)
tests/                   Vitest unit + integration;  e2e/  Playwright
docs/                    PRD, architecture, plan, decisions, data sources, QA report, screenshots
```

## Documentation
`AGENTS.md` · `docs/PRD.md` · `docs/ARCHITECTURE.md` · `docs/IMPLEMENTATION_PLAN.md` · `docs/DECISIONS.md` · `docs/DATA_SOURCES.md` · `docs/QA_REPORT.md` · `docs/BACKLOG.md` · `docs/AGENT_HANDOVER.md` · `docs/AUDIT.md` · `docs/RESTAURANT_VERIFICATION_PLAN.md` · `docs/DATA_REPORT.md`
