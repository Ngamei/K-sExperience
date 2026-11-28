import { expect, test } from "@playwright/test";

/** KEX-SET-01 — customer Settings structure, Privacy & Data (guest), Membership, localisation; Admin Portal modules. */
test.describe("customer Settings", () => {
  test("sections in order; no infrastructure, admin or completeness diagnostics", async ({ page }) => {
    await page.goto("/settings/");
    await expect(page.getByTestId("help-information")).toBeVisible();
    const order = await page.locator("[data-testid=account-section], [data-testid=membership-card], [data-testid=your-experience], [data-testid=app-preferences], [data-testid=help-information]")
      .evaluateAll((els) => els.map((e) => e.getAttribute("data-testid")));
    expect(order).toEqual(["account-section", "membership-card", "your-experience", "app-preferences", "help-information"]);
    for (const id of ["admin-link", "data-mode", "platform-summary", "toggle-samples", "stat-food-items"]) await expect(page.getByTestId(id)).toHaveCount(0);
    const text = await page.getByTestId("settings").innerText();
    for (const t of ["Supabase", "Data mode", "Local mode", "Catalogue administration", "Items with places", "59/63", "Admin"]) expect(text, t).not.toContain(t);
    // Unbuilt features are labelled, not interactive.
    for (const id of ["settings-home-work", "settings-notifications", "settings-appearance", "settings-help", "settings-feedback", "settings-report", "settings-terms"]) {
      const row = page.getByTestId(id);
      await expect(row).toHaveAttribute("data-soon", "true");
      await expect(row).toContainText("Coming soon");
      await expect(row.locator("a, button")).toHaveCount(0);
    }
  });

  test("rows navigate to Passport, Saved, Preferences, Privacy, About and Membership", async ({ page }) => {
    for (const [id, url] of [["settings-passport", /\/passport\/$/], ["settings-saved", /\/saved\/$/], ["settings-preferences", /\/settings\/preferences\/$/], ["settings-privacy", /\/settings\/privacy\/$/], ["settings-about", /\/about\/$/], ["membership-card", /\/membership\/$/]] as const) {
      await page.goto("/settings/");
      await page.getByTestId(id).click();
      await expect(page).toHaveURL(url);
    }
    await expect(page.getByTestId("membership-plan-plus")).toContainText("$1.99");
    await expect(page.getByTestId("membership-plan-plus")).toContainText("$19.99");
    await expect(page.getByTestId("membership-plan-premium")).toContainText("$3.99");
    await expect(page.getByTestId("membership-plan-premium")).toContainText("$39.99");
    await expect(page.getByTestId("membership-not-on-sale")).toBeVisible();
    await expect(page.getByTestId("membership-yearly-plus")).toContainText("save 16.3%");
    await expect(page.getByTestId("membership-yearly-premium")).toContainText("save 16.5%");
    await expect(page.getByTestId("membership-plan-free")).toContainText("Free forever");
    await expect(page.getByTestId("benefit-free-favourites")).toHaveText("20 favourites per experience");
    await expect(page.getByTestId("benefit-plus-favourites")).toHaveText("150 favourites per experience");
    await expect(page.getByTestId("benefit-premium-favourites")).toHaveText("Unlimited favourites");
    // Unbuilt benefits are labelled "Coming", never shown as available.
    for (const id of ["free-menuViews", "plus-nutrition", "plus-advancedPrefs", "plus-menuViews", "premium-menuPrices", "premium-priceCompare"]) {
      await expect(page.getByTestId(`benefit-${id}`)).toHaveAttribute("data-available", "false");
      await expect(page.getByTestId(`benefit-${id}`)).toContainText("Coming");
    }
    await expect(page.getByTestId("membership-currency-note")).toContainText("US dollars");
    await expect(page.getByRole("button", { name: /subscribe|buy|checkout/i })).toHaveCount(0);
  });

  test("Vietnamese Settings", async ({ page }) => {
    await page.goto("/settings/");
    await page.getByTestId("locale-vi").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cài đặt");
    await expect(page.getByTestId("help-information")).toContainText("Quyền riêng tư & Dữ liệu");
    await expect(page.getByTestId("settings-notifications")).toContainText("Sắp ra mắt");
    await page.goto("/settings/privacy/");
    await expect(page.getByTestId("privacy-clear-device")).toContainText("Xóa dữ liệu trên thiết bị này");
    await page.goto("/membership/");
    await expect(page.getByTestId("membership-not-on-sale")).toContainText("không thu bất kỳ khoản phí nào");
    await expect(page.getByTestId("benefit-plus-nutrition")).toContainText("Calo & dinh dưỡng");
    await expect(page.getByTestId("membership-yearly-plus")).toContainText("tiết kiệm 16.3%");
  });
});

