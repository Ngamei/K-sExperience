import { expect, test } from "@playwright/test";
import { enableSamples } from "./helpers";

test("Vietnamese localisation", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByTestId("locale-vi").click();
  await page.goto("/");
  await expect(page.getByTestId("tagline")).toHaveText("Khám phá Việt Nam. Trải nghiệm tại Sài Gòn.");
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
});

test("Surprise me recommends a dish", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("surprise-me").click();
  await expect(page.getByTestId("surprise-result")).toContainText(/View dish/);
});

test("Nearby: honest empty state, then labelled sample venues", async ({ page }) => {
  await page.goto("/nearby/");
  await expect(page.getByTestId("nearby-empty")).toBeVisible();
  await enableSamples(page);
  await page.goto("/nearby/");
  const cards = page.getByTestId("venue-card");
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBe(8);
  for (const c of await cards.all()) await expect(c.getByTestId("sample-badge")).toBeVisible();
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
  for (const path of ["/", "/explore/", "/catalogue/", "/dishes/pho-bo-ha-noi/", "/nearby/", "/places/sample-venue-01/", "/saved/", "/passport/", "/settings/", "/admin/"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
  expect(errors).toEqual([]);
});
