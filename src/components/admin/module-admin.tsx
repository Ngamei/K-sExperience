"use client";
import { googleMapsLink } from "@/lib/geo/maps-link";
/**
 * Admin for shared-engine modules (Bars, Coffee, Spa, Sport) — the same Admin screen, configured by the
 * registry: categories, item attributes, establishment attributes, pricing units and evidence rules.
 * Local mode validates and downloads JSON; Supabase mode saves (editors only) and reports real errors.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileUp } from "lucide-react";
import { useMemo, useState } from "react";
import { EXPERIENCES, loc, type AttributeDef, type ExperienceId, type ExperienceModule } from "@/experiences/registry";
import { ALLOWED_EVIDENCE, LINK_STATUSES, type EvidenceType, type LinkStatus } from "@/lib/data/evidence";
import { LINK_PHOTO_KINDS } from "@/lib/data/schema";
import { EstablishmentSchema, ExperienceItemSchema, OfferingSchema, type Establishment, type ExperienceData, type ExperienceItem, type Offering } from "@/engine/schema";
import { establishmentProblems, itemProblems, moduleDataProblems, offeringProblems } from "@/engine/validate";
import { importIntoModule, type ImportKind, type ModuleImportReport } from "@/engine/import";
import { fetchExperienceData } from "@/components/engine/experience-data";
import { getSupabase } from "@/lib/supabase/client";
import { saveEstablishment, saveItem, saveOffering } from "@/lib/supabase/modules";
import { slugify } from "@/lib/search/normalize";
import type { GeoJsonGeometry } from "@/lib/geo/geo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

const field = "h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted";
const TABS = ["Overview", "Items", "Establishments", "Offerings", "Import"] as const;
type Tab = (typeof TABS)[number];
export type ModuleTab = Tab;
type Attr = ExperienceItem["attributes"][string];

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}
const zodIssues = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map((i) => `${i.path.join(".") || "record"}: ${i.message}`);

function Issues({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-forest" data-testid="module-admin-valid">✓ Valid</p>;
  return <ul className="rounded-xl bg-[#f6e3dc] p-3 text-xs text-[#8a3f26]" data-testid="module-admin-issues">{items.map((i) => <li key={i}>✗ {i}</li>)}</ul>;
}

/** One input for a registry attribute definition. */
function AttrInput({ def, value, onChange }: { def: AttributeDef; value: Attr | undefined; onChange: (v: Attr | undefined) => void }) {
  if (def.kind === "boolean") return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked ? true : undefined)} data-testid={`attr-input-${def.id}`} /> {loc(def.label, "en")}</label>;
  if (def.kind === "list" && def.options) {
    const cur = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-1.5" data-testid={`attr-input-${def.id}`}>
        {def.options.map((o) => <Chip key={o.id} active={cur.includes(o.id)} onClick={() => { const n = cur.includes(o.id) ? cur.filter((x) => x !== o.id) : [...cur, o.id]; onChange(n.length ? n : undefined); }}>{loc(o.label, "en")}</Chip>)}
      </div>
    );
  }
  if (def.options)
    return <select className={field} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value || undefined)} data-testid={`attr-input-${def.id}`}><option value="">—</option>{def.options.map((o) => <option key={o.id} value={o.id}>{loc(o.label, "en")}</option>)}</select>;
  return <input className={field} value={value === undefined ? "" : Array.isArray(value) ? value.join(" | ") : String(value)} data-testid={`attr-input-${def.id}`}
    onChange={(e) => { const v = e.target.value; onChange(v === "" ? undefined : def.kind === "number" ? Number(v) : def.kind === "list" ? v.split("|").map((x) => x.trim()).filter(Boolean) : v); }} />;
}

function AttrFields({ defs, values, onChange }: { defs: AttributeDef[]; values: Record<string, Attr>; onChange: (v: Record<string, Attr>) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {defs.map((d) => (
        <div key={d.id}><span className={label}>{loc(d.label, "en")}{d.unit && loc(d.unit, "en") ? ` (${loc(d.unit, "en")})` : ""}</span>
          <AttrInput def={d} value={values[d.id]} onChange={(v) => { const n = { ...values }; if (v === undefined) delete n[d.id]; else n[d.id] = v; onChange(n); }} />
        </div>
      ))}
    </div>
  );
}

