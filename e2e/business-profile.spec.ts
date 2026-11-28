import { expect, test } from "@playwright/test";

/** KEX-BIZ-02 — shared Business Profile Engine on Food places: honest unknowns, recorded prices only, actions. */
test("restaurant profile: shared components, unknown contact shown honestly, only recorded prices", async ({ page }) => {
  await page.goto("/places/banh-mi-huynh-hoa/");
  const p = page.getByTestId("place-detail");
  await expect(p).toHaveAttribute("data-business-type", "restaurant");
  await expect(page.getByTestId("hero-media")).toContainText("Illustrative image · not this place");
  await expect(page.getByTestId("hero-media")).toHaveAttribute("data-default", "image");
  await expect(page.getByTestId("hero-default-image")).toHaveAttribute("src", "/images/business-defaults/restaurant.webp");
  expect(await page.getByTestId("hero-default-image").evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByTestId("profile-management")).toContainText("Managed by K's Experience");
  await expect(page.getByTestId("fact-phone")).toHaveAttribute("data-known", "false");
  await expect(page.getByTestId("fact-phone")).toContainText("Not published yet");
  await expect(page.getByTestId("action-call")).toBeDisabled();
  await expect(page.getByTestId("maps-photos-link")).toHaveAttribute("href", /google\.com\/maps|maps\.app\.goo\.gl|goo\.gl/);
  await expect(page.getByTestId("maps-photos-link")).toHaveAttribute("target", "_blank");
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

/** KEX-BIZ-03 — the header shows the venue's own credited photo when one exists (synthetic test fixture, not data). */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");
const FIXTURE = { metadata: { note: "e2e fixture", updatedOn: "2026-11-28" }, photos: [{
  venueId: "pho-hoa-pasteur", url: "https://upload.wikimedia.org/test/venue.png", kind: "exterior",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Test_venue.png", attribution: "Test Author", license: "CC BY-SA 4.0", lastCheckedAt: "2026-11-28",
}] };

test("venue photo in the header, with caption, author link and licence; other venues keep the illustration", async ({ page }) => {
  await page.route("**/data/venue-photos.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) }));
  await page.route("https://upload.wikimedia.org/test/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG }));
  await page.goto("/places/pho-hoa-pasteur/");
  const hero = page.getByTestId("hero-media");
  await expect(hero).toHaveAttribute("data-media", "photo");
  await expect(page.getByTestId("hero-photo")).toHaveAttribute("alt", /Phở Hòa Pasteur — Outside the venue/);
  await expect(page.getByTestId("hero-credit")).toContainText("Outside the venue");
  await expect(page.getByTestId("hero-credit")).toContainText("CC BY-SA 4.0");
  await expect(page.getByTestId("hero-credit").getByRole("link", { name: "Test Author" })).toHaveAttribute("href", FIXTURE.photos[0].sourceUrl);
  await page.goto("/places/banh-mi-huynh-hoa/");
  await expect(page.getByTestId("hero-media")).toHaveAttribute("data-media", "illustration");
});

test("a venue photo that fails to load falls back to the illustration", async ({ page }) => {
  await page.route("**/data/venue-photos.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIXTURE) }));
  await page.route("https://upload.wikimedia.org/test/**", (r) => r.fulfill({ status: 404, body: "" }));
  await page.goto("/places/pho-hoa-pasteur/");
  await expect(page.getByTestId("hero-media")).toHaveAttribute("data-media", "illustration");
});
