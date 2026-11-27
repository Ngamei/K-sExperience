/**
 * PM/QA checkpoint priority journey:
 * Explore Vietnam → filter by region and Savory/Sweet/Snack → dish detail → HCMC-only availability → Settings.
 */
import { expect, test } from "@playwright/test";
import { enableSamples, isMobile, visible, waitForIdle, waitForMap } from "./helpers";

test("priority journey: explore → region + category → dish → HCMC availability → settings", async ({ page }) => {
  // The culinary map is the home page.
  await page.goto("/");
  await expect(page.getByTestId("data-banner")).toHaveCount(0); // no development/seed banner in the consumer UI
  await waitForMap(page);

  // Region filter (Bắc Trung Bộ) + category (Sweet)
  await visible(page, "region-bac-trung-bo").click();
  await visible(page, "cat-sweet").click();
  await waitForIdle(page);

  if (isMobile(page)) {
    await page.getByTestId("open-list").click();
  } else {
    await expect(page.getByTestId("explore-heading")).toHaveText("Bắc Trung Bộ");
  }
  const count = page.getByTestId("result-count").last();
  await expect(count).toHaveText(/^\d+ dishes$/);
  const n = Number((await count.textContent())!.split(" ")[0]);
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(20);
  await expect(page.getByTestId("active-chip").filter({ hasText: "Bắc Trung Bộ" }).last()).toBeVisible();
  await expect(page.getByTestId("active-chip").filter({ hasText: "Sweet" }).last()).toBeVisible();

  const cards = page.getByTestId("explore-list").last().getByTestId("dish-card");
  await expect(cards).toHaveCount(n);
  for (const c of await cards.all()) await expect(c).toContainText("Sweet");

  // Open a dish from the filtered list
  const target = cards.filter({ hasText: "Kẹo cu đơ Hà Tĩnh" });
  await target.click();
  await expect(page).toHaveURL(/\/dishes\/keo-cu-do-ha-tinh\/?$/);
  await expect(page.getByTestId("dish-title")).toHaveText("Kẹo cu đơ Hà Tĩnh");
  await expect(page.getByTestId("origin-block")).toContainText("Hà Tĩnh");
  await expect(page.getByTestId("verification-status")).toHaveText(/not yet verified/i);

  // HCMC-only availability: no real venues are verified → honest "none found", samples hidden by default
  const hcmc = page.getByTestId("hcmc-block");
  await expect(hcmc.getByTestId("availability-status")).toHaveAttribute("data-status", "none-found");
  await expect(hcmc).toContainText("No verified HCMC establishment found");
  await expect(hcmc.getByTestId("sample-venues")).toHaveCount(0);

  // Settings
  await page.getByTestId("nav-settings").click();
  await expect(page).toHaveURL(/\/settings\/?$/);
  await expect(page.getByTestId("experience-food")).toHaveAttribute("aria-pressed", "true");
  for (const id of ["bars", "coffee", "spa", "sport"]) await expect(page.getByTestId(`pilot-badge-${id}`)).toHaveText("Pilot");
  await expect(page.getByTestId("experience-shopping")).toBeDisabled();
  await expect(page.getByTestId("experience-shopping")).toContainText("Coming soon");
});

test("sample venues are opt-in, always labelled, and never verified-real", async ({ page }) => {
  // Bánh flan has no real venue yet, only a fictional sample one.
  await page.goto("/dishes/banh-flan/");
  await expect(page.getByTestId("hcmc-block")).toContainText("No verified HCMC establishment found");
  await enableSamples(page);
  await page.goto("/dishes/banh-flan/");
  const samples = page.getByTestId("sample-venues");
  await expect(samples).toBeVisible();
  await expect(samples.getByTestId("sample-badge").first()).toBeVisible();
  // The real-availability status stays "none found" even with samples visible.
  await expect(page.getByTestId("none-found")).toBeVisible();
  await samples.getByTestId("venue-row").first().getByRole("link").first().click();
  await expect(page.getByTestId("sample-warning")).toBeVisible();
  await expect(page.getByRole("button", { name: /Directions/ })).toBeDisabled();
});