function SaveBar({ disabled, canPersist, onSave, msg }: { disabled: boolean; canPersist: boolean; onSave: () => Promise<void>; msg: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={disabled || busy} onClick={async () => { setBusy(true); try { await onSave(); } finally { setBusy(false); } }} data-testid="module-admin-save">
        {busy ? "Saving…" : canPersist ? "Save to database" : "Download validated JSON"}
      </Button>
      {msg && <span className="text-sm" data-testid="module-admin-message">{msg}</span>}
    </div>
  );
}

/** `tab` set = controlled by the Admin Portal section (no own tab bar); unset = standalone with its own tabs. */
export function ModuleAdmin({ id, canPersist, inHcmc, tab: fixedTab }: { id: ExperienceId; canPersist: boolean; inHcmc: (p: [number, number]) => boolean | null; tab?: Tab }) {
  const m = EXPERIENCES.find((e) => e.id === id)!;
  const qc = useQueryClient();
  const { data, error, refetch } = useQuery({ queryKey: ["experience-data", id], queryFn: () => fetchExperienceData(id), staleTime: Infinity });
  const [ownTab, setTab] = useState<Tab>("Overview");
  const tab = fixedTab ?? ownTab;
  const persist = async (save: () => Promise<void>, fallbackName: string, record: unknown) => {
    if (!canPersist) { download(fallbackName, record); return "Downloaded validated JSON (local mode — nothing saved)."; }
    await save(); // throws on any database error → shown as a failure, never as success
    await qc.invalidateQueries({ queryKey: ["experience-data", id] });
    return "Saved ✓";
  };
  if (error) return <div role="alert" className="rounded-2xl bg-[#f6e3dc] p-4 text-sm text-[#8a3f26]">Could not load {m.id} data: {(error as Error).message} <Button size="sm" variant="ghost" onClick={() => refetch()}>Retry</Button></div>;
  if (!data) return <p className="text-sm text-muted">Loading…</p>;
  return (
    <section className="space-y-4" data-testid="module-admin" data-experience={id}>
      {!fixedTab && <nav className="no-scrollbar flex gap-2 overflow-x-auto" aria-label={`${m.id} admin sections`}>
        {TABS.map((t) => <Chip key={t} active={tab === t} onClick={() => setTab(t)} data-testid={`module-admin-tab-${t.toLowerCase()}`}>{t}</Chip>)}
      </nav>}
      {tab === "Overview" && <ModuleOverview m={m} d={data} />}
      {tab === "Items" && <ItemEditor m={m} d={data} canPersist={canPersist} persist={persist} />}
      {tab === "Establishments" && <EstablishmentEditor m={m} d={data} canPersist={canPersist} persist={persist} inHcmc={inHcmc} />}
      {tab === "Offerings" && <OfferingEditor m={m} d={data} canPersist={canPersist} persist={persist} />}
      {tab === "Import" && <ModuleImport m={m} d={data} canPersist={canPersist} />}
    </section>
  );
}
type Persist = (save: () => Promise<void>, fallbackName: string, record: unknown) => Promise<string>;

/** Data quality / completeness for one module (moved here from the consumer UI). */
export function moduleCompleteness(m: ExperienceModule, d: ExperienceData) {
  const real = d.establishments.filter((e) => !e.isSample);
  const offered = new Set(d.offerings.filter((o) => !o.isSample && o.status !== "candidate").map((o) => o.itemId));
  return {
    items: d.items.length,
    verifiedItems: d.items.filter((i) => i.verification.status === "verified").length,
    itemsWithPhoto: d.items.filter((i) => i.photos.length).length,
    itemsWithVenue: d.items.filter((i) => offered.has(i.id)).length,
    establishments: real.length,
    establishmentsWithAttributes: real.filter((e) => Object.keys(e.attributes ?? {}).length).length,
    offerings: d.offerings.filter((o) => !o.isSample && o.status !== "candidate").length,
    confirmedOfferings: d.offerings.filter((o) => ["menu-confirmed", "directly-confirmed", "visit-confirmed"].includes(o.status)).length,
    offeringPhotos: d.offerings.filter((o) => o.photo).length,
    categories: m.categories.map((c) => ({ id: c.id, name: loc(c.name, "en"), items: d.items.filter((i) => i.category === c.id).length })),
    problems: moduleDataProblems(m, d),
  };
}

