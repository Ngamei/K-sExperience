import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Service worker cache invalidation with a REAL service worker against the static build:
 *  1. updated catalogue data becomes visible on reload (data is network-first, never served stale)
 *  2. a new deployment (new sw.js?v=<build>) deletes the previous version's cache
 */
test.use({ serviceWorkers: "allow" });
test.describe.configure({ mode: "serial" });
const FILE = "out-modules/data/experiences/coffee.json";

test("updated catalogue data is visible after an update, and old caches are removed", async ({ page }) => {
  await page.goto("/coffee/catalogue/");
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.ready).active));
  await page.reload(); // now controlled by the service worker
  await expect(page.getByTestId("item-count")).toHaveText("13 coffees");
  const before = await page.evaluate(() => caches.keys());
  expect(before.some((k) => k.startsWith("ksx-"))).toBe(true);

  copyFileSync(FILE, `${FILE}.bak`);
  try {
    const d = JSON.parse(readFileSync(FILE, "utf8"));
    d.items.push({ ...d.items[0], id: "cache-test-item", nameVi: "Cache test", nameEn: "Cache test" });
    writeFileSync(FILE, JSON.stringify(d)); // simulates a deployment with updated data
    await page.reload();
    await expect(page.getByTestId("item-count")).toHaveText("14 coffees");
  } finally {
    copyFileSync(`${FILE}.bak`, FILE);
  }

  // A new build registers sw.js with a new version → on activation the old cache is deleted.
  const old = before.find((k) => k.startsWith("ksx-"))!;
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register("/sw.js?v=next-build-test");
    await new Promise<void>((res) => {
      const w = reg.installing ?? reg.waiting ?? reg.active!;
      if (w.state === "activated") return res();
      w.addEventListener("statechange", () => { if (w.state === "activated") res(); });
    });
  });
  await expect.poll(() => page.evaluate(() => caches.keys())).toContain("ksx-next-build-test");
  await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain(old);
});
