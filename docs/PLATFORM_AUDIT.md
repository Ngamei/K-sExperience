# Platform & Membership Blueprint — repository audit, gap report and phased plan

_28 Nov 2026 · Claude Code · branch `claude/gifted-franklin-iltr35` (not production). Source: PO blueprint "One city. Three workspaces. One shared experience engine." (v0.1). The blueprint is a proposal and component reference; this file records what the repository actually has, what is missing and the order of work. Decisions: D70–D76 in `DECISIONS.md`._

## 1. Deployment status
| Item | State |
| --- | --- |
| Production | `main` (D66), Vercel deploys it; merges apply migrations to the only Supabase project (D65). `main` head at audit time: `ea6c287` (Facebook / phone sign-in, D69). |
| This work | `claude/gifted-franklin-iltr35`, not merged. Adds migrations **0013** (staff roles ≠ memberships) and **0014** (quotas, enforcement off). Merging needs PO approval and applies both to production. |
| Live checks | None run against hosted Supabase in this session; RLS proven in local PostgreSQL 16 + PostGIS only. |

## 2. Existing vs missing, by blueprint section

### 01 · Three workspaces
| Blueprint | Repository today | Gap |
| --- | --- | --- |
| K's Experience (guests, Free/Plus/Premium) | ✅ Discovery app; accounts (email, Google; Facebook/phone on `main`); guest-first Passport with merge; customer Settings without diagnostics (D70) | Real hosted account creation + cross-device persistence unverified (KEX-AUTH-01) |
| K's Business `/business/*` | ❌ none | Whole workspace (P1, flagged off) |
| K's Admin `/admin/*` | ✅ Admin Portal, 11 modules, staff roles admin/editor/researcher/reviewer (D73) | Claims & moderation, Ads & inventory modules; server-side route denial impossible in a static client app (RLS is the boundary) |
| Customer membership ≠ staff ≠ merchant | ✅ memberships and staff roles separate (0013, tested) | Merchant scope (third system) not built |

### 02 · Consumer subscriptions
| Blueprint | Today | Gap |
| --- | --- | --- |
| Prices $1.99 / $3.99, annual $19.99 / $39.99 | ✅ D71, Membership page + Admin billing | Validation of willingness to pay / fees (KEX-MEM-03) |
| Saved references 20 / 150 / ∞ per experience | ✅ configurable in `membership_limits`; **DB trigger enforces when switched on** (0014); usage meter on Membership page | Switched off (no checkout); client gate + upgrade prompt (KEX-MEM-04) |
| Collections 2 / 10 / ∞ | ✅ same trigger (counts named collections that hold ≥ 1 item) | Empty collections live only on the device and are not counted server-side |
| Preference presets 3 / 10 / ∞ · saved locations 2 / 10 / ∞ | ⚠️ quotas seeded | Features do not exist (single preference set; no saved locations) |
| Detailed menu views 5 / 30 / ∞, distinct branch menu per billing period, idempotent, atomic | ⚠️ quota seeded | No menu entity, no unlock table/RPC (schema gap §3) |
| Calories & nutrition (Plus) | ⚠️ `dish.eating.nutrition` exists (kcal, protein, source, confidence) on few dishes; Admin only | Customer display + entitlement gate; nutrition per offering |
| Advanced price comparisons / history (Premium) | ❌ | Needs priced offerings with observed dates — data is the blocker (1 priced link of 182) |
| Allergens & safety free | ✅ allergens shown to all, never gated | — |
| Unlimited Passport history; keep saves on downgrade | ✅ history never limited; trigger checks inserts only (tested: 200 saves kept after Premium expiry) | — |
| Premium data must not leak in public payloads / preloaded bundles | ⚠️ catalogue is public JSON + public-read tables | When prices/nutrition become paid, they must move behind RLS/RPC (not in `/data/*.json` or static pages) |

### 03 · Public business page
| Blueprint | Today | Gap |
| --- | --- | --- |
| One permanent page per real branch | ✅ **one Business Profile Engine** (D77) renders Food `/places/[id]` and `/<exp>/nearby/?id=` | Canonical slug route; a branch in two experiences would need one record (today 170 unique establishments, no overlap) |
| Name, address, verified coordinates | ✅ all 170; exact/building pins 44 / 170 | Street-level pins on the rest |
| Phone, hours, website/social | Schema exists for every experience (module establishments extend the Food restaurant schema); **0 phones, 3 hours** recorded; profiles show "Not published yet" | Research data (never guessed) |
| Menu / services with VND prices | Dish–venue links (121) and module offerings (61); **1 priced** | Menu/version/section entity; price evidence + observed date |
| Nutrition tab | ❌ public | See 02 |
| Source freshness, report correction, claim CTA | Sources + last-checked shown; report/claim ❌ | Report flow (KEX-SET-02), claim (merchant phase) |

### 04 · Merchant workspace — ❌ not started (by design: P1, behind a flag, free)
### 05 · Admin — ✅ reused; missing: claims & moderation, ownership review, entitlement editor UI for quotas (data is admin-writable via RLS), import/access event logs
### 06 · Advertising — ❌ not started (future; contracts only, disabled)

