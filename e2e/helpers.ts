import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Counts derived from the bundled data, so imports (new dishes) do not break hard-coded numbers. */
const readData = (f: string) => JSON.parse(readFileSync(path.join(__dirname, "..", "data", f), "utf8"));
const catalogue = readData("vietnamese-dishes.json") as { dishes: { origins: { provinceId?: string }[] }[] };
export const DISH_COUNT = catalogue.dishes.length;
const provincesRaw = readData("provinces.json");
const provinces = (Array.isArray(provincesRaw) ? provincesRaw : provincesRaw.provinces) as { id: string; nameVi: string }[];
const usedProvinces = new Set(catalogue.dishes.flatMap((d) => d.origins.map((o) => o.provinceId)));
/** Provinces no dish names as an origin (Admin → Quality → Review). */
export const PROVINCES_WITHOUT_DISHES = provinces.filter((p) => !usedProvinces.has(p.id)).map((p) => p.nameVi);

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 1024;

export async function waitForMap(page: Page) {
  await expect(page.locator('[data-testid="vietnam-map"][data-ready="1"]')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => (window as unknown as { __ksxMap?: { loaded(): boolean } }).__ksxMap?.loaded());
  await page.waitForTimeout(600);
}

/** Waits until the camera has stopped moving and markers have been re-rendered. */
export async function waitForIdle(page: Page) {
  await page.waitForFunction(() => {
    const m = (window as unknown as { __ksxMap?: { isMoving(): boolean; isZooming(): boolean } }).__ksxMap;
    return m && !m.isMoving() && !m.isZooming();
  }, undefined, { timeout: 20_000 });
  await page.waitForTimeout(500);
}

/** The visible instance of a test id (desktop and mobile layouts both render some controls). */
export const visible = (page: Page, testId: string) => page.getByTestId(testId).filter({ visible: true }).first();

export async function markerCount(page: Page) {
  return page.evaluate(() => document.querySelectorAll('[data-testid="dish-marker"], [data-testid="dish-cluster"]').length);
}

export async function dishesShownOnMap(page: Page) {
  // Single markers + leaves inside clusters (count badge).
  return page.evaluate(() => {
    const singles = document.querySelectorAll('[data-testid="dish-marker"]').length;
    const clusters = [...document.querySelectorAll('[data-testid="dish-cluster"]')].reduce((a, el) => a + Number(el.textContent?.match(/\d+$/)?.[0] ?? 0), 0);
    return singles + clusters;
  });
}

/** Clicks the map at a geographic coordinate. */
export async function clickLngLat(page: Page, lng: number, lat: number) {
  const pt = await page.evaluate(([x, y]) => {
    const m = (window as unknown as { __ksxMap: { project(l: [number, number]): { x: number; y: number }; getCanvas(): HTMLCanvasElement } }).__ksxMap;
    const p = m.project([x, y]);
    const r = m.getCanvas().getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  }, [lng, lat]);
  await page.mouse.click(pt.x, pt.y);
}

export async function enableSamples(page: Page) {
  // Sample data diagnostics live in Admin → System Health (dev/test builds only; never in customer Settings).
  await page.goto("/admin/#system");
  const box = page.getByTestId("toggle-samples");
  await box.check();
  await expect(page.getByTestId("data-banner")).toContainText("Sample");
}

/** Serve a tiny placeholder for Wikimedia Commons photos so tests are deterministic and offline. */
export async function stubCommonsPhotos(page: Page) {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");
  await page.route(/commons\.wikimedia\.org|upload\.wikimedia\.org/, (route) => route.fulfill({ status: 200, contentType: "image/png", body: png }));
}
