"use client";
import { useState } from "react";
import { CATEGORIES, DIETARY, DISH_TYPES, MEAL_TIMES, PRICE_RANGES, TASTES, VENUE_TYPES, DishRestaurantLinkSchema, DishSchema, LINK_PHOTO_KINDS, type LinkPhotoKind, RestaurantSchema, type Dish, type DishRestaurantLink, type Restaurant } from "@/lib/data/schema";
import { ALLOWED_EVIDENCE, LINK_STATUSES, type EvidenceType, type LinkStatus } from "@/lib/data/evidence";
import { slugify } from "@/lib/search/normalize";
import { Button } from "@/components/ui/button";
import { useFoodData } from "@/components/food/food-data";

export type Saver = (kind: "dish" | "restaurant" | "link", record: unknown) => Promise<void>;

const list = (s: string) => s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
const issuesOf = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => `${i.path.join(".") || "record"}: ${i.message}`);

export const field = "h-9 w-full rounded-xl border border-line bg-paper px-3 text-sm";
export const label = "block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1";

function Issues({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <ul className="mt-3 space-y-0.5 rounded-xl bg-[#f6e3dc] p-3 text-xs text-[#8a3f26]" data-testid="form-issues">{items.map((i) => <li key={i}>✗ {i}</li>)}</ul>;
}

function SaveBar({ onSave, disabled, canPersist }: { onSave: () => void; disabled: boolean; canPersist: boolean }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <Button onClick={onSave} disabled={disabled} data-testid="admin-save">{canPersist ? "Save to database" : "Download validated JSON"}</Button>
      {!canPersist && <span className="text-xs text-muted">Local mode: persistence needs Supabase (see docs/SUPABASE.md).</span>}
    </div>
  );
}

