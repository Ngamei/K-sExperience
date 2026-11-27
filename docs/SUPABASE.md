# Supabase — setup, operations, backup & recovery

**Status:** integration ready; **no project provisioned** (PO approval required — free tier only, no paid upgrades).
Local mode remains the default and keeps working without Supabase.

## What is in the repo
| Item | File |
| --- | --- |
| Schema, RLS, editor role, evidence-level constraints, HCMC-boundary trigger | `supabase/migrations/0001_init.sql` |
| Photo storage bucket (public read, editors write) + content audit trail | `supabase/migrations/0002_storage_and_audit.sql` |
| Data seed (generated, idempotent; real venues only) | `supabase/seed.sql` ← `npm run db:seed-sql` |
| Local DB tests (RLS, permissions, evidence rules, HCMC boundary, storage, audit, seed idempotency, app read columns) | `npm run test:db` (needs local PostgreSQL 16 + PostGIS 3) |
| App read path (falls back to bundled data on error) | `src/lib/supabase/food.ts`, `src/components/food/food-data.tsx` |
| Dish-at-place photos on links (all-or-nothing photo fields) | `supabase/migrations/0004_link_photos.sql` |
| Multi-experience foundations: `pilot-planned` status, Sport module, `establishment_experiences`, generic passport item types/actions | `supabase/migrations/0005_multi_experience.sql` |
| Shared engine: `experience_items`, `offerings` (evidence + photo constraints, mode-tag trigger, RLS, audit) | `supabase/migrations/0006_experience_items_offerings.sql` |
| User accounts & Experience Passport (profiles, preferences, saved items, history, tasting notes, media, achievements; owner-only RLS; account deletion; private `user-media` bucket) | `supabase/migrations/0003_user_accounts.sql` |
| Guest-first auth + passport sync (client) | `src/components/shell/auth-provider.tsx`, `src/lib/supabase/passport.ts`, `src/lib/passport/model.ts`, `src/components/auth/` |
| Account-flow e2e against a mock Supabase | `npm run build:auth-test && npm run test:e2e-auth` |
| Admin persistence (auth, dishes, origins, establishments, evidence links, photos, import, audit) | `src/lib/supabase/admin.ts`, `src/components/admin/`, `src/components/pages/admin-view.tsx` |
| Public-data export / backup | `npm run db:export` |

## Provisioning (PO, ~10 minutes, free tier)
1. supabase.com → New project → **Free plan**, region **Southeast Asia (Singapore)**, strong DB password (store in your password manager).
2. SQL Editor → run the migrations **in order**: `0001_init.sql`, `0002_storage_and_audit.sql`, `0003_user_accounts.sql`
   (accounts & Experience Passport), `0004_link_photos.sql` (dish-at-place photos), `0005_multi_experience.sql`
   (six experience modes incl. Sport, establishments in several modes), `0006_experience_items_offerings.sql`
   (shared engine items + offerings for Coffee and later modules) — **then** `supabase/seed.sql` (the seed needs 0005).
3. Authentication settings:
   Authentication → URL configuration: Site URL = production URL; Redirect URLs for each environment: `/auth/callback/`, `/reset-password/` and `/admin/` on the production domain, on previews (`https://*-<team>.vercel.app/...`) and on `http://localhost:3000/...`.
   Authentication → Providers: **Email** enabled with "Confirm email" ON; **Google** enabled (Google Cloud Console → OAuth client "Web", authorised redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`; paste client ID/secret into Supabase — the secret stays in Supabase, never in the app). Apple: later.
   Authentication → Emails: customise the confirm / reset templates (optional).
4. Make yourself an editor — sign in once on `/admin/` (creates your user), then in SQL Editor:
   `insert into user_roles (user_id, role) select id, 'admin' from auth.users where email = '<your email>';`
5. Project Settings → API → copy **Project URL** and **anon public key**.
6. Vercel → Project → Settings → Environment Variables (Preview first; Production only after QA + approval):
   `NEXT_PUBLIC_DATA_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Redeploy the preview.
7. Verify: Settings page shows "Data mode: Supabase"; Admin shows "Signed in … editor"; edit a dish and see it in Admin → Audit.

Recommended: a **separate development project** for previews and one for production later (both free tier allows 2 active projects).

## Security model
- RLS on every table. Public: read catalogue, provinces, regions, real establishments, non-candidate links, photos. Hidden: candidate links, sample venues, audit, other users' data.
- Writes to curated content: only users in `user_roles` (`admin`/`editor`), checked by `is_editor()` in every policy, including Storage. Admin roles are separate from ordinary accounts: signing up never grants editing.
- Personal data (passport, notes, profile, media): owner-only (`auth.uid() = user_id`) on every table; no one else — editors included — can read it. Users delete their own account via `delete_my_account()` (cascades).
- Database constraints mirror `src/lib/data/evidence.ts` (evidence type must justify the level; public levels need a last-checked date) and reject establishments outside the 2025 HCMC boundary.
- The service-role key is never used by the app and must never be set in Vercel.

## Free-tier constraints to know
- Projects **pause after ~1 week without activity**; resume from the dashboard (data is kept).
- Limits (at time of writing): 500 MB database, 1 GB storage, 50k monthly active users — far above current needs (~0.5 MB data).
- **No automatic downloadable backups on the free plan** → use the procedure below.

## Backup & recovery
| What | How | When |
| --- | --- | --- |
| Full logical backup (schema + all data incl. audit, roles, user data) | On a trusted machine with the Supabase CLI: `supabase db dump --db-url "$DB_URL" -f backups/schema.sql` and `supabase db dump --db-url "$DB_URL" --data-only -f backups/data.sql` (DB_URL from Project Settings → Database; keep it secret) | Weekly, and before every migration or bulk import |
| Public catalogue snapshot | `npm run db:export` → `backups/supabase-export-<date>.json` | Weekly / after editing sessions |
| Bring editor changes into Git | Compare the export with `data/*.json`; update via the importers; commit | Monthly |
| Photos | Storage → `dish-photos` bucket → download (or `supabase storage cp`) | Monthly |

**Recovery:** create/restore the project → run migrations → restore `data.sql` (full) **or** run `supabase/seed.sql` (repository state) → re-add editor roles → re-upload photos if needed. The repository JSON remains a complete fallback: the app keeps working in local mode at any time.

## Not verified yet (needs a provisioned project)
Real magic-link sign-in, Storage upload from the browser, PostgREST embedding/limits, and the Vercel env wiring. All SQL is tested locally; app reads/writes use the tested row mapping.
