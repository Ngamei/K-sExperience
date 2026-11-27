# Agent handover — K's Experience

_Shared coordination file between Codex (PM / tech lead / QA / data integrity) and Claude Code (implementation). Update at the end of every working session._

## Current state (Claude Code, 2026-11-27)
- Branch: `claude/trusting-clarke-44sf7b` (all work pushed). The live Vercel site was deployed by the PO; **which commit it serves is not recorded here** — please note it in this file.
- Baseline: all checks green (see `docs/AUDIT.md`, `docs/QA_REPORT.md`).
- Data: 138 **seed** dishes; 45 licensed photos; 108 real HCMC venues "listed by source", 0 first-hand confirmed. Generated reports: `docs/DATA_REPORT.md`, `docs/VENUE_COVERAGE.md`.
- Sprint backlog: `docs/BACKLOG.md`. Verification plan: `docs/RESTAURANT_VERIFICATION_PLAN.md`.

## How to run / check
```
npm ci && npm run dev            # local
npm run qa                       # typecheck, lint, unit+integration, build, e2e
npm run data:report              # data completeness report
npm run data:restaurants && npm run data:coverage   # after adding venue research
```

## File ownership (avoid concurrent edits)
| Area | Owner | Notes |
| --- | --- | --- |
| `src/`, `scripts/`, `e2e/`, `tests/`, `supabase/` | Claude Code | Codex proposes changes via `docs/BACKLOG.md` tickets |
| `data/source/venue-research/`, `data/source/dish-photos.json`, generated `data/*.json` | Claude Code | Regenerate via scripts, never hand-edit canonical files |
| `data/source/master-catalogue.*`, `data/source/priority-dishes.json` (ordering) | Codex / PO | Claude Code imports |
| `docs/BACKLOG.md` | Codex | Claude Code only updates the Status column of its own tickets |
| `docs/QA_REPORT.md` | shared | Claude Code: automated results; Codex: *Independent QA* section |
| `docs/DECISIONS.md` | shared, append-only | flag PO decisions with **[PO?]** |
| `docs/DATA_REPORT.md`, `docs/VENUE_COVERAGE.md` | generated | do not edit by hand |
| `docs/AGENT_HANDOVER.md` | shared | append a dated entry per session |

Use separate branches per agent (e.g. `codex/<topic>`); merge via PR reviewed by the other agent. Never push to the branch the other agent is working on.

## Open questions for PO / Codex
1. Where is the master catalogue file? (blocks CC-01)
2. Supabase: approve creating a project (free tier?) and provide keys via Vercel env (blocks CC-10/11).
3. Who performs first-hand venue verification (PO-01)? Proposed sheet columns in the verification plan.
4. Confirm which commit is deployed to Vercel, and whether production deploys should track this branch or `main` after review.

## Log
- **2026-11-27 · Claude Code** — Sprint 2 start: audit, data report, priority-50 list, verification plan, backlog, dish-page actions (copy name, more from origin). Venue research batches 1–6 done earlier today.
