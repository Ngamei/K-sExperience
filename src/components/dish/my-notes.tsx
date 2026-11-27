"use client";
import { Star } from "lucide-react";
import { useState } from "react";
import { useUser } from "@/lib/store/user";
import { useAuth } from "@/components/shell/auth-provider";

/** Personal rating + tasting note (local for guests, synced for signed-in users). */
export function MyNotes({ dishId }: { dishId: string }) {
  const note = useUser((s) => s.notes[dishId]);
  const setNote = useUser((s) => s.setNote);
  const { status } = useAuth();
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? note?.note ?? "";
  return (
    <section className="rounded-3xl border border-line/80 bg-paper p-5 md:p-6" data-testid="my-notes">
      <h2 className="mb-1 font-display text-xl text-forest">My tasting notes</h2>
      <p className="mb-3 text-xs text-muted">{status === "signed-in" ? "Saved to your account." : "Saved on this device. Sign in to keep them across devices."}</p>
      <div className="flex gap-1" role="radiogroup" aria-label="My rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={note?.rating === n} aria-label={`${n} stars`} data-testid={`rate-${n}`}
            onClick={() => setNote(dishId, { rating: note?.rating === n ? null : n })}>
            <Star className={`size-6 ${note?.rating && n <= note.rating ? "fill-ochre text-ochre" : "text-line"}`} />
          </button>
        ))}
      </div>
      <textarea className="mt-3 h-20 w-full rounded-xl border border-line bg-ivory p-3 text-sm" placeholder="Where you had it, what stood out…" maxLength={2000}
        value={text} onChange={(e) => setDraft(e.target.value)} onBlur={() => { if (draft !== null) { setNote(dishId, { note: draft }); setDraft(null); } }} data-testid="note-text" />
    </section>
  );
}
