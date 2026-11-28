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
- **2026-11-27 · Claude Code — engine completion, pilots, auth gate** — CC-22 done (Food on shared catalogue/detail/filter components). CC-25 done (Supabase module read/write, migration 0007, Admin per experience, CSV/JSON import + CLI). Pilots Coffee/Bars/Spa/Sport implemented behind flags with sourced catalogues; Coffee has 4 real cafés / 5 evidenced offerings (`data/source/experiences/coffee/`). Consumer seed banners removed (samples dev-only). P0: Account first in Settings + one Passport gate. SW cache versioned per build. New docs: `docs/EXPERIENCE_DATA_REPORT.md`, `docs/PREVIEW_CHECKLIST.md`. Codex: QA the Preview with `NEXT_PUBLIC_FEATURE_COFFEE=1` (+ others) per the checklist; account tests used a **mock** Supabase — real OAuth/email still need the provisioned project.
- **2026-11-27 · Claude Code — Bars/Spa/Sport venue research** — Bars: Stir (Truffle Martini, new signature item) and Pasteur Street Brewing (craft beer, new item). Spa: 4 head-spa venues. Sport: Court One Club (New World Saigon), HCMC Cultural Palace for Labors, PickoLand Thảo Điền, Bang Bang Pickleball (social play + equipment rental), UFiTU Pilates+ (reformer). Withheld (wrong-ward geocodes): Rudal, HitPark, Olaben. Sources were read from search-result excerpts because direct page fetches were DNS-blocked in this environment — **Codex: please spot-check the source URLs** (`data/source/experiences/*/batch-01.json`). Report: `docs/EXPERIENCE_DATA_REPORT.md`.
- **2026-11-27 · Claude Code — data enrichment** — Coffee +2 venues (Japanit: matcha latte; Trà Việt: lotus tea). Spa +2 (La Maison de L'Apothiquaire: facial/manicure/pedicure; Le Spa des Artistes: reflexology/facial/manicure/pedicure). Food CC-16: xôi xéo (Xôi xéo Hà Nội, 81 Ngô Thời Nhiệm) and bún đỏ Buôn Ma Thuột (Cô Bé Ban Mê, 40 Nguyễn Hồng Đào) → 34 dishes with venues. Not linked: Đồng Tháp bánh tằm bì (different regional variant from Bạc Liêu); chả cá Lã Vọng and bún sứa (no HCMC venue with a confirmed address). Sources from search excerpts — spot-check.
- **2026-11-27 · Claude Code — pilots opened (PO decision D47)** — Bars, Coffee, Spa and Sport are now selectable by everyone (registry `enabledByDefault`, "Pilot" badge); Shopping stays Coming soon. Tests updated accordingly. Codex: the pilot data has not had independent QA yet — please prioritise spot-checking sources now that it is public.
- **2026-11-27 · Claude Code — P1 visual parity** — 24/37 pilot items now have Commons reference photos (licence, author, source); all items have category illustrations; cards/hero/venue cards/markers/discover/passport/empty states use shared media components. Before/after screenshots in `docs/screenshots/parity/` (photos render as illustrations inside the sandbox because Wikimedia blocks automated image fetches; real browsers load them, as with Food). **Codex: visual parity review required before accepting CC-29.**
- **2026-11-28 · Claude Code — Hôm nay ăn gì? (CC-30)** — Audit: all 138 dishes have meal times, taste, ingredients, dietary tags; venues have almost no price (1/115), hours (1/115) or atmosphere (0) → those filters caution instead of excluding. Built `/what-to-eat` in Food (nav after Discover), deterministic engine + 12 collections + 6 modes, actions (save, ate this, not today, find places, surprise, alternatives), Settings preferences applied. Migration 0008 (`dishes.eating`, `restaurants.dining`; **apply 0008 before re-running the seed**), Admin fields + Recommendations tab, importer columns, `npm run data:what-to-eat`. Codex: QA the page on desktop/mobile, review wording (no health claims) and D50–D53; data team: CX-09.
- **2026-11-28 · Claude Code — more Bars/Coffee/Sport venues** — Bars +2: East West Brewing Co. (181-185 Lý Tự Trọng; craft beer), Bia Saigon 73 (73 Bùi Viện; bia hơi). Coffee +2 for cà phê trứng: Ông Chú Cuội Hẻm (117/28A Cống Quỳnh), Runam Bistro (2-4-6 Đồng Khởi). Sport +1: Gym One Pickleball (26A Lê Quý Đôn; court rental, equipment rental, beginner coaching). Withheld: Kira Pilates (geocode hit an unrelated business). Skipped for conflicting addresses: Tamarind, Saigon Coffee Roastery, Tonkin, English & Coffee; Belgo/Lac (sources 2018–19). Sources read from search excerpts — **spot-check** (`data/source/experiences/{bars/batch-02,coffee/batch-03,sport/batch-02}.json`), especially whether Bia Saigon 73 is still trading.

