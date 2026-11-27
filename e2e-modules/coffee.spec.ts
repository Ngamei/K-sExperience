import { expect, test, type Page } from "@playwright/test";

/**
 * Coffee reference pilot on the shared Experience Engine (build with the Coffee flag on).
 * The real coffee dataset is intentionally empty (nothing invented), so most tests serve a clearly
 * labelled TEST FIXTURE in place of /data/experiences/coffee.json.
 */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");
const item = (id: string, nameVi: string, nameEn: string, category: string, attributes: Record<string, unknown>) => ({
  id, experienceId: "coffee", nameVi, nameEn, altNames: [], category, attributes,
  description: { en: `${nameEn} (test fixture)`, vi: `${nameVi} (dữ liệu kiểm thử)` }, photos: [], sources: [{ title: "Test fixture" }],
  verification: { status: "seed-unverified" }, dataset: "seed",
});
const est = (id: string, name: string, isSample = false) => ({
  id, name, isSample, address: "1 Test Street, Quận 1", neighbourhood: "Bến Nghé", coordinates: [106.70, 10.776], venueType: "café",
  deliveryLinks: [], sources: [{ title: "Test fixture", url: "https://example.test/" }], lastVerified: "2026-11-27", experiences: ["coffee"],
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=test", contact: { phone: "028 0000 0000" },
});
const PHOTO = "https://img.test/ca-phe-muoi-at-cafe-a.png";
const FIXTURE = {
  metadata: { experienceId: "coffee", dataset: "seed", note: "TEST FIXTURE — not real data" },
  items: [
    item("test-ca-phe-muoi", "Cà phê muối", "Salt coffee", "vietnamese-coffee", { coffeeType: "robusta", preparation: "phin", flavour: ["salty", "sweet"], served: ["hot", "iced"] }),
    item("test-bac-xiu", "Bạc xỉu", "White coffee", "vietnamese-coffee", { coffeeType: "robusta", preparation: "phin", flavour: ["milky", "sweet"] }),
  ],
  establishments: [est("test-cafe-a", "TEST Café A"), est("test-sample", "[SAMPLE] Café", true)],
  offerings: [
    { itemId: "test-ca-phe-muoi", establishmentId: "test-cafe-a", status: "menu-confirmed", isSample: false, menuEvidence: { type: "official-menu", note: "Fixture menu" }, lastVerified: "2026-11-27",
      price: { minVnd: 35000, maxVnd: 45000, unit: "cup" },
      photo: { url: PHOTO, kind: "menu-photo", sourceUrl: "https://img.test/menu", attribution: "TEST Café A", license: "Test fixture", lastCheckedAt: "2026-11-27" } },
    { itemId: "test-bac-xiu", establishmentId: "test-cafe-a", status: "source-listed", isSample: false, menuEvidence: { type: "published-source", note: "Fixture guide" }, lastVerified: "2026-11-27" },
    { itemId: "test-ca-phe-muoi", establishmentId: "test-sample", status: "menu-confirmed", isSample: true, menuEvidence: { type: "sample", note: "sample" } },
  ],
};

async function serveFixture(page: Page) {
  await page.route("https://img.test/**", (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG }));
  await page.route("**/data/experiences/coffee.json", (r) => r.fulfill({ json: FIXTURE }));
}

const navLabels = async (page: Page, isMobile: boolean) =>
  isMobile
    ? page.locator('[aria-label="Main mobile"] a').allInnerTexts()
    : page.getByRole("navigation", { name: "Main" }).getByRole("link").allInnerTexts();

test("switching experience mode changes the navigation, and switching back restores Food", async ({ page, isMobile }) => {
  await serveFixture(page);
  await page.goto("/settings/");
  await expect(page.getByTestId("experience-coffee")).toBeEnabled();
  await expect(page.getByTestId("experience-sport")).toBeDisabled(); // not implemented: flag-independent
  await page.getByTestId("experience-coffee").click();
  await expect(page).toHaveURL(/\/coffee\/$/);
  await expect(page.getByTestId("module-page")).toHaveAttribute("data-experience", "coffee");
  await expect.poll(() => navLabels(page, isMobile)).toEqual(isMobile ? ["Map", "Discover", "Catalogue", "Nearby", "Passport"] : ["Café Map", "Discover", "Coffee Catalogue", "Nearby", "Coffee Passport", "Saved"]);

  await page.goto("/settings/"); // shared page keeps the chosen mode's navigation
  await expect.poll(() => navLabels(page, isMobile)).toContain(isMobile ? "Map" : "Café Map");
  await page.getByTestId("experience-food").click();
  await expect(page).toHaveURL(/localhost:3600\/$/);
  await expect.poll(() => navLabels(page, isMobile)).toEqual(isMobile ? ["Explore", "Discover", "Catalogue", "Nearby", "Passport"] : ["Food Map", "Discover", "Food Catalogue", "Nearby", "Food Passport", "Saved"]);
});

