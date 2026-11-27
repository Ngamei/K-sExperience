import { expect, test } from "@playwright/test";
import { clickLngLat, dishesShownOnMap, isMobile, visible, waitForIdle, waitForMap } from "./helpers";

test.describe("Vietnam culinary map", () => {
  test("renders accurate boundaries, both archipelagos and representative dishes", async ({ page }) => {
    await page.goto("/");
    await waitForMap(page);
    await expect(page.getByTestId("vietnam-map")).toHaveAttribute("data-zoom-level", "national");
    await expect(page.getByText("Quần đảo Hoàng Sa")).toBeVisible();
    await expect(page.getByText("Quần đảo Trường Sa")).toBeVisible();
    const features = await page.evaluate(() => (window as unknown as { __ksxMap: { querySourceFeatures(s: string): unknown[] } }).__ksxMap.querySourceFeatures("provinces").length);
    expect(features).toBeGreaterThan(0);
    // National level shows only representative (tier 1) dishes.
    const national = await dishesShownOnMap(page);
    expect(national).toBe(11);
  });

  test("selecting a region reveals more dishes; clicking a province selects it", async ({ page }) => {
    await page.goto("/");
    await waitForMap(page);
    const before = await dishesShownOnMap(page);
    await visible(page, "region-mien-bac").click();
    await waitForIdle(page);
    const after = await dishesShownOnMap(page);
    expect(after).toBeGreaterThan(before);

    // Lai Châu's interior label point (no dish marker sits there; labels are click-through).
    await clickLngLat(page, 103.3193, 22.3638);
    await waitForIdle(page);
    if (!isMobile(page)) await expect(page.getByTestId("explore-heading")).toHaveText("Lai Châu");
    await expect(page.getByTestId("active-chip").filter({ hasText: "Lai Châu" }).first()).toBeAttached();
  });

  test("clicking a dish marker opens a preview linking to the dish", async ({ page }) => {
    await page.goto("/");
    await waitForMap(page);
    await visible(page, "region-bac-trung-bo").click();
    await waitForIdle(page);
    // Several Huế dishes share an origin; zoom in until Bún bò Huế is its own marker.
    await page.evaluate(() => (window as unknown as { __ksxMap: { jumpTo(o: object): void } }).__ksxMap.jumpTo({ center: [107.6, 16.4], zoom: 9.5 }));
    await waitForIdle(page);
    await page.locator('[data-testid="dish-marker"][data-dish-id="bun-bo-hue"]').click();
    const preview = page.getByTestId("dish-preview").filter({ visible: true });
    await expect(preview).toContainText("Bún bò Huế");
    await preview.getByTestId("preview-view-dish").click();
    await expect(page).toHaveURL(/\/dishes\/bun-bo-hue\/?$/);
  });
});
