# MEM-UNLOCK-FOUNDING — menu unlocks, visibility matrix, default tier, Founding Member

Owner: Claude Code (implementation). Date: 2026-11-28. Status: implemented and tested on the worktree branch. Not pushed and not merged.
The coordinating engineer still has to update the shared docs (BACKLOG, DECISIONS, QA_REPORT, AGENT_HANDOVER, PRD, ARCHITECTURE, STAGING_RUNBOOK).

Unchanged guardrails: **limits stay unenforced** (`LIMITS_ENFORCED = false`, `membership_settings.enforce_limits = false`). **No live payments**: there is no checkout and no billing integration.

## What changed

### 1. Complete menu unlocks (migration `supabase/migrations/0016_menu_unlocks.sql`)
- **Policy.** One unlock gives access to one establishment's complete available menu prices for the current billing period. Reopening a menu already unlocked in that period never uses quota. Quotas: Free 5, Plus 30, Premium unlimited.
- **Billing period.** Until billing exists, the period is the **calendar month in Asia/Ho_Chi_Minh time**: `menu_unlock_period_start()` in SQL and `menuUnlockPeriodStart()` in `plans.ts` (unit-tested across the UTC+7 month boundary). Once subscriptions exist, the period follows the subscription period, and only that function has to change.
- **Quota key renamed** everywhere from `menu_views` to `menu_unlocks`:
  - In the DB, 0016 updates the rows and replaces the check constraint.
  - In code: `LIMITS.menuUnlocksPerMonth`, `DB_LIMIT_KEYS`, the benefit id `menuUnlocks` and the admin label.
  - The parity unit test applies the 0016 rename to the 0014 seed and checks that the constraint's key list matches `DB_LIMIT_KEYS`.
- **Table `menu_unlocks`**
  - Columns: `user_id`, `establishment_id` (FK to restaurants), `experience` (FK to experience_modules), `period_start`, `created_at`.
  - Unique on `(user_id, establishment_id, period_start)`.
  - RLS allows a user to read only their own rows. There are no insert/update/delete policies, and those grants are revoked.
- **RPC `unlock_menu(p_establishment_id, p_experience)`**
  - Security definer, idempotent (returns the existing unlock with `already: true`).
  - Serialised per user with `pg_advisory_xact_lock`, so concurrent unlocks cannot double count.
  - Checks the quota (`member_limit(uid, 'menu_unlocks')`) **only when `enforce_limits` is on**. While enforcement is off, unlocks are still recorded for the meter.
  - Returns `{unlocked, already, used, limit, period_start}`. `limit` is null for unlimited, and `unlocked` is false only when the quota is used up while enforcement is on.
  - Refuses an establishment that is not tagged with that experience (`unknown_establishment`) and refuses guests.
- **RPC `menu_unlock_usage()`** returns `{used, limit, period_start, enforced}` for the usage meter.
- **UI copy** changed from "detailed menu views" to "**5 complete establishment menu unlocks per month**" (EN and VI). The Membership page shows a "Complete menu unlocks this month: used / limit" meter to signed-in members, read through the RPC. If the RPC fails, the count shows as "—" (unknown), never as 0.

### 2. Information visibility matrix (`src/lib/membership/plans.ts`)
- `VIEWERS` (guest, free, plus, premium) × `INFO_TYPES`, stored as data in `VISIBILITY`:
  - **Everyone:** business name, address, phone, opening hours, menu item names, basic price range, preview prices, allergens.
  - **Complete menu prices:** guest none, Free and Plus per unlock, Premium full.
  - **Calories and nutritional breakdown:** Plus and Premium.
  - **Advanced price comparison:** Plus limited, Premium full.
- `infoState(type, tier, {hasData, unlocked, usedUnlocks})` returns `available`, `restricted` or `unavailable`:
  - `unavailable`: we hold no data. This is never shown as restricted.
  - `restricted`: the data exists but the plan does not include it.
  - While limits are not enforced, everything we hold is `available`.