function ModuleOverview({ m, d }: { m: ExperienceModule; d: ExperienceData & { source?: string } }) {
  const c = moduleCompleteness(m, d);
  const stat = (l: string, v: React.ReactNode) => <div key={l} className="rounded-2xl border border-line/80 bg-paper p-4"><dt className="text-xs text-muted">{l}</dt><dd className="font-display text-3xl text-forest">{v}</dd></div>;
  return (
    <div className="space-y-3" data-testid="module-admin-overview">
      <p className="text-sm text-muted">Dataset <Badge tone="sample">{d.metadata.dataset}</Badge> · source {d.source ?? "local"} · {d.metadata.note}</p>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat("Items", c.items)}{stat("Items with a verified HCMC venue", `${c.itemsWithVenue}/${c.items}`)}{stat("Items with photo", c.itemsWithPhoto)}{stat("Verified item descriptions", c.verifiedItems)}
        {stat("Establishments", c.establishments)}{stat("…with attributes", c.establishmentsWithAttributes)}{stat("Offerings (public)", c.offerings)}{stat("Confirmed offerings", c.confirmedOfferings)}
      </dl>
      <div>
        <h3 className="mb-2 font-display text-lg">Categories <span className="text-xs text-muted">(configured in the experience registry)</span></h3>
        <div className="flex flex-wrap gap-2" data-testid="module-admin-categories">{c.categories.map((x) => <Badge key={x.id} tone="outline">{x.name} · {x.items}</Badge>)}</div>
      </div>
      <div><h3 className="mb-2 font-display text-lg">Validation</h3><Issues items={c.problems} /></div>
    </div>
  );
}

