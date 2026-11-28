/** Writes docs/WHAT_TO_EAT_REPORT.md — attribute completeness for Hôm nay ăn gì? */
import { writeFileSync } from "node:fs";
import { getFoodData } from "../src/lib/data/catalogue";
import { reportMarkdown, whatToEatReport } from "../src/lib/food/what-to-eat-report";

const d = getFoodData();
const r = whatToEatReport(d.dishes, d.restaurants, d.links);
writeFileSync("docs/WHAT_TO_EAT_REPORT.md", reportMarkdown(r, new Date().toISOString().slice(0, 10)));
console.log(`✓ docs/WHAT_TO_EAT_REPORT.md — ${r.dishesWithVenue}/${r.totalDishes} dishes with a real HCMC venue (${r.dishesEligible} suggestible); ${r.presets.filter((p) => p.shown === 0).length} empty presets`);
