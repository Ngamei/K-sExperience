"use client";
import { contactOf, displayNameOf } from "@/lib/auth/methods";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Trash2, UserRound } from "lucide-react";
import { getSupabase, supabaseEnabled } from "@/lib/supabase/client";
import { deleteMyAccount, saveProfile } from "@/lib/supabase/passport";
import { authDict } from "@/lib/i18n/auth-dict";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useAuth } from "@/components/shell/auth-provider";
import { AuthCard } from "./auth-forms";

const input = "h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm";

export function ProfileView() {
  const { locale } = useT();
  const a = authDict(locale);
  const router = useRouter();
  const { status, user, profile, refreshProfile, signOut } = useAuth();
  // Arriving signed out → log in. Signing out / deleting the account while here → home.
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (status === "signed-in") wasSignedIn.current = true;
    if (status === "guest") router.replace(wasSignedIn.current ? "/" : "/login/?next=/profile/");
  }, [status, router]);

  if (!supabaseEnabled) return <AuthCard title={a.profile}><span /></AuthCard>;
  if (!user) return <AuthCard title={a.profile}><p className="mt-4 text-sm text-muted">…</p></AuthCard>;
  // Remount the form once the profile row arrives so its fields start from saved values.
  return <ProfileForm key={profile ? "loaded" : "pending"} user={user} profile={profile} refreshProfile={refreshProfile} signOut={signOut} />;
}

function ProfileForm({ user, profile, refreshProfile, signOut }: Pick<ReturnType<typeof useAuth>, "profile" | "refreshProfile" | "signOut"> & { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const { locale } = useT();
  const a = authDict(locale);
  const router = useRouter();
  const setLocale = useUser((s) => s.setLocale);
  const [name, setName] = useState(profile?.display_name ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? "");
  const [share, setShare] = useState(profile?.share_passport ?? false);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState("");
  const sb = getSupabase()!;
  const providers = [...new Set((user.identities ?? []).map((i) => i.provider))];

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8 md:py-12" data-testid="profile">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- user-supplied avatar URL */}
        {avatar ? <img src={avatar} alt="" className="size-16 rounded-full object-cover" /> : <span className="flex size-16 items-center justify-center rounded-full bg-sage-soft text-forest"><UserRound className="size-8" /></span>}
        <div>
          <h1 className="font-display text-3xl text-forest">{displayNameOf(user, profile?.display_name)}</h1>
          <p className="text-sm text-muted">{contactOf(user)} · {a.memberSince} {profile ? new Date(profile.created_at).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-GB", { month: "long", year: "numeric" }) : ""}</p>
        </div>
      </div>

      <section className="space-y-3 rounded-3xl border border-line/80 bg-paper p-5">
        <h2 className="font-display text-xl">{a.profile}</h2>
        <label className="block text-sm">{a.displayName}<input className={input} value={name} onChange={(e) => setName(e.target.value)} data-testid="profile-name" /></label>
        <label className="block text-sm">Avatar URL<input className={input} value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" /></label>
        <div className="flex flex-wrap items-center gap-2 text-sm">Language:
          <Chip active={locale === "en"} onClick={() => setLocale("en")}>English</Chip>
          <Chip active={locale === "vi"} onClick={() => setLocale("vi")}>Tiếng Việt</Chip>
        </div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={share} onChange={(e) => setShare(e.target.checked)} /> {a.sharePassport}</label>
        <Button onClick={async () => { try { await saveProfile(sb, user.id, { display_name: name || null, avatar_url: avatar || null, locale, share_passport: share }); await refreshProfile(); setMsg(a.saved); } catch (e) { setMsg((e as Error).message); } }} data-testid="profile-save">{a.save}</Button>
        {msg && <p className="text-sm text-forest" data-testid="profile-message">{msg}</p>}
      </section>

      <section className="rounded-3xl border border-line/80 bg-paper p-5 text-sm">
        <h2 className="font-display text-xl">{a.providers}</h2>
        <div className="mt-2 flex gap-2">{providers.map((p) => <Badge key={p} tone="forest">{p === "email" ? a.email : p}</Badge>)}</div>
        <p className="mt-2 text-xs text-muted">{a.apple}</p>
        <p className="mt-2"><Link href="/forgot-password/" className="text-terracotta hover:underline">{a.forgot}</Link></p>
      </section>

      <section className="space-y-3 rounded-3xl border border-line/80 bg-paper p-5">
        <Button variant="outline" onClick={async () => { await signOut(); router.push("/"); }} data-testid="logout"><LogOut /> {a.logout}</Button>
        <div className="border-t border-line pt-3">
          <p className="text-sm text-muted">{a.deleteConfirm}</p>
          <div className="mt-2 flex gap-2">
            <input className={input + " max-w-40"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" data-testid="delete-confirm" />
            <Button variant="accent" disabled={confirm !== "DELETE"} data-testid="delete-account" onClick={async () => {
              try { await deleteMyAccount(sb); setMsg(a.deleted); router.push("/"); await signOut(); } catch (e) { setMsg((e as Error).message); }
            }}><Trash2 /> {a.deleteAccount}</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
