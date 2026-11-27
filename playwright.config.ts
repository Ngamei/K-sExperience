import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const glArgs = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"];

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 2,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    screenshot: "only-on-failure",
    launchOptions: { args: glArgs },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions: { args: glArgs } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { args: glArgs } } },
  ],
  webServer: {
    // Runs against the production build (`npm run build` first).
    command: process.env.E2E_STATIC ? `node scripts/serve-static.mjs out ${PORT}` : `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { NEXT_PUBLIC_BASEMAP_STYLE_URL: "none" },
  },
});
