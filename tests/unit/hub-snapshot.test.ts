import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The public project status read by FIRSTLAB Agent Hub: stable schema, counts that match the data, no secrets.
const root = path.resolve(__dirname, "../..");
describe("hub snapshot", () => {
  execFileSync("npx", ["tsx", "scripts/hub-snapshot.ts"], { cwd: root, stdio: "pipe" });
  const raw = readFileSync(path.join(root, "public/hub/snapshot.json"), "utf8");
  const s = JSON.parse(raw);
  it("has the versioned schema and the project identity", () => {
    expect(s.schema).toBe("ks-experience.hub-snapshot/1");
    expect(s.project.id).toBe("ks-experience");
    expect(s.project.summary).not.toMatch(/salon/i);
  });
  it("counts match the canonical data", () => {
    const dishes = JSON.parse(readFileSync(path.join(root, "data/vietnamese-dishes.json"), "utf8")).dishes;
    expect(s.metrics.dishes).toBe(dishes.length);
    const b = s.metrics.foodCoverageBuckets;
    expect(b["0"] + b["1-4"] + b["5+"]).toBe(dishes.length);
    expect(s.metrics.modules.find((m: { id: string }) => m.id === "food").items).toBe(dishes.length);
  });
  it("lists only unfinished work and contains no secrets", () => {
    expect(s.openWork.every((t: { status: string }) => t.status !== "done")).toBe(true);
    expect(raw).not.toMatch(/service[_-]?role|sb_secret|SUPABASE_DB_URL=|postgres(ql)?:\/\/|password/i);
  });
});
