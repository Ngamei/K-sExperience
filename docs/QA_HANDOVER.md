# Independent QA handover — customer readiness

PO 2026-11-28 (D87): technical QA cannot tell us whether people want to use the product. Before public launch the eight
reviews below are run **independently of the implementer** (Claude Code writes code and automated tests; it does not
sign off its own work). Results go in `docs/QA_REPORT.md` → *Independent QA*, one dated entry per review.

## 1. Review departments

| Review | Key question | Reviewer | Inputs | Pass criteria |
| --- | --- | --- | --- | --- |
| Functional QA | Does everything work? | Codex | `npm run qa`; preview URL; e2e specs | `npm run qa` green on the reviewed commit; every journey in §2 completes on desktop + mobile |
| Security QA | Is customer information protected? | Codex | `docs/AUTH_CHECKLIST.md` §A, §D, §E | all §D checks ✅; no open high-severity findings |
| Data QA | Is the information accurate? | Codex (independent source validation) | `docs/PROFILE_COMPLETENESS.md`, research batches, `CX-VALIDATE-ENRICH-001` | ≥ 20 % of new enrichment fields re-checked against the cited source; 0 fabricated values; error rate recorded per batch |
| Visual QA | Does the implementation match our mockups? | Codex / PO | PO mockups; `docs/screenshots/` | side-by-side screenshots for Home, business profile, Membership, Report form, Settings at 390 px and 1280 px; deviations listed |
| Usability QA | Can users find what they need? | ChatGPT + 5 simulated personas, then real users | §2 journeys, task script §3 | ≥ 4/5 complete each journey unaided; time-on-task and confusion points recorded |
| Business acceptance | Are we delivering meaningful value? | PO | completeness dashboard, journey results | PO sign-off per area (launch-ready profiles per area agreed) |
| Human UAT | Would actual customers use this again? | PO + pilot customers | Founding Member pilot (D83, after approval) | survey: "would use again" and "would recommend" ≥ 60 % positive |
| Monetisation validation | Would customers pay for these benefits? | PO + ChatGPT | pilot usage of Premium features (unlock counts, nutrition views), exit survey | stated willingness to pay per benefit; which features were actually used |

## 2. End-to-end customer journeys (must pass as journeys, not as separate buttons)

1. **Pilates near work** (PO example): choose Sport → Pilates → set workplace area → compare available class prices → save the studio → sign in on a second device → the saved studio is there.
2. **What to eat for lunch**: Hôm nay ăn gì? with Vegan + budget < 50k → pick a dish → open a nearby place → hours and contact shown (or honestly "not yet recorded") → save.
3. **Explore a dish**: search a dish → dish page → see places → open place → view menu prices (or see clearly *unavailable* vs *restricted*) → add to Passport.
4. **Report a mistake**: open a business → Report incorrect information → choose "Incorrect opening hours" → add a URL → submit → staff sees it in Admin → resolve; the listing changes only through the importer.
5. **Membership**: guest → sign up → Membership page explains Free / Plus / Premium and the menu-unlock rule; no checkout appears; (pilot) claim Founding Member → Premium shown with end date and "no automatic charge".
6. **Account lifecycle**: sign up → use → delete account → data gone, signing in again starts fresh.

## 3. Usability task script (moderated or simulated)

For each journey: give only the goal ("Find a Pilates studio near your office and keep it for later"), no UI hints.
Record: completed (y/n), time, wrong turns, words the tester used to describe what they looked for, and one thing they
would change. Test on a real phone first (most customers are mobile).

## 4. What is ready for review now (this sprint)

| Item | Where | Automated evidence |
| --- | --- | --- |
| Profile completeness dashboard | `npm run data:profile-completeness` → `docs/PROFILE_COMPLETENESS.md` | `tests/integration/profile-completeness.test.ts` |
| Menu-unlock entitlements + information visibility matrix + Founding Member (off) | `src/lib/membership/plans.ts`, migration 0016 | see `docs/handover/MEM-UNLOCK-FOUNDING.md` |
| Report incorrect information + Admin review queue | business profiles, Admin, migration 0017 | see `docs/handover/REPORT-INCORRECT-INFO.md` |
| Q1/Q3/Phú Nhuận/Bình Thạnh enrichment batch | `research-exchange/inbox/CC-ENRICH-Q1Q3PNBT-001.json` | see `docs/handover/CC-ENRICH-Q1Q3PNBT-001.md` |

## 5. Known limits the reviewer should not mistake for bugs

- Membership limits are **not enforced** and there is **no checkout** (D72, D82): every recorded price is visible to everyone until payments are approved.
- Founding Member is **off** until the PO approves it (D83).
- 0 profiles meet the full launch standard today — this is the honest baseline the enrichment work is measured against, not a reporting error.
