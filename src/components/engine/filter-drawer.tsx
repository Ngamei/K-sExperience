"use client";
/**
 * Shared catalogue building blocks for every experience (Food included):
 *  - FilterDrawer: renders a list of filter DEFINITIONS (chips, single choice, custom controls, headings)
 *  - ActiveFilterBar: result count + removable active-filter chips + "clear all"
 *  - CatalogueLayout: header, desktop sidebar, sticky search/chips row, results, mobile filter sheet
 * Modules supply definitions and state; the layout and interaction are shared.
 */
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";

export interface FilterOption { value: string; label: string; color?: string; testid?: string; icon?: React.ReactNode }
export type FilterDef =
  | { kind: "heading"; id: string; title: string; note?: string }
  | { kind: "chips"; id: string; title: string; note?: string; options: FilterOption[]; selected: readonly string[]; onToggle: (v: string) => void }
  | { kind: "single"; id: string; title: string; note?: string; options: FilterOption[]; value: string; onPick: (v: string) => void }
  | { kind: "custom"; id: string; title: string; note?: string; render: React.ReactNode };

export function FilterSection({ title, children, note, id }: { title: string; children: React.ReactNode; note?: string; id?: string }) {
  return (
    <fieldset className="border-b border-line/70 py-4 first:pt-0 last:border-0" data-filter={id}>
      <legend className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</legend>
      {note && <p className="-mt-1 mb-2 text-[11.5px] text-muted">{note}</p>}
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

export function FilterDrawer({ defs, testid = "filter-panel" }: { defs: FilterDef[]; testid?: string }) {
  return (
    <div className="text-sm" data-testid={testid}>
      {defs.map((d) => {
        if (d.kind === "heading")
          return (
            <div key={d.id}>
              <h4 className="mb-1 mt-5 font-display text-base text-forest">{d.title}</h4>
              {d.note && <p className="mb-2 text-[11.5px] text-muted">{d.note}</p>}
            </div>
          );
        return (
          <FilterSection key={d.id} id={d.id} title={d.title} note={d.note}>
            {d.kind === "chips" && d.options.map((o) => (
              <Chip key={o.value} active={d.selected.includes(o.value)} color={o.color} onClick={() => d.onToggle(o.value)} data-testid={o.testid}>{o.icon}{o.label}</Chip>
            ))}
            {d.kind === "single" && d.options.map((o) => (
              <Chip key={o.value} active={d.value === o.value} onClick={() => d.onPick(o.value)} data-testid={o.testid}>{o.label}</Chip>
            ))}
            {d.kind === "custom" && d.render}
          </FilterSection>
        );
      })}
    </div>
  );
}

export interface ActiveChip { key: string; label: string; onRemove: () => void }

export function ActiveFilterBar({ countLabel, chips, onClear, clearLabel, countTestId = "result-count", className }: {
  countLabel: string; chips: ActiveChip[]; onClear: () => void; clearLabel: string; countTestId?: string; className?: string;
}) {
  return (
    <div className={"flex flex-wrap items-center gap-2 " + (className ?? "")}>
      <span className="text-sm font-medium text-charcoal" data-testid={countTestId} aria-live="polite">{countLabel}</span>
      {chips.map((c) => (
        <button key={c.key} onClick={c.onRemove} className="inline-flex h-7 items-center gap-1 rounded-full bg-forest/10 pl-2.5 pr-1.5 text-xs text-forest hover:bg-forest/20" data-testid="active-chip">
          {c.label}
          <X className="size-3.5" />
        </button>
      ))}
      {chips.length > 0 && (
        <button onClick={onClear} className="text-xs font-medium text-terracotta underline-offset-2 hover:underline" data-testid="clear-filters">{clearLabel}</button>
      )}
    </div>
  );
}

/** The catalogue page frame shared by every experience. */
export function CatalogueLayout({ eyebrow, title, summary, filters, search, chipsRow, activeBar, filtersLabel, children, empty, resultsTestId = "catalogue-results" }: {
  eyebrow: string; title: string;
  /** Optional live data summary under the title (counts). */
  summary?: React.ReactNode;
  /** Filter drawer content (desktop sidebar + mobile sheet). */
  filters: React.ReactNode;
  search: React.ReactNode; chipsRow?: React.ReactNode;
  /** Active filter bar; rendered in the sticky row and at the top of the mobile sheet. */
  activeBar: React.ReactNode;
  filtersLabel: string; children: React.ReactNode; empty?: React.ReactNode; resultsTestId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <header className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta">{eyebrow}</p>
        <h1 className="font-display text-4xl text-forest md:text-5xl">{title}</h1>
        {summary && <div className="mt-1">{summary}</div>}
      </header>
      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2">{filters}</div>
        </aside>
        <div className="min-w-0">
          <div className="sticky top-14 z-20 -mx-4 space-y-3 bg-ivory/95 px-4 pb-3 pt-1 backdrop-blur md:top-16 lg:static lg:mx-0 lg:bg-transparent lg:px-0">
            {search}
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              {chipsRow}
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)} data-testid="open-filters"><SlidersHorizontal /> {filtersLabel}</Button>
            </div>
            {activeBar}
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid={resultsTestId}>{children}</div>
          {empty}
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title={filtersLabel}>
        <div className="mb-4">{activeBar}</div>
        {filters}
      </Sheet>
    </div>
  );
}
