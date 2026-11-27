"use client";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { supabaseEnabled } from "@/lib/supabase/client";
import { authDict } from "@/lib/i18n/auth-dict";
import { useT } from "@/lib/i18n/use-t";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/shell/auth-provider";
import { AuthDialog } from "./auth-gate";
import type { AuthMode } from "./auth-forms";

/** Settings → Account (first section). Ordinary accounts only; admin roles are managed separately (user_roles). */
export function AccountCard() {
  const { locale } = useT();
  const a = authDict(locale);
  const { status, user, profile, signOut } = useAuth();
  const [dialog, setDialog] = useState<AuthMode | null>(null);
  const name = profile?.display_name || user?.email?.split("@")[0] || "";
  return (
    <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6" data-testid="account-section">
      <h2 className="mb-3 font-display text-xl text-forest">{a.account}</h2>
      {!supabaseEnabled ? (
        <p className="text-sm text-muted">{a.disabled}</p>
      ) : status === "signed-in" && user ? (
        <div className="flex flex-wrap items-center gap-3" data-testid="account-signed-in">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- user avatar from the auth provider
            <img src={profile.avatar_url} alt="" className="size-12 rounded-full object-cover" data-testid="account-avatar" />
          ) : (
            <span className="flex size-12 items-center justify-center rounded-full bg-forest font-display text-lg uppercase text-ivory" data-testid="account-avatar">{name.slice(0, 1)}</span>
          )}
          <div className="min-w-0 flex-1 text-sm">
            <strong className="block truncate" data-testid="account-name">{name}</strong>
            <span className="block truncate text-muted" data-testid="account-email">{user.email}</span>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button asChild variant="outline" className="flex-1 sm:flex-none"><Link href="/profile/" data-testid="account-profile-link">{a.manage}</Link></Button>
            <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => signOut()} data-testid="account-logout"><LogOut /> {a.logout}</Button>
          </div>
        </div>
      ) : status === "loading" ? (
        <p className="text-sm text-muted">{a.wait}</p>
      ) : (
        <div className="space-y-3" data-testid="account-guest">
          <p className="text-sm text-charcoal/80">{a.benefits}</p>
          <div className="flex gap-2">
            <Button className="flex-1 sm:flex-none" onClick={() => setDialog("login")} data-testid="account-login">{a.signIn}</Button>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setDialog("signup")} data-testid="account-signup">{a.signUp}</Button>
          </div>
          <AuthDialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)} initialMode={dialog ?? "login"} next="/settings/" onSignedIn={() => setDialog(null)} />
        </div>
      )}
    </section>
  );
}
