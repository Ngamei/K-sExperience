# Authentication & cross-device persistence — launch checklist (P0)

PO priority 2026-11-28 (D81): real production authentication, email sign-up, Google OAuth, account isolation and
cross-device Passport / references / preferences are **launch blockers**. Setup steps live in `docs/AUTH_SETUP.md` and
`docs/STAGING_RUNBOOK.md`; this file tracks **what is proven, by whom, with what evidence**.

Legend: ✅ verified (evidence linked) · 🟡 reported or indirect evidence only · ⬜ not done · ⛔ blocked (reason).
"Verified" requires a passing test or browser/database evidence — never code inspection alone (AGENTS.md).

## A. Database (production project `aibainipwgqbluhnqepu`, D65)

| # | Check | Owner | State | Evidence |
| --- | --- | --- | --- | --- |
| A1 | Migrations 0001–0015 applied, in order, once | CI → CX | 🟡 | GitHub Actions *Supabase migrations* run 46158376758 on `main` @ `d1d0dc3` — `deploy-production-db` → "Apply migrations, seed, parity" **success** (2026-11-28 15:11 UTC). Not yet re-checked by a query against `supabase_migrations.schema_migrations`. |
| A2 | Seed parity 10/10 on production | CI → CX | 🟡 | Same run (parity step inside `scripts/db-deploy.sh`). |
| A3 | RLS on for every public table; advisors clean | CX | ⬜ | Run the read-only checks in `docs/STAGING_RUNBOOK.md` §4 + Supabase advisors. (Claude Code's Supabase connector failed to connect this session.) |
| A4 | Independent review of **0013** (staff roles ≠ memberships) and **0014** (quotas) | **Codex** | ⬜ | Review scope below (§E). |
| A5 | Independent review of **0016** (menu unlocks + Founding Member) and **0017** (info reports) | **Codex** | ⬜ | Branch for this sprint; DB tests in `tests/db/rls.sql`. |
| A6 | Local DB suite green (all migrations on fresh PG16 + PostGIS, seed ×2, parity, RLS) | CC | see QA_REPORT | `npm run test:db` |

## B. Providers & configuration (PO — needs dashboard access)

| # | Check | Owner | State |
| --- | --- | --- | --- |
| B1 | Supabase Site URL + redirect URLs (production + preview: `/auth/callback/`, `/reset-password/`, `/admin/`) | PO | ⬜ |
| B2 | Email provider on, "Confirm email" on; **custom SMTP** before launch (built-in mail is rate-limited) | PO | ⬜ SMTP needs provider choice (free tier exists) |
| B3 | Google OAuth client (consent screen, origin, Supabase callback) → Supabase Google provider | PO | ⬜ |
| B4 | Vercel env: `NEXT_PUBLIC_DATA_MODE=supabase`, URL, **publishable** key, `NEXT_PUBLIC_AUTH_METHODS=google` (add others only when configured) | PO | ⬜ |
| B5 | Facebook / phone (SMS is paid per message) | PO | ⬜ deferred — not launch blockers |

## C. Customer journeys (real accounts, two independent browser profiles/devices)

| # | Journey | State |
| --- | --- | --- |
| C1 | Email sign-up → confirmation mail → sign-in → sign-out → password reset | ⬜ |
| C2 | Google sign-in (new account) and returning sign-in | ⬜ |
| C3 | Guest activity (saved items, Passport) migrates into the new account on first sign-in | ⬜ (mock e2e ✅) |
| C4 | **Cross-device:** save a reference + Passport entry + preferences on device 1 → visible on device 2 after sign-in | ⬜ (KEX-AUTH-01 ⛔ test inboxes / profiles) |
| C5 | **Isolation:** account B never sees account A's saves, notes, Passport, reports or membership | ⬜ (DB RLS tests ✅ locally) |
| C6 | Account deletion removes personal data; content records keep working | ⬜ |
| C7 | Membership tier read correctly; quota meter shows usage; limits stay **off** (D72) | ⬜ |
| C8 | Full journey (PO example): find a Pilates studio near work → compare prices → save → recover on another device | ⬜ (needs Sport data with prices — see `docs/PROFILE_COMPLETENESS.md`) |

**Unblock C1–C8:** the PO (or Codex with a browser) needs two test inboxes (e.g. plus-addressing on one mailbox) and
two browser profiles. Record results in `docs/QA_REPORT.md` → *Independent QA*, then delete the test accounts.

## D. Security sign-off

| # | Check | Owner | State |
| --- | --- | --- | --- |
| D1 | No service-role key in the repo or browser bundle (`grep` the build output) | CX | ⬜ |
| D2 | `/admin/` fails closed on public deployments; only `user_roles` staff get tools (KEX-SEC-01) | CX | ⬜ independent check |
| D3 | Anonymous / non-staff writes to content tables refused (RLS) — repeat with the anon key on production | CX | ⬜ |
| D4 | Reports (0017): anon may insert only `status='new'`, never read others' reports; evidence bucket private | CX | ⬜ |
| D5 | No customer can grant themselves a tier or role (0013/0016 RPCs) | CX | ⬜ |

## E. Codex review scope for 0013 / 0014 / 0016 / 0017

1. Every policy: who can select / insert / update / delete; `with check` matches `using`.
2. Every `security definer` function: fixed `search_path`, `execute` revoked from `public`/`anon` where not needed, only answers for `auth.uid()`.
3. Quota enforcement (0014, 0016): off by default (`membership_settings.enforce_limits`); when on — per-experience counting, no double count on re-save / re-open, downgrade + expiry behaviour, concurrent inserts can't exceed a cap (advisory locks).
4. Founding Member (0016): disabled by default; cap 100 cannot be exceeded concurrently; no double claim; never touches `source='billing'`; reverts to Free at `valid_until` (no automatic billing).
5. Audit trail: membership and report-status changes land in `content_audit`.
