import { expect, test } from "@playwright/test";

/** KEX-BIZ-02 — one profile engine for every experience; the business type sets theme, section and illustration. */
const CASES = [
  ["/coffee/nearby/?id=the-workshop-coffee", "cafe", "Drinks & food", "cups"],
  ["/bars/nearby/?id=heart-of-darkness-31d-ly-tu-trong", "bar", "Drinks menu", "glass"],
  ["/spa/nearby/?id=mam-xoi-do-hair-spa", "head-spa", "Service menu", "massage"],
  ["/spa/nearby/?id=le-spa-des-artistes", "spa", "Treatment menu", "massage"],
  ["/sport/nearby/?id=ufitu-pilates-thao-dien-3-38-quoc-huong", "pilates", "Classes & memberships", "pilates"],
  ["/sport/nearby/?id=pickoland-thao-dien", "pickleball", "Courts & services", "court"],
] as const;

for (const [url, type, section, art] of CASES) {
  test(`${type} profile renders through the shared engine`, async ({ page }) => {
    await page.goto(url);
    const p = page.getByTestId("establishment-detail");
    await expect(p).toHaveAttribute("data-business-type", type);
    await expect(page.getByRole("heading", { level: 2, name: section })).toBeVisible();
    await expect(page.getByTestId("hero-media")).toHaveAttribute("data-art", art);
    await expect(page.getByTestId("establishment-offering").first()).toBeVisible();
    for (const id of ["branch-identity", "contact-facts", "contact-actions", "hours-panel", "source-freshness", "profile-footer-actions"]) await expect(page.getByTestId(id)).toBeVisible();
    await expect(page.getByTestId("fact-phone")).toContainText("Not published yet"); // no phone recorded for any venue yet
  });
}

test("saving a non-Food venue counts toward that experience's saved references", async ({ page }) => {
  await page.goto("/sport/nearby/?id=pickoland-thao-dien");
  await page.getByTestId("establishment-save").click();
  await expect(page.getByTestId("establishment-save")).toHaveAttribute("aria-pressed", "true");
  await page.goto("/membership/");
  await expect(page.getByTestId("usage-sport-refs")).toHaveText("1 / 20");
});

test("profile layout has no horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/spa/nearby/?id=mam-xoi-do-hair-spa");
  await expect(page.getByTestId("establishment-detail")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
