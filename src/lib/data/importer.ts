/**
 * Catalogue importer: converts rows in the *import format* (JSON array or CSV, as exported
 * from a spreadsheet / ChatGPT) into canonical, validated Dish records.
 *
 * Pure and side-effect free so it can be unit-tested and reused by the Admin screen.
 * See docs/DATA_SOURCES.md → "Catalogue import format".
 */
import { z } from "zod";
import { normalizeVi, slugify } from "../search/normalize";
import {
  ALLERGENS, CATEGORIES, COOKING_METHODS, DIETARY, DISH_TYPES, DishEatingSchema, DishSchema, OCCASIONS, PROTEINS, SERVICE_STYLES, MEAL_TIMES, REGION_IDS, TASTES, VERIFICATION_STATUSES,
  type Dish, type DishOrigin, type Province, type Region,
} from "./schema";

const list = z.union([z.array(z.string()), z.string()]).optional().transform((v) =>
  (Array.isArray(v) ? v : (v ?? "").split(/[;,]/)).map((s) => s.trim()).filter(Boolean),
);
const num = z.union([z.number(), z.string()]).optional().transform((v) => (v === undefined || v === "" ? undefined : Number(v)));

export const ImportRowSchema = z.object({
  id: z.string().optional(),
  nameVi: z.string().min(1, "nameVi is required"),
  nameEn: z.string().min(1, "nameEn is required"),
  altNames: list,
  category: z.string().min(1),
  dishType: z.string().min(1),
  family: z.string().optional(),
  origins: list,
  ingredients: list,
  taste: list,
  spiceLevel: num,
  dietary: list,
  mealTimes: list,
  prominence: num,
  descriptionEn: z.string().optional().default(""),
  descriptionVi: z.string().optional().default(""),
  sources: z.union([z.array(z.object({ title: z.string(), url: z.string().optional(), accessed: z.string().optional() })), z.string()]).optional(),
  photos: z.array(z.object({ url: z.string(), credit: z.string(), license: z.string(), sourceUrl: z.string().optional() })).optional(),
  verificationStatus: z.string().optional(),
  // ---- optional Hôm nay ăn gì? attributes (empty = unknown; never defaulted)
  cookingMethods: list, proteins: list, allergens: list,
  allergensComplete: z.union([z.boolean(), z.string()]).optional(),
  portion: z.string().optional(), vegetables: z.string().optional(),
  occasions: list, serviceStyles: list, customisation: list,
  kcal: num, proteinG: num, nutritionSource: z.string().optional(), nutritionConfidence: z.string().optional(),
  eatingSource: z.string().optional(), eatingSourceUrl: z.string().optional(), eatingConfidence: z.string().optional(),
});
const EATING_COLUMNS = ["cookingMethods", "proteins", "allergens", "allergensComplete", "portion", "vegetables", "occasions", "serviceStyles", "customisation", "kcal", "proteinG"] as const;
export type ImportRow = z.input<typeof ImportRowSchema>;

export interface ImportIssue { row: number; name?: string; level: "error" | "warning"; message: string }
export interface ImportResult {
  dishes: Dish[];
  issues: ImportIssue[];
  stats: { rows: number; imported: number; skipped: number };
  /** Dish fields actually present in each source row (defaults are NOT "provided") — used by the merge. */
  provided: Record<string, (keyof Dish)[]>;
}

const CATEGORY_ALIASES: Record<string, (typeof CATEGORIES)[number]> = {
  savory: "savory", savoury: "savory", "mon man": "savory", man: "savory",
  sweet: "sweet", "mon ngot": "sweet", ngot: "sweet", dessert: "sweet",
  snack: "snack", "an vat": "snack", "mon an vat": "snack",
};

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim().replace(/^﻿/, ""));
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

export function buildProvinceResolver(provinces: Province[], regions: Region[]) {
  const byKey = new Map<string, Province>();
  for (const p of provinces) {
    for (const k of [p.id, p.nameVi, p.nameEn, p.iso]) byKey.set(normalizeVi(k), p);
  }
  // Common short forms
  const alias: Record<string, string> = { "tp hcm": "ho-chi-minh", hcm: "ho-chi-minh", "sai gon": "ho-chi-minh", saigon: "ho-chi-minh", hue: "thua-thien-hue", "vung tau": "ba-ria-vung-tau" };
  for (const [k, id] of Object.entries(alias)) { const p = provinces.find((x) => x.id === id); if (p) byKey.set(k, p); }
  const regionByKey = new Map<string, Region>();
  for (const r of regions) for (const k of [r.id, r.nameVi, r.nameEn]) regionByKey.set(normalizeVi(k), r);
  return {
    province: (s: string) => byKey.get(normalizeVi(s)),
    region: (s: string) => regionByKey.get(normalizeVi(s)),
  };
}

