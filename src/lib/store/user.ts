"use client";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Locale } from "../i18n/dict";
import { DEFAULT_PREFERENCES, type Preferences } from "../food/recommend";
import type { ExperienceId } from "@/experiences/registry";

export interface Collection { id: string; name: string; dishIds: string[] }

interface UserState {
  locale: Locale;
  experience: ExperienceId;
  showSamples: boolean;
  preferences: Preferences;
  saved: string[];
  tried: Record<string, string>; // dishId → ISO date
  collections: Collection[];
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
  reset: () => void;
}

const initial = {
  locale: "en" as Locale,
  experience: "food" as ExperienceId,
  showSamples: false,
  preferences: DEFAULT_PREFERENCES,
  saved: [] as string[],
  tried: {} as Record<string, string>,
  collections: [] as Collection[],
  verificationOverrides: {} as Record<string, string>,
};

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      ...initial,
      hydrated: false,
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
      reset: () => set({ ...initial, locale: get().locale }),
    }),
    {
      name: "ks-experience-user",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== "hydrated")) as Partial<UserState>,
    },
  ),
);
