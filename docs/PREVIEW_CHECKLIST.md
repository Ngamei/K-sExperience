# Preview deployment readiness checklist

_For the Product Owner and Codex before Preview QA and before any production release. Claude Code does not deploy._

## Build configurations

| Build | Command | Who sees what |
| --- | --- | --- |
| **Production (default)** | `npm run build` (Vercel) | Vietnamese Food plus the open pilots Bars, Coffee, Spa and Sport (labelled "Pilot", D47). No sample venues (stripped from `/data/food.json`), no development notices. Shopping coming soon. |
| Feature flags | `NEXT_PUBLIC_FEATURE_*` | Only needed for a future module that is implemented but not opened by default. |
| Preview with development data | add `NEXT_PUBLIC_DEV_DATA=1` | Sample venues toggle + "Sample" banner + pilot notice (for testers only — never in Production). |
| Accounts | `NEXT_PUBLIC_DATA_MODE=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Account in Settings, Passport sign-in gate, cross-device passports. Without them the app is the local demo (guest passport on the device, "Accounts are coming soon"). |

## Before Preview QA
- [ ] Supabase project created (free tier); migrations **0001 → 0008** run in order, then `supabase/seed.sql` (docs/SUPABASE.md).
- [ ] Auth: Email (confirm on) + Google enabled; redirect URLs include `/auth/callback/` (with `?next=`), `/reset-password/`, `/admin/` for Preview and Production domains.
- [ ] Vercel Preview env vars set as above (only `NEXT_PUBLIC_*` values; never the service-role key).
- [ ] Editors added in `user_roles`.
- [ ] Record the Preview URL and commit in `docs/AGENT_HANDOVER.md`.

## Codex independent QA (per module before its flag is enabled anywhere)
- [ ] Food regression: map, catalogue filters (regions, provinces, Savory/Sweet/Snack), dish pages, venue cards, Nearby, Passport, Settings.
- [ ] Settings: order Food, Bars, Coffee, Spa, Shopping, Sport; Shopping coming soon; Sport shows Pickleball + Pilates.
- [ ] Mode switching (repeat), direct URLs, back, refresh; Saved/Passport isolation per experience and per user.
- [ ] Passport gate: guest prompt (modal on desktop, sheet on mobile), cancel returns, sign-in opens the requested passport, guest progress migrated, session expiry.
- [ ] Data: every offering has evidence + last-checked date; no reference image presented as a venue photo; only HCMC establishments.
- [ ] Real Google OAuth and real emails (verification, recovery) on the Preview — the automated suite uses a mock.
- [ ] Desktop + mobile screenshots reviewed (docs/screenshots/).

## Before Production
- [ ] PO approval recorded; merge to `main` only after Codex QA passes.
- [ ] Production env: no `NEXT_PUBLIC_DEV_DATA`; pilot flags only for modules the PO activates.
- [ ] Do not activate a module whose data report (docs/EXPERIENCE_DATA_REPORT.md) shows an empty or misleading dataset.
