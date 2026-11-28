"use client";
/**
 * Hôm nay ăn gì? — daily food recommendations on the Food module (shared shell, filter drawer, dish
 * media, establishment data). Guests can use it; signed-in users get their synced history and saved list.
 */
import Link from "next/link";
import { Bookmark, Check, MapPin, RefreshCw, Shuffle, SlidersHorizontal, ThumbsDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { create } from "zustand";
import { TASTES, type Taste } from "@/lib/data/schema";
import { DIET_PREFS, type DietPref } from "@/lib/food/filters";
import { DEFAULT_WTE, recommend, surprise, tierForBudget, type Meal, type Recommendation, type WhatToEatFilters } from "@/lib/food/what-to-eat";
import { COLLECTIONS, MODES, applyPreset, type Preset } from "@/lib/food/what-to-eat-presets";
import { HCMC_CENTER, HCMC_NEIGHBOURHOODS } from "@/lib/food/hcmc";
import { DIET_LABELS, lbl, SPICE_LABELS, TASTE_LABELS } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { DishArt } from "./dish-art";
import { DishThumb } from "./dish-image";
import { useBrowseAvailability, useFoodData } from "./food-data";
import { FilterDrawer, type FilterDef } from "@/components/engine/filter-drawer";

type Lc = "en" | "vi";
const T = {
  title: { en: "Hôm nay ăn gì?", vi: "Hôm nay ăn gì?" },
  sub: { en: "What to eat today? Pick a meal and a few preferences — we suggest a handful of dishes and where to find them in Ho Chi Minh City.", vi: "Chọn bữa và vài sở thích — chúng tôi gợi ý vài món và nơi ăn ở TP.HCM." },
  meal: { en: "Meal", vi: "Bữa" }, occasion: { en: "Occasion", vi: "Dịp" }, everyday: { en: "Everyday", vi: "Hằng ngày" }, special: { en: "Special occasion", vi: "Dịp đặc biệt" },
  people: { en: "People", vi: "Số người" }, budget: { en: "Budget", vi: "Ngân sách" }, perPerson: { en: "per person", vi: "mỗi người" }, total: { en: "total", vi: "tổng" },
  diet: { en: "Dietary", vi: "Chế độ ăn" }, more: { en: "More filters", vi: "Thêm bộ lọc" }, suggest: { en: "Suggest dishes", vi: "Gợi ý cho tôi" },
  surprise: { en: "Surprise me", vi: "Gợi ý bất ngờ" }, alternatives: { en: "Show alternatives", vi: "Xem lựa chọn khác" }, reset: { en: "Reset", vi: "Đặt lại" },
  why: { en: "Why this dish", vi: "Vì sao gợi ý" }, note: { en: "Good to know", vi: "Lưu ý" }, places: { en: "Find places", vi: "Tìm quán" },
  save: { en: "Save", vi: "Lưu" }, saved: { en: "Saved", vi: "Đã lưu" }, eaten: { en: "Ate this", vi: "Đã ăn" }, notInterested: { en: "Not today", vi: "Không thích" },
  none: { en: "No dish matches all of these filters. Try fewer filters.", vi: "Không có món phù hợp tất cả bộ lọc. Hãy bớt bộ lọc." },
  collections: { en: "Quick collections", vi: "Bộ sưu tập nhanh" }, modes: { en: "More ways to choose", vi: "Thêm cách chọn" },
  results: { en: "Suggestions", vi: "Gợi ý" }, eligible: { en: "{n} dishes fit — showing a few", vi: "{n} món phù hợp — hiển thị vài món" },
  disclaimer: { en: "Suggestions use dish tags and verified HCMC venues. Prices, opening hours, nutrition and allergens are shown only when recorded — never assumed. Always check allergies with the venue.", vi: "Gợi ý dựa trên thành phần món và quán đã xác minh ở TP.HCM. Giá, giờ mở cửa, dinh dưỡng và dị ứng chỉ hiện khi có dữ liệu — không phỏng đoán. Luôn hỏi quán về dị ứng." },
  km: { en: "km", vi: "km" }, nearest: { en: "Nearest", vi: "Gần nhất" },
} as const;
const t = (k: keyof typeof T, l: Lc) => T[k][l];

const MEALS: { id: Meal; en: string; vi: string }[] = [
  { id: "breakfast", en: "Breakfast", vi: "Sáng" }, { id: "lunch", en: "Lunch", vi: "Trưa" }, { id: "dinner", en: "Dinner", vi: "Tối" },
  { id: "snack", en: "Snack", vi: "Ăn vặt" }, { id: "late-night", en: "Late night", vi: "Ăn khuya" },
];
/** Default meal from the current HCMC time. */
const mealNow = (d = new Date()): Meal => {
  const h = (d.getUTCHours() + 7) % 24;
  return h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 17 ? "snack" : h < 22 ? "dinner" : "late-night";
};

interface WteState {
  f: WhatToEatFilters;
  budgetMode: "per-person" | "total";
  totalBudget: number | null;
  showAlt: boolean;
  picked: string | null;
  notInterested: string[];
  set: (p: Partial<WhatToEatFilters>) => void;
  setUi: (p: Partial<Omit<WteState, "f" | "set" | "setUi">>) => void;
}
const useWte = create<WteState>()((set, get) => ({
  f: { ...DEFAULT_WTE, meal: mealNow() }, budgetMode: "per-person", totalBudget: null, showAlt: false, picked: null, notInterested: [],
  set: (p) => set({ f: { ...get().f, ...p }, showAlt: false, picked: null }),
  setUi: (p) => set(p),
}));

export function WhatToEatView() {
  const { locale } = useT();
  const l = locale as Lc;
  const { dishes, dishById } = useFoodData();
  const availability = useBrowseAvailability();
  const tried = useUser((s) => s.tried);
  const saved = useUser((s) => s.saved);
  const notes = useUser((s) => s.notes);
  const prefs = useUser((s) => s.preferences);
  const { f, set, showAlt, picked, notInterested, setUi, budgetMode, totalBudget } = useWte();
  const [open, setOpen] = useState(false);
  const [originId, setOriginId] = useState("ben-thanh");
  const origin = HCMC_NEIGHBOURHOODS.find((n) => n.id === originId)?.center ?? HCMC_CENTER;
  // A total group budget is converted to a per-person budget.
  // Saved preferences (Settings) are always applied: diet restrictions are added and the spice cap is respected.
  const filters = useMemo(() => ({
    ...f,
    diet: [...new Set([...f.diet, ...prefs.diet])],
    maxSpice: Math.min(f.maxSpice, prefs.maxSpice),
    budgetPerPersonVnd: budgetMode === "total" && totalBudget ? Math.round(totalBudget / Math.max(1, f.people)) : f.budgetPerPersonVnd,
  }), [f, prefs.diet, prefs.maxSpice, budgetMode, totalBudget]);
  const fromPrefs = prefs.diet.length > 0 || prefs.maxSpice < 3;
  const ctx = useMemo(() => ({
    availability, origin, now: new Date(), dishById,
    history: { tried, saved, ratings: Object.fromEntries(Object.entries(notes).filter(([, n]) => n.rating).map(([id, n]) => [id, n.rating!])), notInterested: new Set(notInterested) },
  }), [availability, origin, dishById, tried, saved, notes, notInterested]);
  const res = useMemo(() => recommend(dishes, filters, ctx), [dishes, filters, ctx]);
  const pickedRec = picked ? res.results.concat(res.alternatives).find((x) => x.dish.id === picked) ?? null : null;
  const shown: Recommendation[] = pickedRec ? [pickedRec] : showAlt ? res.alternatives : res.results;

  const toggle = <T extends string>(xs: T[], v: T) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);
  const defs: FilterDef[] = [
    { kind: "chips", id: "allergens", title: l === "vi" ? "Tránh dị ứng (khi đã biết)" : "Avoid allergens (when known)", note: t("disclaimer", l), options: ["peanut", "egg", "dairy", "fish", "shellfish"].map((a) => ({ value: a, label: ({ peanut: l === "vi" ? "Đậu phộng" : "Peanut", egg: l === "vi" ? "Trứng" : "Egg", dairy: l === "vi" ? "Sữa" : "Dairy", fish: l === "vi" ? "Cá" : "Fish", shellfish: l === "vi" ? "Hải sản có vỏ" : "Shellfish" } as Record<string, string>)[a], testid: `wte-allergen-${a}` })), selected: f.allergens, onToggle: (v) => set({ allergens: toggle(f.allergens, v) }) },
    { kind: "custom", id: "exclude", title: l === "vi" ? "Không ăn (thành phần)" : "Exclude ingredients", render: <input value={f.excludeIngredients} onChange={(e) => set({ excludeIngredients: e.target.value })} placeholder={l === "vi" ? "vd. nghêu, mắm tôm" : "e.g. clams, shrimp paste"} className="h-9 w-full rounded-xl border border-line bg-paper px-3 text-sm" data-testid="wte-exclude" /> },
    { kind: "chips", id: "tastes", title: l === "vi" ? "Khẩu vị" : "Taste", options: TASTES.slice(0, 12).map((x) => ({ value: x, label: lbl(TASTE_LABELS, x, l) })), selected: f.tastes, onToggle: (v) => set({ tastes: toggle(f.tastes, v as Taste) }) },
    { kind: "chips", id: "proteins", title: l === "vi" ? "Đạm" : "Protein", options: ["pork", "beef", "poultry", "seafood", "fish", "egg", "tofu"].map((x) => ({ value: x, label: x })), selected: f.proteins, onToggle: (v) => set({ proteins: toggle(f.proteins, v) }) },
    { kind: "chips", id: "cooking", title: l === "vi" ? "Cách nấu" : "Cooking", options: ["grilled", "fried", "simmered", "braised", "raw-fresh"].map((x) => ({ value: x, label: x })), selected: f.cooking, onToggle: (v) => set({ cooking: toggle(f.cooking, v) }) },
    { kind: "single", id: "portion", title: l === "vi" ? "Khẩu phần" : "Meal size", value: f.portion ?? "any", onPick: (v) => set({ portion: v === "any" ? null : (v as WhatToEatFilters["portion"]) }), options: [{ value: "any", label: l === "vi" ? "Bất kỳ" : "Any" }, { value: "light", label: l === "vi" ? "Nhẹ" : "Light" }, { value: "hearty", label: l === "vi" ? "No lâu" : "Hearty" }] },
    { kind: "chips", id: "veg", title: l === "vi" ? "Rau" : "Vegetables", options: [{ value: "yes", label: l === "vi" ? "Nhiều rau" : "More vegetables" }], selected: f.moreVeg ? ["yes"] : [], onToggle: () => set({ moreVeg: !f.moreVeg }) },
    { kind: "single", id: "spice", title: l === "vi" ? "Độ cay tối đa" : "Max spice", value: String(f.maxSpice), onPick: (v) => set({ maxSpice: Number(v) }), options: [0, 1, 2, 3].map((n) => ({ value: String(n), label: lbl(SPICE_LABELS, String(n), l) })) },
    { kind: "heading", id: "hcmc", title: l === "vi" ? "Ở TP.HCM" : "In Ho Chi Minh City" },
    { kind: "custom", id: "distance", title: l === "vi" ? "Khoảng cách" : "Distance", render: (
      <>
        <select value={originId} onChange={(e) => setOriginId(e.target.value)} className="h-8 rounded-full border border-line bg-paper px-3 text-xs">{HCMC_NEIGHBOURHOODS.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</select>
        {[2, 5, 10].map((km) => <Chip key={km} active={f.maxDistanceKm === km} onClick={() => set({ maxDistanceKm: f.maxDistanceKm === km ? null : km })} data-testid={`wte-km-${km}`}>≤ {km} km</Chip>)}
      </>
    ) },
    { kind: "chips", id: "open", title: l === "vi" ? "Giờ mở cửa" : "Opening hours", options: [{ value: "yes", label: l === "vi" ? "Đang mở (khi biết giờ)" : "Open now (where known)" }], selected: f.openNow ? ["yes"] : [], onToggle: () => set({ openNow: !f.openNow }) },
    { kind: "single", id: "service", title: l === "vi" ? "Hình thức" : "How", value: f.service, onPick: (v) => set({ service: v as WhatToEatFilters["service"] }), options: [["any", "Any", "Bất kỳ"], ["dine-in", "Dine in", "Ăn tại quán"], ["takeaway", "Takeaway", "Mang đi"], ["delivery", "Delivery", "Giao hàng"], ["home-cooking", "Cook at home", "Tự nấu"]].map(([v, en, vi]) => ({ value: v, label: l === "vi" ? vi : en })) },
    { kind: "chips", id: "atmosphere", title: l === "vi" ? "Không gian (khi có dữ liệu)" : "Atmosphere (where recorded)", options: ["romantic", "quiet", "lively", "family-friendly", "upscale", "outdoor"].map((x) => ({ value: x, label: x })), selected: f.atmosphere, onToggle: (v) => set({ atmosphere: toggle(f.atmosphere, v) }) },
    { kind: "heading", id: "you", title: l === "vi" ? "Của bạn" : "Personal" },
    { kind: "single", id: "recent", title: l === "vi" ? "Bỏ món đã ăn gần đây" : "Skip recently eaten", value: String(f.excludeRecentDays), onPick: (v) => set({ excludeRecentDays: Number(v) }), options: [["0", "Off", "Tắt"], ["3", "3 days", "3 ngày"], ["7", "7 days", "7 ngày"], ["14", "14 days", "14 ngày"]].map(([v, en, vi]) => ({ value: v, label: l === "vi" ? vi : en, testid: `wte-recent-${v}` })) },
    { kind: "chips", id: "personal", title: l === "vi" ? "Lọc" : "Only", options: [{ value: "new", label: l === "vi" ? "Món chưa thử" : "Not tried yet" }, { value: "saved", label: l === "vi" ? "Đã lưu" : "Saved" }], selected: [...(f.newOnly ? ["new"] : []), ...(f.savedOnly ? ["saved"] : [])], onToggle: (v) => set(v === "new" ? { newOnly: !f.newOnly } : { savedOnly: !f.savedOnly }) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10" data-testid="what-to-eat">
      <header className="paper-grain rounded-[2rem] bg-forest p-6 text-ivory md:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sage">{l === "vi" ? "Ẩm thực Việt · TP.HCM" : "Vietnamese Food · Ho Chi Minh City"}</p>
        <h1 className="font-display text-4xl md:text-5xl">{t("title", l)}</h1>
        <p className="mt-2 max-w-2xl text-sage">{t("sub", l)}</p>

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("meal", l)}>
            {MEALS.map((m) => (
              <button key={m.id} type="button" onClick={() => set({ meal: f.meal === m.id ? "any" : m.id })} aria-pressed={f.meal === m.id} data-testid={`wte-meal-${m.id}`}
                className={`h-9 rounded-full px-4 text-sm font-medium transition-colors ${f.meal === m.id ? "bg-ivory text-forest" : "bg-ivory/10 text-ivory hover:bg-ivory/20"}`}>{l === "vi" ? m.vi : m.en}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["everyday", "special"] as const).map((o) => (
              <button key={o} type="button" onClick={() => set({ occasion: o })} aria-pressed={f.occasion === o} data-testid={`wte-occasion-${o}`}
                className={`h-8 rounded-full px-3 text-xs font-medium ${f.occasion === o ? "bg-terracotta text-ivory" : "bg-ivory/10 text-ivory hover:bg-ivory/20"}`}>{t(o, l)}</button>
            ))}
            <span className="ml-2 inline-flex h-8 items-center gap-2 rounded-full bg-ivory/10 px-3 text-xs">
              {t("people", l)}
              <button type="button" className="size-6 rounded-full bg-ivory/20" onClick={() => set({ people: Math.max(1, f.people - 1) })} aria-label="−">−</button>
              <span data-testid="wte-people">{f.people}</span>
              <button type="button" className="size-6 rounded-full bg-ivory/20" onClick={() => set({ people: Math.min(20, f.people + 1) })} aria-label="+" data-testid="wte-people-plus">+</button>
            </span>
            <span className="inline-flex h-8 items-center gap-1 rounded-full bg-ivory/10 px-3 text-xs">
              {t("budget", l)}
              <input type="number" min={0} step={10000} inputMode="numeric" placeholder="₫"
                value={(budgetMode === "total" ? totalBudget : f.budgetPerPersonVnd) ?? ""}
                onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; if (budgetMode === "total") setUi({ totalBudget: v }); else set({ budgetPerPersonVnd: v }); }}
                className="h-6 w-24 rounded-full bg-ivory/90 px-2 text-charcoal" data-testid="wte-budget" />
              <select value={budgetMode} onChange={(e) => setUi({ budgetMode: e.target.value as WteState["budgetMode"] })} className="h-6 rounded-full bg-ivory/90 px-1 text-charcoal" data-testid="wte-budget-mode">
                <option value="per-person">{t("perPerson", l)}</option><option value="total">{t("total", l)}</option>
              </select>
              {filters.budgetPerPersonVnd ? <span className="text-sage">≈ {tierForBudget(filters.budgetPerPersonVnd)}</span> : null}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("diet", l)}>
            {(Object.keys(DIET_PREFS) as DietPref[]).map((d) => (
              <button key={d} type="button" onClick={() => set({ diet: toggle(f.diet, d) })} aria-pressed={filters.diet.includes(d)} disabled={prefs.diet.includes(d)} data-testid={`wte-diet-${d}`}
                className={`h-8 rounded-full px-3 text-xs ${filters.diet.includes(d) ? "bg-ivory text-forest" : "bg-ivory/10 text-ivory hover:bg-ivory/20"}`}>{lbl(DIET_LABELS, d, l)}</button>
            ))}
            <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center gap-1 rounded-full border border-ivory/40 px-3 text-xs" data-testid="wte-more"><SlidersHorizontal className="size-3.5" /> {t("more", l)}</button>
          </div>
          {fromPrefs && (
            <p className="text-xs text-sage" data-testid="wte-prefs">
              {l === "vi" ? "Đang áp dụng sở thích của bạn" : "Using your saved preferences"}: {[...prefs.diet.map((x) => lbl(DIET_LABELS, x, l)), ...(prefs.maxSpice < 3 ? [lbl(SPICE_LABELS, String(prefs.maxSpice), l)] : [])].join(", ")} ·{" "}
              <Link href="/settings/" className="underline">{l === "vi" ? "Đổi trong Cài đặt" : "Change in Settings"}</Link>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="accent" onClick={() => { const s = surprise(dishes, filters, ctx); setUi({ picked: s?.dish.id ?? null, showAlt: false }); }} data-testid="wte-surprise"><Shuffle /> {t("surprise", l)}</Button>
            <Button variant="ghost" className="text-ivory hover:bg-ivory/10" onClick={() => { useWte.setState({ f: { ...DEFAULT_WTE, meal: mealNow() }, notInterested: [], picked: null, showAlt: false, totalBudget: null }); }} data-testid="wte-reset"><RefreshCw /> {t("reset", l)}</Button>
          </div>
        </div>
      </header>

      <section className="mt-8" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl text-forest">{pickedRec ? t("surprise", l) : t("results", l)}</h2>
          <p className="text-sm text-muted" data-testid="wte-eligible">{t("eligible", l).replace("{n}", String(res.eligible))}</p>
        </div>
        {shown.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-line p-8 text-center text-muted" data-testid="wte-empty">
            <DishArt type="rice" category="savory" size={72} />
            <p>{t("none", l)}</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="wte-results">
            {shown.map((x) => <RecCard key={x.dish.id} rec={x} l={l} onNotInterested={() => setUi({ notInterested: [...notInterested, x.dish.id], picked: null })} />)}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {pickedRec ? <Button variant="outline" onClick={() => setUi({ picked: null })}><X /> {t("results", l)}</Button>
            : res.alternatives.length > 0 && <Button variant="outline" onClick={() => setUi({ showAlt: !showAlt })} data-testid="wte-alternatives"><RefreshCw /> {t("alternatives", l)}</Button>}
        </div>
        <p className="mt-3 text-[11.5px] text-muted" data-testid="wte-disclaimer">{t("disclaimer", l)}</p>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl text-forest">{t("collections", l)}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="wte-collections">
          {COLLECTIONS.map((p) => <PresetCard key={p.id} p={p} l={l} />)}
        </div>
        <h3 className="mt-6 font-display text-xl text-forest">{t("modes", l)}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODES.map((p) => <Chip key={p.id} onClick={() => { useWte.setState({ f: applyPreset(p), picked: null, showAlt: false }); window.scrollTo({ top: 0, behavior: "smooth" }); }} data-testid={`wte-mode-${p.id}`}><DishArt type={p.art} category="savory" size={20} ring={false} />{p.name[l]}</Chip>)}
        </div>
      </section>

      <Sheet open={open} onOpenChange={setOpen} title={t("more", l)}>
        <FilterDrawer defs={defs} testid="wte-filter-panel" />
        <Button className="mt-4 w-full" onClick={() => setOpen(false)} data-testid="wte-apply">{t("suggest", l)}</Button>
      </Sheet>
    </div>
  );
}

function PresetCard({ p, l }: { p: Preset; l: Lc }) {
  return (
    <button type="button" onClick={() => { useWte.setState({ f: applyPreset(p), picked: null, showAlt: false }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      className="flex items-center gap-3 rounded-3xl border border-line/80 bg-paper p-3 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40" data-testid={`wte-collection-${p.id}`}>
      <DishArt type={p.art} category="savory" size={52} className="bg-ivory" />
      <span className="min-w-0"><span className="block font-display text-[15px] leading-tight">{p.name.vi}</span><span className="block text-[11.5px] text-muted">{l === "vi" ? p.blurb.vi : `${p.name.en} · ${p.blurb.en}`}</span></span>
    </button>
  );
}

function RecCard({ rec, l, onNotInterested }: { rec: Recommendation; l: Lc; onNotInterested: () => void }) {
  const d = rec.dish;
  const saved = useUser((s) => s.saved.includes(d.id));
  const tried = useUser((s) => Boolean(s.tried[d.id]));
  const toggleSaved = useUser((s) => s.toggleSaved);
  const toggleTried = useUser((s) => s.toggleTried);
  const nearest = rec.venues[0];
  return (
    <article className="flex flex-col rounded-3xl border border-line/80 bg-paper p-4" data-testid="wte-card" data-dish-id={d.id}>
      <Link href={`/dishes/${d.id}/`} className="group flex gap-3">
        <DishThumb dish={d} size={64} className="bg-ivory" />
        <span className="min-w-0">
          <span className="block font-display text-lg leading-tight group-hover:text-forest">{d.nameVi}</span>
          <span className="block truncate text-xs text-muted">{d.nameEn}</span>
          <span className="mt-1 line-clamp-2 block text-[12.5px] text-charcoal/75">{d.description[l]}</span>
        </span>
      </Link>
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t("why", l)}</p>
        <ul className="mt-1 space-y-0.5 text-[12.5px] text-forest" data-testid="wte-reasons">{rec.reasons.map((x) => <li key={x.en}>✓ {x[l]}</li>)}</ul>
        {rec.cautions.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11.5px] text-[#8a5a12]" data-testid="wte-cautions" aria-label={t("note", l)}>{rec.cautions.map((x) => <li key={x.en}>! {x[l]}</li>)}</ul>
        )}
      </div>
      {nearest && (
        <p className="mt-2 text-xs text-muted" data-testid="wte-nearest"><MapPin className="mr-1 inline size-3.5" />{t("nearest", l)}: <Link href={`/places/${nearest.restaurant.id}/`} className="underline hover:text-forest">{nearest.restaurant.name}</Link> · {nearest.km.toFixed(1)} {t("km", l)}{rec.venues.length > 1 ? ` · +${rec.venues.length - 1}` : ""}</p>
      )}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
        <Button size="sm" variant={saved ? "primary" : "outline"} onClick={() => toggleSaved(d.id)} aria-pressed={saved} data-testid="wte-save"><Bookmark /> {saved ? t("saved", l) : t("save", l)}</Button>
        <Button size="sm" variant={tried ? "primary" : "outline"} onClick={() => toggleTried(d.id)} aria-pressed={tried} data-testid="wte-eaten"><Check /> {t("eaten", l)}</Button>
        {nearest && <Button size="sm" variant="outline" asChild><Link href={`/dishes/${d.id}/#hcmc-block`} data-testid="wte-places"><MapPin /> {t("places", l)}</Link></Button>}
        <Button size="sm" variant="ghost" onClick={onNotInterested} data-testid="wte-not-interested"><ThumbsDown /> {t("notInterested", l)}</Button>
      </div>
    </article>
  );
}
