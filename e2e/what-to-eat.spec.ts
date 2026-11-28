import { expect, test } from "@playwright/test";

test.describe("Hôm nay ăn gì?", () => {
  // The default meal follows the HCMC clock; pin it to 12:00 (lunch).
  test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date("2026-11-27T12:00:00+07:00")); });

  test("guest gets suggestions with reasons, and Food nav links to it", async ({ page, isMobile }) => {
    await page.goto("/discover/");
    if (isMobile) await page.getByRole("link", { name: /Eat today/ }).first().click();
    else await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "What to eat" }).click();
    await expect(page).toHaveURL(/\/what-to-eat\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hôm nay ăn gì?");
    const cards = page.getByTestId("wte-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeLessThanOrEqual(6);
    await expect(cards.first().getByTestId("wte-reasons").locator("li").first()).toBeVisible();
    await expect(page.getByTestId("wte-disclaimer")).toContainText("allergies");
    await expect(page.getByTestId("wte-collections").locator("button")).toHaveCount(12);
  });

  test("filters change the results; not-interested removes a dish; alternatives differ", async ({ page }) => {
    await page.goto("/what-to-eat/");
    await page.getByTestId("wte-meal-breakfast").click();
    await expect(page.getByTestId("wte-meal-breakfast")).toHaveAttribute("aria-pressed", "true");
    const first = await page.getByTestId("wte-card").first().getAttribute("data-dish-id");
    await page.getByTestId("wte-card").first().getByTestId("wte-not-interested").click();
    await expect(page.locator(`[data-testid="wte-card"][data-dish-id="${first}"]`)).toHaveCount(0);
    const before = await page.getByTestId("wte-card").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-dish-id")));
    await page.getByTestId("wte-alternatives").click();
    const after = await page.getByTestId("wte-card").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-dish-id")));
    expect(after.some((x) => before.includes(x))).toBe(false);

    await page.getByTestId("wte-diet-vegetarian").click();
    await expect(page.getByTestId("wte-card").first()).toBeVisible();
    await page.getByTestId("wte-more").click();
    await page.getByTestId("wte-exclude").fill("zzzz-nothing");
    await page.getByTestId("wte-apply").click();
    await expect(page.getByTestId("wte-card").first()).toBeVisible();
  });

  test("collection preset, surprise, save and find places", async ({ page }) => {
    await page.goto("/what-to-eat/");
    await page.getByTestId("wte-collection-an-khuya").click();
    await expect(page.getByTestId("wte-meal-late-night")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("wte-surprise").click();
    await expect(page.getByTestId("wte-card")).toHaveCount(1);
    const card = page.getByTestId("wte-card").first();
    await card.getByTestId("wte-save").click();
    await expect(card.getByTestId("wte-save")).toHaveAttribute("aria-pressed", "true");
    const id = await card.getAttribute("data-dish-id");
    await card.getByTestId("wte-places").click();
    await expect(page).toHaveURL(new RegExp(`/dishes/${id}/#hcmc-block`));
    await expect(page.getByTestId("hcmc-block")).toBeVisible();
  });

  test("marking as eaten with skip-recent removes the dish", async ({ page }) => {
    await page.goto("/what-to-eat/");
    await expect(page.getByTestId("wte-meal-lunch")).toHaveAttribute("aria-pressed", "true");
    const card = page.getByTestId("wte-card").first();
    const id = await card.getAttribute("data-dish-id");
    await card.getByTestId("wte-eaten").click();
    await page.getByTestId("wte-more").click();
    await page.getByTestId("wte-recent-7").click();
    await page.getByTestId("wte-apply").click();
    await expect(page.locator(`[data-testid="wte-card"][data-dish-id="${id}"]`)).toHaveCount(0);
  });

  test("saved preferences are applied (no pork) and shown", async ({ page }) => {
    await page.goto("/settings/");
    await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem("ks-experience-user") ?? "{\"state\":{},\"version\":1}");
      raw.state.preferences = { ...(raw.state.preferences ?? {}), categories: [], regions: [], maxSpice: 3, diet: ["no-pork"], mealTime: "any" };
      localStorage.setItem("ks-experience-user", JSON.stringify(raw));
    });
    await page.goto("/what-to-eat/");
    await expect(page.getByTestId("wte-prefs")).toContainText("No pork");
    await expect(page.getByTestId("wte-diet-no-pork")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("wte-card").first()).toBeVisible();
    // Cơm tấm Sài Gòn (pork chop) is a lunch suggestion without preferences; with "no pork" it must not appear.
    const ids = await page.getByTestId("wte-card").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-dish-id")));
    expect(ids).not.toContain("com-tam-sai-gon");
  });

  test("Admin shows recommendation data completeness", async ({ page }) => {
    await page.goto("/admin/");
    await page.getByTestId("admin-tab-recommendations").click();
    await expect(page.getByTestId("admin-recommendations")).toContainText("Allergen list complete");
    await expect(page.getByTestId("admin-presets").locator("tbody tr")).toHaveCount(18);
  });
});
