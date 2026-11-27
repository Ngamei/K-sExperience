"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getSupabase, supabaseEnabled } from "@/lib/supabase/client";
import { authDict } from "@/lib/i18n/auth-dict";
import { useT } from "@/lib/i18n/use-t";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/shell/auth-provider";

const input = "h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none focus:border-forest/50";
const origin = () => (typeof window !== "undefined" ? window.location.origin : "");
/** Only same-site paths are accepted as a post-login destination (no open redirects). */
export const safeNext = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/passport/");

export function AuthCard({ title, children, hideTitle }: { title: string; children: React.ReactNode; hideTitle?: boolean }) {
  const { locale } = useT();
  const a = authDict(locale);
  return (
    <div className="mx-auto max-w-md px-4 py-10" data-testid="auth-card">
      <div className="paper-grain rounded-[2rem] border border-line/80 bg-paper p-7 shadow-[0_20px_50px_-30px_rgba(41,45,41,.45)]">
        <p className="font-display text-3xl text-forest">K<span className="text-terracotta">’</span>s Experience</p>
        <p className="mt-1 text-sm text-muted">{a.brandLine}</p>
        <h1 className={hideTitle ? "sr-only" : "mt-6 font-display text-2xl"}>{title}</h1>
        {!supabaseEnabled ? <p className="mt-4 rounded-2xl bg-[#fbf3d9] p-4 text-sm text-[#5f4a0f]" data-testid="auth-disabled">{a.disabled}</p> : children}
      </div>
    </div>
  );
}

function GoogleButton({ next = "/passport/" }: { next?: string }) {
  const { locale } = useT();
  const a = authDict(locale);
  return (
    <>
      <Button variant="outline" className="w-full" type="button" data-testid="google-login"
        onClick={() => getSupabase()?.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin()}/auth/callback/?next=${encodeURIComponent(safeNext(next))}` } })}>
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

export type AuthMode = "login" | "signup" | "forgot";

/**
 * The one sign-in / sign-up / password-recovery panel, used by the account pages, the Passport gate and
 * Settings. Switching modes never leaves the panel. Success = a real Supabase session (the auth provider
 * then migrates guest progress); errors are shown as returned — never a false success.
 */
export function AuthPanel({ initialMode = "login", next = "/passport/", onSignedIn }: { initialMode?: AuthMode; next?: string; onSignedIn?: () => void }) {
  const { locale } = useT();
  const a = authDict(locale);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [f, setF] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  const [busy, setBusy] = useState(false);
  const go = (m: AuthMode) => { setMode(m); setMsg({ t: "" }); };
  const callback = `${origin()}/auth/callback/?next=${encodeURIComponent(safeNext(next))}`;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setMsg({ t: "" });
    if (mode === "signup" && f.password.length < 8) return setMsg({ t: a.passwordRule });
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) return setMsg({ t: friendly(error.message, a) });
        onSignedIn?.();
      } else if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email: f.email, password: f.password, options: { emailRedirectTo: callback } });
        if (error) return setMsg({ t: friendly(error.message, a) });
        if (data.session) onSignedIn?.(); else setMsg({ t: a.verifyEmail, ok: true });
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(f.email, { redirectTo: `${origin()}/reset-password/` });
        setMsg(error ? { t: friendly(error.message, a) } : { t: a.resetSent, ok: true });
      }
    } catch {
      setMsg({ t: a.networkError });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div data-testid="auth-panel" data-mode={mode}>
      <h2 className="font-display text-2xl" data-testid="auth-title">{mode === "login" ? a.login : mode === "signup" ? a.signup : a.forgot}</h2>
      {mode !== "forgot" && <p className="mt-1 text-xs text-muted">{a.guestKept}</p>}
      {mode !== "forgot" && <div className="mt-4"><GoogleButton next={next} /></div>}
      <form className={mode === "forgot" ? "mt-4 space-y-3" : "space-y-3"} onSubmit={submit}>
        <input className={input} type="email" required autoComplete="email" placeholder={a.email} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} data-testid={`${mode}-email`} />
        {mode !== "forgot" && (
          <input className={input} type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={a.password} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} data-testid={`${mode}-password`} />
        )}
        {mode === "signup" && <p className="text-[11px] text-muted">{a.passwordRule}</p>}
        <Button className="w-full" disabled={busy} data-testid={`${mode}-submit`}>{busy ? a.wait : mode === "login" ? a.login : mode === "signup" ? a.signup : a.sendReset}</Button>
      </form>
      <Message text={msg.t} ok={msg.ok} />
      <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
        {mode === "login" && <><button type="button" onClick={() => go("forgot")} className="text-terracotta hover:underline" data-testid="auth-to-forgot">{a.forgot}</button><button type="button" onClick={() => go("signup")} className="text-forest hover:underline" data-testid="auth-to-signup">{a.noAccount}</button></>}
        {mode === "signup" && <button type="button" onClick={() => go("login")} className="text-forest hover:underline" data-testid="auth-to-login">{a.haveAccount}</button>}
        {mode === "forgot" && <button type="button" onClick={() => go("login")} className="text-forest hover:underline" data-testid="auth-to-login">{a.backToLogin}</button>}
      </div>
    </div>
  );
}

/** Supabase error messages mapped to plain language (no engineering terms on consumer screens). */
function friendly(message: string, a: ReturnType<typeof authDict>) {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return a.badCredentials;
  if (m.includes("already registered") || m.includes("already exists")) return a.alreadyRegistered;
  if (m.includes("not confirmed")) return a.notConfirmed;
  if (m.includes("rate") || m.includes("too many")) return a.tooMany;
  return a.genericError;
}

function PageAuth({ mode }: { mode: AuthMode }) {
  const { locale } = useT();
  const a = authDict(locale);
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  return (
    <AuthCard title={mode === "login" ? a.login : mode === "signup" ? a.signup : a.forgot} hideTitle>
      <div className="mt-6"><AuthPanel initialMode={mode} next={next} onSignedIn={() => router.push(next)} /></div>
    </AuthCard>
  );
}
export function LoginForm() { return <Suspense><PageAuth mode="login" /></Suspense>; }
export function SignupForm() { return <Suspense><PageAuth mode="signup" /></Suspense>; }
export function ForgotForm() { return <Suspense><PageAuth mode="forgot" /></Suspense>; }

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

function CallbackInner() {
  const { locale } = useT();
  const a = authDict(locale);
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { status } = useAuth();
  useEffect(() => { if (status === "signed-in") router.replace(next); }, [status, router, next]);
  return <AuthCard title={a.signingIn}><p className="mt-4 text-sm text-muted">{a.signingIn}</p></AuthCard>;
}
export function AuthCallback() { return <Suspense><CallbackInner /></Suspense>; }
