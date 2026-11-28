# Membership matrix — what each member type can do

PO decisions D72, D82, D83, D88 (2026-11-28). Prices in USD (D71). **No live payments**; limits are not enforced until
paid plans can be bought. "—" = not included. *Unavailable* (we have no data) is shown differently from *restricted*
(data exists, not in this plan).

**Default plan right now: Plus** (D88). Every signed-in member is K's Plus until the PO switches the default to Free
at the end of development (`DEFAULT_MEMBER_TIER` / `membership_settings.default_tier`).

| Feature | Guest (no account) | Free (default after development) | Plus — **default now** · $1.99/mo · $19.99/yr | Premium $3.99/mo · $39.99/yr | Founding Member (approved · first 100 members · 90 days) |
| --- | --- | --- | --- | --- | --- |
| Browse dishes, places, map, search | ✓ | ✓ | ✓ | ✓ | ✓ |
| Business name, address, phone, opening hours | ✓ | ✓ | ✓ | ✓ | ✓ |
| Menu item names, basic price range, preview prices | ✓ | ✓ | ✓ | ✓ | ✓ |
| Allergen information | ✓ | ✓ | ✓ | ✓ | ✓ |
| Report incorrect information | ✓ (no photo) | ✓ | ✓ | ✓ | ✓ |
| Complete menu prices (1 unlock = one business's full menu for the month; reopening is free) | — | 5 / month | 30 / month | Unlimited | Unlimited |
| Saved references per experience | — (sign in to save) | 20 | 150 | Unlimited | Unlimited |
| Passport history | — | Unlimited | Unlimited | Unlimited | Unlimited |
| Preferences kept across devices | — | ✓ | ✓ | ✓ | ✓ |
| Advanced preferences | — | — | ✓ | ✓ | ✓ |
| Calories & nutrition (where we have data) | — | — | ✓ | ✓ | ✓ |
| Price comparison | — | — | Limited | Full | Full |
| Early access + direct feedback channel | — | — | — | — | ✓ |
| Cost | Free | Free | Free during development, then $1.99/mo | $3.99/mo | Free, no automatic charge afterwards |

**Precedence:** Founding Member / admin grant > paid plan > default plan (Plus now, Free later).
**When the default switches to Free:** nothing is deleted — references above 20 stay saved and visible; new ones can't be added while over 20.
