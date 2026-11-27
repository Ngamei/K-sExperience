import { expect, test, type Page } from "@playwright/test";

/** P1 visual parity: every enabled module renders Food-level visuals (no text-only cards, no blank images). */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");
const stubCommons = (page: Page) => page.route(/wikimedia\.org/, (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG }));
const MODULES = ["bars", "coffee", "spa", "sport"] as const;

for (const id of MODULES) {
  test(`${id}: catalogue cards, category chips and item pages are never text-only`, async ({ page }) => {
    await stubCommons(page);
    await page.goto(`/${id}/catalogue/`);
    const cards = page.getByTestId("item-card");
    await expect(cards.first()).toBeVisible();
    for (const c of await cards.all()) {
      // every card has a photo thumbnail or the category illustration, plus a category badge
      expect(await c.locator('[data-testid="dish-thumb-photo"], [data-testid="item-art"]').count()).toBeGreaterThan(0);
      await expect(c.getByTestId("category-badge")).toBeVisible();
    }
    for (const chip of await page.getByTestId("item-categories").locator("button").all()) await expect(chip.getByTestId("item-art")).toBeAttached();
    // no broken image elements
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src));
    expect(broken).toEqual([]);
    // item page: hero photo or labelled illustration
    await cards.first().click();
    await expect(page.locator('[data-testid="item-photo"], [data-testid="item-illustration"]')).toBeVisible();
  });
}

test("Sport: Pickleball and Pilates have distinct icons in Settings, markers and catalogue", async ({ page }) => {
  await page.goto("/settings/");
  const pilots = page.getByTestId("pilots-sport").getByTestId("item-art");
  await expect(pilots).toHaveCount(2);
  expect(await pilots.evaluateAll((els) => els.map((e) => e.getAttribute("data-art")))).toEqual(["sport:pickleball", "sport:pilates"]);
  await page.goto("/sport/");
  await expect(page.getByTestId("hcmc-map")).toBeVisible();
  await expect.poll(() => page.getByTestId("venue-marker-art").count()).toBeGreaterThan(0);
  const arts = await page.getByTestId("establishment-card").getByTestId("item-art").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-art")))].sort());
  expect(arts).toEqual(["sport:pickleball", "sport:pilates"]);
});

test("venue cards never show the bare pin icon when an illustration exists; reference photos are labelled", async ({ page }) => {
  await stubCommons(page);
  for (const [id, item] of [["spa", "goi-dau-duong-sinh"], ["sport", "reformer-pilates"], ["bars", "craft-beer"]] as const) {
    await page.goto(`/${id}/item/?id=${item}`);
    const rows = page.getByTestId("section-offerings").getByTestId("venue-row");
    await expect(rows.first()).toBeVisible();
    for (const r of await rows.all()) {
      const kind = await r.getByTestId("venue-thumb").getAttribute("data-kind");
      expect(["illustration", "generic-dish", "venue-specific", "menu-photo", "delivery-listing"]).toContain(kind);
      if (kind === "generic-dish") await expect(r.getByTestId("venue-photo-credit")).toContainText("not from this venue");
    }
  }
});
