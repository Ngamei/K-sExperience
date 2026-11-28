"use client";
import { useState } from "react";
import { Eraser, ShieldCheck, SlidersHorizontal, UserX } from "lucide-react";
import { supabaseEnabled } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/use-t";
import { settingsDict } from "@/lib/i18n/settings-dict";
import { useUser } from "@/lib/store/user";
import { clearDeviceData } from "@/lib/privacy";
import { useAuth } from "@/components/shell/auth-provider";
import { DeleteAccount } from "@/components/auth/delete-account";
import { ConfirmAction, SubPageHeader } from "./settings-ui";

function Card({ icon: Icon, title, children, id }: { icon: typeof Eraser; title: string; children: React.ReactNode; id: string }) {
  return (
    <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6" data-testid={id}>
      <h2 className="mb-2 flex items-center gap-2 font-display text-xl text-forest"><Icon className="size-5" aria-hidden /> {title}</h2>
      {children}
    </section>
  );
}

/**
 * Settings → Privacy & Data (KEX-SET-02). Three clearly separate actions:
 *  1. clear this device (signed-in: the account copy is reloaded, never deleted),
 *  2. reset personal preferences only,
 *  3. delete the account and its personal data (signed-in only, typed confirmation).
 */
export function PrivacyView() {
  const { locale } = useT();
  const s = settingsDict(locale);
  const { status, reloadFromAccount } = useAuth();
  const resetPreferences = useUser((x) => x.resetPreferences);
  const signedIn = status === "signed-in";
  const [msg, setMsg] = useState("");
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-6 md:py-10" data-testid="privacy">
      <SubPageHeader back={s.back} title={s.privacy} intro={s.privacyIntro} />
      {msg && <p role="status" className="rounded-2xl bg-sage-soft/70 p-3 text-sm text-forest" data-testid="privacy-message">{msg}</p>}

      <Card icon={ShieldCheck} title={s.whatWeStore} id="privacy-storage">
        <p className="text-sm text-charcoal/80" data-testid="privacy-storage-mode" data-mode={signedIn ? "account" : "device"}>{signedIn ? s.storeSignedIn : s.storeGuest}</p>
        <p className="mt-1 text-sm text-muted">{s.storePrivate}</p>
      </Card>

      <Card icon={Eraser} title={s.clearDevice} id="privacy-clear-device">
        <p className="mb-3 text-sm text-muted">{signedIn ? s.clearDeviceSignedIn : s.clearDeviceGuest}</p>
        <ConfirmAction label={s.clearDevice} question={signedIn ? s.clearDeviceConfirmSignedIn : s.clearDeviceConfirmGuest} confirm={s.confirm} cancel={s.cancel} testId="clear-device"
          onConfirm={async () => { await clearDeviceData(); if (signedIn) await reloadFromAccount(); setMsg(signedIn ? s.clearDeviceDoneSignedIn : s.clearDeviceDone); }} />
      </Card>

      <Card icon={SlidersHorizontal} title={s.resetPrefs} id="privacy-reset-preferences">
        <p className="mb-3 text-sm text-muted">{s.resetPrefsBody}</p>
        <ConfirmAction label={s.resetPrefs} question={s.resetPrefsConfirm} confirm={s.confirm} cancel={s.cancel} testId="reset-preferences"
          onConfirm={() => { resetPreferences(); setMsg(s.resetPrefsDone); }} />
      </Card>

      <Card icon={UserX} title={s.deleteTitle} id="privacy-delete-account">
        {signedIn ? <DeleteAccount /> : <p className="text-sm text-muted">{supabaseEnabled ? s.deleteGuest : s.deleteDisabled}</p>}
      </Card>
    </div>
  );
}
