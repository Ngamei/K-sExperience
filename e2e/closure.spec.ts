import { expect, test } from "@playwright/test";

// D67: a closed venue's page still opens (saved links and history), says it is closed, and it is not offered for its dish.
const CLOSED = "bun-bo-hue-kim-huong-rach-bung-binh-17-rach-bung-binh";
test("closed venue: page shows the closure; the dish page does not list it", async ({ page }) => {
  await page.goto(`/places/${CLOSED}/`);
  await expect(page.getByTestId("closure-notice")).toHaveAttribute("data-status", "permanently-closed");
  await expect(page.getByTestId("closure-notice")).toContainText("No longer recommended");
  await page.goto("/dishes/bun-bo-hue/");
  await expect(page.getByTestId("venue-row").first()).toBeVisible();
  await expect(page.locator(`[href*="${CLOSED}"]`)).toHaveCount(0);
});
