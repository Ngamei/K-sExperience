"use client";
import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSupabase, supabaseEnabled } from "@/lib/supabase/client";
import { loadAccountPassport, loadProfile, syncPassportDiff, writeAccountPassport, type Profile } from "@/lib/supabase/passport";
import { mergeAllPassports, type Passports } from "@/lib/passport/model";
import { loadMembership } from "@/lib/supabase/membership";
import type { Tier } from "@/lib/membership/plans";
import { allPassportsOf, useUser } from "@/lib/store/user";

type Status = "disabled" | "loading" | "guest" | "signed-in";
interface AuthCtx {
  status: Status;
  user: User | null;
  profile: Profile | null;
  /** Customer membership tier (signed-in only; null while unknown or for guests). An entitlement, not a permission. */
  membership: Tier | null;
  /** Re-download this account's Passport into the device (after the device data was cleared). Never deletes account data. */
  reloadFromAccount: () => Promise<void>;
  migration: { state: "idle" | "running" | "failed"; error: string | null; retry: () => void };
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>({
  status: "disabled", user: null, profile: null, membership: null, reloadFromAccount: async () => {},
  migration: { state: "idle", error: null, retry: () => {} },
  refreshProfile: async () => {}, signOut: async () => {},
});
export const useAuth = () => useContext(Ctx);

/**
 * Guest-first accounts. On sign-in, guest progress on this device is merged into the account
 * (no duplicates) and written to the database; only after that succeeds does the device data become
 * the account's. Afterwards every change is synced as a diff. Sign-out clears personal data from the device.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = getSupabase();
  const [status, setStatus] = useState<Status>(supabaseEnabled ? "loading" : "disabled");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Tier | null>(null);
  const [migration, setMigration] = useState<{ state: "idle" | "running" | "failed"; error: string | null }>({ state: "idle", error: null });
  const synced = useRef<Passports | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const adopt = useCallback(async (u: User) => {
    if (!sb) return;
    setMigration({ state: "running", error: null });
    try {
      const st = useUser.getState();
      const account = await loadAccountPassport(sb, u.id);
      // Guest data (owner null) or this user's cached data is merged; another user's cached data is never merged.
      const local = st.ownerId === null || st.ownerId === u.id ? allPassportsOf(st) : null;
      const merged = local ? mergeAllPassports(account, local) : account;
      if (JSON.stringify(merged) !== JSON.stringify(account)) await writeAccountPassport(sb, u.id, merged);
      synced.current = merged;
      useUser.getState().loadPassport(u.id, merged); // device data now belongs to the account
      setMigration({ state: "idle", error: null });
      setProfile(await loadProfile(sb, u.id).catch(() => null));
      setMembership(await loadMembership(sb, u.id).catch(() => null));
    } catch (e) {
      setMigration({ state: "failed", error: (e as Error).message }); // guest data kept untouched
    }
  }, [sb]);

  useEffect(() => {
    if (!sb) return;
    let current: string | null = null;
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setStatus(u ? "signed-in" : "guest");
      if (u && u.id !== current) { current = u.id; setTimeout(() => adopt(u), 0); }
      if (!u && current) {
        current = null; synced.current = null; setProfile(null); setMembership(null);
        useUser.getState().clearPersonal(); // never leave a previous user's data on the device
      }
      if (!u && event === "INITIAL_SESSION" && useUser.getState().ownerId) useUser.getState().clearPersonal(); // stale account cache, session expired
    });
    return () => sub.subscription.unsubscribe();
  }, [sb, adopt]);

  // Diff sync for signed-in users.
  useEffect(() => {
    if (!sb) return;
    return useUser.subscribe((s) => {
      if (!user || s.ownerId !== user.id || !synced.current) return;
      const next = allPassportsOf(s);
      if (JSON.stringify(next) === JSON.stringify(synced.current)) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        // The device data may have been cleared (or the user switched) since this was scheduled: never sync a
        // snapshot that no longer belongs to this account — that would delete the account's Passport.
        if (useUser.getState().ownerId !== user.id || !synced.current) return;
        const prev = synced.current;
        const snapshot = allPassportsOf(useUser.getState());
        useUser.getState().setSync("saving");
        try {
          await syncPassportDiff(sb, user.id, prev, snapshot);
          synced.current = snapshot;
          useUser.getState().setSync("idle");
        } catch (e) {
          useUser.getState().setSync("error", (e as Error).message); // retried on the next change or via the banner
        }
      }, 400);
    });
  }, [sb, user]);

  const value: AuthCtx = {
    status, user, profile, membership,
    reloadFromAccount: async () => { if (user) await adopt(user); },
    migration: { ...migration, retry: () => { if (user) adopt(user); } },
    refreshProfile: async () => { if (sb && user) setProfile(await loadProfile(sb, user.id)); },
    signOut: async () => {
      if (!sb) return;
      await sb.auth.signOut();
      useUser.getState().clearPersonal();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Re-sends the whole passport (used by the "Retry" banner after a sync error). */
export async function forceResync(userId: string) {
  const sb = getSupabase();
  if (!sb) return;
  await writeAccountPassport(sb, userId, allPassportsOf(useUser.getState()));
  useUser.getState().setSync("idle");
}
