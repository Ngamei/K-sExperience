/**
 * KEX-BIZ-04 — "Report incorrect information" in Supabase mode, against the mock (mock-supabase.mjs emulates the
 * 0017 rules; the real RLS/storage policies are tested in PostgreSQL by `npm run test:db`).
 * Guests and customers file reports; only staff see and triage them; a report never changes the listing.
 */
import { expect, test, type Page } from "@playwright/test";

const MOCK = process.env.MOCK_SUPABASE_URL ?? "http://localhost:54321"; // must match the build's NEXT_PUBLIC_SUPABASE_URL
type Report = { id: string; establishment_id: string; experience: string; category: string; details: string; status: string; reporter_id: string | null; contact_email: string | null; evidence_url: string | null; evidence_photo_path: string | null; reviewed_by: string | null; resolution_note: string | null };
const reports = async (): Promise<Report[]> => (await (await fetch(`${MOCK}/__reports`)).json()).reports;
const objects = async (): Promise<string[]> => (await (await fetch(`${MOCK}/__reports`)).json()).objects;
const users = async (): Promise<{ id: string; email: string }[]> => (await (await fetch(`${MOCK}/__db`)).json()).users;
const unique = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
const tag = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "base64");

async function signup(page: Page, email: string) {
  await page.goto("/signup/");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill("correct-horse-1");
  await page.getByTestId("signup-submit").click();
  await expect(page).toHaveURL(/\/passport\/$/);
  await expect(page.getByTestId("migration-running")).toHaveCount(0);
}
async function fileReport(page: Page, url: string, category: string, details: string, extra?: (page: Page) => Promise<void>) {
  await page.goto(url);
  await page.getByTestId("action-report").click();
  await expect(page.getByTestId("report-dialog")).toHaveAttribute("data-mode", "supabase");
  await expect(page.getByTestId("report-copy")).toHaveCount(0);
  await expect(page.getByTestId("report-notice")).toContainText("does not change the listing directly");
  await page.getByTestId(`report-category-${category}`).click();
  await page.getByTestId("report-details").fill(details);
  await extra?.(page);
  await page.getByTestId("report-submit").click();
  await expect(page.getByTestId("report-success")).toHaveText("Thanks — our team will review it. Your report does not change the listing directly.");
}

test.beforeEach(async () => { await fetch(`${MOCK}/__fail?on=0`); });

test("guest reports a Food place without a photo; the report is new, unattributed and the listing unchanged", async ({ page }) => {
  const t = tag();
  await page.goto("/places/pho-hoa-pasteur/");
  const address = (await page.getByTestId("fact-address").textContent())!;
  await fileReport(page, "/places/pho-hoa-pasteur/", "incorrect-hours", `Closes at 21:00 now (${t})`, async (p) => {
    await expect(p.getByTestId("report-photo-field")).toHaveAttribute("data-enabled", "false");
    await expect(p.getByTestId("report-photo-unavailable")).toContainText("Sign in to attach a photograph");
    await p.getByTestId("report-evidence-url").fill("https://example.com/notice");
    await p.getByTestId("report-email").fill("guest@example.com");
  });
  const r = (await reports()).find((x) => x.details.includes(t))!;
  expect(r).toMatchObject({ establishment_id: "pho-hoa-pasteur", experience: "food", category: "incorrect-hours", status: "new", reporter_id: null, contact_email: "guest@example.com", evidence_url: "https://example.com/notice", evidence_photo_path: null, reviewed_by: null });
  await page.getByTestId("report-done").click();
  await expect(page.getByTestId("fact-address")).toHaveText(address);
});

test("a failed submission is never shown as sent", async ({ page }) => {
  await fetch(`${MOCK}/__fail?on=1`);
  await page.goto("/places/pho-hoa-pasteur/");
  await page.getByTestId("action-report").click();
  await page.getByTestId("report-category-other").click();
  await page.getByTestId("report-details").fill("This should fail to send.");
  await page.getByTestId("report-submit").click();
  await expect(page.getByTestId("report-error")).toContainText("could not be sent");
  await expect(page.getByTestId("report-success")).toHaveCount(0);
});