// ---- Dish ------------------------------------------------------------------------------------
export function DishEditor({ onSave, canPersist }: { onSave: Saver; canPersist: boolean }) {
  const { dishes, provinces, regions, provinceById } = useFoodData();
  const [id, setId] = useState<string>("");
  const base = dishes.find((d) => d.id === id);
  const [f, setF] = useState<Record<string, string>>({});
  const [origins, setOrigins] = useState<{ provinceId: string; role: "primary" | "associated" }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = (dishId: string) => {
    setId(dishId); setMsg("");
    const d = dishes.find((x) => x.id === dishId);
    setF(d ? {
      nameVi: d.nameVi, nameEn: d.nameEn, altNames: d.altNames.join(", "), category: d.category, dishType: d.dishType, family: d.family ?? "",
      ingredients: d.ingredients.join(", "), taste: d.taste.join(", "), dietary: d.dietary.join(", "), mealTimes: d.mealTimes.join(", "),
      spiceLevel: String(d.spiceLevel), prominence: String(d.prominence), descriptionEn: d.description.en, descriptionVi: d.description.vi,
      status: d.verification.status, notes: d.verification.notes ?? "", sources: d.sources.map((s) => [s.title, s.url ?? ""].join(" | ")).join("\n"),
    } : { category: "savory", dishType: "noodle-soup", spiceLevel: "0", prominence: "3", status: "pending-review" });
    setOrigins(d ? d.origins.filter((o) => o.provinceId).map((o) => ({ provinceId: o.provinceId!, role: o.role })) : []);
  };

  const record: Dish = (() => {
    const os = origins.map((o) => ({ provinceId: o.provinceId, regionId: provinceById.get(o.provinceId)?.regionId ?? "mien-bac", role: o.role }));
    const keepRegionWide = base ? base.origins.filter((o) => !o.provinceId) : [];
    const all = [...os, ...keepRegionWide] as Dish["origins"];
    return {
      ...(base ?? { photos: [], dataset: "master" as const }),
      id: base?.id ?? slugify(f.nameVi ?? ""),
      nameVi: f.nameVi ?? "", nameEn: f.nameEn ?? "", altNames: list(f.altNames ?? ""),
      category: f.category as Dish["category"], dishType: f.dishType as Dish["dishType"], ...(f.family ? { family: slugify(f.family) } : { family: undefined }),
      origins: all, regionIds: [...new Set(all.map((o) => o.regionId))],
      ingredients: list(f.ingredients ?? ""), taste: list(f.taste ?? "") as Dish["taste"], dietary: list(f.dietary ?? "") as Dish["dietary"], mealTimes: list(f.mealTimes ?? "") as Dish["mealTimes"],
      spiceLevel: Number(f.spiceLevel ?? 0), prominence: Number(f.prominence ?? 3) as Dish["prominence"],
      description: { en: f.descriptionEn ?? "", vi: f.descriptionVi ?? "" },
      sources: list(f.sources ?? "").map((line) => { const [title, url] = line.split("|").map((x) => x.trim()); return url ? { title: title || url, url } : { title }; }),
      verification: { status: (f.status ?? "pending-review") as Dish["verification"]["status"], ...(f.notes ? { notes: f.notes } : {}) },
    } as Dish;
  })();
  const issues = [...issuesOf(DishSchema.safeParse(record)), ...(record.verification.status === "verified" && !record.sources.length ? ["verification: a verified dish needs at least one source"] : [])];
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <section className="space-y-3" data-testid="dish-editor">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-64 flex-1"><span className={label}>Dish</span>
          <select className={field} value={id} onChange={(e) => load(e.target.value)} data-testid="dish-editor-select">
            <option value="">+ New dish</option>
            {[...dishes].sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi")).map((d) => <option key={d.id} value={d.id}>{d.nameVi}</option>)}
          </select>
        </div>
        {!id && !Object.keys(f).length && <Button variant="outline" onClick={() => load("")}>Start new</Button>}
      </div>
      {(id || Object.keys(f).length > 0) && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div><span className={label}>Name (Vietnamese)</span><input className={field} value={f.nameVi ?? ""} onChange={set("nameVi")} data-testid="dish-nameVi" /></div>
            <div><span className={label}>Name (English)</span><input className={field} value={f.nameEn ?? ""} onChange={set("nameEn")} data-testid="dish-nameEn" /></div>
            <div><span className={label}>Alternative names</span><input className={field} value={f.altNames ?? ""} onChange={set("altNames")} /></div>
            <div><span className={label}>Variant family</span><input className={field} value={f.family ?? ""} onChange={set("family")} placeholder="e.g. pho" /></div>
            <div><span className={label}>Category</span><select className={field} value={f.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><span className={label}>Dish type</span><select className={field} value={f.dishType} onChange={set("dishType")}>{DISH_TYPES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><span className={label}>Ingredients</span><input className={field} value={f.ingredients ?? ""} onChange={set("ingredients")} /></div>
            <div><span className={label}>Taste ({TASTES.length} allowed)</span><input className={field} value={f.taste ?? ""} onChange={set("taste")} title={TASTES.join(", ")} /></div>
            <div><span className={label}>Dietary</span><input className={field} value={f.dietary ?? ""} onChange={set("dietary")} title={DIETARY.join(", ")} /></div>
            <div><span className={label}>Meal times</span><input className={field} value={f.mealTimes ?? ""} onChange={set("mealTimes")} title={MEAL_TIMES.join(", ")} /></div>
            <div><span className={label}>Spice 0–3</span><input className={field} type="number" min={0} max={3} value={f.spiceLevel ?? "0"} onChange={set("spiceLevel")} /></div>
            <div><span className={label}>Map prominence 1–3</span><input className={field} type="number" min={1} max={3} value={f.prominence ?? "3"} onChange={set("prominence")} /></div>
          </div>
          <div>
            <span className={label}>Culinary origins (historical provinces)</span>
            <div className="space-y-1.5">
              {origins.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <select className={field} value={o.provinceId} onChange={(e) => setOrigins((x) => x.map((y, j) => (j === i ? { ...y, provinceId: e.target.value } : y)))}>
                    {provinces.map((p) => <option key={p.id} value={p.id}>{p.nameVi} — {regions.find((r) => r.id === p.regionId)?.nameVi}</option>)}
                  </select>
                  <select className={field + " max-w-40"} value={o.role} onChange={(e) => setOrigins((x) => x.map((y, j) => (j === i ? { ...y, role: e.target.value as "primary" | "associated" } : y)))}>
                    <option value="primary">primary</option><option value="associated">associated</option>
                  </select>
                  <Button variant="ghost" size="sm" onClick={() => setOrigins((x) => x.filter((_, j) => j !== i))}>Remove</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setOrigins((x) => [...x, { provinceId: provinces[0].id, role: x.length ? "associated" : "primary" }])} data-testid="add-origin">+ Add origin</Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><span className={label}>Description (English)</span><textarea className={field + " h-20 py-2"} value={f.descriptionEn ?? ""} onChange={set("descriptionEn")} /></div>
            <div><span className={label}>Description (Vietnamese)</span><textarea className={field + " h-20 py-2"} value={f.descriptionVi ?? ""} onChange={set("descriptionVi")} /></div>
            <div><span className={label}>Sources (one per line: title | url)</span><textarea className={field + " h-20 py-2"} value={f.sources ?? ""} onChange={set("sources")} /></div>
            <div className="space-y-2">
              <div><span className={label}>Verification</span><select className={field} value={f.status} onChange={set("status")}>{["seed-unverified", "pending-review", "verified", "rejected"].map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><span className={label}>Verification notes</span><input className={field} value={f.notes ?? ""} onChange={set("notes")} /></div>
            </div>
          </div>
          <Issues items={issues} />
          <SaveBar canPersist={canPersist} disabled={busy || issues.length > 0} onSave={async () => { setBusy(true); setMsg(""); try { await onSave("dish", record); setMsg("Saved ✓"); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } }} />
          {msg && <p className="text-sm" data-testid="admin-message">{msg}</p>}
        </>
      )}
    </section>
  );
}

// ---- Establishment -----------------------------------------------------------------------------
export function RestaurantEditor({ onSave, canPersist, inHcmc }: { onSave: Saver; canPersist: boolean; inHcmc: (p: [number, number]) => boolean | null }) {
  const { restaurants } = useFoodData();
  const real = restaurants.filter((r) => !r.isSample);
  const [id, setId] = useState("");
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const load = (rid: string) => {
    setId(rid); setMsg("");
    const r = real.find((x) => x.id === rid);
    setF(r ? {
      name: r.name, address: r.address, neighbourhood: r.neighbourhood, lon: String(r.coordinates[0]), lat: String(r.coordinates[1]), precision: r.coordinatePrecision ?? "exact",
      venueType: r.venueType, priceRange: r.priceRange ?? "", highlights: (r.highlights ?? []).join("\n"), sources: r.sources.map((s) => [s.title, s.url ?? ""].join(" | ")).join("\n"),
      lastVerified: r.lastVerified ?? "",
    } : { venueType: "eatery", precision: "exact", lastVerified: new Date().toISOString().slice(0, 10) });
  };
  const base = real.find((x) => x.id === id);
  const record = (() => {
    const name = f.name ?? "";
    const q = `${name}, ${f.address ?? ""}`;
    return {
      ...(base ?? { deliveryLinks: [] }),
      id: base?.id ?? slugify(`${name} ${(f.address ?? "").split(",")[0]}`),
      name, isSample: false, address: f.address ?? "", neighbourhood: f.neighbourhood ?? "",
      coordinates: [Number(f.lon), Number(f.lat)] as [number, number], coordinatePrecision: f.precision as "exact" | "street",
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`,
      venueType: f.venueType as Restaurant["venueType"], ...(f.priceRange ? { priceRange: f.priceRange as Restaurant["priceRange"] } : { priceRange: undefined }),
      highlights: list(f.highlights ?? "").length ? (f.highlights ?? "").split("\n").map((x) => x.trim()).filter(Boolean) : undefined,
      sources: (f.sources ?? "").split("\n").map((x) => x.trim()).filter(Boolean).map((line) => { const [title, url] = line.split("|").map((x) => x.trim()); return url ? { title: title || url, url } : { title }; }),
      lastVerified: f.lastVerified || undefined,
    } as Restaurant;
  })();
  const inside = Number.isFinite(record.coordinates[0]) && Number.isFinite(record.coordinates[1]) ? inHcmc(record.coordinates) : null;
  const issues = [
    ...issuesOf(RestaurantSchema.safeParse(record)),
    ...(!record.sources.length ? ["sources: at least one source is required"] : []),
    ...(!record.lastVerified ? ["lastVerified: last-checked date is required"] : []),
    ...(inside === false ? ["coordinates: outside Ho Chi Minh City (2025 boundary)"] : []),
  ];
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <section className="space-y-3" data-testid="restaurant-editor">
      <div><span className={label}>Establishment</span>
        <select className={field} value={id} onChange={(e) => load(e.target.value)} data-testid="restaurant-editor-select">
          <option value="">+ New establishment</option>
          {[...real].sort((a, b) => a.name.localeCompare(b.name, "vi")).map((r) => <option key={r.id} value={r.id}>{r.name} — {r.address}</option>)}
        </select>
      </div>
      {(id || Object.keys(f).length > 0) ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <div><span className={label}>Name</span><input className={field} value={f.name ?? ""} onChange={set("name")} data-testid="restaurant-name" /></div>
            <div><span className={label}>Street address</span><input className={field} value={f.address ?? ""} onChange={set("address")} data-testid="restaurant-address" /></div>
            <div><span className={label}>Neighbourhood (current ward)</span><input className={field} value={f.neighbourhood ?? ""} onChange={set("neighbourhood")} data-testid="restaurant-neighbourhood" /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><span className={label}>Longitude</span><input className={field} value={f.lon ?? ""} onChange={set("lon")} data-testid="restaurant-lon" /></div>
              <div><span className={label}>Latitude</span><input className={field} value={f.lat ?? ""} onChange={set("lat")} data-testid="restaurant-lat" /></div>
              <div><span className={label}>Pin</span><select className={field} value={f.precision} onChange={set("precision")}><option>exact</option><option>street</option></select></div>
            </div>
            <div><span className={label}>Venue type</span><select className={field} value={f.venueType} onChange={set("venueType")}>{VENUE_TYPES.map((v) => <option key={v}>{v}</option>)}</select></div>
            <div><span className={label}>Price range</span><select className={field} value={f.priceRange ?? ""} onChange={set("priceRange")}><option value="">unknown</option>{PRICE_RANGES.map((v) => <option key={v}>{v}</option>)}</select></div>
            <div><span className={label}>Highlights (one per line, attributed)</span><textarea className={field + " h-20 py-2"} value={f.highlights ?? ""} onChange={set("highlights")} /></div>
            <div><span className={label}>Sources (one per line: title | url)</span><textarea className={field + " h-20 py-2"} value={f.sources ?? ""} onChange={set("sources")} data-testid="restaurant-sources" /></div>
            <div><span className={label}>Last checked</span><input type="date" className={field} value={f.lastVerified ?? ""} onChange={set("lastVerified")} /></div>
          </div>
          <Issues items={issues} />
          <SaveBar canPersist={canPersist} disabled={busy || issues.length > 0} onSave={async () => { setBusy(true); setMsg(""); try { await onSave("restaurant", record); setMsg("Saved ✓"); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } }} />
          {msg && <p className="text-sm" data-testid="admin-message">{msg}</p>}
        </>
      ) : <Button variant="outline" onClick={() => load("")} data-testid="new-restaurant">Start new establishment</Button>}
    </section>
  );
}

// ---- Evidence (dish ↔ establishment link) ------------------------------------------------------
export function EvidenceEditor({ onSave, canPersist }: { onSave: Saver; canPersist: boolean }) {
  const { dishes, restaurants, links } = useFoodData();
  const real = restaurants.filter((r) => !r.isSample);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<Record<string, string>>({ status: "source-listed", type: "published-source", lastVerified: today });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const existing = links.find((l) => !l.isSample && l.dishId === f.dishId && l.restaurantId === f.restaurantId);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const allowed = ALLOWED_EVIDENCE[f.status as LinkStatus] ?? [];
  const record: DishRestaurantLink = {
    dishId: f.dishId ?? "", restaurantId: f.restaurantId ?? "", status: f.status as LinkStatus, isSample: false,
    menuEvidence: { type: f.type as EvidenceType, note: f.note ?? "", ...(f.url ? { url: f.url } : {}) },
    ...(f.priceMin && f.priceMax ? { priceVnd: { min: Number(f.priceMin), max: Number(f.priceMax) } } : {}),
    ...(f.lastVerified ? { lastVerified: f.lastVerified } : {}),
    // Dish-at-place photo: only when entered; otherwise keep the link's existing photo (saving must not drop it).
    ...(f.photoUrl
      ? { photo: { url: f.photoUrl, kind: (f.photoKind ?? "venue-specific") as LinkPhotoKind, sourceUrl: f.photoSourceUrl ?? "", attribution: f.photoAttribution ?? "", license: f.photoLicense ?? "", lastCheckedAt: f.photoChecked ?? today } }
      : existing?.photo ? { photo: existing.photo } : {}),
  };
  const issues = [
    ...issuesOf(DishRestaurantLinkSchema.safeParse(record)),
    ...(!f.dishId ? ["dish: choose a dish"] : []), ...(!f.restaurantId ? ["establishment: choose an establishment"] : []),
    ...(!f.note?.trim() ? ["evidence note: describe what you saw (e.g. 'Grab listing shows Bún bò Huế 55k')"] : []),
  ];
  return (
    <section className="space-y-3" data-testid="evidence-editor">
      <div className="grid gap-3 md:grid-cols-2">
        <div><span className={label}>Dish</span><select className={field} value={f.dishId ?? ""} onChange={set("dishId")} data-testid="evidence-dish"><option value="">—</option>{[...dishes].sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi")).map((d) => <option key={d.id} value={d.id}>{d.nameVi}</option>)}</select></div>
        <div><span className={label}>Establishment</span><select className={field} value={f.restaurantId ?? ""} onChange={set("restaurantId")} data-testid="evidence-restaurant"><option value="">—</option>{[...real].sort((a, b) => a.name.localeCompare(b.name, "vi")).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
        <div><span className={label}>Evidence level</span>
          <select className={field} value={f.status} onChange={(e) => setF((x) => ({ ...x, status: e.target.value, type: ALLOWED_EVIDENCE[e.target.value as LinkStatus][0] }))} data-testid="evidence-status">
            {LINK_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div><span className={label}>Evidence type</span><select className={field} value={f.type} onChange={set("type")} data-testid="evidence-type">{allowed.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="md:col-span-2"><span className={label}>Evidence note</span><input className={field} value={f.note ?? ""} onChange={set("note")} data-testid="evidence-note" /></div>
        <div><span className={label}>Evidence URL</span><input className={field} value={f.url ?? ""} onChange={set("url")} /></div>
        <div><span className={label}>Last checked</span><input type="date" className={field} value={f.lastVerified ?? ""} onChange={set("lastVerified")} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className={label}>Price min ₫</span><input className={field} value={f.priceMin ?? ""} onChange={set("priceMin")} /></div>
          <div><span className={label}>Price max ₫</span><input className={field} value={f.priceMax ?? ""} onChange={set("priceMax")} /></div>
        </div>
        <fieldset className="grid gap-3 rounded-xl border border-line p-3 md:col-span-2 md:grid-cols-2" data-testid="link-photo-fields">
          <legend className="px-1 text-xs text-muted">Photo of this dish at this venue (optional — must show this exact dish; licence or written permission required)</legend>
          <div><span className={label}>Photo URL</span><input className={field} value={f.photoUrl ?? ""} onChange={set("photoUrl")} data-testid="link-photo-url" /></div>
          <div><span className={label}>Photo kind</span><select className={field} value={f.photoKind ?? "venue-specific"} onChange={set("photoKind")}>{LINK_PHOTO_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
          <div><span className={label}>Photo source page</span><input className={field} value={f.photoSourceUrl ?? ""} onChange={set("photoSourceUrl")} /></div>
          <div><span className={label}>Attribution</span><input className={field} value={f.photoAttribution ?? ""} onChange={set("photoAttribution")} /></div>
          <div><span className={label}>Licence / permission</span><input className={field} value={f.photoLicense ?? ""} onChange={set("photoLicense")} /></div>
          <div><span className={label}>Photo last checked</span><input type="date" className={field} value={f.photoChecked ?? today} onChange={set("photoChecked")} /></div>
        </fieldset>
      </div>
      {existing && <p className="text-xs text-muted">Existing link: <strong>{existing.status}</strong> · last checked {existing.lastVerified ?? "—"} — saving replaces it.</p>}
      <Issues items={issues} />
      <SaveBar canPersist={canPersist} disabled={busy || issues.length > 0} onSave={async () => { setBusy(true); setMsg(""); try { await onSave("link", record); setMsg("Saved ✓"); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } }} />
      {msg && <p className="text-sm" data-testid="admin-message">{msg}</p>}
    </section>
  );
}
