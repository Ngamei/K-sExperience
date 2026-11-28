import { expect, test } from "@playwright/test";

/** KEX-BIZ-02 — shared Business Profile Engine on Food places: honest unknowns, recorded prices only, actions. */
test("restaurant profile: shared components, unknown contact shown honestly, only recorded prices", async ({ page }) => {
  await page.goto("/places/banh-mi-huynh-hoa/");
  const p = page.getByTestId("place-detail");
  await expect(p).toHaveAttribute("data-business-type", "restaurant");
  await expect(page.getByTestId("hero-media")).toContainText("Illustration · not a photo of this place");
  await expect(page.getByTestId("profile-management")).toContainText("Managed by K's Experience");
  await expect(page.getByTestId("fact-phone")).toHaveAttribute("data-known", "false");
  await expect(page.getByTestId("fact-phone")).toContainText("Not published yet");
  await expect(page.getByTestId("action-call")).toBeDisabled();
  await expect(page.getByTestId("google-maps-link")).toHaveAttribute("href", /google\.com\/maps|maps\.app\.goo\.gl|goo\.gl/);
  await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();
  const priced = page.locator('[data-testid=place-offering][data-offering="banh-mi-sai-gon"]');
  await expect(priced.getByTestId("offering-price")).toHaveText("38.000–78.000₫");
  await expect(priced.getByTestId("offering-price")).toHaveAttribute("data-state", "shown");
  for (const id of ["action-report", "action-claim"]) await expect(page.getByTestId(id)).toContainText("Coming soon");
  await expect(page.getByTestId("place-sources")).not.toBeEmpty();
  await page.getByTestId("save-venue").click();
  await expect(page.getByTestId("save-venue")).toHaveAttribute("aria-pressed", "true");
});

test("restaurant with published hours shows the hours panel; unrecorded prices say so", async ({ page }) => {
  await page.goto("/places/pho-hoa-pasteur/");
  await expect(page.getByTestId("fact-hours")).toHaveAttribute("data-known", "true");
  await expect(page.getByTestId("hours-panel")).toContainText("Mon");
  const first = page.getByTestId("place-offering").first();
  await expect(first.getByTestId("offering-price")).toHaveText("Price not recorded");
});

test("Vietnamese business profile", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByTestId("locale-vi").click();
  await page.goto("/places/pho-hoa-pasteur/");
  await expect(page.getByRole("heading", { name: "Thực đơn" })).toBeVisible();
  await expect(page.getByTestId("action-share")).toContainText("Chia sẻ");
  await expect(page.getByTestId("hours-panel")).toContainText("T2");
});
