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
async function logout(page: Page) {
  await page.goto("/profile/");
  await page.getByTestId("logout").click();
  await expect(page).toHaveURL(/localhost:3500\/$/); // sign-out finished
}
const triedCount = async (page: Page) => Number((await page.getByTestId("passport-tried").textContent())!.split("/")[0]);

test.beforeEach(async () => { await fetch(`${MOCK}/__fail?on=0`); });

const openPassportFromNav = async (page: Page, isMobile: boolean) =>
  (isMobile ? page.getByTestId("tab-passport") : page.getByTestId("nav-passport")).click();
const gate = (page: Page) => page.getByTestId("auth-dialog");

test("guests browse freely; Passport asks to sign in and cancelling returns to where they were", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByTestId("vietnam-map")).toBeVisible();
  await expect(page.getByRole("banner").getByTestId("account-login")).toHaveCount(0); // no auth buttons in the header
  await tryDish(page, "mi-quang");
  await page.goto("/catalogue/");
  await expect(page.getByTestId("result-count").filter({ visible: true }).first()).toHaveText("138 dishes");
  await openPassportFromNav(page, isMobile);
  await expect(gate(page)).toBeVisible();
  await expect(gate(page).getByTestId("google-login")).toBeVisible();
  await expect(page.getByTestId("passport-tried")).toHaveCount(0); // nothing personal behind the gate
  await gate(page).getByTestId("auth-dialog-close").click();
  await expect(page).toHaveURL(/\/catalogue\/$/);
});

test("signing in from the Passport gate opens the requested Passport with guest progress migrated", async ({ page }) => {
  const email = unique("gate");
  await signup(page, email);
  await logout(page);
  await tryDish(page, "mi-quang"); // guest progress
  await page.goto("/passport/"); // direct URL is protected too
  await expect(gate(page)).toBeVisible();
  // switch between modes without leaving the dialog
  await gate(page).getByTestId("auth-to-signup").click();
  await expect(gate(page).getByTestId("auth-panel")).toHaveAttribute("data-mode", "signup");
  await gate(page).getByTestId("auth-to-login").click();
  await gate(page).getByTestId("auth-to-forgot").click();
  await expect(gate(page).getByTestId("forgot-submit")).toBeVisible();
  await gate(page).getByTestId("auth-to-login").click();
  await gate(page).getByTestId("login-email").fill(email);
  await gate(page).getByTestId("login-password").fill("correct-horse-1");
  await gate(page).getByTestId("login-submit").click();
  await expect(gate(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/passport\/$/);
  await expect(page.getByTestId("passport-account")).toBeVisible();
  await expect.poll(() => triedCount(page)).toBe(1);
  await expect.poll(async () => (await historyOf(email)).filter((r) => r.item_id === "mi-quang").length).toBe(1);
  // signed in: Passport opens directly, no repeated prompt
  await page.goto("/catalogue/");
  await page.goto("/passport/");
  await expect(page.getByTestId("passport-account")).toBeVisible();
  await expect(gate(page)).toHaveCount(0);
});

test("an expired session falls back to the sign-in prompt without showing personal data", async ({ page }) => {
  await signup(page, unique("expire"));
  await tryDish(page, "bun-bo-hue");
  await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("sb-")).forEach((k) => localStorage.removeItem(k)));
  await page.goto("/passport/");
  await expect(gate(page)).toBeVisible();
  await expect(page.getByTestId("passport-tried")).toHaveCount(0);
});

test("Settings shows Account first: sign in / sign up for guests, profile and log out when signed in", async ({ page }) => {
  await page.goto("/settings/");
  await expect(page.getByTestId("experience-mode")).toBeVisible();
  const sections = await page.locator("[data-testid=account-section], [data-testid=experience-mode]").evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
  expect(sections).toEqual(["account-section", "experience-mode"]);
  await expect(page.getByTestId("account-guest")).toContainText("synced across your devices");
  await page.getByTestId("account-signup").click();
  await expect(gate(page).getByTestId("auth-panel")).toHaveAttribute("data-mode", "signup");
  const email = unique("settings");
  await gate(page).getByTestId("signup-email").fill(email);
  await gate(page).getByTestId("signup-password").fill("correct-horse-1");
  await gate(page).getByTestId("signup-submit").click();
  await expect(page).toHaveURL(/\/settings\/$/);
  await expect(page.getByTestId("account-email")).toHaveText(email);
  await expect(page.getByTestId("account-avatar")).toBeVisible();
  await expect(page.getByTestId("account-profile-link")).toBeVisible();
  await page.getByTestId("account-logout").click();
  await expect(page.getByTestId("account-guest")).toBeVisible();
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
  await logout(page);
  await page.goto("/passport/");
  await expect(gate(page)).toBeVisible();
  await expect(page.getByTestId("passport-tried")).toHaveCount(0);

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
  await logout(page);
  await signup(page, b);
  expect(await triedCount(page)).toBe(0);
  await expect(page.getByTestId("passport-account")).toContainText(/bob/);
});

test("wrong password is rejected with a message", async ({ page }) => {
  const email = unique("wrong");
  await signup(page, email);
  await logout(page);
  await page.goto("/login/");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill("not-the-password");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("auth-message")).toContainText("don't match");
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
  await logout(page);
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
  await expect(gate(page)).toBeVisible();
  await expect(page.getByTestId("passport-tried")).toHaveCount(0);
  const state = await db();
  expect(state.users.some((u) => u.id === uid)).toBe(false);
  expect(state.experience_history.some((r) => r.user_id === uid)).toBe(false);
});
