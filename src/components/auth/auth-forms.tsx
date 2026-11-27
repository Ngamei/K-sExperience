"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSupabase, supabaseEnabled } from "@/lib/supabase/client";
import { authDict } from "@/lib/i18n/auth-dict";
import { useT } from "@/lib/i18n/use-t";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/shell/auth-provider";

const input = "h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-forest/50";
const origin = () => (typeof window !== "undefined" ? window.location.origin : "");

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  const { locale } = useT();
  const a = authDict(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-10" data-testid="auth-card">
      <div className="paper-grain rounded-[2rem] border border-line/80 bg-paper p-7 shadow-[0_20px_50px_-30px_rgba(41,45,41,.45)]">
        <p className="font-display text-3xl text-forest">K<span className="text-terracotta">’</span>s Experience</p>
        <p className="mt-1 text-sm text-muted">{a.brandLine}</p>
        <h1 className="mt-6 font-display text-2xl">{title}</h1>
        {!supabaseEnabled ? <p className="mt-4 rounded-2xl bg-[#fbf3d9] p-4 text-sm text-[#5f4a0f]" data-testid="auth-disabled">{a.disabled}</p> : children}
      </div>
    </div>
  );
}

function GoogleButton() {
  const { locale } = useT();
  const a = authDict(locale);
  return (
    <>
      <Button variant="outline" className="w-full" type="button" data-testid="google-login"
        onClick={() => getSupabase()?.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin()}/auth/callback/` } })}>
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24z" /><path fill="#FBBC05" d="M5.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.6H1.4C.5 8.2 0 10 0 12s.5 3.8 1.4 5.4l4-3z" /><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.6l4 3.1c.9-2.8 3.5-4.9 6.6-4.9z" /></svg>
        {a.google}
      </Button>
      <p className="mt-1 text-center text-[11px] text-muted">{a.apple}</p>
      <div className="my-4 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />{a.or}<span className="h-px flex-1 bg-line" /></div>
    </>
  );
}

function Message({ text, ok }: { text: string; ok?: boolean }) {
  if (!text) return null;
  return <p className={`mt-3 rounded-xl p-3 text-sm ${ok ? "bg-forest/10 text-forest" : "bg-[#f6e3dc] text-[#8a3f26]"}`} data-testid="auth-message">{text}</p>;
}

function LoginInner() {
  const { locale } = useT();
  const a = authDict(locale);
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/passport/";
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  return (
    <AuthCard title={a.login}>
      <p className="mt-2 text-xs text-muted">{a.guestKept}</p>
      <div className="mt-4"><GoogleButton /></div>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setMsg("");
        const { error } = await getSupabase()!.auth.signInWithPassword({ email, password });
        setBusy(false);
        if (error) setMsg(error.message); else router.push(next);
      }}>
        <input className={input} type="email" required autoComplete="email" placeholder={a.email} value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email" />
        <input className={input} type="password" required autoComplete="current-password" placeholder={a.password} value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password" />
        <Button className="w-full" disabled={busy} data-testid="login-submit">{a.login}</Button>
      </form>
      <Message text={msg} />
      <div className="mt-4 flex justify-between text-sm"><Link href="/forgot-password/" className="text-terracotta hover:underline">{a.forgot}</Link><Link href="/signup/" className="text-forest hover:underline">{a.noAccount}</Link></div>
    </AuthCard>
  );
}
export function LoginForm() { return <Suspense><LoginInner /></Suspense>; }

export function SignupForm() {
  const { locale } = useT();
  const a = authDict(locale);
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "" }); const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" }); const [busy, setBusy] = useState(false);
  return (
    <AuthCard title={a.signup}>
      <p className="mt-2 text-xs text-muted">{a.guestKept}</p>
      <div className="mt-4"><GoogleButton /></div>
      <form className="space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        if (f.password.length < 8) return setMsg({ t: a.passwordRule });
        setBusy(true); setMsg({ t: "" });
        const { data, error } = await getSupabase()!.auth.signUp({ email: f.email, password: f.password, options: { emailRedirectTo: `${origin()}/auth/callback/`, data: { display_name: f.name } } });
        setBusy(false);
        if (error) return setMsg({ t: error.message });
        if (data.session) router.push("/passport/"); else setMsg({ t: a.verifyEmail, ok: true });
      }}>
        <input className={input} placeholder={a.displayName} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="signup-name" />
        <input className={input} type="email" required autoComplete="email" placeholder={a.email} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid="signup-email" />
        <input className={input} type="password" required autoComplete="new-password" placeholder={a.password} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} data-testid="signup-password" />
        <p className="text-[11px] text-muted">{a.passwordRule}</p>
        <Button className="w-full" disabled={busy} data-testid="signup-submit">{a.signup}</Button>
      </form>
      <Message text={msg.t} ok={msg.ok} />
      <p className="mt-4 text-center text-sm"><Link href="/login/" className="text-forest hover:underline">{a.haveAccount}</Link></p>
    </AuthCard>
  );
}

export function ForgotForm() {
  const { locale } = useT();
  const a = authDict(locale);
  const [email, setEmail] = useState(""); const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  return (
    <AuthCard title={a.forgot}>
      <form className="mt-4 space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await getSupabase()!.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/reset-password/` });
        setMsg(error ? { t: error.message } : { t: a.resetSent, ok: true });
      }}>
        <input className={input} type="email" required placeholder={a.email} value={email} onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email" />
        <Button className="w-full" data-testid="forgot-submit">{a.sendReset}</Button>
      </form>
      <Message text={msg.t} ok={msg.ok} />
    </AuthCard>
  );
}

export function ResetForm() {
  const { locale } = useT();
  const a = authDict(locale);
  const router = useRouter();
  const [pw, setPw] = useState(""); const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  return (
    <AuthCard title={a.newPassword}>
      <form className="mt-4 space-y-3" onSubmit={async (e) => {
        e.preventDefault();
        if (pw.length < 8) return setMsg({ t: a.passwordRule });
        const { error } = await getSupabase()!.auth.updateUser({ password: pw });
        if (error) return setMsg({ t: error.message });
        setMsg({ t: a.passwordSaved, ok: true }); setTimeout(() => router.push("/passport/"), 800);
      }}>
        <input className={input} type="password" required autoComplete="new-password" placeholder={a.newPassword} value={pw} onChange={(e) => setPw(e.target.value)} data-testid="reset-password" />
        <Button className="w-full" data-testid="reset-submit">{a.savePassword}</Button>
      </form>
      <Message text={msg.t} ok={msg.ok} />
    </AuthCard>
  );
}

export function AuthCallback() {
  const { locale } = useT();
  const a = authDict(locale);
  const router = useRouter();
  const { status } = useAuth();
  useEffect(() => { if (status === "signed-in") router.replace("/passport/"); }, [status, router]);
  return <AuthCard title={a.signingIn}><p className="mt-4 text-sm text-muted">{a.signingIn}</p></AuthCard>;
}
