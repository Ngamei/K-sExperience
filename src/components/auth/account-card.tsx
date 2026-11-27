"use client";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { supabaseEnabled } from "@/lib/supabase/client";
import { authDict } from "@/lib/i18n/auth-dict";
import { useT } from "@/lib/i18n/use-t";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/shell/auth-provider";

/** Settings → Account. Ordinary accounts only; admin roles are managed separately (user_roles). */
export function AccountCard() {
  const { locale } = useT();
  const a = authDict(locale);
  const { status, user, profile } = useAuth();
  return (
    <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6" data-testid="account-section">
      <h2 className="mb-3 font-display text-xl text-forest">{a.account}</h2>
      {!supabaseEnabled ? (
        <p className="text-sm text-muted">{a.disabled}</p>
      ) : status === "signed-in" && user ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-sage-soft text-forest"><UserRound className="size-5" /></span>
          <div className="flex-1 text-sm"><strong>{profile?.display_name || user.email}</strong><br /><span className="text-muted">{user.email}</span></div>
          <Button asChild variant="outline"><Link href="/profile/" data-testid="account-profile-link">{a.profile}</Link></Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <p className="w-full text-sm text-muted">{a.makeYoursBody}</p>
          <Button asChild><Link href="/signup/" data-testid="account-signup">{a.signup}</Link></Button>
          <Button asChild variant="outline"><Link href="/login/" data-testid="account-login">{a.login}</Link></Button>
        </div>
      )}
    </section>
  );
}
