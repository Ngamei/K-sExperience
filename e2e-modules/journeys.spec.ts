import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Cross-module journeys on the Coffee-flag build with the REAL pilot dataset (no fixtures):
 * mode switching, back/refresh/direct URLs, module filters, flags, production data hygiene.
 */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");
const stubCommons = (page: Page) => page.route(/wikimedia\.org/, (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG }));
const navTexts = (page: Page, isMobile: boolean) =>
  isMobile ? page.locator('[aria-label="Main mobile"] a').allInnerTexts() : page.getByRole("navigation", { name: "Main" }).getByRole("link").allInnerTexts();
const FOOD = { desktop: ["Food Map", "Discover", "What to eat", "Food Catalogue", "Nearby", "Food Passport", "Saved"], mobile: ["Explore", "Eat today", "Catalogue", "Nearby", "Passport"] };
const COFFEE = { desktop: ["Café Map", "Discover", "Coffee Catalogue", "Nearby", "Coffee Passport", "Saved"], mobile: ["Explore", "Catalogue", "Nearby", "Passport"] };

test("switching repeatedly between Food and Coffee keeps navigation, data and URLs consistent", async ({ page, isMobile }) => {
  const k = isMobile ? "mobile" : "desktop";
  for (let i = 0; i < 3; i++) {
    await page.goto("/settings/");
    await page.getByTestId("experience-coffee").click();
    await expect(page).toHaveURL(/\/coffee\/$/);
    await expect.poll(() => navTexts(page, isMobile)).toEqual(COFFEE[k]);
    await page.goto("/settings/");
    await page.getByTestId("experience-food").click();
    await expect(page).toHaveURL(/:3600\/$/);
    await expect.poll(() => navTexts(page, isMobile)).toEqual(FOOD[k]);
  }
  await page.goto("/catalogue/");
  await expect(page.getByTestId("result-count").filter({ visible: true }).first()).toHaveText("138 dishes"); // Food data intact
});

test("direct URLs, back navigation and refresh keep the right experience", async ({ page, isMobile }) => {
  const k = isMobile ? "mobile" : "desktop";
  await page.goto("/coffee/item/?id=ca-phe-trung"); // fresh direct link
  await expect(page.getByTestId("item-detail")).toContainText("Cà phê trứng");
  await expect.poll(() => navTexts(page, isMobile)).toEqual(COFFEE[k]);
  await page.goto("/coffee/catalogue/");
  await page.getByTestId("item-search").fill("ca phe trung");
  await page.getByTestId("item-card").first().click();
  await expect(page).toHaveURL(/\/coffee\/item\/\?id=ca-phe-trung/);
  await page.goBack();
  await expect(page).toHaveURL(/\/coffee\/catalogue\/$/);
  await expect(page.getByTestId("item-search")).toHaveValue("ca phe trung"); // filter state kept on back
  await page.goto("/saved/"); // shared page follows the chosen mode
  await page.reload();
  await expect(page.getByTestId("module-saved")).toBeVisible();
  await expect.poll(() => navTexts(page, isMobile)).toEqual(COFFEE[k]);
  await page.goto("/"); // a Food URL switches back to Food
  await expect.poll(() => navTexts(page, isMobile)).toEqual(FOOD[k]);
});

test("real Coffee data: sourced cafés per drink, establishment filters, no unverified claims", async ({ page, isMobile }) => {
  await stubCommons(page);
  await page.goto("/coffee/item/?id=ca-phe-trung");
  const rows = page.getByTestId("section-offerings").getByTestId("venue-row");
  await expect(rows).toHaveCount(3) // Okkio, Góc Hà Nội, Runam (Ông Chú Cuội Hẻm is closed — D67)
  for (const r of await rows.all()) {
    await expect(r.getByTestId("availability-status")).toHaveAttribute("data-status", "source-listed");
    await expect(r.getByTestId("last-checked")).toBeVisible();
    // no venue photo → the drink's reference photo, labelled as not from this venue (never a borrowed venue image)
    await expect(r.getByTestId("venue-thumb")).toHaveAttribute("data-kind", "generic-dish");
    await expect(r.getByTestId("venue-photo-credit")).toContainText("not from this venue");
  }
  await expect(page.getByTestId("item-verification")).toContainText("not yet verified");
  // café characteristics are establishment filters: Speciality coffee shop → only drinks such a café offers
  await page.goto("/coffee/catalogue/");
  if (isMobile) await page.getByTestId("open-filters").click();
  await page.getByTestId("filter-est-cafeTypes-specialty").filter({ visible: true }).first().click();
  if (isMobile) await page.keyboard.press("Escape");
  // expected = drinks offered by at least one café tagged "specialty" (derived from the data, not hard-coded)
  const coffee = JSON.parse(readFileSync("data/experiences/coffee.json", "utf8"));
  const specialty = new Set(coffee.establishments.filter((e: { closure?: unknown; attributes?: { cafeTypes?: string[] } }) => !e.closure && e.attributes?.cafeTypes?.includes("specialty")).map((e: { id: string }) => e.id));
  const expected = [...new Set(coffee.offerings.filter((o: { establishmentId: string }) => specialty.has(o.establishmentId)).map((o: { itemId: string }) => o.itemId))].sort();
  await expect(page.getByTestId("item-count")).toHaveText(`${expected.length}/${coffee.items.length} coffees`); // matching / total
  expect((await page.getByTestId("item-card").evaluateAll((xs) => xs.map((x) => x.getAttribute("data-item-id")))).sort()).toEqual(expected);
  expect(expected).toContain("pour-over");
  await page.getByTestId("clear-filters").first().click();
  await expect(page.getByTestId("item-count")).toHaveText("13 coffees");
  // café page shows its characteristics separately from its drinks
  await page.goto("/coffee/nearby/?id=the-workshop-coffee");
  await expect(page.getByTestId("est-attr-cafeTypes")).toContainText("Speciality coffee shop");
  await expect(page.getByTestId("establishment-offering")).toHaveCount(1);
});

