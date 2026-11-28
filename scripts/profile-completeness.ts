/**
 * Business profile completeness dashboard (PO launch quality standard, 2026-11-28) →
 *   docs/PROFILE_COMPLETENESS.md + docs/profile-completeness.json
 *   npm run data:profile-completeness
 *
 * Measures CURRENT coverage of real (non-sample) establishments against the PO's TARGET coverage, overall, per
 * research area (the PO's geographic research split) and per experience. Nothing is inferred: a field counts only if
 * the canonical record carries it. Regenerate after every import; do not edit the outputs by hand.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pointInGeometry, type GeoJsonGeometry, type LngLat } from "../src/lib/geo/geo";

const root = path.resolve(__dirname, "..");
const read = (p: string) => JSON.parse(readFileSync(path.join(root, p), "utf8"));
const TODAY = process.env.REPORT_DATE ?? new Date().toISOString().slice(0, 10);
const daysSince = (d?: string) => (d ? Math.floor((Date.parse(TODAY) - Date.parse(d)) / 86_400_000) : Infinity);

/** PO launch quality standard (target %, not measured). */
export const TARGETS = [
  { key: "nameCategory", label: "Business name & category", short: "Name", target: 100 },
  { key: "address", label: "Verified address", short: "Address", target: 100 },
  { key: "location", label: "Validated location", short: "Pin", target: 100 },
  { key: "status", label: "Operating status", short: "Status", target: 90 },
  { key: "contact", label: "Phone or contact channel", short: "Contact", target: 85 },
  { key: "hours", label: "Opening hours", short: "Hours", target: 80 },
  { key: "menu", label: "Menu or service list", short: "Menu", target: 80 },
  { key: "prices", label: "Published prices", short: "Prices", target: 70 },
  { key: "photo", label: "Actual business photography", short: "Photo", target: 50 },
] as const;
type Key = (typeof TARGETS)[number]["key"];

/** Field definitions (documented in the report so Codex can re-derive them). */
const DEFS: Record<Key | "phone" | "fresh90", string> = {
  nameCategory: "name and venueType present",
  address: "street address (contains a house number or street) and ≥ 1 cited source",
  location: "pin precision exact or building (street-level pins are approximate)",
  status: "closure recorded, or checked ≤ 365 days ago AND the record carries a live operating signal (opening hours, contact channel or delivery link) — a listicle mention alone does not confirm the business is operating",
  contact: "phone, website, social page or a delivery/booking link",
  phone: "phone number recorded (contact.phone)",
  hours: "opening hours recorded",
  menu: "a menu/service list: ≥ 1 link evidenced by an official menu, delivery listing or menu photo, or ≥ 5 real dish/item links (one listicle dish mention is not a menu)",
  prices: "≥ 1 real dish/item link with a published price",
  photo: "≥ 1 real photo of the business (data/venue-photos.json), not an illustration",
  fresh90: "last checked ≤ 90 days ago",
};

interface Est {
  id: string; name: string; experience: string; coordinates: LngLat; address: string; formerDistrict: string | null;
  checks: Record<Key | "phone" | "fresh90", boolean>; age: number; links: number;
}
type Raw = { id: string; name: string; isSample?: boolean; address: string; coordinates: LngLat; coordinatePrecision?: string; venueType?: string; openingHours?: unknown; contact?: { phone?: string; website?: string; social?: string }; deliveryLinks?: unknown[]; sources?: unknown[]; lastVerified?: string; closure?: unknown };
type Link = { isSample?: boolean; status: string; priceVnd?: unknown; price?: unknown; menuEvidence?: { type?: string } };
const MENU_EVIDENCE = new Set(["official-menu", "delivery-listing", "menu-photo"]);

const photoIds = new Set((read("data/venue-photos.json").photos as { venueId: string }[]).map((p) => p.venueId));
/** Former district from the address text ("Quận 3", "District 3", "Phú Nhuận", …); null when the address omits it. */
const DISTRICTS = ["Phú Nhuận", "Bình Thạnh", "Thủ Đức", "Gò Vấp", "Tân Bình", "Tân Phú", "Bình Tân", "Bình Chánh", "Nhà Bè", "Hóc Môn", "Củ Chi", "Cần Giờ"];
function formerDistrict(addr: string): string | null {
  const q = addr.match(/(?:Quận|District)\s+(\d{1,2})\b/);
  if (q) return `Quận ${q[1]}`;
  return DISTRICTS.find((d) => addr.includes(d)) ?? null;
}
function build(r: Raw, experience: string, links: Link[]): Est {
  const real = links.filter((l) => !l.isSample && l.status !== "candidate");
  const precision = r.coordinatePrecision ?? "exact";
  const age = daysSince(r.lastVerified);
  const contact = Boolean(r.contact?.phone || r.contact?.website || r.contact?.social || (r.deliveryLinks?.length ?? 0) > 0);
  return {
    id: r.id, name: r.name, experience, coordinates: r.coordinates, address: r.address, formerDistrict: formerDistrict(r.address), age, links: real.length,
    checks: {
      nameCategory: Boolean(r.name && r.venueType),
      address: /\d|đường|Đường|street/i.test(r.address) && (r.sources?.length ?? 0) > 0,
      location: precision === "exact" || precision === "building",
      status: Boolean(r.closure) || (age <= 365 && Boolean(r.openingHours || contact)),
      contact,
      phone: Boolean(r.contact?.phone),
      hours: Boolean(r.openingHours),
      menu: real.some((l) => MENU_EVIDENCE.has(l.menuEvidence?.type ?? "")) || real.length >= 5,
      prices: real.some((l) => l.priceVnd || l.price),
      photo: photoIds.has(r.id),
      fresh90: age <= 90,
    },
  };
}