test.describe("Privacy & Data (guest)", () => {
  test("reset preferences keeps the Passport; clear device removes guest data after confirmation, language kept", async ({ page }) => {
    await page.goto("/dishes/pho-bo-ha-noi/");
    await page.getByTestId("save-dish").click();
    await expect(page.getByTestId("save-dish")).toHaveAttribute("aria-pressed", "true");
    await page.goto("/settings/preferences/");
    await page.getByTestId("pref-spice-1").click();
    await expect(page.getByTestId("pref-spice-1")).toHaveAttribute("aria-pressed", "true");

    await page.goto("/settings/privacy/");
    await expect(page.getByTestId("privacy-storage-mode")).toHaveAttribute("data-mode", "device");
    await page.getByTestId("reset-preferences").click();
    await page.getByTestId("reset-preferences-confirm").click();
    await expect(page.getByTestId("privacy-message")).toContainText("preferences were reset");
    await page.goto("/settings/preferences/");
    await expect(page.getByTestId("pref-spice-3")).toHaveAttribute("aria-pressed", "true"); // default
    await page.goto("/dishes/pho-bo-ha-noi/");
    await expect(page.getByTestId("save-dish")).toHaveAttribute("aria-pressed", "true"); // Passport kept

    await page.goto("/settings/");
    await page.getByTestId("locale-vi").click();
    await page.goto("/settings/privacy/");
    await page.getByTestId("clear-device").click();
    await page.getByTestId("clear-device-cancel").click(); // cancel = nothing happens
    await page.goto("/dishes/pho-bo-ha-noi/");
    await expect(page.getByTestId("save-dish")).toHaveAttribute("aria-pressed", "true");
    await page.goto("/settings/privacy/");
    await page.getByTestId("clear-device").click();
    await page.getByTestId("clear-device-confirm").click();
    await expect(page.getByTestId("privacy-message")).toBeVisible();
    await page.goto("/dishes/pho-bo-ha-noi/");
    await expect(page.getByTestId("save-dish")).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("html")).toHaveAttribute("lang", "vi"); // language kept
    await page.goto("/settings/privacy/");
    await expect(page.getByTestId("privacy-delete-account")).not.toContainText("DELETE");
  });
});

test.describe("Admin Portal (local mode)", () => {
  test("all eleven modules render; overview shows live coverage; deep links work", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/admin/");
    await expect(page.getByTestId("admin-restricted")).toBeVisible();
    await expect(page.getByTestId("kpi-provinces")).toContainText(/\d+\/63/);
    await expect(page.getByTestId("kpi-dishes-with-places")).toContainText(/\d+(\.\d)?%/);
    for (const id of ["food", "bars", "coffee", "spa", "sport"]) await expect(page.getByTestId(`coverage-${id}`)).toContainText(/\d+\/\d+/);
    const expected: Record<string, string> = { business: "restaurant-name", catalogue: "dish-editor-select", menus: "evidence-status", nutrition: "admin-nutrition", research: "import-tool", quality: "admin-review", users: "admin-users", billing: "admin-billing", system: "admin-system", audit: "admin" };
    for (const [s, id] of Object.entries(expected)) {
      await page.getByTestId(`admin-section-${s}`).click();
      await expect(page).toHaveURL(new RegExp(`#${s}$`));
      if (s === "business") await page.getByTestId("new-restaurant").click();
      await expect(page.getByTestId(id).first()).toBeVisible();
    }
    await page.getByTestId("admin-section-catalogue").click();
    await page.getByTestId("admin-mode-coffee").click();
    await expect(page.getByTestId("module-admin")).toHaveAttribute("data-experience", "coffee");
    await page.goto("/admin/#billing");
    await expect(page.getByTestId("proj-mrr")).toHaveText("$2,789.00");
    await expect(page.getByTestId("proj-arr")).toHaveText("$33,468.00");
    await expect(page.getByTestId("proj-free-users")).toHaveText("8,900");
    await expect(page.getByTestId("billing-prices")).toContainText("16.3%");
    await page.getByTestId("proj-users").fill("20000");
    await expect(page.getByTestId("proj-mrr")).toHaveText("$5,578.00");
    await page.goto("/admin/#system");
    await expect(page.getByTestId("system-data-mode")).toContainText("Local mode");
    await expect(page.getByTestId("toggle-samples")).toBeVisible();
    expect(errors).toEqual([]);
  });
});
