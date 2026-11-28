/** Hôm nay ăn gì? — runs against the real bundled catalogue and HCMC venues (desktop + Pixel 7). */
import { expect, test, type Page } from "@playwright/test";

const setPrefs = async (page: Page, diet: string[], maxSpice = 3) => {
  await page.goto("/settings/");
  await page.evaluate(([d, s]) => {
    const raw = JSON.parse(localStorage.getItem("ks-experience-user") ?? '{"state":{},"version":1}');
    raw.state.preferences = { categories: [], regions: [], maxSpice: s, diet: d, mealTime: "any" };
    localStorage.setItem("ks-experience-user", JSON.stringify(raw));
  }, [diet, maxSpice] as const);
};
const cardIds = async (page: Page) => { await page.getByTestId("wte-card").first().waitFor(); return page.getByTestId("wte-card").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-dish-id"))); };

test.describe("Hôm nay ăn gì?", () => {
  // The default meal follows the HCMC clock; pin it to 12:00 (lunch).
  test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date("2026-11-27T12:00:00+07:00")); });

  test("guest: nav entry, default lunch suggestions with reasons, primary action scrolls to results", async ({ page, isMobile }) => {
    await page.goto("/discover/");
    if (isMobile) await page.getByRole("link", { name: /Eat today/ }).first().click();
    else await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "What to eat" }).click();
    await expect(page).toHaveURL(/\/what-to-eat\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hôm nay ăn gì?");
    await expect(page.getByTestId("wte-meal-lunch")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("wte-find").click();
    await expect(page.getByTestId("wte-results-section")).toBeInViewport();
    const cards = page.getByTestId("wte-results").getByTestId("wte-card");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
    expect(await cards.count()).toBeLessThanOrEqual(6);
    const first = cards.first();
    await expect(first.getByTestId("wte-reasons").locator("li").first()).toContainText("Suits lunch");
    await expect(first.getByTestId("wte-tags")).toContainText("Lunch");
    await expect(first.getByTestId("wte-details")).toBeVisible();
    await expect(first.getByTestId("wte-nearest")).toBeVisible();
    await expect(page.getByTestId("wte-disclaimer")).toContainText("allergies");
    await expect(page.getByTestId("wte-collections").locator("button")).toHaveCount(12);
    // no horizontal page overflow (pill rows scroll inside the card)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("reported bug: saved Vegan + No pork → vegan suggestions, shown as saved, switchable for this meal only", async ({ page }) => {
    await setPrefs(page, ["vegan", "no-pork"]);
    await page.goto("/what-to-eat/");
    await expect(page.getByTestId("wte-saved-vegan")).toBeVisible();
    await expect(page.getByTestId("wte-diet-vegan")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("wte-card").first()).toBeVisible(); // was: zero results, no explanation
    for (const card of await page.getByTestId("wte-card").all()) await expect(card.getByTestId("wte-tags")).toContainText(/Vegan|Thuần chay/);
    const veganCount = await page.getByTestId("wte-count-eligible").textContent();
    // switch Vegan off for this meal only
    await page.getByTestId("wte-diet-vegan").click();
    await expect(page.getByTestId("wte-diet-vegan")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("wte-prefs")).toContainText("still saved in Settings");
    await expect(page.getByTestId("wte-count-eligible")).not.toHaveText(veganCount!);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("ks-experience-user")!).state.preferences.diet);
    expect(stored).toEqual(["vegan", "no-pork"]); // Settings untouched
    // Reset restores saved preferences (temporary changes cleared)
    await page.getByTestId("wte-reset").click();
    await expect(page.getByTestId("wte-diet-vegan")).toHaveAttribute("aria-pressed", "true");
  });

  test("zero results are explained and fixable without relaxing the diet", async ({ page }) => {
    await setPrefs(page, ["vegan"]);
    await page.goto("/what-to-eat/");
    await page.getByTestId("wte-meal-late-night").click();
    await expect(page.getByTestId("wte-card").first()).toBeVisible(); // meal time only ranks by default
    await page.getByTestId("wte-strict-meal").click(); // "Only late night" → explicit hard constraint
    await expect(page.getByTestId("wte-empty")).toBeVisible();
    await expect(page.getByTestId("wte-blockers")).toContainText("Only this meal");
    await expect(page.getByTestId("wte-blockers")).toContainText("Vegan");
    await page.getByTestId("wte-unblock-meal").click();
    await expect(page.getByTestId("wte-card").first()).toBeVisible();
    await expect(page.getByTestId("wte-diet-vegan")).toHaveAttribute("aria-pressed", "true");
    for (const card of await page.getByTestId("wte-card").all()) await expect(card.getByTestId("wte-tags")).toContainText("Vegan");
  });

  test("budget presets, custom budget validation, group total; reset clears temporary filters", async ({ page }) => {
    await page.goto("/what-to-eat/");
    await page.getByTestId("wte-budget-u50").click();
    await expect(page.getByTestId("wte-budget-u50")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("wte-budget-note")).toBeVisible();
    await expect(page.getByTestId("wte-card").first()).toBeVisible(); // unknown prices don't hide dishes…
    await expect(page.getByTestId("wte-card").first().getByTestId("wte-cautions")).toContainText(/Price not confirmed|No price information/); // …but are flagged
    await page.getByTestId("wte-budget-custom").click();
    await page.getByTestId("wte-budget-input").fill("-5");
    await expect(page.getByTestId("wte-budget-note")).toHaveCount(0); // invalid input ignored
    await page.getByTestId("wte-budget-input").fill("400000");
    await page.getByTestId("wte-budget-mode").click();
    await expect(page.getByTestId("wte-budget-per")).toContainText("400.000");
    await page.getByTestId("wte-goal-protein").click();
    await page.getByTestId("wte-occasion-office-lunch").click();
    await page.getByTestId("wte-reset").click();
    for (const id of ["wte-goal-protein", "wte-occasion-office-lunch", "wte-budget-custom"]) await expect(page.getByTestId(id)).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("wte-budget-any")).toHaveAttribute("aria-pressed", "true");
  });

  test("goals change the ranking; special dining shows only dishes with a listed place", async ({ page }) => {
    await page.goto("/what-to-eat/");
    const before = await cardIds(page);
    await page.getByTestId("wte-goal-weight").click();
    await expect.poll(() => cardIds(page)).not.toEqual(before);
    await expect(page.getByTestId("wte-card").first().getByTestId("wte-reasons")).toContainText(/vegetables|lighter cooking/);
    await page.getByTestId("wte-reset").click();
    await page.getByTestId("wte-occasion-special").click();
    await expect(page.getByTestId("wte-card").first()).toBeVisible();
    await expect(page.getByTestId("wte-no-place")).toHaveCount(0);
  });

  test("surprise picks a different eligible dish; not-today removes; alternatives differ", async ({ page }) => {
    await page.goto("/what-to-eat/");
    const top = await cardIds(page);
    await page.getByTestId("wte-surprise").click();
    await expect(page.getByTestId("wte-card")).toHaveCount(1);
    const s1 = await page.getByTestId("wte-card").getAttribute("data-dish-id");
    expect(top).not.toContain(s1);
    await page.getByTestId("wte-surprise").click();
    await expect.poll(() => page.getByTestId("wte-card").getAttribute("data-dish-id")).not.toBe(s1);
    await page.getByRole("button", { name: "Back to top suggestions" }).click();
    const first = top[0]!;
    await page.locator(`[data-testid="wte-card"][data-dish-id="${first}"]`).getByTestId("wte-not-interested").click();
    await expect(page.locator(`[data-testid="wte-card"][data-dish-id="${first}"]`)).toHaveCount(0);
    const placed = async () => { await page.getByTestId("wte-results").getByTestId("wte-card").first().waitFor(); return page.getByTestId("wte-results").getByTestId("wte-card").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-dish-id"))); };
    const now = await placed();
    await page.getByTestId("wte-alternatives").click();
    await expect.poll(placed).not.toEqual(now);
    const alt = await placed();
    expect(alt.some((x) => now.includes(x))).toBe(false);
  });

  test("advanced filters, save, find nearby", async ({ page }) => {
    await page.goto("/what-to-eat/");
    await page.getByTestId("wte-more").click();
    await page.getByTestId("wte-exclude").fill("zzzz-nothing");
    await page.getByTestId("wte-service-dine-in").click();
    await page.getByTestId("wte-apply").click();
    await expect(page.getByTestId("wte-advanced-count")).toHaveText("2");
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
    const card = page.getByTestId("wte-card").first();
    const id = await card.getAttribute("data-dish-id");
    await card.getByTestId("wte-eaten").click();
    await page.getByTestId("wte-more").click();
    await page.getByTestId("wte-recent-7").click();
    await page.getByTestId("wte-apply").click();
    await expect(page.locator(`[data-testid="wte-card"][data-dish-id="${id}"]`)).toHaveCount(0);
  });

  test("results are split: places first, then dishes without listed places; counts are shown", async ({ page }) => {
    await page.goto("/what-to-eat/");
    await expect(page.getByTestId("wte-placed-heading")).toBeVisible();
    for (const c of await page.getByTestId("wte-results").getByTestId("wte-card").all()) await expect(c.getByTestId("wte-no-place")).toHaveCount(0);
    const unplaced = page.getByTestId("wte-unplaced");
    await expect(unplaced).toBeVisible();
    for (const c of await unplaced.getByTestId("wte-card").all()) await expect(c.getByTestId("wte-no-place")).toBeVisible();
    const n = async (id: string) => Number(await page.getByTestId(id).textContent());
    expect(await n("wte-count-placed") + await n("wte-count-unplaced")).toBe(await n("wte-count-eligible"));
    expect(await n("wte-count-places")).toBeGreaterThan(0);
  });

  test("Vietnamese", async ({ page }) => {
    await page.goto("/settings/");
    await page.getByTestId("locale-vi").click();
    await page.goto("/what-to-eat/");
    await expect(page.getByTestId("wte-find")).toContainText("Gợi ý món ăn");
    await expect(page.getByTestId("wte-card").first().getByTestId("wte-reasons")).toContainText("Hợp cho bữa trưa");
  });

  test("Admin shows recommendation data completeness", async ({ page }) => {
    await page.goto("/admin/");
    await page.getByTestId("admin-tab-recommendations").click();
    await expect(page.getByTestId("admin-recommendations")).toContainText("Allergen list complete");
    await expect(page.getByTestId("admin-presets").locator("tbody tr")).toHaveCount(18);
  });
});