test("a forged report (resolved / reviewer set / someone else's id) is refused", async ({ page }) => {
  await page.goto("/places/pho-hoa-pasteur/");
  const statuses = await page.evaluate(async (mock) => {
    const post = (row: Record<string, unknown>) => fetch(`${mock}/rest/v1/info_reports`, { method: "POST", headers: { apikey: "mock-anon-key", "Content-Type": "application/json" }, body: JSON.stringify({ establishment_id: "pho-hoa-pasteur", experience: "food", category: "other", details: "forged report", ...row }) }).then((r) => r.status);
    return [await post({ status: "resolved" }), await post({ reviewed_by: "00000000-0000-0000-0000-000000000001" }), await post({ reporter_id: "00000000-0000-0000-0000-000000000001" })];
  }, MOCK);
  expect(statuses).toEqual([403, 403, 403]);
  expect((await reports()).some((r) => r.details === "forged report")).toBe(false);
});

test("signed-in customer reports a Sport venue with a photo; staff triage it in Admin → Customer Reports", async ({ page, browser }) => {
  const t = tag();
  const email = unique("reporter");
  await signup(page, email);
  const uid = (await users()).find((u) => u.email === email)!.id;
  await fileReport(page, "/sport/nearby/?id=pickoland-thao-dien", "incorrect-photo", `Header photo is another venue (${t})`, async (p) => {
    await expect(p.getByTestId("report-photo-field")).toHaveAttribute("data-enabled", "true");
    await p.getByTestId("report-photo").setInputFiles({ name: "evidence.png", mimeType: "image/png", buffer: PNG });
  });
  const r = (await reports()).find((x) => x.details.includes(t))!;
  expect(r).toMatchObject({ establishment_id: "pickoland-thao-dien", experience: "sport", status: "new", reporter_id: uid });
  expect(r.evidence_photo_path).toBe(`${uid}/${r.id}.png`);
  expect(await objects()).toContain(r.evidence_photo_path);

  // The customer is not staff: Admin stays closed.
  await page.goto("/admin/#reports");
  await expect(page.getByTestId("admin-locked")).toHaveAttribute("data-state", "not-editor");
  await expect(page.getByTestId("admin-reports")).toHaveCount(0);

  // A Data Reviewer opens the queue, filters, views the private photo (signed URL) and resolves the report.
  const staff = await browser.newContext();
  const sp = await staff.newPage();
  const reviewer = unique("reviewer");
  await signup(sp, reviewer);
  await fetch(`${MOCK}/__role?email=${encodeURIComponent(reviewer)}&role=reviewer`);
  await sp.goto("/admin/#reports");
  await expect(sp.getByTestId("admin")).toHaveAttribute("data-section", "reports");
  await expect(sp.getByTestId("admin-role")).toContainText("Data Reviewer");
  await sp.getByTestId("reports-filter-status").selectOption("all");
  await sp.getByTestId("reports-filter-category").selectOption("incorrect-photo");
  const row = sp.locator(`[data-testid=report-row][data-report="${r.id}"]`);
  await expect(row).toHaveAttribute("data-status", "new");
  await expect(row.getByTestId("report-row-business")).toHaveAttribute("href", "/sport/nearby/?id=pickoland-thao-dien");
  await sp.getByTestId("reports-filter-category").selectOption("incorrect-price");
  await expect(row).toHaveCount(0);
  await sp.getByTestId("reports-filter-category").selectOption("all");
  await row.getByTestId("report-view-photo").click();
  await expect(row.getByTestId("report-photo-link")).toHaveAttribute("href", new RegExp(`/storage/v1/object/sign/report-evidence/${uid}/`));
  expect(await row.getByTestId("report-photo-img").evaluate((i: HTMLImageElement) => new Promise((ok) => (i.complete ? ok(i.naturalWidth) : (i.onload = () => ok(i.naturalWidth)))))).toBeGreaterThan(0);
  await row.getByTestId("report-status-select").selectOption("resolved");
  await row.getByTestId("report-note").fill("Photo replaced after checking the venue page.");
  await row.getByTestId("report-save").click();
  await expect(row.getByTestId("report-message")).toHaveText("Saved ✓");
  await expect.poll(async () => (await reports()).find((x) => x.id === r.id)?.status).toBe("resolved");
  const done = (await reports()).find((x) => x.id === r.id)!;
  expect(done.resolution_note).toBe("Photo replaced after checking the venue page.");
  expect(done.reviewed_by).toBe((await users()).find((u) => u.email === reviewer)!.id);
  // default filter is "new": the resolved report leaves the queue
  await sp.reload();
  await expect(sp.getByTestId("reports-filter-status")).toHaveValue("new");
  await expect(sp.locator(`[data-testid=report-row][data-report="${r.id}"]`)).toHaveCount(0);
  await staff.close();
});