const ests: Est[] = [];
const foodLinks = read("data/dish-restaurant-mapping.json").links as (Link & { restaurantId: string })[];
for (const r of read("data/hcmc-restaurants.json").restaurants as Raw[]) if (!r.isSample) ests.push(build(r, "food", foodLinks.filter((l) => l.restaurantId === r.id)));
for (const m of ["coffee", "bars", "spa", "sport"]) {
  const d = read(`data/experiences/${m}.json`);
  for (const e of d.establishments as Raw[]) if (!e.isSample) ests.push(build(e, m, (d.offerings as (Link & { establishmentId: string })[]).filter((o) => o.establishmentId === e.id)));
}

// ---- research areas (PO split, 2026-11-28) -----------------------------------------------------------------------
type Poly = { id: string; searchArea: GeoJsonGeometry };
const polys = Object.fromEntries((read("data/neighbourhoods/neighbourhoods.json").neighbourhoods as Poly[]).map((n) => [n.id, n.searchArea]));
const inPoly = (e: Est, id: string) => Boolean(polys[id]) && pointInGeometry(e.coordinates, polys[id]);
const AREAS = [
  { id: "thao-dien-an-phu", label: "Thảo Điền & An Phú", owner: "ChatGPT", rule: "inside the Thảo Điền or An Phú – An Khánh polygon", match: (e: Est) => inPoly(e, "thao-dien") || inPoly(e, "an-phu-an-khanh") },
  { id: "sala-thu-thiem", label: "Sala & Thủ Thiêm", owner: "ChatGPT", rule: "inside the Sala – Thủ Thiêm polygon", match: (e: Est) => inPoly(e, "sala-thu-thiem") },
  { id: "q7-phu-my-hung", label: "Q7 & Phú Mỹ Hưng", owner: "ChatGPT", rule: "inside the Phú Mỹ Hưng polygon or address in former Quận 7", match: (e: Est) => inPoly(e, "phu-my-hung") || e.formerDistrict === "Quận 7" },
  { id: "q1-q3", label: "Q1 & Q3", owner: "Claude Code", rule: "address in former Quận 1 or Quận 3", match: (e: Est) => e.formerDistrict === "Quận 1" || e.formerDistrict === "Quận 3" },
  { id: "phu-nhuan-binh-thanh", label: "Phú Nhuận & Bình Thạnh", owner: "Claude Code", rule: "address in former Phú Nhuận or Bình Thạnh", match: (e: Est) => e.formerDistrict === "Phú Nhuận" || e.formerDistrict === "Bình Thạnh" },
] as const;
const areaOf = (e: Est) => AREAS.find((a) => a.match(e))?.id ?? (e.formerDistrict ? "other" : "unknown");

// ---- aggregation --------------------------------------------------------------------------------------------------
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
function summarise(es: Est[]) {
  const fields = Object.fromEntries([...TARGETS.map((t) => t.key), "phone", "fresh90"].map((k) => {
    const n = es.filter((e) => e.checks[k as Key]).length;
    return [k, { count: n, pct: pct(n, es.length) }];
  })) as Record<Key | "phone" | "fresh90", { count: number; pct: number }>;
  /** Launch-ready = every field with a target ≥ 70 % is present (photography is optional per profile). */
  const ready = es.filter((e) => TARGETS.filter((t) => t.target >= 70).every((t) => e.checks[t.key])).length;
  const ages = es.map((e) => e.age).filter(Number.isFinite).sort((a, b) => a - b);
  return { total: es.length, fields, launchReady: ready, medianAgeDays: ages.length ? ages[Math.floor(ages.length / 2)] : null };
}
const overall = summarise(ests);
const byArea = [...AREAS.map((a) => ({ id: a.id, label: a.label, owner: a.owner, rule: a.rule })), { id: "other", label: "Other districts", owner: "unassigned", rule: "address names another former district" }, { id: "unknown", label: "District not in address", owner: "unassigned", rule: "address omits the district (pin-only)" }]
  .map((a) => ({ ...a, ...summarise(ests.filter((e) => areaOf(e) === a.id)) }));
