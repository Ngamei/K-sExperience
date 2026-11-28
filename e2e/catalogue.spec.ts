import { expect, test } from "@playwright/test";
import { isMobile, visible } from "./helpers";

test("accent-insensitive search, combined filters, chips and counts", async ({ page }) => {
  await page.goto("/catalogue/");
  const count = visible(page, "result-count");
  await expect(count).toHaveText("138 dishes");
  await visible(page, "search-input").fill("bun bo hue");
  await expect(page.getByTestId("catalogue-results").getByTestId("dish-card").first()).toContainText("Bún bò Huế");

  await visible(page, "search-input").fill("");
  await visible(page, "cat-snack").click();
  const snackCount = Number((await count.textContent())!.split(" ")[0]);
  expect(snackCount).toBeGreaterThan(5);
  expect(snackCount).toBeLessThan(138);

  if (isMobile(page)) await page.getByTestId("open-filters").click();
  const panel = page.getByTestId("filter-panel").filter({ visible: true });
  await panel.getByRole("button", { name: "Tây Nam Bộ" }).click();
  await expect(page.getByTestId("active-chip").filter({ hasText: "Tây Nam Bộ" }).first()).toBeAttached();
  if (isMobile(page)) await page.keyboard.press("Escape");
  const combined = Number((await count.textContent())!.split(" ")[0]);
  expect(combined).toBeLessThan(snackCount);

  await visible(page, "clear-filters").click();
  await expect(count).toHaveText("138 dishes");
});

test("saved dishes, tried dishes and passport progress", async ({ page }) => {
  await page.goto("/dishes/mi-quang/");
  await page.getByTestId("save-dish").click();
  await expect(page.getByTestId("save-dish")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("tried-dish").click();
  await page.goto("/saved/");
  await expect(page.getByTestId("saved-list")).toContainText("Mì Quảng");
  await page.goto("/passport/");
  await expect(page.getByTestId("passport-tried")).toContainText("1");
  await expect(page.getByTestId("passport-region-nam-trung-bo")).toContainText("1/");
  // Tried filter
  await page.goto("/catalogue/");
  if (isMobile(page)) await page.getByTestId("open-filters").click();
  await page.getByTestId("filter-panel").filter({ visible: true }).getByRole("button", { name: "Tried", exact: true }).click();
  await expect(visible(page, "result-count")).toHaveText("1 of 138 dishes");
});
