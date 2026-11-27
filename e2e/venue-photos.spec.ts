import { expect, test, type Page } from "@playwright/test";
import { stubCommonsPhotos } from "./helpers";

/**
 * Dish-at-place photos on dish-page venue cards. The real dataset has no venue photos yet, so the test
 * injects ONE venue-specific photo into the served dataset: Góc Huế (41 Kỳ Đồng) × bánh khoái.
 * The same venue also serves bánh nặm — that photo must never appear on the bánh nặm page.
 */
const VENUE = "goc-hue-ky-dong-41-ky-dong";
const VENUE_PHOTO = "https://img.test/banh-khoai-at-goc-hue.png";

async function injectVenuePhoto(page: Page) {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");
  await page.route("https://img.test/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: png }));
  await page.route("**/data/food.json", async (route) => {
    const res = await route.fetch();
    const data = await res.json();
    for (const l of data.links) {
      if (l.dishId === "banh-khoai" && l.restaurantId === VENUE)
        l.photo = { url: VENUE_PHOTO, kind: "venue-specific", sourceUrl: "https://img.test/post", attribution: "Test fixture", license: "Test fixture", lastCheckedAt: "2026-11-27" };
    }
    await route.fulfill({ response: res, json: data });
  });
}

test.beforeEach(async ({ page }) => {
  await stubCommonsPhotos(page);
  await injectVenuePhoto(page);
});

const card = (page: Page, id: string) => page.locator(`[data-testid="venue-row"][data-venue-id="${id}"]`);

test("venue-specific photo is shown on its own dish; other venues fall back to the icon", async ({ page }) => {
  await page.goto("/dishes/banh-khoai/");
  const own = card(page, VENUE);
  await expect(own.getByTestId("venue-thumb")).toHaveAttribute("data-kind", "venue-specific");
  await expect(own.getByTestId("venue-thumb-img")).toHaveAttribute("src", VENUE_PHOTO);
  await expect(own.getByTestId("venue-photo-credit")).toContainText("Photo of this dish at this venue");
  // Bánh khoái has no generic photo, so the other venues keep the icon.
  const others = page.locator(`[data-testid="venue-row"]:not([data-venue-id="${VENUE}"])`);
  expect(await others.count()).toBeGreaterThan(0);
  for (const r of await others.all()) {
    await expect(r.getByTestId("venue-thumb")).toHaveAttribute("data-kind", "icon");
    await expect(r.getByTestId("venue-photo-credit")).toHaveCount(0);
  }
});

test("generic dish photo fallback, and a venue photo never leaks onto a different dish", async ({ page }) => {
  await page.goto("/dishes/banh-nam/");
  const rows = page.getByTestId("venue-row");
  await expect(rows.first()).toBeVisible();
  for (const r of await rows.all()) {
    await expect(r.getByTestId("venue-thumb")).toHaveAttribute("data-kind", "generic-dish");
    await expect(r.getByTestId("venue-photo-credit")).toContainText("not from this venue");
  }
  // Same venue as the injected bánh khoái photo — must show the bánh nặm generic photo, not that one.
  await expect(card(page, VENUE).getByTestId("venue-thumb-img")).not.toHaveAttribute("src", VENUE_PHOTO);
  await expect(page.locator(`img[src="${VENUE_PHOTO}"]`)).toHaveCount(0);
});

test("a broken image falls back to the icon", async ({ page }) => {
  await page.route(VENUE_PHOTO, (r) => r.fulfill({ status: 404, body: "" }));
  await page.goto("/dishes/banh-khoai/");
  const own = card(page, VENUE);
  await expect(own.getByTestId("venue-thumb")).toHaveAttribute("data-kind", "icon");
  await expect(own.getByTestId("venue-photo-credit")).toHaveCount(0); // no credit for an image that isn't shown
});

test("venue cards keep a clean layout (no overflow, square thumbnails)", async ({ page }) => {
  await page.goto("/dishes/banh-khoai/");
  await expect(card(page, VENUE).getByTestId("venue-thumb-img")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  for (const r of await page.getByTestId("venue-row").all()) {
    const rb = (await r.boundingBox())!;
    const tb = (await r.getByTestId("venue-thumb").boundingBox())!;
    expect(Math.abs(tb.width - tb.height)).toBeLessThan(1);
    expect(tb.width).toBeGreaterThanOrEqual(56);
    expect(tb.x).toBeGreaterThanOrEqual(rb.x);
    expect(tb.x + tb.width).toBeLessThanOrEqual(rb.x + rb.width);
    // Name, evidence level and Google Maps CTA are all still present and inside the card.
    for (const id of ["availability-status", "google-maps-link"]) {
      const b = (await r.getByTestId(id).boundingBox())!;
      expect(b.x + b.width).toBeLessThanOrEqual(rb.x + rb.width + 0.5);
    }
  }
  await page.screenshot({ path: `test-results/venue-cards-${page.viewportSize()!.width}.png`, fullPage: false });
});