test.describe("mobile navigation (PO decision: Discover inside Explore)", () => {
  test("Food: five tabs; Explore switches between Map and Discover; deep links keep working", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile bottom bar");
    await page.goto("/catalogue/");
    await expect(page.locator('[aria-label="Main mobile"] a')).toHaveText(["Explore", "Eat today", "Catalogue", "Nearby", "Passport"]);
    await page.getByTestId("tab-map").click();
    await expect(page.getByTestId("explore-switch")).toBeVisible();
    await expect(page.getByTestId("explore-map")).toHaveAttribute("aria-selected", "true");
    await page.getByTestId("explore-discover").click();
    await expect(page).toHaveURL(/\/discover\/$/);
    await expect(page.getByTestId("explore-discover")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("tab-map")).toHaveAttribute("aria-current", "page"); // Explore stays active on Discover
    await page.goto("/discover/"); // direct deep link
    await expect(page.getByTestId("explore-discover")).toHaveAttribute("aria-selected", "true");
  });
  test("pastel theme follows the experience", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-experience", "food");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ivory").trim().toLowerCase())).toBe("#f3f5ef");
  });
});

test.describe("live data counts", () => {
  test("catalogue shows matching/total counts and places per dish; Settings → About and Admin summarise coverage", async ({ page }) => {
    await page.goto("/catalogue/");
    const coverage = page.getByTestId("catalogue-coverage").filter({ visible: true });
    await expect(coverage).toContainText(/138 dishes · \d+\/63 provinces · 6\/6 regions · \d+ with HCMC places · \d+ places/);
    await expect(page.locator('[data-dish-id="bun-bo-hue"]').filter({ visible: true }).getByTestId("dish-places")).toContainText(/\d+ HCMC places/);
    await page.goto("/settings/");
    await expect(page.getByTestId("stat-food-items")).toHaveText("138");
    await expect(page.getByTestId("stat-unique-places")).toHaveText(/^\d+$/);
    await expect(page.getByTestId("stat-row-coffee")).not.toContainText("Loading");
    await page.goto("/admin/");
    await expect(page.getByTestId("admin-coverage").getByTestId("stat-row-food")).toBeVisible();
  });
});
