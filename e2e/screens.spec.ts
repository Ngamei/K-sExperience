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

test("every dish offers a Google Maps search for HCMC, even without listed venues", async ({ page }) => {
  await page.goto("/dishes/thang-co/");
  await expect(page.getByTestId("none-found")).toBeVisible();
  await expect(page.getByTestId("google-maps-search")).toHaveAttribute("href", /query=Th%E1%BA%AFng%20c%E1%BB%91%2C%20H%E1%BB%93%20Ch%C3%AD%20Minh/);
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
  expect(await cards.count()).toBe(5);
  await expect(page.getByTestId("sample-badge")).toHaveCount(0);
  await expect(page.getByTestId("venue-list")).toContainText("Phở Hòa Pasteur");
  await enableSamples(page);
  await page.goto("/nearby/");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBe(13);
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
  await expect(row.getByTestId("availability-status")).toHaveAttribute("data-status", "unverified");
  await expect(row.getByTestId("google-maps-link")).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=C%C6%A1m%20T%E1%BA%A5m%20Ba%20Ghi%E1%BB%81n/);
  await expect(page.getByTestId("google-maps-search")).toHaveAttribute("href", /maps\/search\/\?api=1&query=C%C6%A1m%20t%E1%BA%A5m%20S%C3%A0i%20G%C3%B2n%2C%20H%E1%BB%93%20Ch%C3%AD%20Minh/);
  await row.getByRole("link", { name: "Cơm Tấm Ba Ghiền" }).click();
  await expect(page.getByTestId("place-detail")).toBeVisible();
  await expect(page.getByTestId("approx-location")).toBeVisible();
  await expect(page.getByTestId("place-sources")).toContainText("MICHELIN Guide");
});

test("Admin import validator rejects bad rows and accepts good ones", async ({ page }) => {
  await page.goto("/admin/");
  await page.getByTestId("import-text").fill(JSON.stringify([
    { nameVi: "Phở bò Nam Định", nameEn: "Nam Dinh pho", category: "Món mặn", dishType: "noodle-soup", origins: "Nam Định" },
    { nameVi: "Món lạ", nameEn: "Unknown", category: "drinks", dishType: "noodle-soup", origins: "Atlantis" },
  ]));
  await page.getByTestId("import-validate").click();
  const r = page.getByTestId("import-result");
  await expect(r).toContainText("1 valid");
  await expect(r).toContainText("Unknown category");
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
