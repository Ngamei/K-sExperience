/**
 * P0 accounts & personal passport — runs against the Supabase-mode build + mock Supabase.
 * Covers: guest mode, signup with guest migration, login on a second device, merge without duplicates,
 * logout isolation, wrong password, password recovery/reset, admin separation, account deletion,
 * migration failure + retry.
 */
import { expect, test, type Page } from "@playwright/test";

const MOCK = "http://localhost:54321";
const mock = (path: string) => fetch(`${MOCK}${path}`).then((r) => r.json());
interface Row { user_id: string; item_id: string; rating?: number | null }
interface MockDb { users: { id: string; email: string }[]; experience_history: Row[]; saved_experiences: Row[]; tasting_notes: Row[] }
const db = (): Promise<MockDb> => mock("/__db");
/** Passport history rows of one user (the mock DB is shared across tests and devices). */
const historyOf = async (email: string) => {
  const d = await db();
  const uid = d.users.find((u) => u.email === email)?.id;
  return d.experience_history.filter((r) => r.user_id === uid);
};
const unique = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;

async function tryDish(page: Page, id: string) {
  await page.goto(`/dishes/${id}/`);
  await page.getByTestId("tried-dish").click();
  await expect(page.getByTestId("tried-dish")).toHaveAttribute("aria-pressed", "true");
}
async function saveDish(page: Page, id: string) {
  await page.goto(`/dishes/${id}/`);
  await page.getByTestId("save-dish").click();
  await expect(page.getByTestId("save-dish")).toHaveAttribute("aria-pressed", "true");
}
async function signup(page: Page, email: string, password = "correct-horse-1") {
  await page.goto("/signup/");
  await page.getByTestId("signup-name").fill("Test Explorer");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-submit").click();
  await expect(page).toHaveURL(/\/passport\/$/);
  await expect(page.getByTestId("passport-account")).toBeVisible();
  await expect(page.getByTestId("migration-running")).toHaveCount(0);
}
async function login(page: Page, email: string, password = "correct-horse-1") {
  await page.goto("/login/");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/\/passport\/$/);
  await expect(page.getByTestId("passport-account")).toBeVisible();
  await expect(page.getByTestId("migration-running")).toHaveCount(0);
}
const triedCount = async (page: Page) => Number((await page.getByTestId("passport-tried").textContent())!.split("/")[0]);

test.beforeEach(async () => { await fetch(`${MOCK}/__fail?on=0`); });

test("guests explore and build a temporary passport without an account", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("vietnam-map")).toBeVisible();
  await tryDish(page, "mi-quang");
  await page.goto("/passport/");
  await expect(page.getByTestId("passport-guest-cta")).toContainText("Make this passport yours");
  expect(await triedCount(page)).toBe(1);
});

test("signup keeps guest progress, persists it, and survives logout + login", async ({ page }) => {
  const email = unique("signup");
  await tryDish(page, "mi-quang");
  await tryDish(page, "bun-bo-hue");
  await saveDish(page, "com-tam-sai-gon");
  await page.goto("/dishes/mi-quang/");
  await page.getByTestId("rate-5").click();
  await signup(page, email);
  expect(await triedCount(page)).toBe(2);
  await expect(page.getByTestId("passport-notes")).toHaveText("1");
  await expect.poll(async () => (await historyOf(email)).length).toBe(2);
  const state = await db();
  const uid = state.users.find((u) => u.email === email)!.id;
  const mine = (t: Row[]) => t.filter((r) => r.user_id === uid);
  expect(mine(state.experience_history).map((r) => r.item_id).sort()).toEqual(["bun-bo-hue", "mi-quang"]);
  expect(mine(state.saved_experiences).map((r) => r.item_id)).toEqual(["com-tam-sai-gon"]);
  expect(mine(state.tasting_notes)[0]).toMatchObject({ item_id: "mi-quang", rating: 5 });

  // logout clears the device; nothing of this user remains visible
  await page.goto("/profile/");
  await page.getByTestId("logout").click();
  await page.goto("/passport/");
  await expect(page.getByTestId("passport-guest-cta")).toBeVisible();
  expect(await triedCount(page)).toBe(0);

  // login again → data comes back from the account
  await login(page, email);
  expect(await triedCount(page)).toBe(2);
});

