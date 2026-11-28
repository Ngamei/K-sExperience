"use client";
import { Download, FileUp, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useT } from "@/lib/i18n/use-t";
import { importCatalogue, parseCsv, type ImportResult } from "@/lib/data/importer";
import { mergeCatalogues } from "@/lib/data/merge";
import { CATEGORIES, type Dish, type DishRestaurantLink, type Restaurant } from "@/lib/data/schema";
import { normalizeVi } from "@/lib/search/normalize";
import { pointInGeometry, type GeoJsonGeometry } from "@/lib/geo/geo";
import { getSupabase, supabaseEnabled } from "@/lib/supabase/client";
import { applyImport, currentUser, isEditor, recentAudit, saveDish, saveLink, saveRestaurant, signInWithEmail, uploadPhoto } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useFoodData } from "@/components/food/food-data";
import { whatToEatReport } from "@/lib/food/what-to-eat-report";
import { DishEditor, EvidenceEditor, RestaurantEditor, field, label, type Saver } from "@/components/admin/admin-forms";
import { ModuleAdmin } from "@/components/admin/module-admin";
import { EXPERIENCES, isSelectable, loc, type ExperienceId } from "@/experiences/registry";

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

const TABS = ["Overview", "Review", "Dishes", "Establishments", "Evidence", "Photos", "Recommendations", "Import", "Audit"] as const;
type Tab = (typeof TABS)[number];

