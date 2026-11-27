# K's Experience

**Explore Vietnam. Experience it in Sài Gòn.**

A dish-first lifestyle discovery platform. The first experience, **Vietnamese Food**, maps dishes from every
region of Vietnam to their culinary origins on an illustrated interactive map, and shows where to taste them in
Ho Chi Minh City. Bars, Coffee, Spa and Shopping are planned modules (Settings → Experience Mode).

> **Checkpoint status:** runnable MVP in local mode. Catalogue = 138 clearly-labelled **seed** dishes.
> No real HCMC establishments are verified yet — see `docs/IMPLEMENTATION_PLAN.md` → *Release blockers*.

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
| `npm run data:seed` | Regenerate the seed catalogue through the importer |
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
`AGENTS.md` · `docs/PRD.md` · `docs/ARCHITECTURE.md` · `docs/IMPLEMENTATION_PLAN.md` · `docs/DECISIONS.md` · `docs/DATA_SOURCES.md` · `docs/QA_REPORT.md`
