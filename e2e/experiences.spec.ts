import { expect, test } from "@playwright/test";

test("Settings lists six experience modes in order; Sport is a pilot with Pickleball and Pilates", async ({ page }) => {
  await page.goto("/settings/");
  await expect(page.getByTestId("experience-sport")).toBeVisible();
  const ids = await page.locator('[data-testid^="experience-"][aria-pressed]').evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(ids).toEqual(["experience-food", "experience-bars", "experience-coffee", "experience-spa", "experience-shopping", "experience-sport"]);
  await expect(page.getByTestId("experience-food")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("experience-food")).toContainText("Ẩm thực Việt Nam");
  const sport = page.getByTestId("experience-sport");
  // PO decision: Bars, Coffee, Spa and Sport are open pilots, labelled "Pilot"; Shopping stays Coming soon.
  for (const id of ["bars", "coffee", "spa", "sport"]) {
    await expect(page.getByTestId(`experience-${id}`)).toBeEnabled();
    await expect(page.getByTestId(`pilot-badge-${id}`)).toHaveText("Pilot");
  }
  await expect(sport).toContainText("Sport");
  await expect(sport).toContainText("Thể thao");
  await expect(page.getByTestId("pilots-sport")).toHaveText(/Pickleball.*Pilates/);
  await expect(page.getByTestId("experience-shopping")).toBeDisabled();
  await expect(page.getByTestId("experience-shopping")).toContainText("Coming soon");

  await page.getByTestId("locale-vi").click();
  await expect(page.getByTestId("pilot-badge-sport")).toHaveText("Thí điểm");
  await expect(page.getByTestId("experience-shopping")).toContainText("Sắp ra mắt");
});

test("Food navigation and passport are unchanged; all six passports listed, Shopping locked", async ({ page, isMobile }) => {
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
  await expect(page.getByTestId("passport-module-sport")).toHaveClass(/border-forest/);
  await expect(page.getByTestId("passport-module-shopping")).toHaveClass(/opacity-60/);
});

test("open pilots work from Settings without any flag; Shopping has no pages", async ({ page, request }) => {
  await page.goto("/settings/");
  await page.getByTestId("experience-bars").click();
  await expect(page).toHaveURL(/\/bars\/$/);
  await page.goto("/bars/catalogue/");
  await expect(page.getByTestId("item-card").first()).toBeVisible();
  expect((await request.get("/shopping/")).status()).toBe(404);
});
