import { expect, type Page } from "@playwright/test";

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
