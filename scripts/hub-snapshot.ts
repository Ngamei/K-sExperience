/**
 * Project status for FIRSTLAB Agent Hub (and anyone else) — read-only, public, no secrets.
 *   npm run hub:snapshot  →  public/hub/snapshot.json   (also runs before every `npm run build`, so each deploy
 *   serves a current copy at https://<site>/hub/snapshot.json)
 * Everything comes from files already in this public repo: registry + data (counts), docs/BACKLOG.md (open work),
 * docs/DECISIONS.md (decisions waiting for the Product Owner), research-exchange/queue.json (research in flight).
 * Shape: schema "ks-experience.hub-snapshot/1" — additive changes only; bump the version for breaking ones.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EXPERIENCES, loc } from "../src/experiences/registry";
import { foodStats, moduleStats, uniqueEstablishments } from "../src/lib/data/platform-stats";

const root = path.resolve(__dirname, "..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");
const json = (p: string) => JSON.parse(read(p));
const plain = (s: string) => s.replace(/\*\*|`/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
const short = (s: string, n = 160) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

// ---- counts ----------------------------------------------------------------------------------------
const food = { dishes: json("data/vietnamese-dishes.json").dishes, restaurants: json("data/hcmc-restaurants.json").restaurants,
  links: json("data/dish-restaurant-mapping.json").links, provinces: json("data/provinces.json").provinces ?? json("data/provinces.json"),
  regions: json("data/regions.json").regions ?? json("data/regions.json") };
const fs = foodStats(food);
const modules = EXPERIENCES.map((e) => {
  if (e.id === "food") return { id: e.id, name: loc(e.name, "en"), status: e.status, items: fs.items, places: fs.establishments, itemsWithPlaces: fs.itemsWithEstablishments };
  if (!e.implemented) return { id: e.id, name: loc(e.name, "en"), status: e.status, items: 0, places: 0, itemsWithPlaces: 0 };
  const s = moduleStats(json(`data/experiences/${e.id}.json`));
  return { id: e.id, name: loc(e.name, "en"), status: e.status, items: s.items, places: s.establishments, itemsWithPlaces: s.itemsWithEstablishments };
});
const allPlaces = uniqueEstablishments([food.restaurants, ...EXPERIENCES.filter((e) => e.id !== "food" && e.implemented).map((e) => json(`data/experiences/${e.id}.json`).establishments)]);
const coverage = json("docs/food-coverage.json");

// ---- open work (BACKLOG rows not done) ---------------------------------------------------------------
const STATUS = [["⛔", "blocked"], ["🔄", "in progress"], ["🟡", "partly done"], ["⬜", "to do"], ["✅", "done"]] as const;
const backlog = read("docs/BACKLOG.md").split("\n").filter((l) => /^\| [A-Z]{2,}[\w-]*-\d+/.test(l)).map((l) => {
  const c = l.split("|").slice(1, -1).map((x) => x.trim());
  const raw = c[c.length - 1];
  const status = STATUS.find(([e]) => raw.includes(e))?.[1] ?? "to do";
  return { id: c[0], priority: c[1], owner: c[2], title: short(plain(c[3]), 140), status, note: short(plain(raw.replace(/[⛔🔄🟡⬜✅]/gu, "")), 160) };
}).filter((t) => t.status !== "done");

// ---- decisions waiting for the Product Owner -------------------------------------------------------
const decisions = read("docs/DECISIONS.md").split("\n").filter((l) => /^\| D\d+ \|/.test(l) && /needs (PO|Business|Product)|PROPOSAL/i.test(l)).map((l) => {
  const c = l.split("|").slice(1, -1).map((x) => x.trim());
  return { id: c[0], date: c[1], summary: short(plain(c[2]).replace(/^\[[^\]]*\]\s*/, ""), 200) };
});

// ---- research in flight ----------------------------------------------------------------------------
const q = json("research-exchange/queue.json");
const research = (Array.isArray(q) ? q : q.batches).filter((b: { status: string }) => !["imported", "rejected", "cancelled"].includes(b.status))
  .map((b: { batchId: string; experience: string; assignedTo: string; status: string; scope: string }) => ({ id: b.batchId, experience: b.experience, assignedTo: b.assignedTo, status: b.status, scope: short(plain(b.scope), 140) }));

const snapshot = {
  schema: "ks-experience.hub-snapshot/1",
  generatedAt: new Date().toISOString(),
  commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
  project: {
    id: "ks-experience", name: "K's Experience", site: "https://k-s-experience.vercel.app",
    repository: "https://github.com/Ngamei/K-sExperience",
    summary: "Lifestyle discovery app for Ho Chi Minh City: Vietnamese food first, plus bars, coffee, spa and sport — real, sourced places only.",
    stage: { name: "Implementation", note: "Live pilot (public discovery). Accounts & Passport on the database await release testing." },
    team: [
      { role: "Product Owner", who: "Founder", does: "Vision, approvals, merges to main" },
      { role: "Implementation", who: "Claude Code", does: "Code, data import, tests" },
      { role: "PM / QA", who: "Codex", does: "Requirements, independent review" },
      { role: "Research", who: "ChatGPT", does: "Catalogue and venue research" },
    ],
  },
  metrics: { places: allPlaces, dishes: fs.items, dishesWithPlaces: fs.itemsWithEstablishments, foodCoverageBuckets: coverage.buckets, modules },
  openWork: backlog,
  decisionsAwaitingOwner: decisions,
  research,
};
mkdirSync(path.join(root, "public/hub"), { recursive: true });
writeFileSync(path.join(root, "public/hub/snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n");
console.log(`✓ public/hub/snapshot.json — ${allPlaces} places, ${backlog.length} open items, ${decisions.length} decisions awaiting owner, ${research.length} research batches`);
