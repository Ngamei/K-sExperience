"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Locale } from "../i18n/dict";
import { DEV_DATA } from "../env";
import { DEFAULT_PREFERENCES, type Preferences } from "../food/recommend";
import type { ExperienceId } from "@/experiences/registry";
import { EMPTY_PASSPORT, FOOD, isEmptyPassport, type Note, type PassportData, type Passports } from "../passport/model";

export interface Collection { id: string; name: string; dishIds: string[] }

interface UserState {
  locale: Locale;
  experience: ExperienceId;
  showSamples: boolean;
  preferences: Preferences;
  saved: string[];
  tried: Record<string, string>; // dishId → ISO date
  collections: Collection[];
  savedVenues: string[];
  visited: Record<string, string>; // establishmentId → ISO date
  notes: Record<string, Note>;     // dishId → rating / tasting note
  /** Personal data of the other experience modules (Coffee, Bars, Spa, Sport…), same shape as Food's. */
  modulePassports: Partial<Record<ExperienceId, PassportData>>;
  /** null = guest (data only on this device); otherwise the signed-in user id the personal data belongs to. */
  ownerId: string | null;
  /** Account sync status (signed-in users). */
  sync: "idle" | "saving" | "error";
  syncError: string | null;
  /** Local-mode admin verification overrides (exported from Admin). */
  verificationOverrides: Record<string, string>;
  hydrated: boolean;
  setLocale: (l: Locale) => void;
  setExperience: (e: ExperienceId) => void;
  setShowSamples: (v: boolean) => void;
  setPreferences: (p: Partial<Preferences>) => void;
  toggleSaved: (id: string) => void;
  toggleTried: (id: string) => void;
  createCollection: (name: string) => string;
  toggleInCollection: (collectionId: string, dishId: string) => void;
  deleteCollection: (id: string) => void;
  setVerificationOverride: (dishId: string, status: string | null) => void;
  toggleSavedVenue: (id: string) => void;
  toggleVisited: (id: string) => void;
  setNote: (dishId: string, patch: { rating?: number | null; note?: string | null }) => void;
  /** Module passport actions (non-Food experiences). */
  toggleModuleSaved: (exp: ExperienceId, itemId: string) => void;
  toggleModuleTried: (exp: ExperienceId, itemId: string) => void;
  toggleModuleVisited: (exp: ExperienceId, establishmentId: string) => void;
  /** Replace personal data of every experience (after sign-in/merge) and set its owner. */
  loadPassport: (owner: string | null, all: Passports) => void;
  /** Clear personal data from this device (sign-out); preferences/language stay. */
  clearPersonal: () => void;
  setSync: (sync: UserState["sync"], syncError?: string | null) => void;
  reset: () => void;
}

/** Sample venues are shown only in development/test builds (DEV_DATA) and only when the toggle is on. */
export const useShowSamples = () => useUser((s) => DEV_DATA && s.showSamples);

/** The personal part of the store as passport data. */
export function passportOf(s: Pick<UserState, "saved" | "savedVenues" | "tried" | "visited" | "notes" | "collections">): PassportData {
  return { saved: s.saved, savedVenues: s.savedVenues, tried: s.tried, visited: s.visited, notes: s.notes, collections: s.collections.map((c) => ({ name: c.name, dishIds: c.dishIds })) };
}

/** Every experience passport held on this device: Food from the top-level fields, the rest from modulePassports. */
export function allPassportsOf(s: Pick<UserState, "saved" | "savedVenues" | "tried" | "visited" | "notes" | "collections" | "modulePassports">): Passports {
  const out: Passports = { [FOOD]: passportOf(s) };
  for (const [id, p] of Object.entries(s.modulePassports)) if (p && !isEmptyPassport(p)) out[id] = p;
  return out;
}

const modulePatch = (cur: PassportData | undefined, f: (p: PassportData) => PassportData) => f(cur ?? EMPTY_PASSPORT);
const toggleDate = (rec: Record<string, string>, id: string) => {
  const r = { ...rec };
  if (r[id]) delete r[id]; else r[id] = new Date().toISOString().slice(0, 10);
  return r;
};