export function AdminView() {
  const { t } = useT();
  const data = useFoodData();
  const { source } = data;
  const qc = useQueryClient();
  const sb = getSupabase();
  const [tab, setTab] = useState<Tab>("Overview");
  const [mode, setMode] = useState<ExperienceId>("food");
  const [user, setUser] = useState<User | null>(null);
  const [editor, setEditor] = useState(false);
  const [email, setEmail] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  useEffect(() => {
    if (!sb) return;
    const refresh = async () => { const u = await currentUser(sb); setUser(u); setEditor(await isEditor(sb, u)); };
    refresh();
    const { data: sub } = sb.auth.onAuthStateChange(() => { refresh(); });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const canPersist = Boolean(sb && editor);
  const hcmc = useQuery({ queryKey: ["geo", "hcmc"], queryFn: () => fetch("/geo/hcmc.json").then((r) => r.json()) });
  // /geo/hcmc.json is a GeometryCollection (mapshaper dissolve); accept a FeatureCollection too.
  const inHcmc = (p: [number, number]) => {
    const g = hcmc.data as { geometries?: GeoJsonGeometry[]; features?: { geometry: GeoJsonGeometry }[] } | undefined;
    if (!g) return null;
    const geoms = g.geometries ?? g.features?.map((f) => f.geometry) ?? [];
    return geoms.some((x) => pointInGeometry(p, x));
  };

  const onSave: Saver = async (kind, record) => {
    if (!canPersist || !sb) {
      const id = kind === "link" ? `${(record as DishRestaurantLink).dishId}@${(record as DishRestaurantLink).restaurantId}` : (record as { id: string }).id;
      download(`${kind}-${id}.json`, record);
      return;
    }
    if (kind === "dish") await saveDish(sb, record as Dish);
    if (kind === "restaurant") await saveRestaurant(sb, record as Restaurant);
    if (kind === "link") await saveLink(sb, record as DishRestaurantLink);
    await qc.invalidateQueries({ queryKey: ["food-data"] });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-10" data-testid="admin">
      <header>
        <h1 className="font-display text-4xl text-forest">{t("admin.title")}</h1>
        <p className="text-muted">{t("admin.subtitle")}</p>
        <div className="mt-3 rounded-2xl border border-line bg-paper p-3 text-sm" data-testid="admin-auth">
          {!supabaseEnabled ? (
            <p className="flex gap-2 text-[#8a3f26]"><ShieldAlert className="size-5 shrink-0" /> Local mode — editors validate records and download them as JSON; saving to a database needs Supabase (docs/SUPABASE.md). This screen is not access-controlled in local mode.</p>
          ) : user ? (
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="size-5 text-forest" /> Signed in as <strong>{user.email}</strong>
              {editor ? <Badge tone="forest">editor</Badge> : <Badge tone="warn">not an editor — read only</Badge>}
              <Button size="sm" variant="ghost" onClick={() => sb!.auth.signOut()}><LogOut /> Sign out</Button>
            </div>
          ) : (
            <form className="flex flex-wrap items-center gap-2" onSubmit={async (e) => { e.preventDefault(); try { await signInWithEmail(sb!, email); setAuthMsg("Check your email for the sign-in link."); } catch (err) { setAuthMsg((err as Error).message); } }}>
              <span>Editors sign in to save changes:</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-9 rounded-full border border-line px-3" />
              <Button size="sm" type="submit">Email me a sign-in link</Button>
              {authMsg && <span className="text-xs text-muted">{authMsg}</span>}
            </form>
          )}
          <p className="mt-1 text-xs text-muted">Data source: {source ?? "local"}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2" data-testid="admin-modes" aria-label="Experience mode">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Experience</span>
        {EXPERIENCES.filter((e) => e.implemented).map((e) => (
          <Chip key={e.id} active={mode === e.id} onClick={() => setMode(e.id)} data-testid={`admin-mode-${e.id}`}>
            {loc(e.name, "en")}{e.id !== "food" && !isSelectable(e) ? " · hidden" : ""}
          </Chip>
        ))}
      </div>

      {mode !== "food" ? <ModuleAdmin key={mode} id={mode} canPersist={canPersist} inHcmc={inHcmc} /> : <>
      <nav className="no-scrollbar flex gap-2 overflow-x-auto" aria-label="Admin sections">
        {TABS.map((x) => <Chip key={x} active={tab === x} onClick={() => setTab(x)} data-testid={`admin-tab-${x.toLowerCase()}`}>{x}</Chip>)}
      </nav>

      {tab === "Overview" && <Overview />}
      {tab === "Review" && <Review />}
      {tab === "Dishes" && <DishEditor onSave={onSave} canPersist={canPersist} />}
      {tab === "Establishments" && <RestaurantEditor onSave={onSave} canPersist={canPersist} inHcmc={inHcmc} />}
      {tab === "Evidence" && <EvidenceEditor onSave={onSave} canPersist={canPersist} />}
      {tab === "Photos" && <Photos canPersist={canPersist} />}
      {tab === "Recommendations" && <RecommendationCoverage />}
      {tab === "Import" && <ImportTool canPersist={canPersist} />}
      {tab === "Audit" && <Audit enabled={canPersist} />}
      </>}
    </div>
  );
}

function Overview() {
  const { t } = useT();
  const { dishes, regions, restaurants, links, catalogue } = useFoodData();
  const covered = new Set(dishes.flatMap((d) => d.origins.map((o) => o.provinceId)).filter(Boolean));
  const real = restaurants.filter((r) => !r.isSample);
  const realLinks = links.filter((l) => !l.isSample);
  const stat = (l: string, v: React.ReactNode) => <div key={l} className="rounded-2xl border border-line/80 bg-paper p-4"><dt className="text-xs text-muted">{l}</dt><dd className="font-display text-3xl text-forest">{v}</dd></div>;
  return (
    <section>
      <div className="mb-3 rounded-2xl border border-[#e9d9a6] bg-[#fbf3d9] p-3 text-sm text-[#5f4a0f]" data-testid="admin-data-quality">
        <p><strong>Data quality</strong> · dataset <Badge tone="sample">{catalogue.dataset}</Badge> · {catalogue.label}</p>
        {catalogue.dataset !== "master" && (
          <p className="mt-1" data-testid="admin-seed-notice">
            {catalogue.seedCount ?? catalogue.recordCount} seed dishes authored from general culinary knowledge are not yet source-verified; the master catalogue will be merged
            in with the non-destructive importer (IDs, photos and venue links preserved). Consumers see per-dish verification status, not this notice.
          </p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat("Dishes", dishes.length)}
        {CATEGORIES.map((c) => stat(t(`cat.${c}`), dishes.filter((d) => d.category === c).length))}
        {stat("Provinces with dishes", `${covered.size}/63`)}
        {stat("With photo", dishes.filter((d) => d.photos.length).length)}
        {stat("Real HCMC venues", real.length)}
        {stat("Dish–venue links", realLinks.length)}
      </dl>
      <div className="mt-3 grid gap-2 md:grid-cols-6">{regions.map((r) => <div key={r.id} className="rounded-xl bg-paper p-2 text-xs"><strong>{r.nameVi}</strong><br />{dishes.filter((d) => d.regionIds.includes(r.id)).length} dishes</div>)}</div>
    </section>
  );
}

function Review() {
  const { dishes, provinces, restaurants, links } = useFoodData();
  const venueCount = new Map<string, number>();
  links.filter((l) => !l.isSample && l.status !== "candidate").forEach((l) => venueCount.set(l.dishId, (venueCount.get(l.dishId) ?? 0) + 1));
  const covered = new Set(dishes.flatMap((d) => d.origins.map((o) => o.provinceId)).filter(Boolean));
  const dupes = useMemo(() => {
    const m = new Map<string, string[]>();
    dishes.forEach((d) => { const k = normalizeVi(d.nameVi); m.set(k, [...(m.get(k) ?? []), d.id]); });
    return [...m.values()].filter((v) => v.length > 1);
  }, [dishes]);
  const groups: [string, string[]][] = [
    ["Provinces without dishes", provinces.filter((p) => !covered.has(p.id)).map((p) => p.nameVi)],
    ["Possible duplicate dishes", dupes.map((g) => g.join(" ↔ "))],
    ["Dishes without sources", dishes.filter((d) => !d.sources.length).map((d) => d.nameVi)],
    ["Dishes without a photo", dishes.filter((d) => !d.photos.length).map((d) => d.nameVi)],
    ["Dishes without an HCMC venue", dishes.filter((d) => !venueCount.has(d.id)).map((d) => d.nameVi)],
    ["Dishes with 1–4 venues", dishes.filter((d) => (venueCount.get(d.id) ?? 0) > 0 && (venueCount.get(d.id) ?? 0) < 5).map((d) => `${d.nameVi} (${venueCount.get(d.id)})`)],
    ["Venues with approximate (street-level) pins", restaurants.filter((r) => !r.isSample && r.coordinatePrecision === "street").map((r) => r.name)],
    ["Candidate links awaiting review", links.filter((l) => l.status === "candidate").map((l) => `${l.dishId} @ ${l.restaurantId}`)],
  ];
  return (
    <section className="grid gap-3 md:grid-cols-2" data-testid="admin-review">
      {groups.map(([title, items]) => (
        <details key={title} className="rounded-2xl border border-line/80 bg-paper p-4" open={items.length > 0 && items.length < 8}>
          <summary className="cursor-pointer font-medium">{title} <Badge tone={items.length ? "warn" : "forest"}>{items.length}</Badge></summary>
          <ul className="mt-2 max-h-56 overflow-y-auto text-sm text-charcoal/80">{items.map((i) => <li key={i}>· {i}</li>)}</ul>
        </details>
      ))}
    </section>
  );
}

function Photos({ canPersist }: { canPersist: boolean }) {
  const { dishes } = useFoodData();
  const qc = useQueryClient();
  const [dishId, setDishId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState({ credit: "", license: "", sourceUrl: "" });
  const [msg, setMsg] = useState("");
  const dish = dishes.find((d) => d.id === dishId);
  return (
    <section className="space-y-3" data-testid="admin-photos">
      <p className="text-sm text-muted">Only upload a photo that shows <strong>this exact dish</strong>, with its author and licence. Never use a photo of a different dish.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div><span className={label}>Dish</span><select className={field} value={dishId} onChange={(e) => setDishId(e.target.value)}><option value="">—</option>{[...dishes].sort((a, b) => a.nameVi.localeCompare(b.nameVi, "vi")).map((d) => <option key={d.id} value={d.id}>{d.nameVi}{d.photos.length ? " ✓" : ""}</option>)}</select></div>
        <div><span className={label}>Image (jpeg/png/webp ≤ 5 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" /></div>
        <div><span className={label}>Credit (author)</span><input className={field} value={meta.credit} onChange={(e) => setMeta({ ...meta, credit: e.target.value })} /></div>
        <div><span className={label}>Licence</span><input className={field} value={meta.license} onChange={(e) => setMeta({ ...meta, license: e.target.value })} placeholder="e.g. CC BY-SA 4.0, or 'Owner permission'" /></div>
        <div className="md:col-span-2"><span className={label}>Source URL</span><input className={field} value={meta.sourceUrl} onChange={(e) => setMeta({ ...meta, sourceUrl: e.target.value })} /></div>
      </div>
      {dish?.photos.length ? <p className="text-xs text-muted">Current: {dish.photos.map((p) => `${p.credit} (${p.license})`).join("; ")}</p> : null}
      <Button disabled={!canPersist || !dishId || !file || !meta.credit || !meta.license} onClick={async () => { try { await uploadPhoto(getSupabase()!, dishId, file!, meta); setMsg("Uploaded ✓"); await qc.invalidateQueries({ queryKey: ["food-data"] }); } catch (e) { setMsg((e as Error).message); } }}>Upload</Button>
      {!canPersist && <p className="text-xs text-muted">Photo upload needs Supabase Storage and an editor sign-in.</p>}
      {msg && <p className="text-sm">{msg}</p>}
    </section>
  );
}

function ImportTool({ canPersist }: { canPersist: boolean }) {
  const { dishes, regions, provinces } = useFoodData();
  const qc = useQueryClient();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [text, setText] = useState("");
  const [dataset, setDataset] = useState<"seed" | "master">("master");
  const [msg, setMsg] = useState("");
  const runImport = (raw: string, filename = "pasted") => {
    try {
      const rows = filename.endsWith(".csv") || (!raw.trim().startsWith("[") && !raw.trim().startsWith("{")) ? parseCsv(raw) : (() => { const j = JSON.parse(raw); return Array.isArray(j) ? j : j.dishes; })();
      setResult(importCatalogue(rows, { provinces, regions, dataset }));
    } catch (e) {
      setResult({ dishes: [], provided: {}, issues: [{ row: 0, level: "error", message: `Could not parse input: ${(e as Error).message}` }], stats: { rows: 0, imported: 0, skipped: 0 } });
    }
  };
  const preview = result && result.dishes.length ? mergeCatalogues(dishes, result.dishes, result.provided).report : null;
  const errors = result?.issues.filter((i) => i.level === "error").length ?? 0;
  return (
    <section className="rounded-3xl border border-line/80 bg-paper p-5" data-testid="import-tool">
      <h2 className="font-display text-2xl">Import & validate catalogue</h2>
      <p className="mt-1 text-sm text-muted">CSV or JSON in the import format (docs/DATA_SOURCES.md). Imports <strong>merge</strong>: existing dish IDs, photos, sources and venue links are kept; nothing is deleted.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm hover:bg-ivory-deep">
          <FileUp className="size-4" /> Upload file
          <input type="file" accept=".json,.csv" className="hidden" data-testid="import-file" onChange={async (e) => { const f = e.target.files?.[0]; if (f) runImport(await f.text(), f.name); }} />
        </label>
        <select value={dataset} onChange={(e) => setDataset(e.target.value as "seed" | "master")} className="h-10 rounded-full border border-line bg-paper px-3 text-sm"><option value="master">master</option><option value="seed">seed</option></select>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="mt-3 w-full rounded-2xl border border-line bg-ivory p-3 font-mono text-xs" placeholder='[{"nameVi":"Phở bò Nam Định","nameEn":"Nam Dinh beef pho","category":"Món mặn","dishType":"noodle-soup","origins":"Nam Định"}]' data-testid="import-text" />
      <Button className="mt-2" onClick={() => runImport(text)} data-testid="import-validate">Validate</Button>
      {result && (
        <div className="mt-4" data-testid="import-result">
          <p className="text-sm"><strong>{result.stats.imported}</strong> valid · <strong>{result.stats.skipped}</strong> rejected · {errors} errors · {result.issues.filter((i) => i.level === "warning").length} warnings</p>
          {preview && <p className="mt-1 text-sm" data-testid="import-preview">Merge preview: {preview.matched.length} matched · {preview.added.length} new · {preview.keptNotInImport.length} existing kept · {preview.downgraded.length} downgraded to pending-review</p>}
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl bg-ivory p-2 text-xs">
            {result.issues.map((i, k) => <li key={k} className={i.level === "error" ? "text-[#8a3f26]" : "text-[#6b4e00]"}>{i.level === "error" ? "✗" : "!"} row {i.row}{i.name ? ` (${i.name})` : ""}: {i.message}</li>)}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.dishes.length > 0 && <Button variant="outline" onClick={() => download("import-validated.json", { dishes: result.dishes })}><Download /> Download validated JSON</Button>}
            {canPersist && result.dishes.length > 0 && errors === 0 && (
              <Button onClick={async () => { try { const r = await applyImport(getSupabase()!, dishes, result.dishes, result.provided); setMsg(`Applied: ${r.added.length} added, ${r.matched.length} matched.`); await qc.invalidateQueries({ queryKey: ["food-data"] }); } catch (e) { setMsg((e as Error).message); } }}>Apply to database</Button>
            )}
          </div>
          {msg && <p className="mt-2 text-sm">{msg}</p>}
        </div>
      )}
    </section>
  );
}

function Audit({ enabled }: { enabled: boolean }) {
  const q = useQuery({ queryKey: ["audit"], queryFn: () => recentAudit(getSupabase()!), enabled });
  if (!enabled) return <p className="text-sm text-muted">The audit trail is recorded in Supabase (table <code>content_audit</code>) and visible to signed-in editors.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-muted"><tr><th className="py-2">When</th><th>Table</th><th>Record</th><th>Action</th><th>Editor</th></tr></thead>
      <tbody>{(q.data ?? []).map((a) => <tr key={a.id} className="border-t border-line/60"><td className="py-1.5">{new Date(a.changed_at).toLocaleString()}</td><td>{a.table_name}</td><td>{a.row_key}</td><td>{a.action}</td><td className="text-xs text-muted">{a.changed_by?.slice(0, 8) ?? "system"}</td></tr>)}</tbody>
    </table>
  );
}


/** Hôm nay ăn gì? attribute completeness (same numbers as docs/WHAT_TO_EAT_REPORT.md). */
function RecommendationCoverage() {
  const { dishes, restaurants, links } = useFoodData();
  const r = whatToEatReport(dishes, restaurants, links);
  const cell = "px-2 py-1 text-right tabular-nums";
  return (
    <section className="space-y-6" data-testid="admin-recommendations">
      <div>
        <h2 className="font-display text-2xl">Hôm nay ăn gì? — data completeness</h2>
        <p className="text-sm text-muted">{r.dishesWithVenue} / {r.totalDishes} dishes can be recommended with a real HCMC venue. Unknown values are never assumed; edit attributes in Dishes / Establishments or import them (see docs/DATA_SOURCES.md).</p>
      </div>
      <table className="w-full max-w-3xl text-sm"><thead><tr className="text-left text-muted"><th className="px-2">Dish attribute</th><th className={cell}>Sourced</th><th className={cell}>Estimate</th><th className={cell}>Derived</th><th className={cell}>Unknown</th></tr></thead>
        <tbody>{r.dishes.map((x) => <tr key={x.attribute} className="border-t border-line/60"><td className="px-2 py-1">{x.attribute}</td><td className={cell}>{x.sourced}</td><td className={cell}>{x.estimate}</td><td className={cell}>{x.derived}</td><td className={cell}>{x.unknown}</td></tr>)}</tbody></table>
      <table className="w-full max-w-3xl text-sm"><thead><tr className="text-left text-muted"><th className="px-2">Venue attribute</th><th className={cell}>Known</th><th className={cell}>Total</th></tr></thead>
        <tbody>{r.venues.map((x) => <tr key={x.attribute} className="border-t border-line/60"><td className="px-2 py-1">{x.attribute}</td><td className={cell}>{x.known}</td><td className={cell}>{x.total}</td></tr>)}</tbody></table>
      <table className="w-full max-w-3xl text-sm" data-testid="admin-presets"><thead><tr className="text-left text-muted"><th className="px-2">Collection / mode</th><th className={cell}>Eligible</th><th className={cell}>Shown</th></tr></thead>
        <tbody>{r.presets.map((x) => <tr key={x.id} className="border-t border-line/60"><td className="px-2 py-1">{x.name}</td><td className={cell}>{x.eligible}</td><td className={cell}>{x.shown}</td></tr>)}</tbody></table>
    </section>
  );
}
