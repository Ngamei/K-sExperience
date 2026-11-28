import { expect, test } from "@playwright/test";
import { enableSamples, stubCommonsPhotos } from "./helpers";

test("Vietnamese localisation", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByTestId("locale-vi").click();
  await page.goto("/discover/");
  await expect(page.getByTestId("tagline")).toHaveText("Khám phá Việt Nam. Trải nghiệm tại Sài Gòn.");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
});

test("header language switch shows the active language", async ({ page }) => {
  await page.goto("/discover/");
  await expect(page.getByTestId("lang-en")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("lang-en")).toHaveText("EN");
  await page.getByTestId("lang-vi").click();
  await expect(page.getByTestId("lang-vi")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("tagline")).toHaveText("Khám phá Việt Nam. Trải nghiệm tại Sài Gòn.");
  await page.getByTestId("lang-en").click();
  await expect(page.getByTestId("tagline")).toHaveText("Explore Vietnam. Experience it in Sài Gòn.");
});

test("a dish with researched venues lists at least 5, each with a Google Maps link", async ({ page }) => {
  await page.goto("/dishes/mi-quang/");
  const rows = page.getByTestId("hcmc-block").getByTestId("venue-row");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(5);
  for (const r of await rows.all()) await expect(r.getByTestId("google-maps-link")).toHaveAttribute("href", /google\.com\/maps\/search/);
});

test("every dish offers a Google Maps search for HCMC, even without listed venues", async ({ page }) => {
  await page.goto("/dishes/thang-co/");
  await expect(page.getByTestId("none-found")).toBeVisible();
  await expect(page.getByTestId("google-maps-search")).toHaveAttribute("href", /query=Th%E1%BA%AFng%20c%E1%BB%91%2C%20H%E1%BB%93%20Ch%C3%AD%20Minh/);
});

test("dish page: copy dish name and browse more dishes from its origin province", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/dishes/bun-bo-hue/");
  await page.getByTestId("copy-dish-name").click();
  await expect(page.getByTestId("copy-dish-name")).toContainText("Copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Bún bò Huế");
  await page.getByTestId("more-from-origin").click();
  await expect(page).toHaveURL(/\/catalogue\/$/);
  await expect(page.getByTestId("active-chip").filter({ hasText: "Thừa Thiên Huế" }).first()).toBeAttached();
  const cards = page.getByTestId("catalogue-results").getByTestId("dish-card");
  expect(await cards.count()).toBeGreaterThan(5);
});

test("home page is the culinary map; Discover moved to /discover", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("vietnam-map")).toBeVisible();
  await page.goto("/discover/");
  await expect(page.getByTestId("tagline")).toBeVisible();
  await page.getByTestId("cta-explore").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("vietnam-map")).toBeVisible();
});

test("Surprise me recommends a dish", async ({ page }) => {
  await page.goto("/discover/");
  await page.getByTestId("surprise-me").click();
  await expect(page.getByTestId("surprise-result")).toContainText(/View dish/);
});

test("Nearby: real researched venues, samples only when enabled", async ({ page }) => {
  await page.goto("/nearby/");
  const cards = page.getByTestId("venue-card");
  await expect(cards.first()).toBeVisible();
  const realCount = await cards.count();
  expect(realCount).toBeGreaterThanOrEqual(5);
  await expect(page.getByTestId("sample-badge")).toHaveCount(0);
  await expect(page.getByTestId("venue-list")).toContainText("Phở Hòa Pasteur");
  await enableSamples(page);
  await page.goto("/nearby/");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBe(realCount + 8);
  expect(await page.getByTestId("sample-badge").count()).toBe(8);
});

test("dish page lists real HCMC venues with Google Maps links and a licensed photo", async ({ page }) => {
  await stubCommonsPhotos(page);
  await page.goto("/dishes/com-tam-sai-gon/");
  const photo = page.getByTestId("dish-photo").filter({ visible: true });
  await expect(photo).toBeVisible();
  await expect(photo).toContainText("Wikimedia Commons");
  await expect(photo).toContainText("CC BY-SA 4.0");
  const row = page.getByTestId("venue-row").filter({ hasText: "Cơm Tấm Ba Ghiền" });
  await expect(row).toBeVisible();
  await expect(row).toContainText("84 Đặng Văn Ngữ");
  await expect(row).toContainText("Michelin");
  await expect(row.getByTestId("availability-status")).toHaveAttribute("data-status", "source-listed");
  await expect(row.getByTestId("last-checked")).toContainText("Last checked 2026-11-27");
  await expect(row.getByTestId("google-maps-link")).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=C%C6%A1m%20T%E1%BA%A5m%20Ba%20Ghi%E1%BB%81n/);
  await expect(page.getByTestId("google-maps-search")).toHaveAttribute("href", /maps\/search\/\?api=1&query=C%C6%A1m%20t%E1%BA%A5m%20S%C3%A0i%20G%C3%B2n%2C%20H%E1%BB%93%20Ch%C3%AD%20Minh/);
  await row.getByRole("link", { name: "Cơm Tấm Ba Ghiền" }).click();
  await expect(page.getByTestId("place-detail")).toBeVisible();
  await expect(page.getByTestId("approx-location")).toBeVisible();
  await expect(page.getByTestId("place-sources")).toContainText("MICHELIN Guide");
});

