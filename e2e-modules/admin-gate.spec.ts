import { expect, test } from "@playwright/test";

/**
 * KEX-SEC-01 — this build is a public-deployment configuration (local data, no Supabase,
 * no NEXT_PUBLIC_LOCAL_ADMIN): /admin/ must fail closed while public discovery keeps working.
 */
test("public local-data build: /admin/ is unavailable and shows no editor tools", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.getByTestId("admin-unavailable")).toContainText("Admin is not available on this deployment");
  for (const id of ["admin", "admin-auth", "admin-modes", "admin-tab-dishes", "admin-tab-import", "admin-save", "admin-coverage"]) {
    await expect(page.getByTestId(id)).toHaveCount(0);
  }
  await expect(page.getByText("Download validated JSON")).toHaveCount(0);
});

test("public local-data build: no Admin entry point in Settings; discovery still works", async ({ page }) => {
  await page.goto("/settings/");
  await expect(page.getByTestId("experience-food")).toBeVisible();
  await expect(page.getByTestId("admin-link")).toHaveCount(0);
  await page.goto("/catalogue/");
  await expect(page.getByTestId("dish-card").first()).toBeVisible();
  await page.goto("/bars/catalogue/");
  await expect(page.getByTestId("item-card").first()).toBeVisible();
});
