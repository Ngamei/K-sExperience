/**
 * Personal passport data (one per user / guest) and the guest → account merge.
 * Experience-agnostic: rows carry experience_id so Coffee/Bars/Spa/Shopping can reuse the same tables.
 */
export interface Note { rating?: number; note?: string; updatedAt: string }
export interface PassportData {
  saved: string[];                         // dish ids
  savedVenues: string[];                   // establishment ids
  tried: Record<string, string>;           // dish id → ISO date first tried
  visited: Record<string, string>;         // establishment id → ISO date first visited
  notes: Record<string, Note>;             // dish id → rating / tasting note
  collections: { name: string; dishIds: string[] }[];
}

export const EMPTY_PASSPORT: PassportData = { saved: [], savedVenues: [], tried: {}, visited: {}, notes: {}, collections: [] };

export const isEmptyPassport = (p: PassportData) =>
  !p.saved.length && !p.savedVenues.length && !Object.keys(p.tried).length && !Object.keys(p.visited).length &&
  !Object.keys(p.notes).length && !p.collections.some((c) => c.dishIds.length);

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
const earliest = (a: Record<string, string>, b: Record<string, string>) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) if (!out[k] || v < out[k]) out[k] = v;
  return out;
};

/**
 * Merge guest progress into an account without loss or duplicates:
 * unions for saved items; earliest date for tried/visited; for notes the most recently updated wins
 * (account wins ties); collections merge by name.
 */
export function mergePassports(account: PassportData, guest: PassportData): PassportData {
  const notes = { ...account.notes };
  for (const [k, g] of Object.entries(guest.notes)) {
    const a = notes[k];
    if (!a || g.updatedAt > a.updatedAt) {
      notes[k] = { ...(g.rating ?? a?.rating ? { rating: g.rating ?? a?.rating } : {}), ...(g.note ?? a?.note ? { note: g.note ?? a?.note } : {}), updatedAt: g.updatedAt };
    }
  }
  const cols = new Map(account.collections.map((c) => [c.name, [...c.dishIds]]));
  for (const c of guest.collections) cols.set(c.name, union(cols.get(c.name) ?? [], c.dishIds));
  return {
    saved: union(account.saved, guest.saved),
    savedVenues: union(account.savedVenues, guest.savedVenues),
    tried: earliest(account.tried, guest.tried),
    visited: earliest(account.visited, guest.visited),
    notes,
    collections: [...cols].map(([name, dishIds]) => ({ name, dishIds })),
  };
}

// ---- Database rows (tables from supabase/migrations/0003_user_accounts.sql) ----------------------
export const FOOD = "food";
/**
 * Rows are shared by every experience (migration 0005 adds item types "item"/"instructor" and actions
 * "attended"/"completed" for Bars, Coffee, Spa, Shopping and Sport). The Food passport reads and writes
 * only experience_id = "food" rows; rows of other experiences on the same account are left untouched
 * (sync sends diffs between two Food snapshots, so it never deletes them).
 */
export type ItemType = "dish" | "establishment" | "item" | "instructor";
export type HistoryAction = "tried" | "visited" | "attended" | "completed";
export interface SavedRow { user_id: string; experience_id: string; item_type: ItemType; item_id: string; collection: string }
export interface HistoryRow { user_id: string; experience_id: string; item_type: ItemType; item_id: string; action: HistoryAction; occurred_on: string }
export interface NoteRow { user_id: string; experience_id: string; item_type: ItemType; item_id: string; rating: number | null; note: string | null; updated_at: string }

/** Item type used for an experience's catalogue items ("dish" for Food, "item" for every other module). */
export const itemTypeFor = (experienceId: string): ItemType => (experienceId === FOOD ? "dish" : "item");

export function toRows(userId: string, p: PassportData, experienceId: string = FOOD) {
  const it = itemTypeFor(experienceId);
  const base = { user_id: userId, experience_id: experienceId };
  const saved: SavedRow[] = [
    ...p.saved.map((id) => ({ ...base, item_type: it, item_id: id, collection: "" })),
    ...p.savedVenues.map((id) => ({ ...base, item_type: "establishment" as const, item_id: id, collection: "" })),
    ...p.collections.flatMap((c) => c.dishIds.map((id) => ({ ...base, item_type: it, item_id: id, collection: c.name }))),
  ];
  const history: HistoryRow[] = [
    ...Object.entries(p.tried).map(([id, d]) => ({ ...base, item_type: it, item_id: id, action: "tried" as const, occurred_on: d })),
    ...Object.entries(p.visited).map(([id, d]) => ({ ...base, item_type: "establishment" as const, item_id: id, action: "visited" as const, occurred_on: d })),
  ];
  const notes: NoteRow[] = Object.entries(p.notes).map(([id, n]) => ({
    ...base, item_type: it, item_id: id, rating: n.rating ?? null, note: n.note ?? null, updated_at: n.updatedAt,
  }));
  return { saved, history, notes };
}

/** Rows of one experience → its passport. Rows of other experiences are ignored (and therefore preserved). */
export function fromRows(saved: SavedRow[], history: HistoryRow[], notes: NoteRow[], experienceId: string = FOOD): PassportData {
  const it = itemTypeFor(experienceId);
  const mine = <T extends { experience_id: string }>(r: T[]) => r.filter((x) => x.experience_id === experienceId);
  const s = mine(saved);
  const h = mine(history);
  const cols = new Map<string, string[]>();
  s.filter((r) => r.collection && r.item_type === it).forEach((r) => cols.set(r.collection, [...(cols.get(r.collection) ?? []), r.item_id]));
  return {
    saved: s.filter((r) => !r.collection && r.item_type === it).map((r) => r.item_id),
    savedVenues: s.filter((r) => !r.collection && r.item_type === "establishment").map((r) => r.item_id),
    tried: Object.fromEntries(h.filter((r) => r.action === "tried" && r.item_type === it).map((r) => [r.item_id, r.occurred_on])),
    visited: Object.fromEntries(h.filter((r) => r.action === "visited").map((r) => [r.item_id, r.occurred_on])),
    notes: Object.fromEntries(
      mine(notes).filter((r) => r.item_type === it).map((r) => [r.item_id, { ...(r.rating ? { rating: r.rating } : {}), ...(r.note ? { note: r.note } : {}), updatedAt: r.updated_at }]),
    ),
    collections: [...cols].map(([name, dishIds]) => ({ name, dishIds })),
  };
}

/** One account holds one passport per experience. */
export type Passports = Record<string, PassportData>;

/** Splits all rows of an account into per-experience passports (Food always present). */
export function passportsFromRows(saved: SavedRow[], history: HistoryRow[], notes: NoteRow[]): Passports {
  const ids = new Set<string>([FOOD, ...saved.map((r) => r.experience_id), ...history.map((r) => r.experience_id), ...notes.map((r) => r.experience_id)]);
  return Object.fromEntries([...ids].map((id) => [id, fromRows(saved, history, notes, id)]));
}

export function passportsToRows(userId: string, all: Passports) {
  const parts = Object.entries(all).map(([id, p]) => toRows(userId, p, id));
  return { saved: parts.flatMap((x) => x.saved), history: parts.flatMap((x) => x.history), notes: parts.flatMap((x) => x.notes) };
}

/** Guest → account merge, experience by experience (no experience's data can leak into another). */
export function mergeAllPassports(account: Passports, guest: Passports): Passports {
  const out: Passports = { ...account };
  for (const [id, g] of Object.entries(guest)) out[id] = mergePassports(account[id] ?? EMPTY_PASSPORT, g);
  return out;
}
