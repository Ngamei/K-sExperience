import { defineConfig, devices } from "@playwright/test";

/**
 * Account-flow e2e: a static build configured for Supabase mode, talking to an in-memory mock of
 * Supabase Auth + REST (e2e-auth/mock-supabase.mjs). Build first with `npm run build:auth-test`.
 */
const glArgs = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
export default defineConfig({
  testDir: "e2e-auth",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1, // shared mock state
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3500", trace: "off", launchOptions: { args: glArgs } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions: { args: glArgs } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { args: glArgs } } },
  ],
  webServer: [
    { command: "node e2e-auth/mock-supabase.mjs 54321", port: 54321, reuseExistingServer: false },
    { command: "node scripts/serve-static.mjs out-auth 3500", port: 3500, reuseExistingServer: false },
  ],
});
