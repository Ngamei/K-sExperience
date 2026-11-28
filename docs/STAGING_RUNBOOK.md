# Staging runbook — migrations 0009/0010, seed parity, accounts & Passport (KEX-DB-01)

Ordered steps for an **authorized Supabase staging project** and a **Vercel preview** (never Production). Tracks
[GitHub issue #2](https://github.com/Ngamei/K-sExperience/issues/2). Every step lists its evidence; record results in
`docs/QA_REPORT.md` with the review commit and environment. Production promotion stays pending PO review.

## 0. Current blocker (28 Nov 2026)

| Item | State |
| --- | --- |
| Authorized staging project | **Not confirmed.** A project `aibainipwgqbluhnqepu` exists and is empty ("No migrations"), but nobody has confirmed it is staging rather than the future production database. |
| Credentials in this workspace | None. No DB password, access token or anon key is available to Claude Code, and none should be pasted into chat. |
| What Claude Code did | Nothing against that project (no `supabase link`, no `db push`, no SQL). All evidence below is from a throwaway local PostgreSQL 16 + PostGIS database (`npm run test:db`). |
| Needed from PO | (1) Confirm `aibainipwgqbluhnqepu` is staging (or create a separate staging project). (2) Run steps 1–4 yourself in the Supabase dashboard, or give a trusted operator access — the DB password / service-role key stay with the operator, never in Git, Vercel or chat. (3) Add the three `NEXT_PUBLIC_*` values to the Vercel **Preview** environment only. |

## 1. Pre-flight (operator, before touching the database)

1. Confirm the project ref in the dashboard URL is the **staging** project. Stop if unsure.
2. Backup (skip on an empty project): `supabase db dump --db-url "$DB_URL" -f backups/staging-schema.sql` and `--data-only -f backups/staging-data.sql` on a trusted machine (`DB_URL` is a secret).
3. Check which migrations ran: SQL editor → `select to_regclass('public.offerings') is not null as has_0006, exists (select 1 from information_schema.columns where table_name='dishes' and column_name='eating') as has_0008, (select is_nullable from information_schema.columns where table_name='dishes' and column_name='spice_level') = 'YES' as has_0009, exists (select 1 from pg_constraint where conname = 'restaurants_coordinate_precision_check' and pg_get_constraintdef(oid) like '%building%') as has_0010;`

## 2. Migrations (in order, each one exactly once)

| Database state | Run |
| --- | --- |
| Empty (current `aibainipwgqbluhnqepu`) | `0001` → `0002` → … → `0008` → **`0009_unknown_spice.sql`** → **`0010_pin_precision.sql`** |
| Already at 0008 | **`0009_unknown_spice.sql`** then **`0010_pin_precision.sql`** |

Either paste each file into the SQL editor in order, or `supabase link --project-ref <staging-ref>` + `supabase db push` from a trusted machine. Evidence: no error per file; the pre-flight query (step 1.3) returns all `true`.

What they change: 0009 makes `dishes.spice_level` nullable (unknown ≠ 0; the 0–3 check stays). 0010 allows `coordinate_precision = 'building'`. Neither drops data. Both are safe to re-run (0009 only relaxes the column; 0010 drops the check `if exists` and re-adds it), but run them once and in order.

## 3. Seed + parity

1. Run `supabase/seed.sql` (idempotent — the local test runs it twice).
2. Generate the parity SQL from the review commit: `npx tsx scripts/print-seed-parity-sql.ts > parity.sql`. It is **read-only** (selects only).
3. Paste `parity.sql` into the SQL editor. Every row must read `PARITY PASS …`.

Expected at review commit (from canonical JSON): dishes 138 · unknown-spice dishes 0 · establishments 170 · experience tags 170 · Food links 121 · module items 37 · module offerings 61 · street pins 126 · building pins 1 · sample establishments 0.

## 4. Security checks (anon key only — what any browser can do)

1. Roles: `insert into user_roles (user_id, role) select id, 'editor' from auth.users where email = '<staging editor test identity>';` (operator, after that identity signed up once).
2. In a preview browser **signed out**: `/admin/` shows only the editor sign-in, no tools (`admin-locked`, state guest).
3. Signed in as a **non-editor test identity**: `/admin/` says "not an editor — no access", no tools.
4. Signed in as the **editor test identity**: tools appear, the save button reads "Save to database"; edit one test dish field, confirm it in Admin → Audit, then revert.
5. Bypass check (non-editor, UI skipped): call the REST API directly with the anon key and the non-editor's access token (from the preview's local storage): `fetch('<SUPABASE_URL>/rest/v1/dishes?id=eq.mi-quang', {method:'PATCH', headers:{apikey:'<anon>', Authorization:'Bearer <non-editor access token>', 'Content-Type':'application/json', Prefer:'return=representation'}, body: JSON.stringify({name_en:'x'})})` must return `[]` (RLS filters the row) and the dish must be unchanged. The same is proven locally for every curated table in `tests/db/rls.sql` (KEX-SEC-01 block).

## 5. Accounts & Passport (issue #2), on the preview with staging test identities

| # | Flow | Pass when |
| --- | --- | --- |
| A1 | Browse/search as guest; open Passport | Sign-in prompt shown; after sign-in you return to the requested Passport |
| A2 | Sign-up → confirmation email → sign-in → sign-out → password reset | Each completes; redirect URLs (`/auth/callback/`, `/reset-password/`) are allow-listed for the preview domain |
| A3 | Google sign-in | Only if in launch scope; separate test |
| A4 | Save a dish, record a Passport action; open a second isolated browser context | Both visible after sign-in in the second context |
| A5 | Second test account | Cannot read or modify the first account's rows (also `tests/db/rls.sql` 3c) |
| A6 | Guest saves + Passport progress, then sign in; sign in again on another device | Migrated once, no duplicate actions (earliest date kept) |

Record: review commit, preview URL, staging project ref, pass/fail per row, any configuration blocker.

## 6. Rollback

- Bad migration: restore `backups/staging-*.sql` (or, on staging, recreate the project and re-run steps 2–3).
- Bad seed: re-run `supabase/seed.sql` from the last good commit.
- App: remove the `NEXT_PUBLIC_*` Supabase values from the Preview environment — the app returns to local mode and `/admin/` fails closed ("Admin is not available on this deployment").

## Local evidence (no hosted access needed)

`npm run test:db` applies `0001`–`0010` in order to a fresh PostgreSQL 16 + PostGIS database, runs the seed twice, checks the columns the app reads as `anon`, runs the seed parity SQL above (10/10 PASS) and the RLS suite (53/53 PASS, incl. KEX-SEC-01: anon and signed-in non-editor writes to dishes, restaurants, links, offerings, items, tags, origins, `user_roles` and `content_audit` are all refused; the editor's write succeeds and is audited). The account flows run end-to-end against a mock Supabase in `npm run test:e2e-auth`.
