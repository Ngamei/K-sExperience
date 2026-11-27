"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DishCard } from "@/components/food/dish-card";
import { useFoodData } from "@/components/food/food-data";
import { EXPERIENCES, isSelectable } from "@/experiences/registry";
import { ModuleGate } from "@/components/engine/experience-data";
import { ModuleSaved } from "@/components/engine/module-views";

/** Saved is shared: it shows the saved items of the active experience (Food keeps its own view). */
export function SavedView() {
  const experience = useUser((s) => s.experience);
  const mod = EXPERIENCES.find((e) => e.id === experience);
  if (mod && mod.id !== "food" && isSelectable(mod)) return <ModuleGate id={mod.id}>{(d) => <ModuleSaved d={d} />}</ModuleGate>;
  return <FoodSavedView />;
}

function FoodSavedView() {
  const { t } = useT();
  const { dishById } = useFoodData();
  const saved = useUser((s) => s.saved);
  const collections = useUser((s) => s.collections);
  const createCollection = useUser((s) => s.createCollection);
  const deleteCollection = useUser((s) => s.deleteCollection);
  const [active, setActive] = useState<string>("all");
  const [name, setName] = useState("");
  const col = collections.find((c) => c.id === active);
  const ids = col ? col.dishIds : saved;
  const dishes = ids.map((id) => dishById.get(id)).filter(Boolean) as NonNullable<ReturnType<typeof dishById.get>>[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <h1 className="font-display text-4xl text-forest">{t("saved.title")}</h1>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip active={active === "all"} onClick={() => setActive("all")}>{t("saved.all")} · {saved.length}</Chip>
        {collections.map((c) => <Chip key={c.id} active={active === c.id} onClick={() => setActive(c.id)}>{c.name} · {c.dishIds.length}</Chip>)}
        <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { setActive(createCollection(name.trim())); setName(""); } }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("saved.newCollection")} className="h-8 w-44 rounded-full border border-line bg-paper px-3 text-xs" data-testid="new-collection" />
          <Button size="sm" variant="subtle" type="submit"><Plus /> {t("saved.create")}</Button>
        </form>
        {col && <Button size="sm" variant="ghost" onClick={() => { deleteCollection(col.id); setActive("all"); }}><Trash2 /></Button>}
      </div>
      {dishes.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-line p-8 text-center text-muted" data-testid="saved-empty">{t("saved.empty")}</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="saved-list">{dishes.map((d) => <DishCard key={d.id} dish={d} />)}</div>
      )}
    </div>
  );
}
