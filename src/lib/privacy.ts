"use client";
import { useUser } from "./store/user";

/**
 * Privacy & Data → "Clear data on this device". Clears the app's browser storage (personal data, preferences,
 * offline content cache); language is kept. Never calls the account: for a signed-in user the caller reloads
 * the Passport from the account afterwards (AuthProvider.reloadFromAccount), so cloud history is untouched.
 */
export async function clearDeviceData() {
  useUser.getState().clearDevice();
  try {
    if (typeof caches !== "undefined") for (const k of await caches.keys()) await caches.delete(k);
  } catch { /* cache storage unavailable (private mode, file://) — nothing to clear */ }
}
