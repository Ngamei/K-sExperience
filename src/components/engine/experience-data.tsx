"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { EXPERIENCES, isSelectable, loc, type ExperienceId, type ExperienceModule } from "@/experiences/registry";
import { ExperienceDataSchema, type Establishment, type ExperienceData, type ExperienceItem, type Offering } from "@/engine/schema";
import { buildOfferingIndex, type OfferingIndex } from "@/engine/offering-index";
import { COPY } from "@/engine/copy";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";

async function fetchExperienceData(id: ExperienceId): Promise<ExperienceData> {
  const r = await fetch(`/data/experiences/${id}.json`);
  if (!r.ok) throw new Error(`Failed to load ${id} data (${r.status})`);
  return ExperienceDataSchema.parse(await r.json()); // validated: a malformed file never renders
}

export interface ModuleData extends ExperienceData {
  module: ExperienceModule;
  /** Real establishments and public offerings only (no samples, no candidates) — used for everything shown. */
  index: OfferingIndex<Offering, Establishment>;
  itemById: Map<string, ExperienceItem>;
}

/** Loads one module's dataset (cached) and its offering index — the engine counterpart of FoodDataProvider. */
export function useModuleData(id: ExperienceId): { data: ModuleData | null; error: Error | null } {
  const mod = EXPERIENCES.find((e) => e.id === id)!;
  const { data, error } = useQuery({ queryKey: ["experience-data", id], queryFn: () => fetchExperienceData(id), staleTime: Infinity, enabled: isSelectable(mod) });
  const value = useMemo(() => {
    if (!data) return null;
    // Only establishments tagged with this module and inside HCMC data files are listed; samples never.
    const ests = data.establishments.filter((e) => e.experiences.includes(id));
    const index = buildOfferingIndex(ests, data.offerings, { item: (o) => o.itemId, establishment: (o) => o.establishmentId }, { includeSamples: false });
    return { ...data, module: mod, index, itemById: new Map(data.items.map((i) => [i.id, i])) };
  }, [data, id, mod]);
  return { data: value, error: error as Error | null };
}

/**
 * Wraps every page of a non-Food module. Unselectable modules (not implemented or flag off) render a
 * "not available yet" notice — feature flags can never make an unfinished module look functional.
 * Visiting a module's URL makes it the active experience (navigation labels follow).
 */
export function ModuleGate({ id, children }: { id: ExperienceId; children: (d: ModuleData) => React.ReactNode }) {
  const { locale } = useT();
  const mod = EXPERIENCES.find((e) => e.id === id)!;
  const selectable = isSelectable(mod);
  const setExperience = useUser((s) => s.setExperience);
  const hydrated = useUser((s) => s.hydrated);
  useEffect(() => { if (selectable && hydrated) setExperience(id); }, [selectable, hydrated, id, setExperience]);
  const { data, error } = useModuleData(id);
  if (!selectable)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center" data-testid="module-unavailable">
        <p className="font-display text-2xl text-forest">{loc(mod.name, locale)}</p>
        <p className="mt-2 text-sm text-charcoal/80">{loc(COPY.comingSoon, locale)}</p>
        <p className="mt-1 text-sm text-muted">{loc(COPY.comingSoonBody, locale)}</p>
        <Link href="/" className="mt-5 inline-block rounded-full bg-forest px-4 py-2 text-sm text-ivory" onClick={() => setExperience("food")}>{loc(COPY.backToFood, locale)}</Link>
      </div>
    );
  if (error) return <p className="px-4 py-20 text-center text-sm text-muted" role="alert">{error.message}</p>;
  if (!data) return <p className="px-4 py-20 text-center text-sm text-muted">{loc(COPY.loading, locale)}</p>;
  return (
    <div className="flex h-full flex-col" data-testid="module-page" data-experience={id}>
      <p className="shrink-0 border-b border-[#e9d9a6] bg-[#fbf3d9] px-4 py-1.5 text-center text-[11.5px] text-[#5f4a0f]" data-testid="pilot-banner">{loc(COPY.pilotBanner, locale)}</p>
      <div className="min-h-0 flex-1 overflow-y-auto">{children(data)}</div>
    </div>
  );
}
