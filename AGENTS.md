# AGENTS.md — K's Experience

Guidance for any AI agent (Claude Code, ChatGPT, others) working in this repository.

## Roles
- **Product Owner** — vision, business decisions, approvals (paid services, deployment, credentials).
- **ChatGPT / Codex** — Product Manager, Technical Lead and QA: requirements, data preparation, review, independent testing, data integrity.
- **Claude Code** — implementation engineer: code, terminal, debugging, automated tests.

The repository and the canonical docs below are the source of truth between agents. Do not rely on chat history.

## Canonical documents (keep them current with every change)
| File | Purpose |
| --- | --- |
| `README.md` | Setup, scripts, preview instructions |
| `docs/PRD.md` | Product requirements as implemented |
| `docs/ARCHITECTURE.md` | Structure, data flow, modules |
| `docs/IMPLEMENTATION_PLAN.md` | Phase checklist, blockers, next actions |
| `docs/DECISIONS.md` | Product + technical decision log (with "needs PO confirmation" flags) |
| `docs/DATA_SOURCES.md` | Every dataset: source, licence, status, import format |
| `docs/QA_REPORT.md` | Exact commands, results, evidence, known issues |
| `docs/BACKLOG.md` | Prioritised sprint tickets with owners and status |
| `docs/AGENT_HANDOVER.md` | Coordination between Codex and Claude Code, file ownership, session log |
| `docs/AUDIT.md` | Feature audit against the PRD with evidence |
| `docs/EXPERIENCE_ENGINE.md` | Multi-experience architecture: registry, reuse matrix, sequence |
| `docs/NEIGHBOURHOODS.md`, `docs/NEIGHBOURHOOD_COVERAGE.md` | Neighbourhood-first strategy proposal; generated coverage audit (`npm run data:neighbourhoods`) |
| `research-exchange/README.md` | Shared research contract, queue and intake workflow (Claude Code · ChatGPT · Codex) |
| `docs/RESTAURANT_VERIFICATION_PLAN.md` | Evidence levels and workflow for HCMC venues |
| `docs/DATA_REPORT.md`, `docs/VENUE_COVERAGE.md`, `docs/WHAT_TO_EAT_REPORT.md` | Generated data reports (`npm run data:report`, `npm run data:coverage`, `npm run data:what-to-eat`) |

## Non-negotiable rules
1. **Never fabricate** dishes, restaurants, prices, reviews, opening hours or menu availability.
2. Seed/sample data must be **visibly labelled** in the UI and in the data (`dataset: "seed"`, `isSample: true`, `[SAMPLE]` names).
3. Sample venues are **never** used in recommendations (`buildAvailabilityIndex(..., { includeSamples: false })`).
4. Restaurants must be inside the **current HCMC boundary** (`data/hcmc-boundary.geojson`); enforced by `npm run data:validate`.
5. A real dish–venue link may be `verified-available` only with `menuEvidence` + `lastVerified`.
6. Keep regional variants as **separate dishes** linked by `family`; never merge them.
7. No secrets in the repo. Only `NEXT_PUBLIC_*` values may reach the browser. Never expose the Supabase service-role key.
8. No production deployment, paid services or permission changes without Product Owner approval.

## Working agreement
- Run `npm run qa` (typecheck, lint, unit+integration, build, e2e) before declaring work done; record results in `docs/QA_REPORT.md`.
- Do not mark a feature complete from code inspection alone — it needs a passing test or browser evidence.
- Data changes go through the importer (`npm run data:import`) and validators, never hand-edited canonical files.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
