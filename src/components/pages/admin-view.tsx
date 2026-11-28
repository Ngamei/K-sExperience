"use client";
import { Activity, BookOpen, Building2, ClipboardList, CreditCard, Download, FileUp, FlaskConical, LayoutDashboard, LogOut, Salad, ShieldAlert, ShieldCheck, Tags, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { useT } from "@/lib/i18n/use-t";
import { importCatalogue, parseCsv, type ImportResult } from "@/lib/data/importer";
import { mergeCatalogues } from "@/lib/data/merge";
import { CATEGORIES, type Dish, type DishRestaurantLink, type Restaurant } from "@/lib/data/schema";
import { normalizeVi } from "@/lib/search/normalize";
import { pointInGeometry, type GeoJsonGeometry } from "@/lib/geo/geo";
import { getSupabase, SUPABASE_URL, supabaseEnabled } from "@/lib/supabase/client";
import { applyImport, currentUser, grantTestMembership, listMemberships, recentAudit, saveDish, saveLink, saveRestaurant, signInWithEmail, staffRole, uploadPhoto } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useFoodData } from "@/components/food/food-data";
import { whatToEatReport } from "@/lib/food/what-to-eat-report";
import { PlatformSummary, usePlatformStats } from "@/components/engine/platform-summary";
import { DishEditor, EvidenceEditor, RestaurantEditor, field, label, type Saver } from "@/components/admin/admin-forms";
import { ModuleAdmin, type ModuleTab } from "@/components/admin/module-admin";
import { EXPERIENCES, isSelectable, loc, type ExperienceId } from "@/experiences/registry";
import { adminAllowed, adminGate, canEdit, canManageMembers, localAdminAllowed, STAFF_ROLE_LABELS, STAFF_ROLES, type AdminGate, type StaffRole } from "@/lib/admin/access";
import { annualSavingsPct, B2B_PLANS, LIMITS, PLANS, projectRevenue, TIERS, usd, type Tier } from "@/lib/membership/plans";
import { DEV_DATA } from "@/lib/env";
import { useUser } from "@/lib/store/user";
import { cn } from "@/lib/utils";

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Admin Portal (KEX-ADM-01): the existing Admin tools organised into operations modules. One admin system —
 * Food uses the dish/venue editors, other experiences reuse ModuleAdmin. Restricted: see src/lib/admin/access.ts.
 */
type SectionId = "overview" | "business" | "catalogue" | "menus" | "nutrition" | "research" | "quality" | "users" | "billing" | "system" | "audit";
const SECTIONS: { id: SectionId; label: string; icon: LucideIcon; tabs?: { id: string; label: string }[]; module?: ModuleTab }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "business", label: "Business Directory", icon: Building2, tabs: [{ id: "establishments", label: "Establishments" }], module: "Establishments" },
  { id: "catalogue", label: "Catalogue Management", icon: BookOpen, tabs: [{ id: "dishes", label: "Dishes" }, { id: "photos", label: "Photos" }], module: "Items" },
  { id: "menus", label: "Menus & Pricing", icon: Tags, tabs: [{ id: "evidence", label: "Dish–venue evidence" }], module: "Offerings" },
  { id: "nutrition", label: "Nutrition Database", icon: Salad },
  { id: "research", label: "Research & Imports", icon: FlaskConical, tabs: [{ id: "import", label: "Import" }], module: "Import" },
  { id: "quality", label: "Data Quality & Coverage", icon: ClipboardList, tabs: [{ id: "review", label: "Review queue" }, { id: "coverage", label: "Coverage" }, { id: "recommendations", label: "Recommendations" }], module: "Overview" },
  { id: "users", label: "Users & Memberships", icon: Users },
  { id: "billing", label: "Subscriptions & Billing", icon: CreditCard },
  { id: "system", label: "System Health", icon: Activity },
  { id: "audit", label: "Audit Logs", icon: ShieldCheck, tabs: [{ id: "audit", label: "Content audit" }] },
];
const sectionFromHash = (): SectionId => {
  if (typeof window === "undefined") return "overview";
  const h = window.location.hash.slice(1);
  return SECTIONS.some((x) => x.id === h) ? (h as SectionId) : "overview";
};

