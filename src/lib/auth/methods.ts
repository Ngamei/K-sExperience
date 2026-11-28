/**
 * Sign-in methods offered in the UI. Each must also be enabled in Supabase (Authentication → Providers), so a
 * method only appears once it is listed in NEXT_PUBLIC_AUTH_METHODS — no button that cannot work.
 * Email + password is always available when accounts are on. Default: Google only (as before).
 */
export type AuthMethod = "google" | "facebook" | "phone";
const ALL: AuthMethod[] = ["google", "facebook", "phone"];
export function enabledAuthMethods(raw = process.env.NEXT_PUBLIC_AUTH_METHODS): AuthMethod[] {
  const list = (raw ?? "google").split(",").map((s) => s.trim().toLowerCase());
  return ALL.filter((m) => list.includes(m));
}

/**
 * Vietnamese phone numbers to E.164 (+84…) for SMS sign-in. Accepts "0912 345 678", "912345678", "+84 912…",
 * "84912…". Returns null when it is not a plausible Vietnamese mobile number (9 digits after the country code,
 * first digit 3/5/7/8/9). Other countries: enter the full +country number.
 */
export function normalizePhone(input: string): string | null {
  const s = input.replace(/[\s().-]/g, "");
  if (/^\+(?!84)\d{7,15}$/.test(s)) return s; // another country, already international
  const digits = s.replace(/^\+?84/, "").replace(/^0/, "");
  return /^[35789]\d{8}$/.test(digits) ? `+84${digits}` : null;
}

/** Name to greet a user with: profile → provider name (Google/Facebook) → email name → phone. */
export function displayNameOf(u: { email?: string | null; phone?: string | null; user_metadata?: Record<string, unknown> } | null | undefined, profileName?: string | null) {
  if (!u) return "";
  const meta = u.user_metadata ?? {};
  return profileName || (meta.full_name as string) || (meta.name as string) || u.email?.split("@")[0] || (u.phone ? `+${u.phone.replace(/^\+/, "")}` : "");
}
export const contactOf = (u: { email?: string | null; phone?: string | null } | null | undefined) => u?.email || (u?.phone ? `+${u.phone.replace(/^\+/, "")}` : "");