const byExperience = ["food", "coffee", "bars", "spa", "sport"].map((x) => ({ experience: x, ...summarise(ests.filter((e) => e.experience === x)) }));
/** Enrichment worklist: in-area profiles missing the most target fields, most-linked first (the research order). */
const missing = (e: Est) => TARGETS.filter((t) => !e.checks[t.key] && t.key !== "photo").map((t) => t.key);
const worklist = AREAS.map((a) => ({
  area: a.id, owner: a.owner,
  venues: ests.filter((e) => areaOf(e) === a.id).map((e) => ({ id: e.id, experience: e.experience, name: e.name, links: e.links, missing: missing(e) }))
    .filter((v) => v.missing.length).sort((x, y) => y.links - x.links || y.missing.length - x.missing.length || x.id.localeCompare(y.id)),
}));

const json = { generated: TODAY, targets: TARGETS, definitions: DEFS, overall, byArea, byExperience, worklist };
writeFileSync(path.join(root, "docs/profile-completeness.json"), JSON.stringify(json, null, 2) + "\n");

// ---- markdown -------------------------------------------------------------------------------------------------------
const mark = (have: number, target: number) => (have >= target ? "✅" : have >= target * 0.5 ? "🟡" : "🔴");
const md: string[] = [
  "# Business profile completeness",
  "",
  `Generated ${TODAY} by \`npm run data:profile-completeness\` from the canonical data. Do not edit by hand. Machine-readable: \`docs/profile-completeness.json\`.`,
  "",
  "**Targets** are the PO's proposed launch quality standard (2026-11-28) — target coverage, not measured coverage. **Current** is measured from the records; a field counts only if the record carries it. Real records only (no samples). ✅ meets target · 🟡 at least half way · 🔴 below half.",
  "",
  `**${overall.total} real establishments** (Food ${byExperience[0].total} · Coffee ${byExperience[1].total} · Bars ${byExperience[2].total} · Spa ${byExperience[3].total} · Sport ${byExperience[4].total}). **Launch-ready profiles: ${overall.launchReady}** (every field with a target ≥ 70 % present). Median days since last check: ${overall.medianAgeDays ?? "—"}; checked in the last 90 days: ${overall.fields.fresh90.pct} %.`,
  "",
  "## Overall vs launch standard",
  "",
  "| Field | Target | Current | Count | |",
  "| --- | --- | --- | --- | --- |",
  ...TARGETS.map((t) => `| ${t.label} | ${t.target} % | ${overall.fields[t.key].pct} % | ${overall.fields[t.key].count}/${overall.total} | ${mark(overall.fields[t.key].pct, t.target)} |`),
  `| ↳ of which phone number | — | ${overall.fields.phone.pct} % | ${overall.fields.phone.count}/${overall.total} | |`,
  `| Source freshness (≤ 90 days) | — | ${overall.fields.fresh90.pct} % | ${overall.fields.fresh90.count}/${overall.total} | |`,
  "",
  "## By research area",
  "",
  "Areas follow the PO's research split. An establishment is counted in the first area whose rule matches (polygon areas first, then the former district named in the address).",
  "",
  `| Area | Owner | Profiles | Launch-ready | ${TARGETS.map((t) => t.short).join(" | ")} | Phone | ≤ 90 d |`,
  `| --- | --- | --- | --- | ${TARGETS.map(() => "---").join(" | ")} | --- | --- |`,
  ...byArea.map((a) => `| ${a.label} | ${a.owner} | ${a.total} | ${a.launchReady} | ${TARGETS.map((t) => `${a.fields[t.key].pct} %`).join(" | ")} | ${a.fields.phone.pct} % | ${a.fields.fresh90.pct} % |`),
  "",
  "Columns: " + TARGETS.map((t) => `${t.short} = ${t.label} (target ${t.target} %)`).join(" · ") + ".",
  "",
  "## By experience",
  "",
  `| Experience | Profiles | Launch-ready | ${TARGETS.map((t) => t.short).join(" | ")} |`,
  `| --- | --- | --- | ${TARGETS.map(() => "---").join(" | ")} |`,
  ...byExperience.map((x) => `| ${x.experience} | ${x.total} | ${x.launchReady} | ${TARGETS.map((t) => `${x.fields[t.key].pct} %`).join(" | ")} |`),
  "",
  "## Definitions",
  "",
  ...Object.entries(DEFS).map(([k, v]) => `- **${k}** — ${v}`),
  "",
  "## Enrichment worklist (top 15 per area)",
  "",
  "Existing profiles first (PO: enrich before adding). Ordered by number of linked dishes/items, then most missing fields. Full lists in the JSON.",
  "",
  ...worklist.flatMap((w) => [
    `### ${AREAS.find((a) => a.id === w.area)!.label} — ${w.owner} (${w.venues.length} profiles missing fields)`,
    "",
    ...(w.venues.length ? ["| Venue | Experience | Links | Missing |", "| --- | --- | --- | --- |", ...w.venues.slice(0, 15).map((v) => `| ${v.name} (\`${v.id}\`) | ${v.experience} | ${v.links} | ${v.missing.join(", ")} |`)] : ["None."]),
    "",
  ]),
];
writeFileSync(path.join(root, "docs/PROFILE_COMPLETENESS.md"), md.join("\n"));
console.log(`profile completeness: ${overall.total} establishments, ${overall.launchReady} launch-ready → docs/PROFILE_COMPLETENESS.md`);