## 3. Schema gap report (logical entity → current tables)
| Blueprint entity | Current | Gap / proposal (additive; keep canonical IDs) |
| --- | --- | --- |
| Business / Brand | — | `brands (id, name, slug, status)`; `restaurants.brand_id` nullable |
| Branch / Establishment | `restaurants` (all experiences) + `establishment_experiences` | `slug`, `ownership_state`; contact/hours columns usable by every experience |
| Catalogue item | `dishes`, `experience_items` | — |
| Menu / Version / Section | — | `menus (id, branch_id, source, published_on, currency 'VND', status, version)`, `menu_sections` |
| Offering / Variant | `dish_restaurant_links`, `offerings` (one price range, no variants) | `offering_variants (portion, duration, price, unit, observed_at, source)`; link offerings to a menu version |
| Nutrition evidence | `dishes.eating.nutrition` (jsonb) | `nutrition_facts` scoped to item **or** offering, serving size, nutrients, method, confidence, verified_on |
| Media / Source / Revision | `dish_photos`, link photos, `*_sources`, `content_audit` | Generic revisions for merchant drafts (draft → submitted → approved → published) |
| Account / Membership / Entitlement | `user_memberships` (0013), `membership_limits` + `membership_settings` (0014) | `plan_version`, usage periods; `menu_unlocks (user_id, branch_id, period, unique)` + atomic unlock RPC |
| Saved reference / Passport | `saved_experiences`, `experience_history`, `tasting_notes` | Saved locations + preference presets tables when those features exist |
| Claim / Merchant assignment | — | `business_claims`, `merchant_assignments (user_id, branch scope, role)`, private evidence bucket; `is_merchant_of(branch)` for RLS |
| Campaign / Inventory | — | Future only |

## 4. Component reuse matrix
| Blueprint component | Reuse / status |
| --- | --- |
| BusinessHeader, ContactActions, HoursPanel, SourceFreshness | `place-view.tsx` (Food) — extract into `components/business/*` and use in module establishment pages |
| OfferingCard, MenuTabs, PriceRange | `engine/offering-row.tsx`, `OfferingsSection` in `engine/detail.tsx` |
| NutritionPanel | new (data in `lib/food/eating.ts`) |
| SaveButton | existing save/visited toggles (store) — add EntitlementGate when limits go live |
| PlanCard, PlanComparison, UsageMeter | ✅ `settings/membership-view.tsx` |
| EntitlementGate, MenuUnlockDialog, UpgradePrompt | new — needs checkout (KEX-MEM-02/04) |
| AccountPanel, PassportAuthGate | ✅ `auth/account-card.tsx`, `auth/auth-gate.tsx` |
| AdminShell, CoverageMatrix, ImportDryRun, AuditTimeline | ✅ `pages/admin-view.tsx`, `engine/platform-summary.tsx`, import tools, Audit Logs |
| EvidenceDrawer | ✅ `admin-forms.tsx` EvidenceEditor |
| DuplicateReview | partial: Review queue lists possible duplicate dishes; establishment merge preview missing |
| ModerationQueue, OwnershipReview, EntitlementEditor | new (EntitlementEditor: edit `membership_limits` — data is already admin-writable) |
| Merchant components (ClaimWizard … InsightsPanel) | new, P1 |

## 5. Phased backlog (bounded increments)
| Phase | Increment | Owner | Status |
| --- | --- | --- | --- |
| P0-a | Customer Settings / Admin separation; staff ≠ membership (0013) | CC | ✅ awaiting Codex + PO |
| P0-b | Membership plans, benefits, currency, billing projection (D71–D75) | CC | ✅ |
| P0-c | **Server-side quotas, off by default (0014)**; usage meter | CC | ✅ this increment |
| P0-d | Real auth verification on hosted Supabase: 5 journeys, cross-device, guest migration | PO/CX | ⛔ test inboxes / profiles |
| P0-e | Business page standardisation: shared `components/business/*` for Food + modules, honest unknown states (D77) | CC | ✅ |
| P0-f | Research: phones, hours, menus with VND prices for Thảo Điền, Sala, Q1, Phú Mỹ Hưng, workplace catchments — sourced only | ChatGPT / CC research | ⬜ data is the main gap |
| P1-a | Client EntitlementGate + upgrade prompt; switch on enforcement with checkout (KEX-MEM-04) | CC | ⬜ waits payment provider |
| P1-b | Menu entity + menu unlocks (atomic RPC) + nutrition per offering; move paid fields behind RLS | CC | ⬜ |
| P1-c | Merchant foundation: claims, branch-scoped roles, draft/review/publish, behind a flag | CC + CX review | ⬜ needs PO go-ahead |
| Future | Advertising contracts only (disabled) | — | ⬜ |

## 6. Blockers
1. Hosted auth verification (test inboxes, independent browser profiles).
2. Business data: 0 phones, 3 opening hours, 1 price across 170 establishments — research, not code.
3. Payment provider choice (KEX-MEM-02) before any limit is switched on.
4. Codex independent review of 0013/0014 and the Admin gate; PO approval to merge (applies migrations to production).