const initial = {
  locale: "en" as Locale,
  experience: "food" as ExperienceId,
  showSamples: false,
  preferences: DEFAULT_PREFERENCES,
  saved: [] as string[],
  tried: {} as Record<string, string>,
  savedVenues: [] as string[],
  visited: {} as Record<string, string>,
  notes: {} as Record<string, Note>,
  ownerId: null as string | null,
  modulePassports: {} as Partial<Record<ExperienceId, PassportData>>,
  collections: [] as Collection[],
  verificationOverrides: {} as Record<string, string>,
};

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      ...initial,
      hydrated: false,
      sync: "idle",
      syncError: null,
      setLocale: (locale) => set({ locale }),
      setExperience: (experience) => set({ experience }),
      setShowSamples: (showSamples) => set({ showSamples }),
      setPreferences: (p) => set({ preferences: { ...get().preferences, ...p } }),
      toggleSaved: (id) => set({ saved: get().saved.includes(id) ? get().saved.filter((x) => x !== id) : [...get().saved, id] }),
      toggleTried: (id) => {
        const tried = { ...get().tried };
        if (tried[id]) delete tried[id];
        else tried[id] = new Date().toISOString().slice(0, 10);
        set({ tried });
      },
      createCollection: (name) => {
        const id = `c-${Date.now().toString(36)}`;
        set({ collections: [...get().collections, { id, name, dishIds: [] }] });
        return id;
      },
      toggleInCollection: (cid, dishId) =>
        set({
          collections: get().collections.map((c) =>
            c.id !== cid ? c : { ...c, dishIds: c.dishIds.includes(dishId) ? c.dishIds.filter((x) => x !== dishId) : [...c.dishIds, dishId] },
          ),
        }),
      deleteCollection: (id) => set({ collections: get().collections.filter((c) => c.id !== id) }),
      setVerificationOverride: (dishId, status) => {
        const o = { ...get().verificationOverrides };
        if (status) o[dishId] = status;
        else delete o[dishId];
        set({ verificationOverrides: o });
      },
      toggleSavedVenue: (id) => set({ savedVenues: get().savedVenues.includes(id) ? get().savedVenues.filter((x) => x !== id) : [...get().savedVenues, id] }),
      toggleVisited: (id) => {
        const visited = { ...get().visited };
        if (visited[id]) delete visited[id];
        else visited[id] = new Date().toISOString().slice(0, 10);
        set({ visited });
      },
      setNote: (dishId, patch) => {
        const notes = { ...get().notes };
        const cur = notes[dishId] ?? { updatedAt: "" };
        const next: Note = { ...cur, updatedAt: new Date().toISOString() };
        if (patch.rating !== undefined) { if (patch.rating) next.rating = patch.rating; else delete next.rating; }
        if (patch.note !== undefined) { if (patch.note?.trim()) next.note = patch.note; else delete next.note; }
        if (!next.rating && !next.note) delete notes[dishId];
        else notes[dishId] = next;
        set({ notes });
      },
      toggleModuleSaved: (exp, itemId) => set({ modulePassports: { ...get().modulePassports, [exp]: modulePatch(get().modulePassports[exp], (p) => ({ ...p, saved: p.saved.includes(itemId) ? p.saved.filter((x) => x !== itemId) : [...p.saved, itemId] })) } }),
      toggleModuleTried: (exp, itemId) => set({ modulePassports: { ...get().modulePassports, [exp]: modulePatch(get().modulePassports[exp], (p) => ({ ...p, tried: toggleDate(p.tried, itemId) })) } }),
      toggleModuleVisited: (exp, id) => set({ modulePassports: { ...get().modulePassports, [exp]: modulePatch(get().modulePassports[exp], (p) => ({ ...p, visited: toggleDate(p.visited, id) })) } }),
      loadPassport: (owner, all) => {
        const p = all[FOOD] ?? EMPTY_PASSPORT;
        const modulePassports = Object.fromEntries(Object.entries(all).filter(([id]) => id !== FOOD)) as UserState["modulePassports"];
        set({
          ownerId: owner, modulePassports, saved: p.saved, savedVenues: p.savedVenues, tried: p.tried, visited: p.visited, notes: p.notes,
          collections: p.collections.map((c, i) => ({ id: `c-${i}-${c.name}`, name: c.name, dishIds: c.dishIds })),
        });
      },
      clearPersonal: () => set({ ownerId: null, ...EMPTY_PASSPORT, collections: [], modulePassports: {}, sync: "idle", syncError: null }),
      setSync: (sync, syncError = null) => set({ sync, syncError }),
      reset: () => set({ ...initial, locale: get().locale, ownerId: get().ownerId }),
    }),
    {
      name: "ks-experience-user",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([k]) => !["hydrated", "sync", "syncError"].includes(k))) as Partial<UserState>,
    },
  ),
);