- `menuUnlockState()` returns open, unlockable, exhausted or sign-in. `priceAccess()` in `src/lib/business/profile.ts` now uses it. Guests now see no complete prices when enforced (they get `locked`, not `unlockable`).
- New component `src/components/business/info-state-label.tsx` (`InfoStateLabel`, `restrictedText`), with EN and VI copy in `business-dict.ts`.
  - Used by the business-profile `PriceEntitlement`. Existing selectors (`data-state="unknown"` / `"shown"`) are kept, and `data-info` is added.
  - Nutrition is not rendered on business profiles today, so nothing else needed changing.

### 3. Default member tier (PO 2026-11-28; replaces the briefly proposed 60-day welcome period, which was removed)
- `DEFAULT_MEMBER_TIER = "plus"` in `plans.ts`. It is mirrored as `membership_settings.default_tier text not null default 'plus'` (check: free/plus/premium) in 0016, and a unit test keeps the two in step.
- `effectiveTier()` gives a signed-in member with no row, an expired row or an invalid row the default tier.
- In the DB, `member_tier()` is redefined as `coalesce(member_stored_tier(uid), default_tier)`. Every quota lookup goes through it (the 0014 saved-reference and collection triggers, and the 0016 unlocks).
- Founding, test, admin and billing rows always take precedence, including an explicit `free` grant.
- Guests still have no tier (public information only). The Membership page shows "K's Plus" for ordinary members, with no trial wording.
- **To switch back to Free later:** an admin runs `update membership_settings set default_tier = 'free'`, and someone sets `DEFAULT_MEMBER_TIER = "free"` in code. The unit sync test fails until both match.

### 4. K's Founding Member programme (APPROVED by the PO 2026-11-28)
- **It goes live only when this branch is merged to `main`**, because migrations apply on merge (D65).
- **Config.** `founding_programme` is a single row with `enabled true`, `cap 100` and `duration_days 90`. Public read; only admins can update it.
  - It is mirrored in `FOUNDING_PROGRAMME = { enabled: true, cap: 100, durationDays: 90, tier: "premium", autoBilling: false }`, with a unit sync test.
  - `user_memberships.source` now also accepts `'founding'`.
- **`founding_claims`** is a ledger of every claim ever made. The cap counts this ledger, so a place is not freed when a membership expires or is overwritten, and each member can claim once. Users read only their own claim; clients cannot write to it.
- **RPC `claim_founding_membership()`**
  - Authenticated users only. Serialised with one global advisory lock, so the cap cannot be exceeded concurrently.
  - Refuses with `founding_refused:<reason>`:
    - `disabled`
    - `already_claimed`
    - `already_member`: an active stored Plus or Premium row, or any `billing` row. The default tier does not count, so ordinary members can join.
    - `cap_reached`
  - Grants Premium with `source = 'founding'` and `valid_until = now() + duration`. The existing 0013 trigger audits the grant.
  - **No automatic billing.** At `valid_until` the membership simply falls back to the default tier.
- **RPC `founding_places_left()`** returns a count only and no user data (anon and authenticated). It returns null while the programme is off.
- **Membership page.** The section is shown **by default**; `NEXT_PUBLIC_FOUNDING_PROGRAMME=0` hides it. It shows:
  - "K's Founding Member — Early access programme — Explore everything. Help us make it better."
  - 5 benefits.
  - "No automatic charge afterwards".
  - "N of 100 places left".
  - A "Become a Founding Member" button for signed-in members. Refusals show a readable reason. After a successful claim, the tier refreshes through the new `useAuth().refreshMembership`.
  - Guests see "Sign in to join". In local mode (no accounts), a note says joining needs an account.

## Decisions / items for PO confirmation
1. **Quota key rename** `menu_views` → `menu_unlocks` in the database (an admin-visible data change). Recommended; already applied in 0016.
2. **Guests and complete menu prices.** When enforced, guests see none and are asked to sign in (matrix: guest = none). Preview prices stay public.
3. **Billing period** is the HCMC calendar month until subscriptions exist.
4. **Founding Member refusal rule.** "Already a paid member" means an active stored Plus or Premium row (test or admin grants included) or any billing row. Members on the default tier may join. An explicit admin `free` grant may also join.
5. **Founding expiry** falls back to the *default* tier. That is Plus during development, then Free once the PO flips `default_tier`.
6. The **default tier is Plus** during development. Remember to flip it to Free (DB and code) before paid plans launch.
7. The unlock flow is not wired into the business profile yet: no "Unlock" call, and the per-establishment unlocked state is not loaded. This is harmless while limits are off; it belongs with KEX-MEM-04 together with moving complete prices out of the public payload.

