/**
 * KEX-SEC-02 / KEX-SET-01 — customer Settings vs Admin Portal, membership tiers vs staff roles, and
 * Privacy & Data — against the Supabase-mode build + mock Supabase (mock-supabase.mjs emulates the 0013 RLS rules;
 * the real policies are tested in PostgreSQL by `npm run test:db`).
 */
import { expect, test, type Page } from "@playwright/test";

const MOCK = "http://localhost:54321";
const mock = (path: string) => fetch(`${MOCK}${path}`).then((r) => r.json());
const unique = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
const ADMIN_UI = ["admin-nav", "admin-section-overview", "admin-kpis", "admin-modes", "admin-save", "admin-coverage", "admin-system", "admin-users", "admin-memberships"];
const INTERNAL_TEXT = ["Supabase", "Data mode", "Catalogue administration", "Items with places", "Provinces", "bundled data"];

async function signup(page: Page, email: string) {
  await page.goto("/signup/");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill("correct-horse-1");
  await page.getByTestId("signup-submit").click();
  await expect(page).toHaveURL(/\/passport\/$/);
  await expect(page.getByTestId("migration-running")).toHaveCount(0);
}
/** A customer's own REST write attempt with their session token (what a curious user could do from devtools). */
async function restWrite(page: Page, table: string, row: Record<string, unknown>) {
  return page.evaluate(async ({ table, row }) => {
    const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"))!;
    const token = JSON.parse(localStorage.getItem(key)!).access_token;
    const r = await fetch(`http://localhost:54321/rest/v1/${table}`, { method: "POST", headers: { apikey: "mock-anon-key", Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(row) });
    return r.status;
  }, { table, row });
}
const userId = async (email: string) => ((await mock("/__db")) as { users: { id: string; email: string }[] }).users.find((u) => u.email === email)!.id;

async function expectCustomerSettings(page: Page) {
  await page.goto("/settings/");
  await expect(page.getByTestId("account-section")).toBeVisible();
  for (const id of ["admin-link", "data-mode", "platform-summary", "toggle-samples"]) await expect(page.getByTestId(id)).toHaveCount(0);
  const text = await page.getByTestId("settings").innerText();
  for (const t of INTERNAL_TEXT) expect(text, t).not.toContain(t);
}
async function expectAdminDenied(page: Page, state: "guest" | "not-editor") {
  await page.goto("/admin/");
  await expect(page.getByTestId("admin-locked")).toHaveAttribute("data-state", state);
  await expect(page.getByTestId("admin-locked")).toContainText("Access denied");
  for (const id of ADMIN_UI) await expect(page.getByTestId(id)).toHaveCount(0);
  for (const section of ["#system", "#users", "#catalogue"]) { // direct deep links are denied too
    await page.goto(`/admin/${section}`);
    await expect(page.getByTestId("admin-locked")).toHaveAttribute("data-state", state);
    await expect(page.getByTestId("admin-nav")).toHaveCount(0);
  }
}

test.beforeEach(async () => { await fetch(`${MOCK}/__fail?on=0`); });

test("guest: customer Settings only, membership teaser, Admin denied", async ({ page }) => {
  await expectCustomerSettings(page);
  await expect(page.getByTestId("account-guest")).toContainText("Welcome to K's Experience");
  await expect(page.getByTestId("membership-card")).toContainText("Plans from $1.99/month");
  await expect(page.getByTestId("membership-tier")).toHaveCount(0);
  // 0016: the Founding Member section is shown by default; guests are asked to sign in (no claim button)
  await page.goto("/membership/");
  await expect(page.getByTestId("founding-sign-in")).toHaveText("Sign in to join");
  await expect(page.getByTestId("founding-join")).toHaveCount(0);
  await expect(page.getByTestId("founding-places-left")).toHaveText(/^\d+ of 100 places left$/); // a count only
  await expect(page.getByTestId("usage-menu-unlocks")).toHaveCount(0);
  await expectAdminDenied(page, "guest");
});

test("member without a membership row: K's Plus by default (development), cannot self-assign Premium or a staff role, Admin denied", async ({ page }) => {
  const email = unique("member");
  await signup(page, email);
  await expectCustomerSettings(page);
  await expect(page.getByTestId("membership-tier")).toHaveText("K's Plus");
  const uid = await userId(email);
  expect(await restWrite(page, "user_memberships", { user_id: uid, tier: "premium" })).toBe(403);
  expect(await restWrite(page, "user_roles", { user_id: uid, role: "admin" })).toBe(403);
  await page.reload();
  await expect(page.getByTestId("membership-tier")).toHaveText("K's Plus");
  // 0016: complete menu unlocks meter (RPC menu_unlock_usage) at the Plus quota; no trial wording
  await page.goto("/membership/");
  await expect(page.getByTestId("membership-plan-plus")).toHaveAttribute("data-current", "true");
  await expect(page.getByTestId("usage-menu-unlocks-count")).toHaveText("0 / 30");
  await expect(page.getByTestId("membership-usage")).not.toContainText(/trial/i);
  await expectAdminDenied(page, "not-editor");
});

test("Free customer (explicit grant): Free quotas shown", async ({ page }) => {
  const email = unique("free");
  await signup(page, email);
  await mock(`/__membership?email=${encodeURIComponent(email)}&tier=free`);
  await page.goto("/membership/");
  await expect(page.getByTestId("membership-tier")).toHaveText("K's Free");
  await expect(page.getByTestId("usage-menu-unlocks-count")).toHaveText("0 / 5");
});

test("Founding Member: a signed-in member claims a place once; Premium for 90 days, no automatic charge", async ({ page }) => {
  await signup(page, unique("founding"));
  await page.goto("/membership/");
  const section = page.getByTestId("founding-programme");
  await expect(section).toContainText("K's Founding Member");
  await expect(section).toContainText("Early access programme");
  await expect(section).toContainText("Explore everything. Help us make it better.");
  await expect(page.getByTestId("founding-no-charge")).toContainText("No automatic charge afterwards");
  for (const b of ["unlimitedSaved", "allMenuPrices", "nutrition", "earlyAccess", "feedbackChannel"]) await expect(page.getByTestId(`founding-benefit-${b}`)).toBeVisible();
  await expect(page.getByTestId("founding-places-left")).toHaveText(/^\d+ of 100 places left$/);
  const before = Number((await page.getByTestId("founding-places-left").textContent())!.split(" ")[0]);
  await page.getByTestId("founding-join").click();
  await expect(page.getByTestId("founding-joined")).toContainText("You are a K's Founding Member until");
  await expect(page.getByTestId("membership-tier")).toHaveText("K's Premium");
  await expect(page.getByTestId("founding-places-left")).toHaveText(`${before - 1} of 100 places left`);
  await page.reload();
  await expect(page.getByTestId("membership-tier")).toHaveText("K's Premium");
  await page.getByTestId("founding-join").click(); // a second claim is refused, and says why
  await expect(page.getByTestId("founding-error")).toHaveAttribute("data-reason", "already_claimed");
  await expect(page.getByTestId("founding-error")).toContainText("already joined");
});


for (const tier of ["plus", "premium"] as const) {
  test(`${tier} customer (test entitlement): plan shown, still no administrative access`, async ({ page }) => {
    const email = unique(tier);
    await signup(page, email);
    await mock(`/__membership?email=${encodeURIComponent(email)}&tier=${tier}`);
    await page.reload(); // membership is read on sign-in / page load
    await expectCustomerSettings(page);
    const name = tier === "plus" ? "K's Plus" : "K's Premium";
    await expect(page.getByTestId("membership-tier")).toHaveText(name);
    await page.goto("/membership/");
    await expect(page.getByTestId(`membership-plan-${tier}`)).toHaveAttribute("data-current", "true");
    await expect(page.getByTestId("membership-not-on-sale")).toContainText("no payment is taken");
    await expect(page.getByTestId("usage-menu-unlocks-count")).toHaveText(tier === "plus" ? "0 / 30" : "0 / Unlimited");
    await expectAdminDenied(page, "not-editor");
    expect(await restWrite(page, "user_roles", { user_id: await userId(email), role: "editor" })).toBe(403);
  });
}

test("reviewer staff: read-only Admin Portal (no database saving, no membership management)", async ({ page }) => {
  const email = unique("reviewer");
  await signup(page, email);
  await mock(`/__role?email=${encodeURIComponent(email)}&role=reviewer`);
  await page.goto("/admin/");
  await expect(page.getByTestId("admin-role")).toContainText("Data Reviewer · read-only");
  await page.getByTestId("admin-section-catalogue").click();
  await page.getByTestId("dish-editor-select").selectOption("mi-quang");
  await expect(page.getByTestId("admin-save")).toHaveText("Download validated JSON");
  await page.getByTestId("admin-section-users").click();
  await expect(page.getByTestId("admin-users-restricted")).toBeVisible();
  await expect(page.getByTestId("admin-memberships")).toHaveCount(0);
  await expectCustomerSettings(page); // staff never see admin tools inside customer Settings either
});

test("admin: full portal, grants a test entitlement that the customer then sees", async ({ page, browser }) => {
  const customer = unique("cust");
  const other = await browser.newContext();
  const cpage = await other.newPage();
  await signup(cpage, customer);
  const adminEmail = unique("admin");
  await signup(page, adminEmail);
  await mock(`/__role?email=${encodeURIComponent(adminEmail)}&role=admin`);
  await page.goto("/admin/");
  await expect(page.getByTestId("admin-role")).toContainText("Admin · editor");
  for (const s of ["overview", "business", "catalogue", "menus", "nutrition", "research", "quality", "users", "billing", "system", "audit"]) {
    await page.getByTestId(`admin-section-${s}`).click();
    await expect(page.getByTestId("admin")).toHaveAttribute("data-section", s);
  }
  await page.getByTestId("admin-section-system").click();
  await expect(page.getByTestId("system-data-mode")).toContainText("Supabase");
  await page.getByTestId("admin-section-users").click();
  await page.getByTestId("membership-user").fill(await userId(customer));
  await page.getByTestId("membership-tier-select").selectOption("premium");
  await page.getByTestId("membership-grant").click();
  await expect(page.getByTestId("membership-message")).toHaveText("Saved ✓");
  await cpage.goto("/settings/");
  await expect(cpage.getByTestId("membership-tier")).toHaveText("K's Premium");
  await expectAdminDenied(cpage, "not-editor"); // Premium ≠ admin
  await other.close();
});

test("Privacy & Data: clearing this device never deletes the account's Passport", async ({ page }) => {
  const email = unique("clear");
  await signup(page, email);
  await page.goto("/dishes/pho-bo-ha-noi/");
  await page.getByTestId("tried-dish").click();
  await expect(page.getByTestId("tried-dish")).toHaveAttribute("aria-pressed", "true");
  const uid = await userId(email);
  const rows = async () => ((await mock("/__db")) as { experience_history: { user_id: string; item_id: string }[] }).experience_history.filter((r) => r.user_id === uid).map((r) => r.item_id);
  await expect.poll(rows).toEqual(["pho-bo-ha-noi"]);
  await page.goto("/settings/privacy/");
  await expect(page.getByTestId("privacy-storage-mode")).toHaveAttribute("data-mode", "account");
  await page.getByTestId("clear-device").click();
  await page.getByTestId("clear-device-confirm").click();
  await expect(page.getByTestId("privacy-message")).toContainText("reloaded from your account");
  await page.waitForTimeout(1200); // longer than the 400 ms sync debounce: nothing may be deleted
  expect(await rows()).toEqual(["pho-bo-ha-noi"]);
  await page.goto("/dishes/pho-bo-ha-noi/");
  await expect(page.getByTestId("tried-dish")).toHaveAttribute("aria-pressed", "true"); // reloaded from the account
  await expect(page.getByTestId("privacy-delete-account")).toHaveCount(0);
  await page.goto("/settings/privacy/");
  await expect(page.getByTestId("privacy-delete-account").getByTestId("delete-account")).toBeDisabled();
});
