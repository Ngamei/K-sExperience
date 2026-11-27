"use client";
import { Download, FileUp, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { importCatalogue, parseCsv, type ImportResult } from "@/lib/data/importer";
import { CATEGORIES, VERIFICATION_STATUSES } from "@/lib/data/schema";
import { matchesQuery } from "@/lib/search/normalize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFoodData } from "@/components/food/food-data";

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminView() {
  const { t } = useT();
  const { dishes, regions, provinces, restaurants, links, catalogue } = useFoodData();
  const overrides = useUser((s) => s.verificationOverrides);
  const setOverride = useUser((s) => s.setVerificationOverride);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [dataset, setDataset] = useState<"seed" | "master">("master");

  const real = restaurants.filter((r) => !r.isSample);
  const covered = new Set(dishes.flatMap((d) => d.origins.map((o) => o.provinceId)).filter(Boolean));
  const uncovered = provinces.filter((p) => !covered.has(p.id));
  const queue = useMemo(() => dishes.filter((d) => !q || matchesQuery(`${d.nameVi} ${d.nameEn}`, q)), [dishes, q]);

  const runImport = (raw: string, filename = "pasted") => {
    try {
      const rows = filename.endsWith(".csv") || (!raw.trim().startsWith("[") && !raw.trim().startsWith("{")) ? parseCsv(raw) : (() => { const j = JSON.parse(raw); return Array.isArray(j) ? j : j.dishes; })();
      setResult(importCatalogue(rows, { provinces, regions, dataset }));
    } catch (e) {
      setResult({ dishes: [], issues: [{ row: 0, level: "error", message: `Could not parse input: ${(e as Error).message}` }], stats: { rows: 0, imported: 0, skipped: 0 } });
    }
  };

  const stat = (label: string, value: React.ReactNode) => (
    <div key={label} className="rounded-2xl border border-line/80 bg-paper p-4"><dt className="text-xs text-muted">{label}</dt><dd className="font-display text-3xl text-forest">{value}</dd></div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 md:px-6 md:py-10" data-testid="admin">
      <header>
        <h1 className="font-display text-4xl text-forest">{t("admin.title")}</h1>
        <p className="text-muted">{t("admin.subtitle")}</p>
        <p className="mt-3 flex gap-2 rounded-2xl bg-[#f6e3dc] p-3 text-sm text-[#8a3f26]"><ShieldAlert className="size-5 shrink-0" /> Local mode: this screen is not access-controlled and changes stay in this browser. Production requires Supabase Auth with an admin role (see docs/IMPLEMENTATION_PLAN.md → release blockers).</p>
      </header>

      <section>
        <h2 className="mb-3 font-display text-2xl">Catalogue</h2>
        <p className="mb-3 text-sm text-muted">Dataset: <Badge tone="sample">{catalogue.dataset}</Badge> · {catalogue.label} · generated {catalogue.generatedAt} from <code>{catalogue.sourceFile}</code></p>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stat("Dishes", dishes.length)}
          {CATEGORIES.map((c) => stat(t(`cat.${c}`), dishes.filter((d) => d.category === c).length))}
          {stat("Provinces with dishes", `${covered.size}/63`)}
          {stat("Verified dishes", dishes.filter((d) => (overrides[d.id] ?? d.verification.status) === "verified").length)}
          {stat("Real HCMC venues", real.length)}
          {stat("Dish–venue links (real)", links.filter((l) => !l.isSample).length)}
        </dl>
        <div className="mt-3 grid gap-2 md:grid-cols-6">
          {regions.map((r) => <div key={r.id} className="rounded-xl bg-paper p-2 text-xs"><strong>{r.nameVi}</strong><br />{dishes.filter((d) => d.regionIds.includes(r.id)).length} dishes</div>)}
        </div>
        {uncovered.length > 0 && <p className="mt-3 text-sm text-muted">Provinces without dishes yet: {uncovered.map((p) => p.nameVi).join(", ")}</p>}
      </section>

      <section className="rounded-3xl border border-line/80 bg-paper p-5" data-testid="import-tool">
        <h2 className="font-display text-2xl">Import & validate catalogue</h2>
        <p className="mt-1 text-sm text-muted">Upload or paste the master catalogue (JSON or CSV in the import format — docs/DATA_SOURCES.md). Validation runs in the browser; to publish, run <code>npm run data:import -- &lt;file&gt; --dataset master</code> and commit.</p>
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
            <p className="text-sm"><strong>{result.stats.imported}</strong> valid · <strong>{result.stats.skipped}</strong> rejected · {result.issues.filter((i) => i.level === "error").length} errors · {result.issues.filter((i) => i.level === "warning").length} warnings</p>
            <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl bg-ivory p-2 text-xs">
              {result.issues.map((i, k) => <li key={k} className={i.level === "error" ? "text-[#8a3f26]" : "text-[#6b4e00]"}>{i.level === "error" ? "✗" : "!"} row {i.row}{i.name ? ` (${i.name})` : ""}: {i.message}</li>)}
            </ul>
            {result.dishes.length > 0 && (
              <Button variant="outline" className="mt-2" onClick={() => download("vietnamese-dishes.json", { metadata: { dataset, label: dataset === "seed" ? "SEED DATA" : "Master catalogue", generatedAt: new Date().toISOString().slice(0, 10), sourceFile: "admin-upload", recordCount: result.dishes.length }, dishes: result.dishes })}>
                <Download /> Download canonical JSON
              </Button>
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-line/80 bg-paper p-5" data-testid="verification-queue">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl">Verification queue</h2>
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="h-9 rounded-full border border-line bg-ivory px-3 text-sm" />
            <Button variant="outline" size="sm" onClick={() => download("verification-overrides.json", overrides)}><Download /> Export decisions</Button>
          </div>
        </div>
        <p className="mt-1 text-xs text-muted">Marking “verified” requires at least one source reference in the catalogue — dishes without sources cannot be verified here.</p>
        <div className="mt-3 max-h-[480px] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-paper text-xs text-muted"><tr><th className="py-2">Dish</th><th>Category</th><th>Sources</th><th>Status</th></tr></thead>
            <tbody>
              {queue.map((d) => {
                const status = overrides[d.id] ?? d.verification.status;
                return (
                  <tr key={d.id} className="border-t border-line/60">
                    <td className="py-2"><a href={`/dishes/${d.id}/`} className="font-medium hover:underline">{d.nameVi}</a><div className="text-xs text-muted">{d.nameEn}</div></td>
                    <td>{t(`cat.${d.category}`)}</td>
                    <td>{d.sources.length}</td>
                    <td>
                      <select value={status} onChange={(e) => setOverride(d.id, e.target.value === d.verification.status ? null : e.target.value)} className="h-8 rounded-full border border-line bg-ivory px-2 text-xs">
                        {VERIFICATION_STATUSES.map((s) => <option key={s} value={s} disabled={s === "verified" && d.sources.length === 0}>{s}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