## Tests — exact commands and results (2026-11-28, this worktree)
| Command | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 errors; 1 warning that was already there, in `scripts/neighbourhood-coverage.ts`) |
| `npm run test` | **24 files, 195 tests passed** (new: `tests/unit/membership-unlocks.test.ts`; updated: `access-membership`, `business-profile`) |
| `npm run test:db` | **ALL DB TESTS PASSED — 140 PASS, 0 FAIL** (new section `-- 0016 menu unlocks + founding` in `tests/db/rls.sql`) |
| `npm run build:e2e && E2E_PORT=3177 npx playwright test --trace off` | **113 passed, 1 skipped** (full default suite) |
| Auth build + `e2e-auth` suite | **54 passed** (access-control 18, accounts 36) — see note |

DB test coverage in the 0016 section:
- Menu unlocks:
  - key rename and quotas
  - HCMC billing period
  - idempotent unlock with no double count
  - no direct client insert, update or delete
  - read-own isolation
  - unknown establishment and guest refused
  - limits off: Free can unlock 7
  - enforced: Free stops at exactly 5, the 6th is refused and not stored, and reopening an unlocked menu still works
  - enforced: Premium unlimited
- Founding:
  - on by default
  - anon places-left count
  - admin switches it off, then: places-left is null and a claim is refused as disabled
  - a customer cannot switch it on
  - claim grants Premium for about 90 days and is audited
  - no double claim
  - billing-tier member refused; active Premium member refused
  - cap refusal (cap set to 2)
  - claims ledger is read-own and has no client writes
  - expiry falls back to the default tier and does not free a place
- Default tier:
  - no row gives Plus (150 references, 30 unlocks)
  - an expired grant gives the default tier
  - founding and test grants win
  - the unlock meter uses the default quota
  - a customer cannot change `default_tier`
  - an admin flips it to Free, after which a member with no row is Free
  - an unknown tier is rejected

The 0014 section now pins `default_tier = 'free'` because it tests Free quotas; the 0016 section restores `plus`.

**Auth e2e note.** Ports 3500 and 54321 were taken by another agent's worktree servers. I therefore built the auth configuration into `out-auth-alt`, using the same env as `build:auth-test` but with `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399`. I ran temporary copies of `e2e-auth/*` and `playwright.auth.config.ts` rewritten to ports 54399 and 3599, then deleted them. `npm run build:auth-test && npm run test:e2e-auth` has not been run on the standard ports; re-run it there before merging. `npm run build:modules-test && npm run test:e2e-modules` was not run: no module code was touched.

## Files
- New: `supabase/migrations/0016_menu_unlocks.sql`, `src/components/business/info-state-label.tsx`, `tests/unit/membership-unlocks.test.ts`, this note.
- Changed:
  - `src/lib/membership/plans.ts`, `src/lib/business/profile.ts`, `src/lib/supabase/membership.ts`
  - `src/components/settings/membership-view.tsx`, `src/components/business/business-profile.tsx`, `src/components/shell/auth-provider.tsx` (adds `refreshMembership`), `src/components/pages/admin-view.tsx` (label)
  - `src/lib/i18n/settings-dict.ts`, `src/lib/i18n/business-dict.ts`
  - `tests/db/rls.sql`, `tests/unit/access-membership.test.ts`, `tests/unit/business-profile.test.ts`
  - `e2e/settings.spec.ts`, `e2e-auth/access-control.spec.ts`, `e2e-auth/mock-supabase.mjs` (mock RPCs: `menu_unlock_usage`, `claim_founding_membership`, `founding_places_left`; mock default tier Plus)
- Not changed: `supabase/seed.sql`, `scripts/build-supabase-seed.ts`, `scripts/print-read-columns-sql.ts`. The app reads no new table columns directly (RPCs only), and the seed does not touch membership tables.
