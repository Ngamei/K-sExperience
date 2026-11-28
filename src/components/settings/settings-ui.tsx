"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Customer Settings building blocks — a lifestyle-app list (sections of rows), using the pastel theme tokens. */
export function SettingsSection({ title, children, id, className }: { title: string; children: React.ReactNode; id?: string; className?: string }) {
  return (
    <section data-testid={id} aria-labelledby={id ? `${id}-title` : undefined} className={className}>
      <h2 id={id ? `${id}-title` : undefined} className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</h2>
      <div className="overflow-hidden rounded-3xl border border-line/80 bg-paper">{children}</div>
    </section>
  );
}

const rowBase = "flex w-full items-center gap-3 px-4 py-3.5 text-left md:px-5";
const divider = "border-t border-line/60 first:border-t-0";

function RowBody({ icon: Icon, title, subtitle, trailing }: { icon: LucideIcon; title: string; subtitle?: string; trailing?: React.ReactNode }) {
  return (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage-soft text-forest"><Icon className="size-[18px]" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-charcoal">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
      {trailing}
    </>
  );
}

/** A navigational row. `soon` renders a non-interactive row with a "Coming soon" badge (never a fake control). */
export function SettingsRow({ icon, title, subtitle, href, soon, soonLabel, value, testId }: {
  icon: LucideIcon; title: string; subtitle?: string; href?: string; soon?: boolean; soonLabel?: string; value?: React.ReactNode; testId?: string;
}) {
  if (soon || !href) {
    return (
      <div className={cn(rowBase, divider, soon && "opacity-70")} data-testid={testId} aria-disabled={soon || undefined} data-soon={soon ? "true" : undefined}>
        <RowBody icon={icon} title={title} subtitle={subtitle} trailing={soon ? <Badge tone="outline">{soonLabel}</Badge> : value} />
      </div>
    );
  }
  return (
    <Link href={href} className={cn(rowBase, divider, "transition-colors hover:bg-ivory-deep/70 focus-visible:bg-ivory-deep/70")} data-testid={testId}>
      <RowBody icon={icon} title={title} subtitle={subtitle} trailing={<>{value}<ChevronRight className="size-4 text-muted" aria-hidden /></>} />
    </Link>
  );
}

/** A row-shaped block holding inline controls. */
export function SettingsBlock({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <div className={cn("px-4 py-4 md:px-5", divider, className)} data-testid={id}>{children}</div>;
}

export function SubPageHeader({ back, title, intro }: { back: string; title: string; intro?: string }) {
  return (
    <header className="space-y-1">
      <Link href="/settings/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-forest" data-testid="settings-back"><ChevronLeft className="size-4" aria-hidden /> {back}</Link>
      <h1 className="font-display text-4xl text-forest">{title}</h1>
      {intro && <p className="text-sm text-muted">{intro}</p>}
    </header>
  );
}

/** Two-step destructive action: the first click asks, the second confirms. */
export function ConfirmAction({ label, question, confirm, cancel, onConfirm, testId, variant = "outline" }: {
  label: string; question: string; confirm: string; cancel: string; onConfirm: () => void | Promise<void>; testId: string; variant?: "outline" | "accent";
}) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) return <Button variant={variant} onClick={() => setAsking(true)} data-testid={testId}>{label}</Button>;
  return (
    <div className="space-y-2 rounded-2xl bg-ivory-deep/70 p-3" role="group" aria-label={question} data-testid={`${testId}-ask`}>
      <p className="text-sm font-medium">{question}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="accent" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); setAsking(false); } }} data-testid={`${testId}-confirm`}>{confirm}</Button>
        <Button variant="ghost" onClick={() => setAsking(false)} data-testid={`${testId}-cancel`}>{cancel}</Button>
      </div>
    </div>
  );
}
