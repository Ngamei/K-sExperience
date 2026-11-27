import { expect, test } from "@playwright/test";

test.describe("Guest passport (local mode)", () => {
  test("tasting notes and ratings persist on this device", async ({ page }) => {
    await page.goto("/dishes/bun-bo-hue/");
    await page.getByTestId("rate-4").click();
    await page.getByTestId("note-text").fill("Cay, thơm sả — chợ Đông Ba style");
    await page.getByTestId("note-text").blur();
    await page.reload();
    await expect(page.getByTestId("rate-4")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("note-text")).toHaveValue("Cay, thơm sả — chợ Đông Ba style");
    await page.goto("/passport/");
    await expect(page.getByTestId("passport-notes")).toHaveText("1");
  });

  test("visited establishments count towards the passport; passport modules show Food active", async ({ page }) => {
    await page.goto("/places/pho-hoa-pasteur/");
    await page.getByTestId("visited-venue").click();
    await expect(page.getByTestId("visited-venue")).toHaveAttribute("aria-pressed", "true");
    await page.goto("/passport/");
    await expect(page.getByTestId("passport-visited")).toHaveText("1");
    await expect(page.getByTestId("passport-module-food")).toContainText("Food Passport");
    await expect(page.getByTestId("passport-module-coffee")).toContainText("Coffee Passport");
    await expect(page.getByTestId("passport-guest-cta")).toContainText("Make this passport yours");
  });

  test("account pages explain accounts are not enabled in local mode; Settings shows Account", async ({ page }) => {
    for (const path of ["/login/", "/signup/", "/forgot-password/", "/reset-password/", "/profile/"]) {
      await page.goto(path);
      await expect(page.getByTestId("auth-disabled")).toBeVisible();
    }
    await page.goto("/settings/");
    await expect(page.getByTestId("account-section")).toContainText("not enabled");
  });
});
