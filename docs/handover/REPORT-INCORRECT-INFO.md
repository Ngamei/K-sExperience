# Report incorrect information (S4-RPT-01, D84)

Implemented 2026-11-28 by Claude Code. Customer reports **never write the listing**; staff triage them in
Admin → **Customer Reports** (12th Admin module, `#reports`). Corrections reach canonical data only via the importer.

## Files
- New: `supabase/migrations/0017_info_reports.sql`, `src/lib/business/report.ts` (validation, insert row, photo path, copy text, admin link, error mapping), `src/lib/supabase/reports.ts` (submit, list, update, signed photo URL), `src/lib/i18n/report-dict.ts` (EN + VI), `src/components/business/report-dialog.tsx`, `src/components/admin/reports-queue.tsx`, `tests/unit/info-report.test.ts`, `e2e/report-info.spec.ts`, `e2e-auth/info-reports.spec.ts`.
- Changed: `business-profile.tsx` (footer report button; disabled on sample venues; "Claim this business" stays Coming soon), `admin-view.tsx`, `tests/db/rls.sql` (section `-- 0017 info reports`), `e2e-auth/mock-supabase.mjs` (0017 rules, upload, signed URLs, `/__reports` test endpoint), `e2e/business-profile.spec.ts`, `e2e/settings.spec.ts`, `e2e-auth/access-control.spec.ts`.

## Database (0017)
- **Insert:** guests and signed-in users may file a report only with `status='new'`, no reviewer fields, reporter = nobody or themselves. Photo only for a signed-in user, from their own folder. A trigger stamps the server time, fills the reporter for signed-in users, and rejects unknown establishment ids (checked against `restaurants`, which holds every experience's establishments; no foreign key, so reports survive a removed listing).
- **Abuse limits:** 10 reports per signed-in user per day; guests 5 per establishment per hour and 60 per hour overall.
- **Read:** reporter sees only their own; staff (`is_staff()`) see all; guests can't read back (client inserts without returning the row).
- **Update:** staff only, and only status + resolution note (trigger blocks edits to the report itself); reviewer/time stamped; every change audited into `content_audit`.
- **Delete:** no client delete.
- **Bucket `report-evidence`:** private, 5 MB, JPEG/PNG/WebP; signed-in users upload only into their own folder; staff read; editors delete.
- Extra columns: `establishment_name` (name the reporter saw), `locale`.

## Form behaviour
- Supabase mode: "Send report" → "Thanks — our team will review it. Your report does not change the listing directly." Any failure shows an error, never the thanks message. Guests are told to sign in to attach a photo.
- Local/static mode: notice that the report is not sent; only "Copy report" (text marked "(NOT SENT)", also shown in a box if the clipboard is blocked).
- Admin queue: filter by status (default `new`) and category, link to the business and evidence, photo via 10-minute signed URL, set status + note. Fails closed for non-staff; local mode explains nothing is sent.

## Tests (agent run in its worktree, 2026-11-28)
| Command | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | 0 errors, 1 pre-existing warning (`scripts/neighbourhood-coverage.ts`) |
| `npm run test` | 24 files, 188 passed |
| `npm run test:db` | ALL DB TESTS PASSED (126 checks, 32 new), parity PASS |
| `build:e2e` + playwright | 121 passed |
| `build:auth-test` + `test:e2e-auth` | 58 passed |
| `build:modules-test` + `test:e2e-modules` | 62 passed |

Known flake on `main`: `e2e/business-profile.spec.ts` "venue photo in the header…" — the service worker can serve `/data/venue-photos.json` before `page.route` intercepts it (passes 30/30 with `serviceWorkers: "block"`). Suggested fix: block service workers in `playwright.config.ts` like the modules config.

## Open questions for the PO
1. All staff (incl. Data Reviewers, Researchers) may change a report's status — restrict to admins/editors? (one-line policy change)
2. A signed-in user's report is always attributed to them (no anonymous reports while signed in) — acceptable?
3. Rate limits (10/user/day; guests 5/venue/hour) — acceptable?
4. Retention period for contact emails and photos; orphan photos (upload ok, insert failed) need a periodic service-role cleanup.
5. No email notifications to staff/reporters — needs an email service (paid-service decision).
6. The copy-only flow says "send to the K's Experience team" without an address — name one?
