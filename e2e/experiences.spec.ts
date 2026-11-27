import { expect, test } from "@playwright/test";

test("Settings lists six experience modes in order; Sport is a pilot with Pickleball and Pilates", async ({ page }) => {
  await page.goto("/settings/");
  await expect(page.getByTestId("experience-sport")).toBeVisible();
  const ids = await page.locator('[data-testid^="experience-"][aria-pressed]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids).toEqual(["experience-food", "experience-bars", "experience-coffee", "experience-spa", "experience-shopping", "experience-sport"]);
  await expect(page.getByTestId("experience-food")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("experience-food")).toContainText("Ẩm thực Việt Nam");
  const sport = page.getByTestId("experience-sport");
  await expect(sport).toBeDisabled();
  await expect(sport).toContainText("Sport");
  await expect(sport).toContainText("Thể thao");
  await expect(sport).toContainText("Pilot planned");
  await expect(page.getByTestId("pilots-sport")).toHaveText(/Pickleball.*Pilates/);
  await expect(page.getByTestId("experience-shopping")).toContainText("Coming soon");

  await page.getByTestId("locale-vi").click();
  await expect(sport).toContainText("Dự kiến thí điểm");
  await expect(page.getByTestId("experience-bars")).toContainText("Sắp ra mắt");
});

test("Food stays the only working module: navigation and passport are unchanged", async ({ page, isMobile }) => {
  await page.goto("/catalogue/");
  if (!isMobile) {
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link")).toHaveText(["Food Map", "Discover", "Food Catalogue", "Nearby", "Food Passport", "Saved"]);
  }
  await expect(page.getByTestId("result-count").filter({ visible: true }).first()).toHaveText("138 dishes");
  await page.goto("/passport/");
  const mods = page.getByTestId("experience-passports");
  await expect(mods.locator('[data-testid^="passport-module-"]')).toHaveCount(6);
  await expect(page.getByTestId("passport-module-sport")).toContainText("Sport Passport");
  await expect(page.getByTestId("passport-module-food")).toHaveClass(/border-forest/);
  await expect(page.getByTestId("passport-module-sport")).toHaveClass(/opacity-60/);
});

test("with feature flags off, a module URL never looks functional", async ({ page }) => {
  await page.goto("/coffee/catalogue/");
  await expect(page.getByTestId("module-unavailable")).toContainText("not available yet");
  await expect(page.getByTestId("item-results")).toHaveCount(0);
  await expect(page.getByTestId("experience-coffee")).toHaveCount(0);
  await page.goto("/settings/");
  await expect(page.getByTestId("experience-coffee")).toBeDisabled();
});
