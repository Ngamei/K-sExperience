# Sign-in setup — Google, Facebook, phone (SMS), email

The app code supports four ways to sign in or sign up (D69). Each one needs a switch in Supabase, and the buttons only
appear on the site once they are listed in the Vercel setting `NEXT_PUBLIC_AUTH_METHODS`, so nothing broken is ever
shown. Supabase project: `aibainipwgqbluhnqepu` (production, D65). Live site: `https://k-s-experience.vercel.app`.

| Method | Where it is switched on | Cost |
| --- | --- | --- |
| Email + password (always on with accounts) | Supabase → Authentication → Sign In / Providers → Email | Free (Supabase's built-in email is rate-limited; add your own SMTP before launch) |
| Google | Google Cloud OAuth client + Supabase Google provider | Free |
| Facebook | Meta developer app + Supabase Facebook provider | Free |
| Phone (6-digit SMS code) | SMS provider account (e.g. Twilio) + Supabase Phone provider | **Paid per SMS** — check the provider's Vietnam price page before enabling |

## 1. Supabase — URLs (once)

Authentication → URL Configuration:
- **Site URL:** `https://k-s-experience.vercel.app`
- **Redirect URLs:** `https://k-s-experience.vercel.app/auth/callback/**`, `https://k-s-experience.vercel.app/reset-password/**`, `https://k-s-experience.vercel.app/admin/**`, plus the same three for Vercel previews (`https://*-<your-team>.vercel.app/...`) and `http://localhost:3000/...` for local testing.

Authentication → Sign In / Providers → **Email**: enabled, "Confirm email" on.

The callback address the providers below ask for is always: `https://aibainipwgqbluhnqepu.supabase.co/auth/v1/callback`

## 2. Google

1. console.cloud.google.com → choose or create a project (no billing needed for sign-in) → APIs & Services → **OAuth consent screen**: app name "K's Experience", support email, home page `https://k-s-experience.vercel.app/`, privacy policy `https://k-s-experience.vercel.app/privacy/`, authorised domain `k-s-experience.vercel.app`; audience External; publish.
2. APIs & Services → Credentials → **Create credentials → OAuth client ID** → Web application.
   - Authorised JavaScript origins: `https://k-s-experience.vercel.app`
   - Authorised redirect URIs: `https://aibainipwgqbluhnqepu.supabase.co/auth/v1/callback`
3. Copy the **Client ID** and **Client secret** into Supabase → Authentication → Sign In / Providers → **Google** → enable → save. The secret stays in Supabase only.

## 3. Facebook

1. developers.facebook.com → My Apps → **Create app** → use case "Authenticate and request data from users with Facebook Login" → name "K's Experience".
2. Facebook Login → Settings → **Valid OAuth Redirect URIs:** `https://aibainipwgqbluhnqepu.supabase.co/auth/v1/callback`.
3. App settings → Basic: **Privacy Policy URL** `https://k-s-experience.vercel.app/privacy/`, **User data deletion** → *Data deletion instructions URL* `https://k-s-experience.vercel.app/data-deletion/`, app domain `k-s-experience.vercel.app`; switch the app to **Live** (in Development mode only you and testers can sign in).
4. Copy the **App ID** and **App secret** into Supabase → Sign In / Providers → **Facebook** → enable → save.

## 4. Phone (SMS code)

1. Create an account with an SMS provider Supabase supports (Twilio, Twilio Verify, MessageBird, Vonage, Textlocal). Check its price and sender rules for Vietnam — Vietnamese carriers may require a registered sender name (brandname) for business SMS, which can take time.
2. Supabase → Sign In / Providers → **Phone** → enable → choose the provider → paste its account ID, auth token and sender/service ID → save. Keep "Enable phone confirmations" on. Code length 6, expiry a few minutes.
3. Supabase → Authentication → Rate Limits: keep the SMS limit low at first (it protects against SMS-cost abuse).

## 5. Vercel (production) — after the providers above work

Settings → Environment Variables → Production (and Preview):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_DATA_MODE` | `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://aibainipwgqbluhnqepu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **publishable** key (`sb_publishable_…`) — never the secret/service-role key |
| `NEXT_PUBLIC_AUTH_METHODS` | the methods switched on above, e.g. `google,facebook,phone` (omit one until its provider is configured) |

Redeploy. The site then reads its data from the database (identical to the repository — checked by every database run) and Admin opens only for editors (D64).

## 6. Test together, then clean up

On a Preview first, then production: sign up by email (confirm the email), Google, Facebook, phone; record a Passport action and see it on a second device; sign out; reset a password; delete the test accounts (Profile → Delete my account). Record results in `docs/QA_REPORT.md`.

Optional Vercel setting `NEXT_PUBLIC_CONTACT_EMAIL`: a public contact address shown on the privacy and data-deletion pages (leave unset to offer in-app deletion only).
