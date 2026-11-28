import { expect, test } from "@playwright/test";

// Required by Facebook Login / Google sign-in: public privacy policy and data-deletion instructions.
test("privacy policy and data-deletion pages are public and linked from Settings", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByTestId("privacy-link").click();
  await expect(page).toHaveURL(/\/privacy\/$/);
  await expect(page.getByTestId("legal-page")).toContainText("We do not sell data");
  await page.goto("/data-deletion/");
  await expect(page.getByTestId("legal-page")).toContainText("Delete my account");
  await expect(page.getByTestId("legal-page")).toContainText("deleted immediately and permanently");
});