export function importCatalogue(
  rawRows: unknown[],
  ctx: { provinces: Province[]; regions: Region[]; dataset: "seed" | "master" },
): ImportResult {
  const resolve = buildProvinceResolver(ctx.provinces, ctx.regions);
  const issues: ImportIssue[] = [];
  const dishes: Dish[] = [];
  const provided: Record<string, (keyof Dish)[]> = {};
  const seen = new Set<string>();

  rawRows.forEach((raw, i) => {
    const rowNo = i + 1;
    const parsed = ImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      issues.push({ row: rowNo, level: "error", message: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
      return;
    }
    const r = parsed.data;
    const err = (message: string) => issues.push({ row: rowNo, name: r.nameVi, level: "error", message });
    const warn = (message: string) => issues.push({ row: rowNo, name: r.nameVi, level: "warning", message });

    const category = CATEGORY_ALIASES[normalizeVi(r.category)];
    if (!category) return err(`Unknown category "${r.category}" (use Savory/Sweet/Snack or Món mặn/Món ngọt/Ăn vặt)`);
    const dishType = slugify(r.dishType) as (typeof DISH_TYPES)[number];
    if (!DISH_TYPES.includes(dishType)) return err(`Unknown dishType "${r.dishType}"`);

    const origins: DishOrigin[] = [];
    for (const token of r.origins) {
      const associated = token.startsWith("~");
      const t = token.replace(/^~/, "").trim();
      if (/^region:/i.test(t)) {
        const reg = resolve.region(t.slice(7));
        if (!reg) { err(`Unknown region "${t}"`); continue; }
        origins.push({ regionId: reg.id, role: "associated" });
      } else {
        const p = resolve.province(t);
        if (!p) { err(`Unknown province "${t}" (use one of the 63 historical provinces)`); continue; }
        origins.push({ provinceId: p.id, regionId: p.regionId, role: associated ? "associated" : "primary" });
      }
    }
    if (!origins.length) return err("At least one origin (province or region) is required");
    if (!origins.some((o) => o.role === "primary") && origins.some((o) => o.provinceId)) {
      // All provincial origins marked associated: fine, but note it.
      warn("No primary origin; dish will be placed at its first associated origin");
    }

    const pick = <T extends string>(vals: string[], allowed: readonly T[], field: string) =>
      vals.map((v) => slugify(v)).filter((v): v is T => {
        const ok = (allowed as readonly string[]).includes(v);
        if (!ok) warn(`Ignored unknown ${field} value "${v}"`);
        return ok;
      });

    const id = r.id ? slugify(r.id) : slugify(r.nameVi);
    if (seen.has(id)) return err(`Duplicate dish id "${id}" — give regional variants distinct names (e.g. "Phở bò Nam Định")`);
    seen.add(id);

    const status = slugify(r.verificationStatus ?? (ctx.dataset === "seed" ? "seed-unverified" : "pending-review"));
    // KEX-IMPORT-01: an omitted/blank spice level stays UNKNOWN (never 0). Legacy numeric values ("2", 2) are kept;
    // out-of-range numbers are clamped with a warning; non-numeric values are dropped with a warning.
    let spice: number | undefined;
    if (r.spiceLevel !== undefined) {
      if (!Number.isFinite(r.spiceLevel)) warn(`Ignored non-numeric spiceLevel — spice intensity left unknown`);
      else {
        spice = Math.max(0, Math.min(3, Math.round(r.spiceLevel)));
        if (spice !== r.spiceLevel) warn(`spiceLevel ${r.spiceLevel} normalised to ${spice} (allowed 0–3)`);
      }
    }
    const prominence = r.prominence ?? 3;
    const sources = typeof r.sources === "string"
      ? r.sources.split(";").map((s) => s.trim()).filter(Boolean).map((s) => (/^https?:\/\//.test(s) ? { title: s, url: s } : { title: s }))
      : (r.sources ?? []);

    if (status === "verified" && sources.length === 0) warn("Marked verified but has no source references");
    if (!r.descriptionEn || !r.descriptionVi) warn("Missing English or Vietnamese description");

    const eatingRaw = {
      cookingMethods: r.cookingMethods.length ? pick(r.cookingMethods, COOKING_METHODS, "cookingMethod") : undefined,
      proteins: r.proteins.length ? pick(r.proteins, PROTEINS, "protein") : undefined,
      allergens: r.allergens.length ? pick(r.allergens, ALLERGENS, "allergen") : undefined,
      allergensComplete: r.allergensComplete === true || /^(true|yes|1)$/i.test(String(r.allergensComplete ?? "")) ? true : undefined,
      portion: r.portion ? slugify(r.portion) : undefined, vegetables: r.vegetables ? slugify(r.vegetables) : undefined,
      occasions: r.occasions.length ? pick(r.occasions, OCCASIONS, "occasion") : undefined,
      serviceStyles: r.serviceStyles.length ? pick(r.serviceStyles, SERVICE_STYLES, "serviceStyle") : undefined,
      customisation: r.customisation.length ? r.customisation : undefined,
      nutrition: r.kcal !== undefined || r.proteinG !== undefined
        ? { kcal: r.kcal, proteinG: r.proteinG, source: r.nutritionSource ?? "", confidence: slugify(r.nutritionConfidence ?? "estimate") }
        : undefined,
      source: r.eatingSource ? { title: r.eatingSource, ...(r.eatingSourceUrl ? { url: r.eatingSourceUrl } : {}), confidence: slugify(r.eatingConfidence ?? "sourced") } : undefined,
    };
    const eatingClean = Object.fromEntries(Object.entries(eatingRaw).filter(([, v]) => v !== undefined));
    let eating: Dish["eating"];
    if (Object.keys(eatingClean).length) {
      const ev = DishEatingSchema.safeParse(eatingClean);
      if (!ev.success) return err(ev.error.issues.map((x) => `eating.${x.path.join(".")}: ${x.message}`).join("; "));
      if (ev.data.allergensComplete && ev.data.source?.confidence !== "sourced") return err("allergensComplete needs a cited source (eatingSource with eatingConfidence=sourced)");
      if (EATING_COLUMNS.some((k) => k !== "kcal" && k !== "proteinG" && eatingClean[k] !== undefined) && !ev.data.source) warn("Eating attributes without eatingSource — they will show as unsourced estimates");
      eating = ev.data;
    }

    const candidate = {
      id,
      nameVi: r.nameVi.trim(),
      nameEn: r.nameEn.trim(),
      altNames: r.altNames,
      category,
      dishType,
      family: r.family ? slugify(r.family) : undefined,
      origins,
      regionIds: [...new Set(origins.map((o) => o.regionId))],
      ingredients: r.ingredients,
      taste: pick(r.taste, TASTES, "taste"),
      ...(spice !== undefined ? { spiceLevel: spice } : {}),
      dietary: pick(r.dietary, DIETARY, "dietary"),
      mealTimes: pick(r.mealTimes, MEAL_TIMES, "mealTime"),
      description: { en: r.descriptionEn, vi: r.descriptionVi },
      photos: r.photos ?? [],
      sources,
      verification: { status: (VERIFICATION_STATUSES as readonly string[]).includes(status) ? status : "pending-review" },
      dataset: ctx.dataset,
      prominence: [1, 2, 3].includes(prominence) ? prominence : 3,
      ...(eating ? { eating } : {}),
    };
    const valid = DishSchema.safeParse(candidate);
    if (!valid.success) return err(valid.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "));
    dishes.push(valid.data);
    const rawObj = raw as Record<string, unknown>;
    const has = (k: string) => rawObj[k] !== undefined && rawObj[k] !== null && String(rawObj[k]).trim() !== "";
    const p: (keyof Dish)[] = ["nameVi", "nameEn", "category", "dishType"];
    if (has("altNames")) p.push("altNames");
    if (has("family")) p.push("family");
    if (has("origins")) p.push("origins", "regionIds");
    if (has("ingredients")) p.push("ingredients");
    if (has("taste")) p.push("taste");
    if (has("spiceLevel") && spice !== undefined) p.push("spiceLevel"); // unknown never overwrites a recorded level
    if (has("dietary")) p.push("dietary");
    if (has("mealTimes")) p.push("mealTimes");
    if (has("descriptionEn") || has("descriptionVi")) p.push("description");
    if (has("prominence")) p.push("prominence");
    if (eating) p.push("eating");
    provided[valid.data.id] = p;
  });

  // Validate family references are consistent (a family should have >1 member to be meaningful)
  const fam = new Map<string, number>();
  dishes.forEach((d) => d.family && fam.set(d.family, (fam.get(d.family) ?? 0) + 1));
  fam.forEach((n, f) => n < 2 && issues.push({ row: 0, level: "warning", message: `Family "${f}" has a single member` }));

  return { dishes, issues, provided, stats: { rows: rawRows.length, imported: dishes.length, skipped: rawRows.length - dishes.length } };
}

export { REGION_IDS };
