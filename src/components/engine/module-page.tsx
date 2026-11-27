"use client";
import type { ExperienceId } from "@/experiences/registry";
import { ModuleGate } from "./experience-data";
import { PassportGate } from "@/components/auth/auth-gate";
import { EstablishmentsView, ItemCatalogue, ItemDetail, ModuleDiscover, ModulePassport } from "./module-views";

export type ModuleSlot = "map" | "discover" | "catalogue" | "item" | "nearby" | "passport";

/** One client entry point for every shared-engine screen of a non-Food module. */
export function ModulePage({ id, slot }: { id: ExperienceId; slot: ModuleSlot }) {
  return (
    <ModuleGate id={id}>
      {(d) => {
        switch (slot) {
          case "map": return <EstablishmentsView d={d} title={d.module.navLabels.map} />;
          case "nearby": return <EstablishmentsView d={d} title={d.module.navLabels.nearby} />;
          case "discover": return <ModuleDiscover d={d} />;
          case "catalogue": return <ItemCatalogue d={d} />;
          case "item": return <ItemDetail d={d} />;
          case "passport": return <PassportGate><ModulePassport d={d} /></PassportGate>;
        }
      }}
    </ModuleGate>
  );
}