test("open pilots Bars, Spa and Sport render real sourced data; Shopping stays Coming soon", async ({ page }) => {
  for (const id of ["bars", "spa", "sport"]) {
    await page.goto(`/${id}/catalogue/`);
    await expect(page.getByTestId("module-unavailable")).toHaveCount(0);
    await expect(page.getByTestId("item-card").first()).toBeVisible();
  }
  await page.goto("/sport/item/?id=pickleball-court-rental");
  await expect(page.getByTestId("section-offerings").getByTestId("venue-row").first()).toBeVisible();
  await page.goto("/settings/");
  await expect(page.getByTestId("experience-shopping")).toBeDisabled();
  await expect(page.getByTestId("experience-shopping")).toContainText("Coming soon");
  await expect(page.getByTestId("pilots-sport")).toHaveText(/Pickleball.*Pilates/);
});

test("production-like build: no fictional venues, no sample toggle, no development banners", async ({ page, request }) => {
  const food = await (await request.get("/data/food.json")).json();
  expect(food.restaurants.some((r: { isSample: boolean }) => r.isSample)).toBe(false);
  expect(food.links.some((l: { isSample: boolean }) => l.isSample)).toBe(false);
  await page.goto("/settings/");
  await expect(page.getByTestId("experience-mode")).toBeVisible();
  await expect(page.getByTestId("toggle-samples")).toHaveCount(0);
  await page.goto("/nearby/");
  await expect(page.getByTestId("enable-samples")).toHaveCount(0);
  await expect(page.getByTestId("data-banner")).toHaveCount(0);
});

test("Bars craft beer batch (GPT-BARS-001): live venue counts on catalogue, item and map", async ({ page }) => {
  const data = JSON.parse(readFileSync("data/experiences/bars.json", "utf8"));
  const craft = new Set(data.offerings.filter((o: { itemId: string }) => o.itemId === "craft-beer").map((o: { establishmentId: string }) => o.establishmentId)).size;
  await page.goto("/bars/catalogue/");
  await expect(page.getByTestId("module-coverage").filter({ visible: true })).toContainText(`${data.establishments.length} HCMC places`);
  await expect(page.locator('[data-item-id="craft-beer"]').getByTestId("item-places")).toHaveText(`${craft} HCMC places`);
  await page.goto("/bars/item/?id=craft-beer");
  await expect(page.getByTestId("section-offerings").getByTestId("venue-row")).toHaveCount(craft);
  await page.goto("/bars/nearby/");
  await expect(page.getByTestId("establishment-count")).toHaveText(String(data.establishments.length));
  await expect(page.getByTestId("establishment-card")).toHaveCount(data.establishments.length);
});

test("KEX-QA-02: street-level pins are labelled approximate; exact pins are not", async ({ page }) => {
  await page.goto("/bars/nearby/?id=tiem-bia-ga-thao-dien-26b-xuan-thuy");
  await expect(page.getByTestId("approx-location")).toContainText("Approximate location");
  await page.goto("/bars/nearby/?id=pasteur-street-craft-beer-thao-dien-120-xuan-thuy");
  await expect(page.getByTestId("approx-location")).toBeVisible();
  await page.goto("/bars/nearby/?id=heart-of-darkness-31d-ly-tu-trong"); // exact (mapped POI)
  await expect(page.getByTestId("establishment-detail")).toBeVisible();
  await expect(page.getByTestId("approx-location")).toHaveCount(0);
});