test("Admin import validator rejects bad rows and accepts good ones", async ({ page }) => {
  await page.goto("/admin/");
  await page.getByTestId("admin-section-research").click();
  await page.getByTestId("import-text").fill(JSON.stringify([
    { nameVi: "Phở bò Nam Định", nameEn: "Nam Dinh pho", category: "Món mặn", dishType: "noodle-soup", origins: "Nam Định" },
    { nameVi: "Món lạ", nameEn: "Unknown", category: "drinks", dishType: "noodle-soup", origins: "Atlantis" },
  ]));
  await page.getByTestId("import-validate").click();
  const r = page.getByTestId("import-result");
  await expect(r).toContainText("1 valid");
  await expect(r).toContainText("Unknown category");
  await expect(page.getByTestId("import-preview")).toContainText("1 matched · 0 new");
});

test.describe("Admin CMS (local mode)", () => {
  test("Review lists the four provinces without dishes", async ({ page }) => {
    await page.goto("/admin/");
    await expect(page.getByTestId("admin-auth")).toContainText("Local mode");
    await page.getByTestId("admin-section-quality").click();
    const review = page.getByTestId("admin-review");
    for (const p of ["Thái Nguyên", "Đắk Nông", "Đồng Nai", "Hậu Giang"]) await expect(review).toContainText(p);
  });

  test("dish editor validates and downloads a valid record", async ({ page }) => {
    await page.goto("/admin/");
    await page.getByTestId("admin-section-catalogue").click();
    await page.getByTestId("dish-editor-select").selectOption("mi-quang");
    await expect(page.getByTestId("dish-nameVi")).toHaveValue("Mì Quảng");
    await page.getByTestId("dish-nameEn").fill("");
    await expect(page.getByTestId("form-issues")).toContainText("nameEn");
    await expect(page.getByTestId("admin-save")).toBeDisabled();
    await page.getByTestId("dish-nameEn").fill("Quảng-style turmeric noodles");
    await expect(page.getByTestId("form-issues")).toHaveCount(0);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("admin-save").click()]);
    expect(download.suggestedFilename()).toBe("dish-mi-quang.json");
  });

  test("establishment editor enforces sources and the HCMC boundary", async ({ page }) => {
    await page.goto("/admin/");
    await page.getByTestId("admin-section-business").click();
    await page.getByTestId("new-restaurant").click();
    await page.getByTestId("restaurant-name").fill("Test Quán");
    await page.getByTestId("restaurant-address").fill("1 Hàng Bông");
    await page.getByTestId("restaurant-lon").fill("105.85");
    await page.getByTestId("restaurant-lat").fill("21.03");
    const issues = page.getByTestId("form-issues");
    await expect(issues).toContainText("outside Ho Chi Minh City");
    await expect(issues).toContainText("at least one source");
    await page.getByTestId("restaurant-lon").fill("106.7");
    await page.getByTestId("restaurant-lat").fill("10.776");
    await page.getByTestId("restaurant-sources").fill("Test guide | https://example.org/guide");
    await expect(issues).toContainText("neighbourhood");
    await page.getByTestId("restaurant-neighbourhood").fill("Phường Bến Thành");
    await expect(issues).toHaveCount(0);
  });

  test("evidence editor only offers evidence types that can justify the chosen level", async ({ page }) => {
    await page.goto("/admin/");
    await page.getByTestId("admin-section-menus").click();
    await page.getByTestId("evidence-status").selectOption("menu-confirmed");
    const types = await page.getByTestId("evidence-type").locator("option").allTextContents();
    expect(types).toEqual(["official-menu", "delivery-listing", "menu-photo"]);
    await page.getByTestId("evidence-status").selectOption("source-listed");
    expect(await page.getByTestId("evidence-type").locator("option").allTextContents()).toEqual(["published-source"]);
  });
});

test("all primary screens render without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["/", "/discover/", "/explore/", "/catalogue/", "/dishes/pho-bo-ha-noi/", "/nearby/", "/places/sample-venue-01/", "/places/pho-hoa-pasteur/", "/saved/", "/passport/", "/settings/", "/admin/"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
  expect(errors).toEqual([]);
});