test("Coffee catalogue: module categories, attributes and accent-insensitive search; no Food filters", async ({ page }) => {
  await serveFixture(page);
  await page.goto("/coffee/catalogue/");
  await expect(page.getByTestId("item-count")).toHaveText("2 coffees");
  await expect(page.getByTestId("item-categories")).toContainText("Vietnamese coffee");
  await expect(page.getByTestId("item-card").first().getByTestId("card-attr-coffeeType")).toHaveText("Robusta");
  for (const foodOnly of ["filter-panel", "cat-snack", "province-select", "region-all", "avail-none-found"]) await expect(page.getByTestId(foodOnly)).toHaveCount(0);
  await expect(page.getByTestId("module-filter-panel").first()).toBeAttached(); // the shared drawer with Coffee definitions
  await expect(page.getByText("Tây Nam Bộ")).toHaveCount(0);
  await page.getByTestId("item-search").fill("ca phe muoi");
  await expect(page.getByTestId("item-count")).toHaveText("1 coffee");
  await expect(page.getByTestId("item-card")).toHaveAttribute("data-item-id", "test-ca-phe-muoi");
});

test("item detail: module sections, shared establishment card with offering photo, evidence; samples never listed", async ({ page }) => {
  await serveFixture(page);
  await page.goto("/coffee/item/?id=test-ca-phe-muoi");
  await expect(page.getByTestId("attr-coffeeType")).toContainText("Robusta");
  await expect(page.getByTestId("section-offerings")).toContainText("Where to try it in Ho Chi Minh City");
  const rows = page.getByTestId("section-offerings").getByTestId("venue-row");
  await expect(rows).toHaveCount(1); // the [SAMPLE] café is excluded
  await expect(rows.getByTestId("venue-thumb")).toHaveAttribute("data-kind", "menu-photo");
  await expect(rows.getByTestId("venue-thumb-img")).toHaveAttribute("src", PHOTO);
  await expect(rows.getByTestId("availability-status")).toHaveAttribute("data-status", "menu-confirmed");
  await expect(rows.getByTestId("last-checked")).toContainText("2026-11-27");
  await expect(rows).toContainText("35.000–45.000 ₫ / cup");
  await expect(rows.getByTestId("venue-phone")).toBeVisible();
  await expect(rows.getByTestId("google-maps-link")).toBeVisible();

  // Same café, different item: the salt-coffee menu photo must not appear.
  await page.goto("/coffee/item/?id=test-bac-xiu");
  await expect(page.getByTestId("section-offerings").getByTestId("venue-thumb")).toHaveAttribute("data-kind", "icon");
  await expect(page.locator(`img[src="${PHOTO}"]`)).toHaveCount(0);
});

test("HCMC establishment map and Nearby list module establishments only", async ({ page }) => {
  await serveFixture(page);
  await page.goto("/coffee/nearby/");
  await expect(page.getByTestId("hcmc-map")).toBeVisible();
  await expect(page.getByTestId("establishment-card")).toHaveCount(1);
  await page.getByTestId("establishment-card").click();
  await expect(page.getByTestId("establishment-detail")).toContainText("TEST Café A");
  await expect(page.getByTestId("establishment-offering")).toHaveCount(2);
});

test("passports and saved items are isolated per experience on the same device", async ({ page }) => {
  await serveFixture(page);
  await page.goto("/coffee/item/?id=test-ca-phe-muoi");
  await page.getByTestId("item-tried").click();
  await page.getByTestId("item-save").click();
  await page.goto("/coffee/passport/");
  await expect(page.getByTestId("module-passport-tried")).toHaveText("1/2");
  await page.goto("/saved/");
  await expect(page.getByTestId("module-saved").getByTestId("item-card")).toHaveCount(1);
  await page.goto("/passport/"); // Food passport is untouched
  await expect(page.getByTestId("passport-tried")).toHaveText(/^0\//);
});

test("with the real (empty) dataset the pilot shows honest empty states", async ({ page }) => {
  await page.goto("/coffee/catalogue/");
  await expect(page.getByTestId("pilot-banner")).toHaveCount(0); // development notice only (not in production-like builds)
  await expect(page.getByTestId("data-banner")).toHaveCount(0); // Food's seed banner is Food-only
  await expect(page.getByTestId("module-empty")).toContainText("No coffees have been researched yet");
  await page.goto("/coffee/");
  await expect(page.getByTestId("module-empty")).toContainText("No cafés in Ho Chi Minh City have been verified yet");
});
