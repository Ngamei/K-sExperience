import { expect, test, type Page } from "@playwright/test";

/**
 * KEX-BIZ-04 — "Report incorrect information" on every business profile, local build (no Supabase):
 * nothing can be sent, so the dialog says so and only offers "Copy report". Submission against Supabase is
 * covered by e2e-auth/info-reports.spec.ts; the database rules by `npm run test:db` (0017 section).
 */
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

async function openReport(page: Page, url: string, name: RegExp) {
  await page.goto(url);
  await page.getByTestId("action-report").click();
  const d = page.getByTestId("report-dialog");
  await expect(d).toBeVisible();
  await expect(d).toHaveAttribute("data-mode", "local");
  await expect(d.getByRole("heading", { name: "Report incorrect information" })).toBeVisible();
  await expect(d).toContainText("Help us keep K's Experience accurate.");
  await expect(page.getByTestId("report-target")).toContainText(name);
  return d;
}

async function expectLayout(page: Page) {
  const box = (await page.getByTestId("report-dialog").boundingBox())!;
  const vp = page.viewportSize()!;
  if (vp.width < 768) { // bottom sheet: full width, anchored to the bottom edge
    expect(Math.round(box.width)).toBe(vp.width);
    expect(Math.abs(box.y + box.height - vp.height)).toBeLessThanOrEqual(1);
  } else { // centred modal
    expect(box.width).toBeLessThanOrEqual(520);
    expect(Math.abs(box.x + box.width / 2 - vp.width / 2)).toBeLessThanOrEqual(2);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("Food place: report form validates, says it will not be sent, copies the report", async ({ page }) => {
  const d = await openReport(page, "/places/pho-hoa-pasteur/", /Phở Hòa Pasteur/);
  await expectLayout(page);
  await expect(page.getByTestId("report-local-notice")).toContainText("will not be sent");
  await expect(page.getByTestId("report-submit")).toHaveCount(0); // no "Send" in a build that cannot send
  await expect(page.getByTestId("report-photo-unavailable")).toBeVisible();
  for (const c of ["incorrect-address", "permanently-closed", "incorrect-hours", "incorrect-phone", "outdated-menu", "incorrect-price", "incorrect-photo", "missing-information", "other"]) {
    await expect(page.getByTestId(`report-category-${c}`)).toBeVisible();
  }
  // empty submit → errors, nothing copied
  await page.getByTestId("report-copy").click();
  await expect(page.getByTestId("report-error-category")).toBeVisible();
  await expect(page.getByTestId("report-error-details")).toBeVisible();
  await page.getByTestId("report-category-incorrect-hours").click();
  await page.getByTestId("report-details").fill("Now closes at 21:00 on weekdays.");
  await page.getByTestId("report-evidence-url").fill("not a url");
  await page.getByTestId("report-copy").click();
  await expect(page.getByTestId("report-error-evidenceUrl")).toBeVisible();
  await page.getByTestId("report-evidence-url").fill("https://example.com/notice");
  await page.getByTestId("report-email").fill("me@example.com");
  await page.getByTestId("report-copy").click();
  await expect(page.getByTestId("report-not-sent")).toContainText("not sent");
  await expect(d).not.toContainText("Thanks");
  const text = await page.getByTestId("report-copy-text").inputValue();
  expect(text).toContain("(NOT SENT)");
  expect(text).toContain("Business: Phở Hòa Pasteur (pho-hoa-pasteur · food)");
  expect(text).toContain("Category: Incorrect opening hours [incorrect-hours]");
  expect(text).toContain("Details: Now closes at 21:00 on weekdays.");
  expect(text).toContain("Supporting link: https://example.com/notice");
  if ((await page.getByTestId("report-copied").getAttribute("data-auto")) === "true") {
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);
  }
  await page.getByTestId("report-done").click();
  await expect(d).toHaveCount(0);
  // the listing itself is unchanged
  await expect(page.getByTestId("fact-address")).toBeVisible();
});

test("module establishment (Sport): same report form through the shared engine", async ({ page }) => {
  await openReport(page, "/sport/nearby/?id=pickoland-thao-dien", /Pickoland/i);
  await expectLayout(page);
  await page.getByTestId("report-category-incorrect-phone").click();
  await page.getByTestId("report-details").fill("The number belongs to another court.");
  await page.getByTestId("report-copy").click();
  const text = await page.getByTestId("report-copy-text").inputValue();
  expect(text).toContain("pickoland-thao-dien · sport");
  expect(text).toContain("[incorrect-phone]");
  await page.getByTestId("report-close").click();
  await expect(page.getByTestId("report-dialog")).toHaveCount(0);
});

test("Vietnamese report form", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByTestId("locale-vi").click();
  await page.goto("/places/pho-hoa-pasteur/");
  await expect(page.getByTestId("action-report")).toContainText("Báo thông tin chưa đúng");
  await page.getByTestId("action-report").click();
  const d = page.getByTestId("report-dialog");
  await expect(d).toContainText("Giúp K's Experience luôn chính xác.");
  await expect(page.getByTestId("report-category-permanently-closed")).toContainText("Cơ sở đã đóng cửa vĩnh viễn");
  await expect(page.getByTestId("report-copy")).toContainText("Sao chép báo cáo");
});

test("Admin (local mode): Customer Reports module explains that local builds send nothing", async ({ page }) => {
  await page.goto("/admin/#reports");
  await expect(page.getByTestId("admin")).toHaveAttribute("data-section", "reports");
  await expect(page.getByTestId("admin-reports-local")).toContainText("info_reports");
});
