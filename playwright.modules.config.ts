import { defineConfig, devices } from "@playwright/test";

/**
 * Cross-module e2e: a static build with the Coffee pilot flag ON (NEXT_PUBLIC_FEATURE_COFFEE=1), so mode
 * switching and the shared engine screens can be tested. Build first with `npm run build:modules-test`.
 * The default build (flag off) is covered by e2e/experiences.spec.ts.
 */
const glArgs = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
export default defineConfig({
  testDir: "e2e-modules",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 2,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3600", trace: "off", serviceWorkers: "block", // fixtures are served via page.route
    launchOptions: { args: glArgs } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions: { args: glArgs } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { args: glArgs } } },
  ],
  webServer: { command: "node scripts/serve-static.mjs out-modules 3600", port: 3600, reuseExistingServer: false },
});