test("passport syncs across devices and merges guest progress without duplicates", async ({ browser }) => {
  const email = unique("devices");
  const phone = await (await browser.newContext()).newPage();
  await tryDish(phone, "mi-quang");
  await signup(phone, email);
  await tryDish(phone, "cao-lau-hoi-an"); // synced change while signed in
  await expect.poll(async () => (await historyOf(email)).filter((r) => r.item_id === "cao-lau-hoi-an").length).toBe(1);

  // second device: guest progress overlaps (mi-quang) and adds new (banh-xeo)
  const laptop = await (await browser.newContext()).newPage();
  await tryDish(laptop, "mi-quang");
  await tryDish(laptop, "banh-xeo-nam-bo");
  await login(laptop, email);
  expect(await triedCount(laptop)).toBe(3);

  const state = await db();
  const uid = state.users.find((u) => u.email === email)!.id;
  const tried = state.experience_history.filter((r) => r.user_id === uid);
  expect(tried.map((r) => r.item_id).sort()).toEqual(["banh-xeo-nam-bo", "cao-lau-hoi-an", "mi-quang"]); // no duplicate mi-quang

  // first device sees the second device's progress after reloading
  await phone.goto("/passport/");
  await phone.reload();
  await expect.poll(() => triedCount(phone)).toBe(3);
});

test("accounts are isolated: user B never sees user A's passport on the same device", async ({ page }) => {
  const a = unique("alice"), b = unique("bob");
  await signup(page, a);
  await tryDish(page, "bun-cha-ha-noi");
  await expect.poll(async () => (await historyOf(a)).filter((r) => r.item_id === "bun-cha-ha-noi").length).toBe(1);
  await page.goto("/profile/");
  await page.getByTestId("logout").click();
  await signup(page, b);
  expect(await triedCount(page)).toBe(0);
  await expect(page.getByTestId("passport-account")).toContainText(/Test Explorer|bob/);
});

test("wrong password is rejected with a message", async ({ page }) => {
  const email = unique("wrong");
  await signup(page, email);
  await page.goto("/profile/");
  await page.getByTestId("logout").click();
  await page.goto("/login/");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("not-the-password");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("auth-message")).toContainText("Invalid login credentials");
});

test("password recovery and reset", async ({ page }) => {
  const email = unique("reset");
  await signup(page, email);
  await page.goto("/forgot-password/");
  await page.getByTestId("forgot-email").fill(email);
  await page.getByTestId("forgot-submit").click();
  await expect(page.getByTestId("auth-message")).toContainText("reset link");
  // the emailed link signs the user in on /reset-password/ — here the session already exists
  await page.goto("/reset-password/");
  await page.getByTestId("reset-password").fill("new-password-42");
  await page.getByTestId("reset-submit").click();
  await expect(page.getByTestId("auth-message")).toContainText("Password updated");
  await page.goto("/profile/");
  await page.getByTestId("logout").click();
  await login(page, email, "new-password-42");
});

test("ordinary users cannot use admin functions", async ({ page }) => {
  await signup(page, unique("plain"));
  await page.goto("/admin/");
  await expect(page.getByTestId("admin-auth")).toContainText("not an editor");
  await page.getByTestId("admin-tab-dishes").click();
  await page.getByTestId("dish-editor-select").selectOption("mi-quang");
  await expect(page.getByTestId("admin-save")).toHaveText("Download validated JSON");
});

test("guest progress is kept when migration fails, then migrates on retry", async ({ page }) => {
  const email = unique("retry");
  await tryDish(page, "pho-bo-ha-noi");
  await fetch(`${MOCK}/__fail?on=1`);
  await page.goto("/signup/");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill("correct-horse-1");
  await page.getByTestId("signup-submit").click();
  await expect(page.getByTestId("migration-failed")).toBeVisible();
  expect(await triedCount(page)).toBe(1); // nothing lost
  await fetch(`${MOCK}/__fail?on=0`);
  await page.getByTestId("migration-failed").getByRole("button").click();
  await expect(page.getByTestId("migration-failed")).toHaveCount(0);
  await expect.poll(async () => (await historyOf(email)).filter((r) => r.item_id === "pho-bo-ha-noi").length).toBe(1);
});

test("users can delete their account and all personal data", async ({ page }) => {
  const email = unique("delete");
  await signup(page, email);
  await tryDish(page, "hu-tieu-nam-vang");
  await expect.poll(async () => (await historyOf(email)).filter((r) => r.item_id === "hu-tieu-nam-vang").length).toBeGreaterThan(0);
  const uid = (await db()).users.find((u) => u.email === email)!.id;
  await page.goto("/profile/");
  await page.getByTestId("delete-confirm").fill("DELETE");
  await page.getByTestId("delete-account").click();
  await expect(page).toHaveURL(/localhost:3500\/$/);
  await expect.poll(async () => (await db()).users.some((u) => u.id === uid)).toBe(false);
  await page.goto("/passport/");
  await expect(page.getByTestId("passport-guest-cta")).toBeVisible();
  expect(await triedCount(page)).toBe(0);
  const state = await db();
  expect(state.users.some((u) => u.id === uid)).toBe(false);
  expect(state.experience_history.some((r) => r.user_id === uid)).toBe(false);
});
