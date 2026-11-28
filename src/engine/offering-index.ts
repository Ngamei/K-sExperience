import { STATUS_RANK, type LinkStatus } from "../lib/data/evidence";

/** Minimum shape shared by Food links and engine offerings. */
export interface OfferingLike { status: LinkStatus; isSample: boolean }

export interface OfferingIndex<O, E> {
  /** Best public status per item id. */
  statusByItem: Map<string, LinkStatus | "none-found">;
  byItem: Map<string, O[]>;
  byEstablishment: Map<string, O[]>;
  establishments: Map<string, E>;
}

/**
 * Item ↔ establishment index shared by every experience module.
 * `includeSamples` must be false for anything presented as a real recommendation;
 * candidates are admin-only.
 */
export function buildOfferingIndex<O extends OfferingLike, E extends { id: string; isSample: boolean; closure?: unknown }>(
  establishments: E[],
  offerings: O[],
  key: { item: (o: O) => string; establishment: (o: O) => string },
  opts: { includeSamples: boolean; includeCandidates?: boolean },
): OfferingIndex<O, E> {
  // D67: a closed establishment is never a place to go (its record still exists for history and saved items).
  const es = new Map(establishments.filter((e) => (opts.includeSamples || !e.isSample) && !e.closure).map((e) => [e.id, e]));
  const statusByItem = new Map<string, LinkStatus | "none-found">();
  const byItem = new Map<string, O[]>();
  const byEstablishment = new Map<string, O[]>();
  for (const o of offerings) {
    const eid = key.establishment(o);
    const iid = key.item(o);
    if (!es.has(eid)) continue;
    if (o.isSample && !opts.includeSamples) continue;
    if (o.status === "candidate" && !opts.includeCandidates) continue;
    byItem.set(iid, [...(byItem.get(iid) ?? []), o]);
    byEstablishment.set(eid, [...(byEstablishment.get(eid) ?? []), o]);
    const cur = statusByItem.get(iid);
    if (!cur || STATUS_RANK[o.status] > STATUS_RANK[cur]) statusByItem.set(iid, o.status);
  }
  return { statusByItem, byItem, byEstablishment, establishments: es };
}
