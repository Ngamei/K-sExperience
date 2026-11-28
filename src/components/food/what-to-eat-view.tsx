"use client";
/**
 * Hôm nay ăn gì? — daily food recommendations on the Food module.
 * Light pastel-sage layout: a compact control card (meal, occasion, budget presets, goals, dietary) with one
 * primary action, results right below (side by side on desktop), advanced filters in the shared drawer.
 * Saved Settings preferences are shown as "saved" and can be switched off for this meal only; Reset clears
 * temporary changes. When nothing matches, the page says which filters restrict the results.
 */
import Link from "next/link";
import { Bookmark, Check, Info, MapPin, RefreshCw, Shuffle, SlidersHorizontal, Sparkles, ThumbsDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { TASTES, type Taste } from "@/lib/data/schema";
import { DIET_PREFS, type DietPref } from "@/lib/food/filters";
import {
  BUDGET_PRESETS, DEFAULT_WTE, GOALS, OCCASIONS, dietCoverage, explainEmpty, recommend, surprise,
  type Goal, type L as LT, type Meal, type Recommendation, type WhatToEatFilters,
} from "@/lib/food/what-to-eat";
import { COLLECTIONS, GOAL_L, MODES, OCCASION_L, applyPreset, type Preset } from "@/lib/food/what-to-eat-presets";
import { HCMC_CENTER, HCMC_NEIGHBOURHOODS } from "@/lib/food/hcmc";
import { DIET_LABELS, MEAL_LABELS, lbl, SPICE_LABELS, TASTE_LABELS } from "@/lib/i18n/labels";
import { useT } from "@/lib/i18n/use-t";
import { useUser } from "@/lib/store/user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { DishArt } from "./dish-art";
import { DishThumb } from "./dish-image";
import { useFoodData, useRealAvailability } from "./food-data";
import { FilterDrawer, type FilterDef } from "@/components/engine/filter-drawer";

type Lc = "en" | "vi";
const T = {
  sub: { en: "Good food for every day, every mood — dishes and places in Ho Chi Minh City.", vi: "Món ngon cho mỗi ngày, mỗi tâm trạng — món ăn và quán ở TP.HCM." },
  meal: { en: "Meal", vi: "Bữa ăn" }, occasion: { en: "What's the occasion?", vi: "Dịp gì?" }, budget: { en: "Budget", vi: "Ngân sách" },
  perPerson: { en: "per person", vi: "mỗi người" }, total: { en: "total for group", vi: "tổng cả nhóm" }, custom: { en: "Custom", vi: "Tự nhập" },
  people: { en: "People", vi: "Số người" }, goals: { en: "What matters to you today?", vi: "Hôm nay bạn muốn?" }, diet: { en: "Dietary", vi: "Chế độ ăn" },
  saved: { en: "saved", vi: "đã lưu" }, savedNote: { en: "Saved in Settings. Tap to switch off for this meal only.", vi: "Đã lưu trong Cài đặt. Chạm để tắt cho bữa này." },
  offNote: { en: "Switched off for this meal — still saved in Settings.", vi: "Đã tắt cho bữa này — vẫn lưu trong Cài đặt." },
  find: { en: "Find something to eat", vi: "Gợi ý món ăn" }, surprise: { en: "Surprise me", vi: "Gợi ý bất ngờ" }, advanced: { en: "Advanced filters", vi: "Bộ lọc nâng cao" },
  reset: { en: "Reset", vi: "Đặt lại" }, results: { en: "Suggestions for you", vi: "Gợi ý cho bạn" }, surprisePick: { en: "Surprise pick", vi: "Gợi ý bất ngờ" },
  eligible: { en: "{n} dishes fit · {v} with a listed HCMC place", vi: "{n} món phù hợp · {v} món có quán ở TP.HCM" },
  alternatives: { en: "Show other suggestions", vi: "Xem gợi ý khác" }, back: { en: "Back to top suggestions", vi: "Quay lại gợi ý chính" },
  why: { en: "Why this dish", vi: "Vì sao gợi ý" }, note: { en: "Good to know", vi: "Lưu ý" },
  details: { en: "View details", vi: "Xem chi tiết" }, nearby: { en: "Find nearby", vi: "Tìm quán gần" }, save: { en: "Save", vi: "Lưu" }, savedBtn: { en: "Saved", vi: "Đã lưu" },
  eaten: { en: "Ate this", vi: "Đã ăn" }, notToday: { en: "Not today", vi: "Không thích" },
  noPlace: { en: "No HCMC place listed yet", vi: "Chưa có quán ở TP.HCM trong dữ liệu" }, places: { en: "{n} HCMC places · nearest", vi: "{n} quán ở TP.HCM · gần nhất" },
  price: { en: "Recorded price", vi: "Giá đã ghi nhận" },
  emptyTitle: { en: "No dish matches all of these filters", vi: "Không có món nào khớp tất cả bộ lọc" },
  emptyBody: { en: "These filters are restricting the results. Nothing is relaxed automatically — choose what to change:", vi: "Các bộ lọc sau đang giới hạn kết quả. Không có gì tự động nới lỏng — bạn chọn điều chỉnh:" },
  turnOffSaved: { en: "Switch off {x} for this meal", vi: "Tắt {x} cho bữa này" }, remove: { en: "Remove {x}", vi: "Bỏ {x}" }, gives: { en: "{n} dishes", vi: "{n} món" }, givesOne: { en: "1 dish", vi: "1 món" },
  hardNote: { en: "Dietary and allergy choices are never removed for you.", vi: "Lựa chọn ăn uống và dị ứng không bao giờ bị tự động bỏ." },
  dataNote: { en: "Data note: only {n} of {t} dishes in our catalogue are tagged {x}.", vi: "Lưu ý dữ liệu: chỉ {n}/{t} món trong danh mục được gắn nhãn {x}." },
  budgetNote: { en: "Few places have a recorded price yet, so budget is shown as unconfirmed instead of hiding dishes.", vi: "Ít quán có giá đã ghi nhận, nên ngân sách được ghi là chưa xác nhận thay vì ẩn món." },
  disclaimer: { en: "Suggestions use dish tags and HCMC places with a published source. Prices, opening hours, nutrition and allergens appear only when recorded — never assumed. Always check allergies with the venue.", vi: "Gợi ý dựa trên thành phần món và quán ở TP.HCM có nguồn. Giá, giờ mở cửa, dinh dưỡng và dị ứng chỉ hiện khi có dữ liệu — không phỏng đoán. Luôn hỏi quán về dị ứng." },
  collections: { en: "Quick collections", vi: "Bộ sưu tập nhanh" }, modes: { en: "More ways to choose", vi: "Thêm cách chọn" }, apply: { en: "Show suggestions", vi: "Xem gợi ý" },
} as const;
const t = (k: keyof typeof T, l: Lc, v: Record<string, string | number> = {}) => Object.entries(v).reduce<string>((s, [a, b]) => s.replace(`{${a}}`, String(b)), T[k][l]);

const MEALS: Exclude<Meal, "any">[] = ["breakfast", "lunch", "dinner", "snack", "late-night"];
const MEAL_L: Record<Exclude<Meal, "any">, LT> = { breakfast: { en: "Breakfast", vi: "Sáng" }, lunch: { en: "Lunch", vi: "Trưa" }, dinner: { en: "Dinner", vi: "Tối" }, snack: { en: "Snack", vi: "Ăn vặt" }, "late-night": { en: "Late night", vi: "Ăn khuya" } };
/** Default meal from the current HCMC time. */
const mealNow = (d = new Date()): Meal => {
  const h = (d.getUTCHours() + 7) % 24;
  return h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 17 ? "snack" : h < 22 ? "dinner" : "late-night";
};
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}₫`;

interface WteState {
  /** Temporary filters for this meal (saved preferences are merged on top, see `effective`). */
  f: WhatToEatFilters;
  budgetId: string;
  budgetMode: "per-person" | "total";
  customBudget: number | null;
  /** Saved diet preferences switched off for this meal only. */
  savedOff: DietPref[];
  spiceOff: boolean;
  showAlt: boolean;
  picked: string | null;
  seenSurprise: string[];
  notInterested: string[];
  set: (p: Partial<WhatToEatFilters>) => void;
  setUi: (p: Partial<Omit<WteState, "f" | "set" | "setUi" | "reset">>) => void;
  reset: () => void;
}
const fresh = () => ({ f: { ...DEFAULT_WTE, meal: mealNow() }, budgetId: "any", budgetMode: "per-person" as const, customBudget: null, savedOff: [], spiceOff: false, showAlt: false, picked: null, seenSurprise: [], notInterested: [] });
export const useWte = create<WteState>()((set, get) => ({
  ...fresh(),
  set: (p) => set({ f: { ...get().f, ...p }, showAlt: false, picked: null }),
  setUi: (p) => set(p),
  reset: () => set(fresh()),
}));

/** Selection pill in the pastel theme (soft sage when active). */
function Pill({ active, onClick, children, testid, title, className }: { active: boolean; onClick: () => void; children: React.ReactNode; testid?: string; title?: string; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} data-testid={testid} title={title}
      className={cn("inline-flex h-9 shrink-0 items-center gap-1 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
        active ? "border-forest/50 bg-sage-soft text-forest" : "border-line bg-paper text-charcoal hover:border-forest/40", className)}>
      {active && <Check className="size-3.5" />}{children}
    </button>
  );
}
function Row({ label, children, scroll = true }: { label: string; children: React.ReactNode; scroll?: boolean }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <div className={cn("flex gap-1.5", scroll ? "no-scrollbar -mx-4 overflow-x-auto px-4 pb-0.5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" : "flex-wrap")}>{children}</div>
    </div>
  );
}

export function WhatToEatView() {
  const { locale } = useT();
  const l = locale as Lc;
  const { dishes, dishById } = useFoodData();
  const availability = useRealAvailability(); // never sample venues in recommendations
  const tried = useUser((s) => s.tried);
  const saved = useUser((s) => s.saved);
  const notes = useUser((s) => s.notes);
  const prefs = useUser((s) => s.preferences);
  const st = useWte();
  const { f, set, setUi } = st;
  const [open, setOpen] = useState(false);
  const [originId, setOriginId] = useState("ben-thanh");
  const resultsRef = useRef<HTMLElement>(null);
  const origin = HCMC_NEIGHBOURHOODS.find((n) => n.id === originId)?.center ?? HCMC_CENTER;

  const { savedOff, spiceOff, budgetId, budgetMode, customBudget } = st;
  const filters: WhatToEatFilters = useMemo(() => {
    const preset = BUDGET_PRESETS.find((b) => b.id === budgetId);
    const per = (v: number | null) => (v === null ? null : budgetMode === "total" ? Math.round(v / Math.max(1, f.people)) : v);
    return {
      ...f,
      diet: [...new Set([...f.diet, ...prefs.diet.filter((d) => !savedOff.includes(d))])],
      maxSpice: spiceOff ? f.maxSpice : Math.min(f.maxSpice, prefs.maxSpice),
      budgetMinVnd: budgetId === "custom" ? null : per(preset?.min ?? null),
      budgetMaxVnd: budgetId === "custom" ? per(customBudget) : per(preset?.max ?? null),
    };
  }, [f, prefs.diet, prefs.maxSpice, savedOff, spiceOff, budgetId, budgetMode, customBudget]);
  const ctx = useMemo(() => ({
    availability, origin, now: new Date(), dishById,
    history: { tried, saved, ratings: Object.fromEntries(Object.entries(notes).filter(([, n]) => n.rating).map(([id, n]) => [id, n.rating!])), notInterested: new Set(st.notInterested) },
  }), [availability, origin, dishById, tried, saved, notes, st.notInterested]);
  const res = useMemo(() => recommend(dishes, filters, ctx), [dishes, filters, ctx]);
  const blockers = useMemo(() => (res.eligible === 0 ? explainEmpty(dishes, filters, ctx) : []), [res.eligible, dishes, filters, ctx]);
  const pickedRec = st.picked ? res.results.concat(res.alternatives).find((x) => x.dish.id === st.picked) ?? null : null;
  const [pickedState, setPickedState] = useState<Recommendation | null>(null);
  const picked = st.picked ? pickedRec ?? (pickedState?.dish.id === st.picked ? pickedState : null) : null;
  const shown: Recommendation[] = picked ? [picked] : st.showAlt ? res.alternatives : res.results;

  const toggle = <V extends string>(xs: V[], v: V) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]);
  const scrollToResults = () => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const toggleDiet = (d: DietPref) => {
    if (prefs.diet.includes(d)) setUi({ savedOff: toggle(st.savedOff, d), showAlt: false, picked: null });
    else set({ diet: toggle(f.diet, d) });
  };
  const advancedCount = [f.allergens.length, f.excludeIngredients.trim() ? 1 : 0, f.tastes.length, f.proteins.length, f.cooking.length, f.portion ? 1 : 0, f.moreVeg ? 1 : 0, f.maxSpice < 3 ? 1 : 0,
    f.maxDistanceKm ? 1 : 0, f.openNow ? 1 : 0, f.service !== "any" ? 1 : 0, f.atmosphere.length, f.excludeRecentDays ? 1 : 0, f.newOnly ? 1 : 0, f.savedOnly ? 1 : 0, f.people > 1 ? 1 : 0].reduce((a, b) => a + b, 0);

  const removeBlocker = (id: string) => {
    if (id.startsWith("diet:")) { const d = id.slice(5) as DietPref; if (prefs.diet.includes(d)) setUi({ savedOff: [...st.savedOff, d] }); else set({ diet: f.diet.filter((x) => x !== d) }); return; }
    const map: Record<string, Partial<WhatToEatFilters>> = {
      meal: { meal: "any" }, maxSpice: { maxSpice: 3 }, regions: { regions: [] }, savedOnly: { savedOnly: false }, newOnly: { newOnly: false },
      excludeRecentDays: { excludeRecentDays: 0 }, excludeIngredients: { excludeIngredients: "" }, avoidCooking: { avoidCooking: [] }, allergens: { allergens: [] },
      place: { service: "any", maxDistanceKm: null, openNow: false, atmosphere: [], occasion: "everyday" },
    };
    if (id === "maxSpice" && prefs.maxSpice < 3) setUi({ spiceOff: true });
    if (id === "budget") { setUi({ budgetId: "any", customBudget: null }); return; }
    if (map[id]) set(map[id]);
  };

  const defs: FilterDef[] = [
    { kind: "custom", id: "people", title: t("people", l), render: (
      <span className="inline-flex h-8 items-center gap-2 rounded-full border border-line px-3 text-xs">
        <button type="button" className="size-6 rounded-full bg-sage-soft" onClick={() => set({ people: Math.max(1, f.people - 1) })} aria-label="−">−</button>
        <span data-testid="wte-people">{f.people}</span>
        <button type="button" className="size-6 rounded-full bg-sage-soft" onClick={() => set({ people: Math.min(20, f.people + 1) })} aria-label="+" data-testid="wte-people-plus">+</button>
      </span>
    ) },
    { kind: "chips", id: "allergens", title: l === "vi" ? "Tránh dị ứng (khi đã biết)" : "Avoid allergens (when known)", note: l === "vi" ? "Chỉ loại món đã biết có chất này. Luôn hỏi quán." : "Only removes dishes known to contain them. Always ask the venue.",
      options: ["peanut", "egg", "dairy", "fish", "shellfish"].map((a) => ({ value: a, label: ({ peanut: l === "vi" ? "Đậu phộng" : "Peanut", egg: l === "vi" ? "Trứng" : "Egg", dairy: l === "vi" ? "Sữa" : "Dairy", fish: l === "vi" ? "Cá" : "Fish", shellfish: l === "vi" ? "Hải sản có vỏ" : "Shellfish" } as Record<string, string>)[a], testid: `wte-allergen-${a}` })),
      selected: f.allergens, onToggle: (v) => set({ allergens: toggle(f.allergens, v) }) },
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
    { kind: "single", id: "service", title: l === "vi" ? "Hình thức" : "How", value: f.service, onPick: (v) => set({ service: v as WhatToEatFilters["service"] }), options: [["any", "Any", "Bất kỳ"], ["dine-in", "Dine in", "Ăn tại quán"], ["takeaway", "Takeaway", "Mang đi"], ["delivery", "Delivery", "Giao hàng"], ["home-cooking", "Cook at home", "Tự nấu"]].map(([v, en, vi]) => ({ value: v, label: l === "vi" ? vi : en, testid: `wte-service-${v}` })) },
    { kind: "chips", id: "atmosphere", title: l === "vi" ? "Không gian (khi có dữ liệu)" : "Atmosphere (where recorded)", options: ["romantic", "quiet", "lively", "family-friendly", "upscale", "outdoor"].map((x) => ({ value: x, label: x })), selected: f.atmosphere, onToggle: (v) => set({ atmosphere: toggle(f.atmosphere, v) }) },
    { kind: "heading", id: "you", title: l === "vi" ? "Của bạn" : "Personal" },
    { kind: "single", id: "recent", title: l === "vi" ? "Bỏ món đã ăn gần đây" : "Skip recently eaten", value: String(f.excludeRecentDays), onPick: (v) => set({ excludeRecentDays: Number(v) }), options: [["0", "Off", "Tắt"], ["3", "3 days", "3 ngày"], ["7", "7 days", "7 ngày"], ["14", "14 days", "14 ngày"]].map(([v, en, vi]) => ({ value: v, label: l === "vi" ? vi : en, testid: `wte-recent-${v}` })) },
    { kind: "chips", id: "personal", title: l === "vi" ? "Lọc" : "Only", options: [{ value: "new", label: l === "vi" ? "Món chưa thử" : "Not tried yet" }, { value: "saved", label: l === "vi" ? "Đã lưu" : "Saved" }], selected: [...(f.newOnly ? ["new"] : []), ...(f.savedOnly ? ["saved"] : [])], onToggle: (v) => set(v === "new" ? { newOnly: !f.newOnly } : { savedOnly: !f.savedOnly }) },
  ];

  const dietNote = filters.diet.find((d) => d === "vegan" || d === "vegetarian");
  return (
    <div className="min-h-full bg-sage-soft/40" data-testid="what-to-eat">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-5 md:px-6 md:pt-8">
        <header className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-forest/70">{l === "vi" ? "Ẩm thực Việt · TP.HCM" : "Vietnamese Food · Ho Chi Minh City"}</p>
          <h1 className="font-display text-3xl text-forest md:text-4xl">Hôm nay ăn gì?</h1>
          <p className="mt-1 text-sm text-charcoal/70">{t("sub", l)}</p>
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
          {/* ---- controls */}
          <section className="min-w-0 space-y-4 rounded-3xl border border-line/80 bg-paper p-4 shadow-sm lg:sticky lg:top-24" data-testid="wte-controls">
            <Row label={t("meal", l)}>
              {MEALS.map((m) => <Pill key={m} active={f.meal === m} onClick={() => set({ meal: f.meal === m ? "any" : m })} testid={`wte-meal-${m}`}>{MEAL_L[m][l]}</Pill>)}
            </Row>
            <Row label={t("occasion", l)}>
              {OCCASIONS.map((o) => <Pill key={o} active={f.occasion === o} onClick={() => set({ occasion: o, ...(o === "date" && f.people < 2 ? { people: 2 } : {}), ...(o === "family" && f.people < 3 ? { people: 4 } : {}) })} testid={`wte-occasion-${o}`}>{OCCASION_L[o][l]}</Pill>)}
            </Row>
            <div>
              <Row label={`${t("budget", l)} · ${st.budgetMode === "total" ? t("total", l) : t("perPerson", l)}`}>
                {BUDGET_PRESETS.map((b) => <Pill key={b.id} active={st.budgetId === b.id} onClick={() => setUi({ budgetId: b.id, showAlt: false, picked: null })} testid={`wte-budget-${b.id}`}>{b.label[l]}</Pill>)}
                <Pill active={st.budgetId === "custom"} onClick={() => setUi({ budgetId: "custom", showAlt: false, picked: null })} testid="wte-budget-custom">{t("custom", l)}</Pill>
              </Row>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {st.budgetId === "custom" && (
                  <label className="inline-flex items-center gap-1">
                    <span className="sr-only">{t("budget", l)}</span>
                    <input type="number" min={0} step={10000} inputMode="numeric" placeholder={l === "vi" ? "Tối đa (₫)" : "Max (₫)"} value={st.customBudget ?? ""}
                      onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setUi({ customBudget: v !== null && Number.isFinite(v) && v > 0 ? v : null }); }}
                      className="h-8 w-32 rounded-full border border-line bg-paper px-3" data-testid="wte-budget-input" />
                  </label>
                )}
                <button type="button" onClick={() => setUi({ budgetMode: st.budgetMode === "total" ? "per-person" : "total" })} className="rounded-full border border-line px-3 py-1 text-muted hover:text-forest" data-testid="wte-budget-mode">
                  {st.budgetMode === "total" ? `${t("total", l)} · ${f.people} ${l === "vi" ? "người" : "people"}` : t("perPerson", l)} ⇄
                </button>
                {filters.budgetMaxVnd !== null && st.budgetMode === "total" && <span className="text-muted" data-testid="wte-budget-per">≈ {vnd(filters.budgetMaxVnd)} / {t("perPerson", l)}</span>}
              </div>
            </div>
            <Row label={t("goals", l)}>
              {GOALS.map((g) => <Pill key={g} active={f.goals.includes(g)} onClick={() => set({ goals: toggle(f.goals, g as Goal) })} testid={`wte-goal-${g}`}>{GOAL_L[g][l]}</Pill>)}
              <Pill active={filters.diet.includes("vegetarian")} onClick={() => toggleDiet("vegetarian")} testid="wte-goal-vegetarian">{l === "vi" ? "Ăn chay" : "Vegetarian"}</Pill>
            </Row>
            <div>
              <Row label={t("diet", l)}>
                {(Object.keys(DIET_PREFS) as DietPref[]).filter((d) => d !== "vegetarian").map((d) => {
                  const isSaved = prefs.diet.includes(d);
                  return (
                    <Pill key={d} active={filters.diet.includes(d)} onClick={() => toggleDiet(d)} testid={`wte-diet-${d}`} title={isSaved ? t("savedNote", l) : undefined}
                      className={isSaved && !filters.diet.includes(d) ? "line-through decoration-muted" : undefined}>
                      {lbl(DIET_LABELS, d, l)}{isSaved && <span className="ml-1 rounded-full bg-paper/70 px-1.5 text-[10px] uppercase tracking-wide text-forest/70" data-testid={`wte-saved-${d}`}>{t("saved", l)}</span>}
                    </Pill>
                  );
                })}
              </Row>
              {prefs.diet.length > 0 && (
                <p className="mt-1.5 text-[11.5px] text-muted" data-testid="wte-prefs">
                  {st.savedOff.length ? t("offNote", l) : t("savedNote", l)} <Link href="/settings/" className="underline hover:text-forest">{l === "vi" ? "Cài đặt" : "Settings"}</Link>
                </p>
              )}
            </div>
            <div className="space-y-2 pt-1">
              <Button className="h-11 w-full text-[15px]" onClick={() => { setUi({ showAlt: false, picked: null }); scrollToResults(); }} data-testid="wte-find"><Sparkles /> {t("find", l)}</Button>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const s = surprise(dishes, filters, ctx, Math.random, [...st.seenSurprise, ...res.results.map((x) => x.dish.id)]);
                  setPickedState(s); setUi({ picked: s?.dish.id ?? null, showAlt: false, seenSurprise: s ? [...st.seenSurprise, s.dish.id] : st.seenSurprise }); scrollToResults();
                }} data-testid="wte-surprise"><Shuffle /> {t("surprise", l)}</Button>
                <Button variant="outline" size="sm" onClick={() => setOpen(true)} data-testid="wte-more"><SlidersHorizontal /> {t("advanced", l)}{advancedCount > 0 && <span className="ml-0.5 rounded-full bg-forest px-1.5 text-[10px] text-ivory" data-testid="wte-advanced-count">{advancedCount}</span>}</Button>
                <Button variant="ghost" size="sm" onClick={() => st.reset()} data-testid="wte-reset"><RefreshCw /> {t("reset", l)}</Button>
              </div>
            </div>
          </section>

          {/* ---- results */}
          <section ref={resultsRef} className="min-w-0 scroll-mt-20" aria-live="polite" data-testid="wte-results-section">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-2xl text-forest">{picked ? t("surprisePick", l) : t("results", l)}</h2>
              <p className="text-xs text-muted" data-testid="wte-eligible">{t("eligible", l, { n: res.eligible, v: res.withVenue })}</p>
            </div>
            {filters.budgetMaxVnd !== null || filters.budgetMinVnd !== null ? <p className="mt-1 flex items-start gap-1 text-[11.5px] text-muted" data-testid="wte-budget-note"><Info className="mt-0.5 size-3.5 shrink-0" />{t("budgetNote", l)}</p> : null}
            {shown.length === 0 ? (
              <EmptyState l={l} blockers={blockers} prefsDiet={prefs.diet} onRemove={removeBlocker}
                dataNote={dietNote ? t("dataNote", l, { n: dietCoverage(dishes, dietNote), t: dishes.length, x: lbl(DIET_LABELS, dietNote, l) }) : null} />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="wte-results">
                {shown.map((x) => <RecCard key={x.dish.id} rec={x} l={l} onNotInterested={() => setUi({ notInterested: [...st.notInterested, x.dish.id], picked: null })} />)}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {picked ? <Button variant="outline" size="sm" onClick={() => setUi({ picked: null })}>{t("back", l)}</Button>
                : res.alternatives.length > 0 && <Button variant="outline" size="sm" onClick={() => setUi({ showAlt: !st.showAlt })} data-testid="wte-alternatives"><RefreshCw /> {st.showAlt ? t("back", l) : t("alternatives", l)}</Button>}
            </div>
            <p className="mt-3 text-[11px] text-muted" data-testid="wte-disclaimer">{t("disclaimer", l)}</p>
          </section>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-2xl text-forest">{t("collections", l)}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4" data-testid="wte-collections">
            {COLLECTIONS.map((p) => <PresetCard key={p.id} p={p} l={l} onPick={scrollToResults} />)}
          </div>
          <h3 className="mt-6 font-display text-xl text-forest">{t("modes", l)}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {MODES.map((p) => <Chip key={p.id} onClick={() => { useWte.setState({ f: applyPreset(p), picked: null, showAlt: false }); scrollToResults(); }} data-testid={`wte-mode-${p.id}`}><DishArt type={p.art} category="savory" size={20} ring={false} />{p.name[l]}</Chip>)}
          </div>
        </section>
      </div>

      <Sheet open={open} onOpenChange={setOpen} title={t("advanced", l)}>
        <FilterDrawer defs={defs} testid="wte-filter-panel" />
        <Button className="mt-4 w-full" onClick={() => { setOpen(false); setTimeout(scrollToResults, 50); }} data-testid="wte-apply">{t("apply", l)} ({res.eligible})</Button>
      </Sheet>
    </div>
  );
}

function EmptyState({ l, blockers, prefsDiet, onRemove, dataNote }: { l: Lc; blockers: ReturnType<typeof explainEmpty>; prefsDiet: DietPref[]; onRemove: (id: string) => void; dataNote: string | null }) {
  return (
    <div className="mt-3 rounded-3xl border border-line bg-paper p-5" data-testid="wte-empty">
      <div className="flex items-start gap-3">
        <DishArt type="rice" category="savory" size={52} className="bg-ivory" />
        <div>
          <p className="font-display text-lg text-forest">{t("emptyTitle", l)}</p>
          <p className="text-sm text-charcoal/75">{t("emptyBody", l)}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5" data-testid="wte-blockers">
        {blockers.map((b) => {
          const savedDiet = b.id.startsWith("diet:") && prefsDiet.includes(b.id.slice(5) as DietPref);
          const label = savedDiet ? t("turnOffSaved", l, { x: b.label[l] }) : t("remove", l, { x: b.label[l] });
          return (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sage-soft/50 px-3 py-2 text-sm" data-testid="wte-blocker" data-blocker={b.id}>
              <span>{b.label[l]}{b.hard && <span className="ml-1 text-[11px] text-muted">({l === "vi" ? "bạn quyết định" : "your choice"})</span>}</span>
              <Button size="sm" variant="outline" disabled={b.without === 0} onClick={() => onRemove(b.id)} data-testid={`wte-unblock-${b.id}`}>{label} → {b.without === 1 ? t("givesOne", l) : t("gives", l, { n: b.without })}</Button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11.5px] text-muted">{t("hardNote", l)}</p>
      {dataNote && <p className="mt-1 text-[11.5px] text-muted" data-testid="wte-data-note">{dataNote}</p>}
    </div>
  );
}

function PresetCard({ p, l, onPick }: { p: Preset; l: Lc; onPick: () => void }) {
  return (
    <button type="button" onClick={() => { useWte.setState({ f: applyPreset(p), budgetId: p.filters.budgetMaxVnd === 50_000 ? "u50" : "any", picked: null, showAlt: false }); onPick(); }}
      className="flex items-center gap-3 rounded-3xl border border-line/80 bg-paper p-3 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40" data-testid={`wte-collection-${p.id}`}>
      <DishArt type={p.art} category="savory" size={48} className="bg-ivory" />
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
  const priced = rec.venues.find((v) => v.priceVnd);
  const tags = [
    ...d.mealTimes.slice(0, 3).map((m) => lbl(MEAL_LABELS, m, l)),
    ...(d.dietary.includes("vegan") ? [lbl(DIET_LABELS, "vegan", l)] : d.dietary.includes("vegetarian") ? [l === "vi" ? "Chay" : "Vegetarian"] : d.dietary.includes("vegetarian-version-common") ? [l === "vi" ? "Có bản chay" : "Veg version common"] : []),
  ];
  return (
    <article className="flex flex-col rounded-3xl border border-line/80 bg-paper p-4 shadow-sm" data-testid="wte-card" data-dish-id={d.id}>
      <div className="flex gap-3">
        <DishThumb dish={d} size={72} className="bg-ivory" />
        <div className="min-w-0">
          <Link href={`/dishes/${d.id}/`} className="block font-display text-lg leading-tight hover:text-forest" data-testid="wte-name">{d.nameVi}</Link>
          <span className="block truncate text-xs text-muted">{d.nameEn}</span>
          <div className="mt-1 flex flex-wrap gap-1" data-testid="wte-tags">{tags.map((x) => <span key={x} className="rounded-full bg-sage-soft/70 px-2 py-0.5 text-[10.5px] text-forest">{x}</span>)}</div>
        </div>
      </div>
      <ul className="mt-3 space-y-0.5 text-[12.5px] text-forest" data-testid="wte-reasons" aria-label={t("why", l)}>{rec.reasons.slice(0, 3).map((x) => <li key={x.en}>✓ {x[l]}</li>)}</ul>
      {rec.cautions.length > 0 && <ul className="mt-1.5 space-y-0.5 text-[11.5px] text-[#8a5a12]" data-testid="wte-cautions" aria-label={t("note", l)}>{rec.cautions.slice(0, 3).map((x) => <li key={x.en}>! {x[l]}</li>)}</ul>}
      {priced?.priceVnd && <p className="mt-1.5 text-xs text-charcoal" data-testid="wte-price">{t("price", l)}: {vnd(priced.priceVnd.min)}{priced.priceVnd.max !== priced.priceVnd.min ? `–${vnd(priced.priceVnd.max)}` : ""} · {priced.restaurant.name}</p>}
      <p className="mt-2 text-xs text-muted" data-testid="wte-nearest">
        <MapPin className="mr-1 inline size-3.5" />
        {nearest
          ? <>{t("places", l, { n: rec.venues.length })}: <Link href={`/places/${nearest.restaurant.id}/`} className="underline hover:text-forest">{nearest.restaurant.name}</Link> · {nearest.km.toFixed(1)} km</>
          : <span data-testid="wte-no-place">{t("noPlace", l)}</span>}
      </p>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
        <Button size="sm" asChild><Link href={`/dishes/${d.id}/`} data-testid="wte-details">{t("details", l)}</Link></Button>
        {nearest && <Button size="sm" variant="outline" asChild><Link href={`/dishes/${d.id}/#hcmc-block`} data-testid="wte-places"><MapPin /> {t("nearby", l)}</Link></Button>}
        <Button size="sm" variant={saved ? "primary" : "outline"} onClick={() => toggleSaved(d.id)} aria-pressed={saved} data-testid="wte-save"><Bookmark /> {saved ? t("savedBtn", l) : t("save", l)}</Button>
        <Button size="sm" variant={tried ? "primary" : "outline"} onClick={() => toggleTried(d.id)} aria-pressed={tried} data-testid="wte-eaten"><Check /> {t("eaten", l)}</Button>
        <Button size="sm" variant="ghost" onClick={onNotInterested} data-testid="wte-not-interested"><ThumbsDown /> {t("notToday", l)}</Button>
      </div>
    </article>
  );
}
