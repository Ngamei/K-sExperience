"use client";
/**
 * One reusable authentication gate for every Experience Passport (Food, Bars, Coffee, Wellness, Sport,
 * Shopping later) plus the responsive auth dialog used by Settings.
 * Desktop: centred modal · Mobile: bottom sheet. Reuses AuthPanel + AuthProvider (guest merge on sign-in).
 */
import * as Dialog from "@radix-ui/react-dialog";
import { Lock, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { getExperience, moduleForPath } from "@/experiences/registry";
import { supabaseEnabled } from "@/lib/supabase/client";
import { previousPath } from "@/lib/nav-history";
import { authDict } from "@/lib/i18n/auth-dict";
import { useT } from "@/lib/i18n/use-t";
import { useAuth } from "@/components/shell/auth-provider";
import { AuthPanel, type AuthMode } from "./auth-forms";

export function AuthDialog({ open, onOpenChange, initialMode = "login", next, onSignedIn, intro }: {
  open: boolean; onOpenChange: (o: boolean) => void; initialMode?: AuthMode; next: string; onSignedIn?: () => void; intro?: React.ReactNode;
}) {
  const { locale } = useT();
  const a = authDict(locale);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal/35 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-ivory p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl outline-none md:inset-auto md:left-1/2 md:top-1/2 md:w-[440px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:p-7"
          aria-describedby={undefined}
          data-testid="auth-dialog"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <Dialog.Title className="font-display text-lg text-forest">K<span className="text-terracotta">’</span>s Experience</Dialog.Title>
            <Dialog.Close className="-m-1 rounded-full p-2 hover:bg-ivory-deep" aria-label={a.close} data-testid="auth-dialog-close"><X className="size-5" /></Dialog.Close>
          </div>
          {intro}
          <AuthPanel key={initialMode} initialMode={initialMode} next={next} onSignedIn={onSignedIn} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Wrap any Passport page. Signed-in → the passport. Guest → the auth dialog opens immediately; cancelling
 * returns to the previous page (or the experience map); signing in reveals the requested passport in place
 * (same URL, same experience) while AuthProvider migrates guest progress. Local demo builds without an
 * account service keep the on-device guest passport (accounts cannot exist there).
 */
export function PassportGate({ children }: { children: React.ReactNode }) {
  if (!supabaseEnabled) return <>{children}</>;
  return <Gate>{children}</Gate>;
}

function Gate({ children }: { children: React.ReactNode }) {
  const { locale } = useT();
  const a = authDict(locale);
  const { status } = useAuth();
  const router = useRouter();
  const path = usePathname() ?? "/passport/";
  // Session ended while on the passport → say so in the dialog (derived from the previous status).
  const [prev, setPrev] = useState(status);
  const [expired, setExpired] = useState(false);
  if (status !== prev) {
    setPrev(status);
    if (status === "signed-in") setExpired(false);
    else if (status === "guest" && prev === "signed-in") setExpired(true);
  }

  if (status === "signed-in") return <>{children}</>;
  const cancel = () => {
    // Back to the page the user came from inside the app; on a direct visit, to the experience's map.
    const prevPath = previousPath();
    if (prevPath && prevPath !== path) router.back();
    else router.push(getExperience(moduleForPath(path)?.id ?? "food").routes.map);
  };
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center" data-testid="passport-locked">
      <Lock className="mx-auto size-8 text-muted" />
      <p className="mt-3 font-display text-2xl text-forest">{a.gateTitle}</p>
      <p className="mt-1 text-sm text-muted">{status === "loading" ? a.wait : a.gateBody}</p>
      {status === "guest" && (
        <AuthDialog
          open
          onOpenChange={(o) => { if (!o) cancel(); }}
          next={path}
          intro={<p className="mb-4 text-sm text-charcoal/80" data-testid="passport-gate-intro">{expired ? a.sessionExpired : a.gateBody}</p>}
        />
      )}
    </div>
  );
}
