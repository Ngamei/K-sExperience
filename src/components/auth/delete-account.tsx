"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { deleteMyAccount } from "@/lib/supabase/passport";
import { authDict } from "@/lib/i18n/auth-dict";
import { useT } from "@/lib/i18n/use-t";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/shell/auth-provider";

/** Permanently deletes the signed-in account and all personal rows (delete_my_account RPC). Typed confirmation required. */
export function DeleteAccount() {
  const { locale } = useT();
  const a = authDict(locale);
  const router = useRouter();
  const { signOut } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <div>
      <p className="text-sm text-muted">{a.deleteConfirm}</p>
      <div className="mt-2 flex gap-2">
        <input className="h-10 w-full max-w-40 rounded-xl border border-line bg-paper px-3 text-sm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" aria-label={a.deleteConfirm} data-testid="delete-confirm" />
        <Button variant="accent" disabled={confirm !== "DELETE"} data-testid="delete-account" onClick={async () => {
          try { await deleteMyAccount(getSupabase()!); setMsg(a.deleted); router.push("/"); await signOut(); } catch (e) { setMsg((e as Error).message); }
        }}><Trash2 /> {a.deleteAccount}</Button>
      </div>
      {msg && <p className="mt-2 text-sm" role="status" data-testid="delete-message">{msg}</p>}
    </div>
  );
}