function ItemEditor({ m, d, canPersist, persist }: { m: ExperienceModule; d: ExperienceData; canPersist: boolean; persist: Persist }) {
  const blank = (): ExperienceItem => ({ id: "", experienceId: m.id, nameVi: "", nameEn: "", altNames: [], category: m.categories[0]?.id ?? "", attributes: {}, description: { en: "", vi: "" }, photos: [], sources: [], verification: { status: "seed-unverified" }, dataset: "seed" });
  const [it, setIt] = useState<ExperienceItem>(blank);
  const [src, setSrc] = useState({ title: "", url: "" });
  const [photo, setPhoto] = useState({ url: "", credit: "", license: "", sourceUrl: "" });
  const [msg, setMsg] = useState("");
  const record: ExperienceItem = {
    ...it, id: it.id || slugify(it.nameVi),
    sources: src.title ? [...it.sources.filter((s) => s.title !== src.title), { title: src.title, ...(src.url ? { url: src.url } : {}), accessed: new Date().toISOString().slice(0, 10) }] : it.sources,
    photos: photo.url ? [{ url: photo.url, credit: photo.credit, license: photo.license, ...(photo.sourceUrl ? { sourceUrl: photo.sourceUrl } : {}) }, ...it.photos.filter((p) => p.url !== photo.url)] : it.photos,
  };
  const issues = [...zodIssues(ExperienceItemSchema.safeParse(record)), ...itemProblems(m, record), ...(!record.sources.length ? ["sources: add at least one source reference"] : [])];
  return (
    <div className="space-y-3" data-testid="module-item-editor">
      <div><span className={label}>Edit existing</span><select className={field} value={it.id} onChange={(e) => { const x = d.items.find((i) => i.id === e.target.value); setIt(x ?? blank()); setMsg(""); }} data-testid="module-item-select"><option value="">+ New item</option>{d.items.map((i) => <option key={i.id} value={i.id}>{i.nameVi}</option>)}</select></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><span className={label}>Name (VI)</span><input className={field} value={it.nameVi} onChange={(e) => setIt({ ...it, nameVi: e.target.value })} data-testid="module-item-name-vi" /></div>
        <div><span className={label}>Name (EN)</span><input className={field} value={it.nameEn} onChange={(e) => setIt({ ...it, nameEn: e.target.value })} data-testid="module-item-name-en" /></div>
        <div><span className={label}>Category</span><select className={field} value={it.category} onChange={(e) => setIt({ ...it, category: e.target.value })} data-testid="module-item-category">{m.categories.map((c) => <option key={c.id} value={c.id}>{loc(c.name, "en")}</option>)}</select></div>
        <div><span className={label}>Verification</span><select className={field} value={it.verification.status} onChange={(e) => setIt({ ...it, verification: { status: e.target.value as ExperienceItem["verification"]["status"] } })}>{["seed-unverified", "pending-review", "verified", "rejected"].map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="md:col-span-2"><span className={label}>Description (EN)</span><input className={field} value={it.description.en} onChange={(e) => setIt({ ...it, description: { ...it.description, en: e.target.value } })} /></div>
        <div className="md:col-span-2"><span className={label}>Description (VI)</span><input className={field} value={it.description.vi} onChange={(e) => setIt({ ...it, description: { ...it.description, vi: e.target.value } })} /></div>
        <div><span className={label}>Source title</span><input className={field} value={src.title} onChange={(e) => setSrc({ ...src, title: e.target.value })} data-testid="module-item-source-title" /></div>
        <div><span className={label}>Source URL</span><input className={field} value={src.url} onChange={(e) => setSrc({ ...src, url: e.target.value })} data-testid="module-item-source-url" /></div>
      </div>
      <fieldset className="rounded-xl border border-line p-3"><legend className="px-1 text-xs text-muted">Item attributes ({m.id})</legend><AttrFields defs={m.attributes} values={it.attributes} onChange={(attributes) => setIt({ ...it, attributes })} /></fieldset>
      <fieldset className="grid gap-3 rounded-xl border border-line p-3 md:grid-cols-2"><legend className="px-1 text-xs text-muted">Reference photograph (must show this exact item; licence required)</legend>
        <input className={field} placeholder="Photo URL" value={photo.url} onChange={(e) => setPhoto({ ...photo, url: e.target.value })} />
        <input className={field} placeholder="Credit" value={photo.credit} onChange={(e) => setPhoto({ ...photo, credit: e.target.value })} />
        <input className={field} placeholder="Licence" value={photo.license} onChange={(e) => setPhoto({ ...photo, license: e.target.value })} />
        <input className={field} placeholder="Source page URL" value={photo.sourceUrl} onChange={(e) => setPhoto({ ...photo, sourceUrl: e.target.value })} />
      </fieldset>
      <Issues items={issues} />
      <SaveBar canPersist={canPersist} disabled={issues.length > 0} msg={msg} onSave={async () => { try { setMsg(await persist(() => saveItem(getSupabase()!, m.id, record), `item-${record.id}.json`, record)); } catch (e) { setMsg(`✗ ${(e as Error).message}`); } }} />
    </div>
  );
}

function EstablishmentEditor({ m, d, canPersist, persist, inHcmc }: { m: ExperienceModule; d: ExperienceData; canPersist: boolean; persist: Persist; inHcmc: (p: [number, number]) => boolean | null }) {
  const blank = (): Establishment => ({ id: "", name: "", isSample: false, address: "", neighbourhood: "", coordinates: [106.7, 10.776], venueType: "", deliveryLinks: [], sources: [], experiences: [m.id], attributes: {}, lastVerified: new Date().toISOString().slice(0, 10) });
  const [e, setE] = useState<Establishment>(blank);
  const [src, setSrc] = useState({ title: "", url: "" });
  const [msg, setMsg] = useState("");
  const record: Establishment = {
    ...e, id: e.id || slugify(`${e.name} ${e.address}`).slice(0, 80),
    googleMapsUrl: e.name && e.address ? googleMapsLink(e.name, e.address, { placeUrl: e.googleMapsUrl }) : e.googleMapsUrl,
    sources: src.title ? [...e.sources.filter((s) => s.title !== src.title), { title: src.title, ...(src.url ? { url: src.url } : {}), accessed: new Date().toISOString().slice(0, 10) }] : e.sources,
  };
  const hcmc = inHcmc(record.coordinates);
  const issues = [...zodIssues(EstablishmentSchema.safeParse(record)), ...establishmentProblems(m, record), ...(hcmc === false ? ["coordinates: outside Ho Chi Minh City"] : [])];
  return (
    <div className="space-y-3" data-testid="module-establishment-editor">
      <div><span className={label}>Edit existing</span><select className={field} value={e.id} onChange={(ev) => { setE(d.establishments.find((x) => x.id === ev.target.value) ?? blank()); setMsg(""); }}><option value="">+ New establishment</option>{d.establishments.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div className="grid gap-3 md:grid-cols-2">
        <div><span className={label}>Name</span><input className={field} value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} data-testid="module-est-name" /></div>
        <div><span className={label}>Venue type</span><input className={field} value={e.venueType} onChange={(ev) => setE({ ...e, venueType: ev.target.value })} placeholder="café, bar, spa, studio…" data-testid="module-est-type" /></div>
        <div className="md:col-span-2"><span className={label}>Address</span><input className={field} value={e.address} onChange={(ev) => setE({ ...e, address: ev.target.value })} data-testid="module-est-address" /></div>
        <div><span className={label}>Ward / neighbourhood</span><input className={field} value={e.neighbourhood} onChange={(ev) => setE({ ...e, neighbourhood: ev.target.value })} data-testid="module-est-neighbourhood" /></div>
        <div className="grid grid-cols-2 gap-2"><div><span className={label}>Longitude</span><input className={field} value={e.coordinates[0]} onChange={(ev) => setE({ ...e, coordinates: [Number(ev.target.value), e.coordinates[1]] })} data-testid="module-est-lon" /></div><div><span className={label}>Latitude</span><input className={field} value={e.coordinates[1]} onChange={(ev) => setE({ ...e, coordinates: [e.coordinates[0], Number(ev.target.value)] })} data-testid="module-est-lat" /></div></div>
        <div><span className={label}>Source title</span><input className={field} value={src.title} onChange={(ev) => setSrc({ ...src, title: ev.target.value })} data-testid="module-est-source-title" /></div>
        <div><span className={label}>Source URL</span><input className={field} value={src.url} onChange={(ev) => setSrc({ ...src, url: ev.target.value })} data-testid="module-est-source-url" /></div>
        <div><span className={label}>Last checked</span><input type="date" className={field} value={e.lastVerified ?? ""} onChange={(ev) => setE({ ...e, lastVerified: ev.target.value })} /></div>
        <div><span className={label}>Experience modes</span><div className="flex flex-wrap gap-1.5">{EXPERIENCES.filter((x) => x.id !== "shopping").map((x) => <Chip key={x.id} active={e.experiences.includes(x.id)} onClick={() => setE({ ...e, experiences: e.experiences.includes(x.id) ? e.experiences.filter((y) => y !== x.id) : [...e.experiences, x.id] })}>{loc(x.name, "en")}</Chip>)}</div></div>
      </div>
      <fieldset className="rounded-xl border border-line p-3"><legend className="px-1 text-xs text-muted">Establishment attributes ({m.id}) — characteristics of the place, not of items</legend><AttrFields defs={m.establishmentAttributes} values={e.attributes} onChange={(attributes) => setE({ ...e, attributes })} /></fieldset>
      <Issues items={issues} />
      <SaveBar canPersist={canPersist} disabled={issues.length > 0} msg={msg} onSave={async () => { try { setMsg(await persist(() => saveEstablishment(getSupabase()!, m.id, record), `establishment-${record.id}.json`, record)); } catch (err) { setMsg(`✗ ${(err as Error).message}`); } }} />
    </div>
  );
}

function OfferingEditor({ m, d, canPersist, persist }: { m: ExperienceModule; d: ExperienceData; canPersist: boolean; persist: Persist }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<Record<string, string>>({ status: "source-listed", type: "published-source", lastVerified: today, unit: m.pricingUnits[0], photoKind: "venue-specific", photoChecked: today });
  const [msg, setMsg] = useState("");
  const set = (k: string) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: ev.target.value }));
  const existing = d.offerings.find((o) => o.itemId === f.itemId && o.establishmentId === f.establishmentId);
  const record: Offering = {
    itemId: f.itemId ?? "", establishmentId: f.establishmentId ?? "", status: f.status as LinkStatus, isSample: false,
    menuEvidence: { type: f.type as EvidenceType, note: f.note ?? "", ...(f.url ? { url: f.url } : {}) },
    ...(f.priceMin && f.priceMax ? { price: { minVnd: Number(f.priceMin), maxVnd: Number(f.priceMax), unit: f.unit } } : existing?.price ? { price: existing.price } : {}),
    ...(f.lastVerified ? { lastVerified: f.lastVerified } : {}),
    ...(f.photoUrl ? { photo: { url: f.photoUrl, kind: f.photoKind as NonNullable<Offering["photo"]>["kind"], sourceUrl: f.photoSource ?? "", attribution: f.photoAttribution ?? "", license: f.photoLicense ?? "", lastCheckedAt: f.photoChecked } } : existing?.photo ? { photo: existing.photo } : {}),
  };
  const known = useMemo(() => ({ items: new Set(d.items.map((i) => i.id)), establishments: new Set(d.establishments.map((e) => e.id)) }), [d]);
  const issues = [...zodIssues(OfferingSchema.safeParse(record)), ...offeringProblems(m, record, known.items, known.establishments), ...(!f.note?.trim() ? ["evidence note: describe what the source shows for this exact item"] : [])];
  return (
    <div className="space-y-3" data-testid="module-offering-editor">
      <div className="grid gap-3 md:grid-cols-2">
        <div><span className={label}>Item</span><select className={field} value={f.itemId ?? ""} onChange={set("itemId")} data-testid="module-off-item"><option value="">—</option>{d.items.map((i) => <option key={i.id} value={i.id}>{i.nameVi}</option>)}</select></div>
        <div><span className={label}>Establishment</span><select className={field} value={f.establishmentId ?? ""} onChange={set("establishmentId")} data-testid="module-off-est"><option value="">—</option>{d.establishments.filter((e) => !e.isSample).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
        <div><span className={label}>Evidence level</span><select className={field} value={f.status} onChange={(ev) => setF((x) => ({ ...x, status: ev.target.value, type: ALLOWED_EVIDENCE[ev.target.value as LinkStatus][0] }))} data-testid="module-off-status">{LINK_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><span className={label}>Evidence type</span><select className={field} value={f.type} onChange={set("type")}>{(ALLOWED_EVIDENCE[f.status as LinkStatus] ?? []).map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="md:col-span-2"><span className={label}>Evidence note</span><input className={field} value={f.note ?? ""} onChange={set("note")} data-testid="module-off-note" /></div>
        <div><span className={label}>Evidence URL</span><input className={field} value={f.url ?? ""} onChange={set("url")} /></div>
        <div><span className={label}>Last checked</span><input type="date" className={field} value={f.lastVerified} onChange={set("lastVerified")} /></div>
        <div className="grid grid-cols-3 gap-2 md:col-span-2">
          <div><span className={label}>Price min ₫</span><input className={field} value={f.priceMin ?? ""} onChange={set("priceMin")} /></div>
          <div><span className={label}>Price max ₫</span><input className={field} value={f.priceMax ?? ""} onChange={set("priceMax")} /></div>
          <div><span className={label}>Per</span><select className={field} value={f.unit} onChange={set("unit")} data-testid="module-off-unit">{m.pricingUnits.map((u) => <option key={u}>{u}</option>)}</select></div>
        </div>
      </div>
      <fieldset className="grid gap-3 rounded-xl border border-line p-3 md:grid-cols-2"><legend className="px-1 text-xs text-muted">Offering photograph — this exact item / facility at this establishment (licence or written permission required)</legend>
        <input className={field} placeholder="Photo URL" value={f.photoUrl ?? ""} onChange={set("photoUrl")} />
        <select className={field} value={f.photoKind} onChange={set("photoKind")}>{LINK_PHOTO_KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        <input className={field} placeholder="Source page URL" value={f.photoSource ?? ""} onChange={set("photoSource")} />
        <input className={field} placeholder="Attribution" value={f.photoAttribution ?? ""} onChange={set("photoAttribution")} />
        <input className={field} placeholder="Licence / permission" value={f.photoLicense ?? ""} onChange={set("photoLicense")} />
        <input type="date" className={field} value={f.photoChecked} onChange={set("photoChecked")} />
      </fieldset>
      {existing && <p className="text-xs text-muted">Existing offering: <strong>{existing.status}</strong> · last checked {existing.lastVerified ?? "—"} — saving replaces it.</p>}
      <Issues items={issues} />
      <SaveBar canPersist={canPersist} disabled={issues.length > 0} msg={msg} onSave={async () => { try { setMsg(await persist(() => saveOffering(getSupabase()!, m.id, record, known), `offering-${record.itemId}@${record.establishmentId}.json`, record)); } catch (e) { setMsg(`✗ ${(e as Error).message}`); } }} />
    </div>
  );
}

function ModuleImport({ m, d, canPersist }: { m: ExperienceModule; d: ExperienceData; canPersist: boolean }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<ImportKind>("items");
  const [text, setText] = useState("");
  const [report, setReport] = useState<ModuleImportReport | null>(null);
  const [msg, setMsg] = useState("");
  const hcmc = useQuery({ queryKey: ["geo", "hcmc"], queryFn: () => fetch("/geo/hcmc.json").then((r) => r.json()) });
  const geoms: GeoJsonGeometry[] = (hcmc.data?.geometries ?? hcmc.data?.features?.map((f: { geometry: GeoJsonGeometry }) => f.geometry)) ?? [];
  const run = (raw: string) => { setMsg(""); setReport(importIntoModule(m, d, raw, kind, geoms)); };
  const apply = async () => {
    if (!report) return;
    const sb = getSupabase()!;
    const changed = new Set([...report.added, ...report.updated]);
    const known = { items: new Set(report.merged.items.map((i) => i.id)), establishments: new Set(report.merged.establishments.map((e) => e.id)) };
    let n = 0;
    try {
      for (const i of report.merged.items) if (changed.has(`item ${i.id}`)) { await saveItem(sb, m.id, i); n++; }
      for (const e of report.merged.establishments) if (changed.has(`establishment ${e.id}`)) { await saveEstablishment(sb, m.id, e); n++; }
      for (const o of report.merged.offerings) if (changed.has(`offering ${o.itemId}@${o.establishmentId}`)) { await saveOffering(sb, m.id, o, known); n++; }
      setMsg(`Applied ${n} records ✓`);
    } catch (e) {
      setMsg(`✗ Stopped after ${n} records: ${(e as Error).message}`); // partial progress is reported, never hidden
    }
    await qc.invalidateQueries({ queryKey: ["experience-data", m.id] });
  };
  return (
    <div className="space-y-3" data-testid="module-import">
      <p className="text-sm text-muted">CSV or JSON for <strong>{m.id}</strong>. Dry run first; imports <strong>merge</strong> by id — only supplied columns change, nothing is deleted. CSV columns: items <code>id,name_vi,name_en,category,attr:&lt;id&gt;,…</code>; establishments <code>id,name,address,neighbourhood,lon,lat,venue_type,source_title,source_url,last_verified,attr:&lt;id&gt;</code>; offerings <code>item_id,establishment_id,status,evidence_type,evidence_note,evidence_url,price_min,price_max,price_unit,last_verified,photo_*</code>. Lists use <code>|</code>.</p>
      <div className="flex flex-wrap items-center gap-2">
        <select className="h-10 rounded-full border border-line bg-paper px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value as ImportKind)} data-testid="module-import-kind">{(["items", "establishments", "offerings", "bundle"] as const).map((k) => <option key={k}>{k}</option>)}</select>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm hover:bg-ivory-deep"><FileUp className="size-4" /> Upload file<input type="file" accept=".json,.csv" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) run(await f.text()); }} /></label>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="w-full rounded-2xl border border-line bg-ivory p-3 font-mono text-xs" data-testid="module-import-text" />
      <Button onClick={() => run(text)} data-testid="module-import-validate">Validate (dry run)</Button>
      {report && (
        <div className="space-y-2" data-testid="module-import-report">
          <p className="text-sm"><strong>{report.added.length}</strong> new · <strong>{report.updated.length}</strong> updated · {report.unchanged.length} unchanged · <strong>{report.errors.length}</strong> errors · {report.warnings.length} warnings · nothing deleted</p>
          <ul className="max-h-56 overflow-y-auto rounded-xl bg-ivory p-2 text-xs">
            {report.errors.map((x) => <li key={x} className="text-[#8a3f26]">✗ {x}</li>)}
            {report.warnings.map((x) => <li key={x} className="text-[#6b4e00]">! {x}</li>)}
          </ul>
          <div className="flex flex-wrap gap-2">
            {report.errors.length === 0 && <Button variant="outline" onClick={() => download(`${m.id}.json`, report.merged)} data-testid="module-import-download"><Download /> Download merged {m.id}.json</Button>}
            {canPersist && report.errors.length === 0 && <Button onClick={apply} data-testid="module-import-apply">Apply to database</Button>}
          </div>
          {msg && <p className="text-sm" data-testid="module-import-message">{msg}</p>}
        </div>
      )}
    </div>
  );
}