const subscribeHash = (cb: () => void) => { window.addEventListener("hashchange", cb); return () => window.removeEventListener("hashchange", cb); };

export function AdminView() {
  const { t } = useT();
  const data = useFoodData();
  const { source } = data;
  const qc = useQueryClient();
  const sb = getSupabase();
  // The open module lives in the URL hash (#catalogue …): deep-linkable, back button works, prerender = Overview.
  const section = useSyncExternalStore(subscribeHash, sectionFromHash, () => "overview" as SectionId);
  const [tabs, setTabs] = useState<Partial<Record<SectionId, string>>>({});
  const [mode, setMode] = useState<ExperienceId>("food");
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<StaffRole | null>(null);
  const [email, setEmail] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [checked, setChecked] = useState(false);
  const gate = adminGate();

  const setSection = (id: SectionId) => { window.history.pushState(null, "", `#${id}`); window.dispatchEvent(new HashChangeEvent("hashchange")); };

  useEffect(() => {
    if (!sb) return;
    const refresh = async () => {
      try { const u = await currentUser(sb); setUser(u); setRole(await staffRole(sb, u)); }
      catch { setUser(null); setRole(null); } // fail closed on any auth/role error
      finally { setChecked(true); }
    };
    refresh();
    const { data: sub } = sb.auth.onAuthStateChange(() => { refresh(); });
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const canPersist = Boolean(sb && canEdit(role));
  const allowed = adminAllowed(gate, role);
  const hcmc = useQuery({ queryKey: ["geo", "hcmc"], queryFn: () => fetch("/geo/hcmc.json").then((r) => r.json()), enabled: allowed });
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

  const header = (
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-4xl text-forest">K’s Experience Admin</h1>
          <Badge tone="warn" data-testid="admin-restricted"><ShieldAlert className="size-3" /> Restricted</Badge>
        </div>
        <p className="text-muted">Internal operations workspace · {t("admin.subtitle")}</p>
        <div className="mt-3 rounded-2xl border border-line bg-paper p-3 text-sm" data-testid="admin-auth">
          {!supabaseEnabled ? (
            <p className="flex gap-2 text-[#8a3f26]"><ShieldAlert className="size-5 shrink-0" /> Local mode (development build only) — editors validate records and download them as JSON; saving to a database needs Supabase (docs/SUPABASE.md). Public deployments never show this screen.</p>
          ) : user ? (
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="size-5 text-forest" /> Signed in as <strong>{user.email}</strong>
              {role ? <Badge tone="forest" data-testid="admin-role">{STAFF_ROLE_LABELS[role]}{canEdit(role) ? " · editor" : " · read-only"}</Badge> : <Badge tone="warn">not staff — no access</Badge>}
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
        </div>
      </header>
  );

  // KEX-SEC-01: fail closed — no editor tools (and no Admin data views) unless allowed.
  if (gate === "unavailable") {
    return (
      <div className="mx-auto max-w-xl space-y-3 px-4 py-10" data-testid="admin-unavailable">
        <h1 className="font-display text-3xl text-forest">{t("admin.title")}</h1>
        <p className="flex gap-2 rounded-2xl border border-line bg-paper p-3 text-sm text-muted"><ShieldAlert className="size-5 shrink-0" /> Admin is not available on this deployment. Editors use a deployment connected to the database and sign in with an editor account.</p>
      </div>
    );
  }
  if (!allowed) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6 md:py-10" data-testid="admin">
        {header}
        <p role="alert" className="rounded-2xl border border-line bg-paper p-3 text-sm text-muted" data-testid="admin-locked" data-state={!checked ? "checking" : user ? "not-editor" : "guest"}>
          {!checked ? "Checking access…" : user ? "Access denied. This account has no staff role — customer memberships (Plus, Premium) do not include administrative access." : "Access denied. Sign in with a staff account to open the Admin Portal."}
        </p>
      </div>
    );
  }

  const sec = SECTIONS.find((x) => x.id === section)!;
  const tab = tabs[section] ?? sec.tabs?.[0]?.id;
  const usesModes = Boolean(sec.module);
  const moduleMode = usesModes && mode !== "food";
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-10" data-testid="admin" data-section={section}>
      {header}
      <div className="grid gap-6 md:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="Admin modules" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0" data-testid="admin-nav">
          {SECTIONS.map((x) => (
            <button key={x.id} type="button" onClick={() => setSection(x.id)} aria-current={section === x.id ? "page" : undefined} data-testid={`admin-section-${x.id}`}
              className={cn("flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-left text-sm transition-colors md:rounded-xl",
                section === x.id ? "bg-forest text-ivory" : "bg-paper text-charcoal hover:bg-ivory-deep md:bg-transparent")}>
              <x.icon className="size-4 shrink-0" aria-hidden /> <span className="whitespace-nowrap">{x.label}</span>
            </button>
          ))}
        </nav>
        <main className="min-w-0 space-y-4">
          <h2 className="font-display text-3xl text-forest">{sec.label}</h2>
          {usesModes && (
            <div className="flex flex-wrap items-center gap-2" data-testid="admin-modes" aria-label="Experience mode">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Experience</span>
              {EXPERIENCES.filter((e) => e.implemented).map((e) => (
                <Chip key={e.id} active={mode === e.id} onClick={() => setMode(e.id)} data-testid={`admin-mode-${e.id}`}>
                  {loc(e.name, "en")}{e.id !== "food" && !isSelectable(e) ? " · hidden" : ""}
                </Chip>
              ))}
            </div>
          )}
          {moduleMode ? <ModuleAdmin key={`${mode}-${sec.module}`} id={mode} canPersist={canPersist} inHcmc={inHcmc} tab={sec.module} /> : <>
            {sec.tabs && sec.tabs.length > 1 && (
              <nav className="no-scrollbar flex gap-2 overflow-x-auto" aria-label={`${sec.label} views`}>
                {sec.tabs.map((x) => <Chip key={x.id} active={tab === x.id} onClick={() => setTabs({ ...tabs, [section]: x.id })} data-testid={`admin-tab-${x.id}`}>{x.label}</Chip>)}
              </nav>
            )}
            {section === "overview" && <Overview />}
            {tab === "dishes" && <DishEditor onSave={onSave} canPersist={canPersist} />}
            {tab === "photos" && <Photos canPersist={canPersist} />}
            {tab === "establishments" && <RestaurantEditor onSave={onSave} canPersist={canPersist} inHcmc={inHcmc} />}
            {tab === "evidence" && <EvidenceEditor onSave={onSave} canPersist={canPersist} />}
            {section === "nutrition" && <Nutrition />}
            {tab === "import" && <ImportTool canPersist={canPersist} />}
            {tab === "review" && <Review />}
            {tab === "coverage" && <section className="rounded-2xl border border-line/80 bg-paper p-4"><h3 className="mb-2 font-display text-lg">Data coverage by experience</h3><PlatformSummary detailed /></section>}
            {tab === "recommendations" && <RecommendationCoverage />}
            {section === "users" && <UsersMemberships role={role} user={user} />}
            {section === "billing" && <Billing />}
            {section === "system" && <SystemHealth gate={gate} source={source ?? "local"} role={role} user={user} />}
            {tab === "audit" && <Audit enabled={Boolean(sb && role)} />}
          </>}
        </main>
      </div>
    </div>
  );
}

/** Overview dashboard: live counts (real, sourced records only — no samples). */
function Overview() {
  const { t } = useT();
  const { dishes, regions, restaurants, links, catalogue } = useFoodData();
  const { rows, unique } = usePlatformStats();
  const food = rows[0].stats!;
  const covered = new Set(dishes.flatMap((d) => d.origins.map((o) => o.provinceId)).filter(Boolean));
  const real = restaurants.filter((r) => !r.isSample);
  const realLinks = links.filter((l) => !l.isSample);
  const pct = food.items ? ((food.itemsWithEstablishments / food.items) * 100).toFixed(1) : "0";
  const stat = (l: string, v: React.ReactNode, id?: string) => <div key={l} className="rounded-2xl border border-line/80 bg-paper p-4" data-testid={id}><dt className="text-xs text-muted">{l}</dt><dd className="font-display text-3xl text-forest">{v}</dd></div>;
  return (
    <section className="space-y-4" data-testid="admin-overview">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="admin-kpis">
        {stat("Unique establishments", unique ?? "…", "kpi-unique-places")}
        {stat("Vietnamese dishes", food.items, "kpi-dishes")}
        {stat("Historical provinces covered", `${food.provinces!.covered}/${food.provinces!.total}`, "kpi-provinces")}
        {stat("Dishes with listed places", `${pct}%`, "kpi-dishes-with-places")}
      </dl>
      <div className="rounded-2xl border border-line/80 bg-paper p-4">
        <h3 className="mb-2 font-display text-lg">Catalogue coverage <span className="text-sm text-muted">(items with places / items)</span></h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" data-testid="admin-catalogue-coverage">
          {rows.map((r) => <li key={r.id} className="rounded-xl bg-ivory p-3" data-testid={`coverage-${r.id}`}><span className="block text-xs text-muted">{loc(r.name, "en")}</span><strong className="font-display text-xl">{r.stats ? `${r.stats.itemsWithEstablishments}/${r.stats.items}` : "…"}</strong></li>)}
        </ul>
      </div>
      <div className="rounded-2xl border border-line/80 bg-paper p-4">
        <h3 className="mb-2 font-display text-lg">Data coverage by experience</h3>
        <PlatformSummary detailed />
      </div>
      <div className="rounded-2xl border border-[#e9d9a6] bg-[#fbf3d9] p-3 text-sm text-[#5f4a0f]" data-testid="admin-data-quality">
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
      <div className="grid gap-2 md:grid-cols-6">{regions.map((r) => <div key={r.id} className="rounded-xl bg-paper p-2 text-xs"><strong>{r.nameVi}</strong><br />{dishes.filter((d) => d.regionIds.includes(r.id)).length} dishes</div>)}</div>
    </section>
  );
}

/** Nutrition Database: what the catalogue records today (dish eating attributes). Editing is in Catalogue → Dishes. */
function Nutrition() {
  const { dishes } = useFoodData();
  const withN = dishes.filter((d) => d.eating?.nutrition);
  const sourced = withN.filter((d) => d.eating!.nutrition!.confidence === "sourced").length;
  return (
    <section className="space-y-3" data-testid="admin-nutrition">
      <p className="text-sm text-muted">Nutrition is recorded per dish (kcal, protein) with a source and confidence; unknown values are never assumed. Edit values in Catalogue Management → Dishes or import them (docs/DATA_SOURCES.md). A dedicated nutrition database is not built yet.</p>
      <dl className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line/80 bg-paper p-4"><dt className="text-xs text-muted">Dishes with nutrition</dt><dd className="font-display text-3xl text-forest" data-testid="nutrition-count">{withN.length}/{dishes.length}</dd></div>
        <div className="rounded-2xl border border-line/80 bg-paper p-4"><dt className="text-xs text-muted">Sourced</dt><dd className="font-display text-3xl text-forest">{sourced}</dd></div>
        <div className="rounded-2xl border border-line/80 bg-paper p-4"><dt className="text-xs text-muted">Estimates</dt><dd className="font-display text-3xl text-forest">{withN.length - sourced}</dd></div>
      </dl>
      {withN.length > 0 && (
        <table className="w-full max-w-3xl text-sm"><thead><tr className="text-left text-muted"><th className="py-1">Dish</th><th>kcal</th><th>Protein (g)</th><th>Confidence</th><th>Source</th></tr></thead>
          <tbody>{withN.map((d) => { const n = d.eating!.nutrition!; return <tr key={d.id} className="border-t border-line/60"><td className="py-1">{d.nameVi}</td><td>{n.kcal ?? "—"}</td><td>{n.proteinG ?? "—"}</td><td>{n.confidence}</td><td className="text-xs text-muted">{n.source}</td></tr>; })}</tbody></table>
      )}
    </section>
  );
}

/** Users & Memberships: staff roles vs customer tiers. Admins grant test entitlements (RLS: admins only). */
function UsersMemberships({ role, user }: { role: StaffRole | null; user: User | null }) {
  const sb = getSupabase();
  const admin = Boolean(sb && canManageMembers(role));
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["memberships"], queryFn: () => listMemberships(sb!), enabled: admin });
  const [uid, setUid] = useState("");
  const [tier, setTier] = useState<Tier>("plus");
  const [msg, setMsg] = useState("");
  const perms: Record<StaffRole, string> = { admin: "Everything, incl. memberships and roles", editor: "Edit catalogue, establishments, evidence, photos, imports", researcher: "Read-only portal: research, coverage, audit", reviewer: "Read-only portal: review queue, coverage, audit" };
  return (
    <section className="space-y-4" data-testid="admin-users">
      <div className="rounded-2xl border border-line/80 bg-paper p-4 text-sm">
        <h3 className="font-display text-lg">Two separate systems</h3>
        <p className="mt-1 text-muted"><strong>Staff roles</strong> (table <code>user_roles</code>) grant Admin Portal access. <strong>Customer memberships</strong> (table <code>user_memberships</code>: Free, Plus, Premium) are entitlements only and never grant administrative access. Nobody can assign themselves either; roles are granted in the database by an administrator. Business-owner access (Business Portal) will be a third, separately scoped permission.</p>
        <table className="mt-3 w-full max-w-2xl"><thead><tr className="text-left text-xs text-muted"><th className="py-1">Staff role</th><th>Permissions</th></tr></thead>
          <tbody>{STAFF_ROLES.map((r) => <tr key={r} className="border-t border-line/60"><td className="py-1.5 pr-3">{STAFF_ROLE_LABELS[r]}{role === r && <Badge tone="forest" className="ml-2">you</Badge>}</td><td className="text-muted">{perms[r]}</td></tr>)}</tbody></table>
      </div>
      {!admin ? (
        <p className="rounded-2xl border border-line bg-paper p-3 text-sm text-muted" data-testid="admin-users-restricted">Membership management is available to signed-in Admins on a database-connected deployment.</p>
      ) : (
        <div className="space-y-3 rounded-2xl border border-line/80 bg-paper p-4" data-testid="admin-memberships">
          <h3 className="font-display text-lg">Test entitlements</h3>
          <p className="text-sm text-muted">Billing is not live. Grant a test tier to an account by its user ID (UUID) to test Plus/Premium behaviour. Every change is audited.</p>
          <form className="flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); try { await grantTestMembership(sb!, uid, tier, user!.id); setMsg("Saved ✓"); setUid(""); await qc.invalidateQueries({ queryKey: ["memberships"] }); } catch (err) { setMsg((err as Error).message); } }}>
            <label className="text-sm"><span className={label}>User ID</span><input className={cn(field, "w-80")} value={uid} onChange={(e) => setUid(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" data-testid="membership-user" /></label>
            <label className="text-sm"><span className={label}>Tier</span><select className={field} value={tier} onChange={(e) => setTier(e.target.value as Tier)} data-testid="membership-tier-select">{TIERS.map((x) => <option key={x} value={x}>{PLANS[x].name}</option>)}</select></label>
            <Button type="submit" data-testid="membership-grant">Grant test tier</Button>
            {msg && <span className="text-sm" data-testid="membership-message">{msg}</span>}
          </form>
          <table className="w-full text-sm"><thead><tr className="text-left text-xs text-muted"><th className="py-1">User</th><th>Tier</th><th>Source</th><th>Valid until</th><th>Updated</th></tr></thead>
            <tbody>{(q.data ?? []).map((m) => <tr key={m.user_id} className="border-t border-line/60"><td className="py-1 font-mono text-xs">{m.user_id}</td><td>{PLANS[m.tier]?.name ?? m.tier}</td><td>{m.source}</td><td>{m.valid_until ? new Date(m.valid_until).toLocaleDateString() : "—"}</td><td>{new Date(m.updated_at).toLocaleString()}</td></tr>)}</tbody></table>
          {q.error && <p className="text-sm text-[#8a3f26]">{(q.error as Error).message}</p>}
        </div>
      )}
    </section>
  );
}

function Billing() {
  const [users, setUsers] = useState(10000);
  const [plusPct, setPlusPct] = useState(8);
  const [premiumPct, setPremiumPct] = useState(3);
  const r = projectRevenue(users, plusPct / 100, premiumPct / 100);
  const lim = (n: number) => (n === Infinity ? "Unlimited" : String(n));
  const num = "h-9 w-28 rounded-xl border border-line bg-paper px-3 text-sm";
  const kpi = (l: string, v: string, id: string) => <div className="rounded-2xl border border-line/80 bg-paper p-4"><dt className="text-xs text-muted">{l}</dt><dd className="font-display text-2xl text-forest" data-testid={id}>{v}</dd></div>;
  return (
    <section className="space-y-5" data-testid="admin-billing">
      <p className="rounded-2xl border border-[#e9d9a6] bg-[#fbf3d9] p-3 text-sm text-[#5f4a0f]">No live payments. Subscription payment integration is a P1 item awaiting Product Owner approval of a payment provider; until then tiers are test entitlements (Users &amp; Memberships). Limits are defined but not enforced (<code>LIMITS_ENFORCED = false</code> in the app, <code>membership_settings.enforce_limits = false</code> in the database — migration 0014). Switch both on only with the client gate and checkout (KEX-MEM-04).</p>
      <div>
        <h3 className="mb-1 font-display text-lg">Pricing (USD, introductory hypothesis — D71)</h3>
        <table className="w-full max-w-xl text-sm" data-testid="billing-prices"><thead><tr className="text-left text-xs text-muted"><th className="py-1">Membership</th><th>Monthly</th><th>Annually</th><th>Annual savings</th></tr></thead>
          <tbody>{TIERS.map((x) => <tr key={x} className="border-t border-line/60"><td className="py-1.5">{PLANS[x].name}</td><td>{PLANS[x].monthly === null ? "$0" : usd(PLANS[x].monthly!)}</td><td>{PLANS[x].yearly === null ? "$0" : usd(PLANS[x].yearly!)}</td><td>{annualSavingsPct(x) === null ? "—" : `${annualSavingsPct(x)}%`}</td></tr>)}</tbody></table>
      </div>
      <div>
        <h3 className="mb-1 font-display text-lg">Entitlement limits (D72)</h3>
        <table className="w-full max-w-xl text-sm"><thead><tr className="text-left text-xs text-muted"><th className="py-1">Limit</th>{TIERS.map((x) => <th key={x}>{PLANS[x].name}</th>)}</tr></thead>
          <tbody>
            {([["favouritesPerExperience", "Saved references per experience", true], ["collectionsPerExperience", "Collections per experience", true], ["menuViewsPerMonth", "Detailed menu views / month", false], ["presetsPerExperience", "Saved preference presets per experience", false], ["savedLocations", "Saved locations per account", false]] as const).map(([k, l, built]) => (
              <tr key={k} className="border-t border-line/60"><td className="py-1.5">{l} {built ? <Badge tone="forest">DB-enforceable</Badge> : <Badge tone="outline">not built</Badge>}</td>{TIERS.map((x) => <td key={x}>{lim(LIMITS[k][x])}</td>)}</tr>
            ))}
          </tbody></table>
      </div>
      <div className="rounded-2xl border border-line/80 bg-paper p-4">
        <h3 className="font-display text-lg">Revenue projection</h3>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <label><span className={label}>Registered users</span><input type="number" min={0} className={num} value={users} onChange={(e) => setUsers(Math.max(0, Number(e.target.value) || 0))} data-testid="proj-users" /></label>
          <label><span className={label}>Plus conversion %</span><input type="number" min={0} max={100} step={0.5} className={num} value={plusPct} onChange={(e) => setPlusPct(Number(e.target.value) || 0)} data-testid="proj-plus" /></label>
          <label><span className={label}>Premium conversion %</span><input type="number" min={0} max={100} step={0.5} className={num} value={premiumPct} onChange={(e) => setPremiumPct(Number(e.target.value) || 0)} data-testid="proj-premium" /></label>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          {kpi("Free users", r.free.toLocaleString("en-US"), "proj-free-users")}{kpi("Plus users", r.plus.toLocaleString("en-US"), "proj-plus-users")}{kpi("Premium users", r.premium.toLocaleString("en-US"), "proj-premium-users")}
          {kpi("Monthly recurring revenue", usd(r.mrr), "proj-mrr")}{kpi("Annualised recurring revenue", usd(r.arr), "proj-arr")}
        </dl>
        <p className="mt-2 text-xs text-muted">Hypothetical gross subscription revenue at monthly prices, excluding taxes, payment fees, churn, annual-plan discounts and operating costs. Payment fees can take a large share of a $1.99 charge — validate with the chosen provider before finalising prices.</p>
      </div>
      <div>
        <h3 className="mb-1 font-display text-lg">Business memberships — deferred (D75)</h3>
        <table className="w-full max-w-md text-sm"><tbody>{B2B_PLANS.map((b) => <tr key={b.name} className="border-t border-line/60"><td className="py-1.5">{b.name}</td><td>{b.monthly === null ? "$0" : b.monthly === "custom" ? "Custom pricing" : `${usd(b.monthly)}/month`}</td></tr>)}</tbody></table>
        <p className="mt-1 text-xs text-muted">Not offered until there is an established customer base.</p>
      </div>
      <p className="text-xs text-muted">Currency (D74): memberships in USD · Vietnamese establishments&apos; menu and service prices in VND · internal reporting in USD (local currency where needed) · checkout must show the billing currency and final amount before confirmation.</p>
    </section>
  );
}

/** System Health: infrastructure + diagnostics (moved here from customer Settings). */
function SystemHealth({ gate, source, role, user }: { gate: AdminGate; source: string; role: StaffRole | null; user: User | null }) {
  const { catalogue } = useFoodData();
  const showSamples = useUser((s) => s.showSamples);
  const setShowSamples = useUser((s) => s.setShowSamples);
  const host = (() => { try { return SUPABASE_URL ? new URL(SUPABASE_URL).host : "—"; } catch { return "—"; } })();
  const row = (k: string, v: React.ReactNode, id?: string) => <tr key={k} className="border-t border-line/60"><td className="py-1.5 pr-4 text-muted">{k}</td><td data-testid={id}>{v}</td></tr>;
  return (
    <section className="space-y-4" data-testid="admin-system">
      <table className="w-full max-w-3xl text-sm"><tbody>
        {row("Data mode", source === "supabase" ? "Supabase — catalogue and venues are read live from the database." : source === "local-fallback" ? "Supabase is configured but could not be reached — showing the bundled data." : "Local mode — data is read from the repository's JSON files; personal data lives in this browser only.", "system-data-mode")}
        {row("Database configured", supabaseEnabled ? `yes (${host})` : "no")}
        {row("Admin gate", gate)}
        {row("Local admin build flag", localAdminAllowed ? "on (dev/test build only)" : "off")}
        {row("Development data (samples)", DEV_DATA ? "on" : "off")}
        {row("Catalogue dataset", `${catalogue.dataset} · ${catalogue.recordCount} records`)}
        {row("Signed-in staff", user ? `${user.email} · ${role ? STAFF_ROLE_LABELS[role] : "none"}` : "—")}
        {row("Build", process.env.NEXT_PUBLIC_BUILD_ID ?? "dev")}
      </tbody></table>
      {DEV_DATA && (
        <div className="rounded-2xl border border-line/80 bg-paper p-4" data-testid="samples">
          <h3 className="font-display text-lg">Sample data diagnostics</h3>
          <label className="mt-2 flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 size-5 accent-[#294C3D]" checked={showSamples} onChange={(e) => setShowSamples(e.target.checked)} data-testid="toggle-samples" />
            <span className="text-sm text-charcoal/80">Show fictional demonstration venues (always labelled SAMPLE) in this browser. They are never used for recommendations. Development/test builds only.</span>
          </label>
        </div>
      )}
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
