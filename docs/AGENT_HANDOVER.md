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

Multi-experience architecture: read `docs/EXPERIENCE_ENGINE.md` (reuse matrix, sequence A–H) before touching shared components.

## Open questions for PO / Codex
1. Where is the master catalogue file? (blocks CC-01)
2. Supabase: approve creating a project (free tier?) and provide keys via Vercel env (blocks CC-10/11).
3. Who performs first-hand venue verification (PO-01)? Proposed sheet columns in the verification plan.
4. Confirm which commit is deployed to Vercel, and whether production deploys should track this branch or `main` after review.

## Log
- **2026-11-27 · Claude Code** — Sprint 2 start: audit, data report, priority-50 list, verification plan, backlog, dish-page actions (copy name, more from origin). Venue research batches 1–6 done earlier today.
- **2026-11-27 · Claude Code** — CC-05 batch 7 (priority-50): +5 venues (hủ tiếu Mỹ Tho ×2, cơm hến, bún nước lèo, phở khô Gia Lai). Priority-50: 6 at ≥5, 16 at 1–4, 28 none. Next: remaining 28 priority dishes; then CC-07 verification importer once PO confirms who verifies.
- **2026-11-27 · Claude Code — Sprint 3** — Evidence levels (7) end-to-end; master-catalogue merge importer (no data loss, tested; caught & fixed a defaults-overwrite bug in dry run); Supabase: hardened migrations (RLS all tables, editor role, evidence constraint, HCMC trigger), storage bucket + audit trail, idempotent seed, local DB tests (14 checks), read path with fallback, Admin CMS with auth/persistence (live verification pending provisioning); docs/SUPABASE.md (setup, security, backup & recovery). Four provinces without dishes: **Thái Nguyên, Đắk Nông, Đồng Nai, Hậu Giang**. **Vercel:** Claude Code cannot see which commit is deployed (no Vercel access from the sandbox) — PO/Codex please record it here (Vercel → Deployments → commit SHA) and compare with `git log` on this branch. Master catalogue: Claude Code has no access to the ChatGPT conversation; the file must be committed (CX-04).
- **2026-11-27 · Claude Code — P0 accounts** — Baseline before the change: passport was localStorage-only (`ks-experience-user`), no user auth; `user_saved/user_tried` tables existed only in the unapplied schema. Now: migration 0003 (profiles, preferences, saved_experiences, experience_history, tasting_notes, user_media, user_achievements; owner-only RLS; delete_my_account; private user-media bucket), guest-first auth pages, persist-then-adopt guest migration, diff sync, Experience Passport modules, notes/ratings, visited venues. Tests: unit 47 + integration 15, DB 21 checks, local e2e 50 (server + static), account e2e 18 (9 scenarios × desktop + mobile, mock Supabase). Codex: please run independent security QA on migration 0003 and the auth flows (QA-007/QA-008); live OAuth/email checks after provisioning.
- **2026-11-27 · Claude Code — venue imagery + multi-experience foundations** — (1) Dish-at-place photos: `photo` on dish–venue links (migration 0004), venue cards show venue → menu/delivery → generic dish photo → icon; no real venue photos added (licensing, D31/PO-02). (2) Sport added as 6th mode (pilot planned; Pickleball, Pilates). Registry rewritten as the single config for 6 modules (nav labels per slot, terminology, filters, pricing units, passport terms, feature flags `NEXT_PUBLIC_FEATURE_*`). Migration 0005 (additive): `pilot-planned`, sport row, `establishment_experiences`, generic passport item types/actions — **seed now requires 0005**. Sport draft schemas in `src/experiences/sport/schema.ts`. Audit + reuse matrix in `docs/EXPERIENCE_ENGINE.md` (step A); step B extraction is next (CC-22), Coffee pilot after PO go-ahead (CC-23). Codex: please review the reuse matrix (CX-05).
- **2026-11-27 · Claude Code — shared Experience Engine + Coffee pilot** — Registry completed (routes, searchable fields, attributes, catalogue config, detail sections, offerings, pricing units); navigation built from shared slots for every module; one route set `src/app/[experience]/…`; engine schema/index/image; shared `OfferingRow` (Food dish pages use it); module screens (catalogue, item detail, map/Nearby/establishment, discover, passport, saved); per-experience passports with guest merge + sync; migration 0006 (`experience_items`, `offerings`). Coffee implemented, **flag off, dataset empty** (needs CX-06). New test build `npm run build:modules-test && npm run test:e2e-modules` (Coffee flag on, fixtures injected). Codex: please review `docs/EXPERIENCE_ENGINE.md` (CX-05) and QA the module build.
