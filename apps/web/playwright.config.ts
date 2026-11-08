import { defineConfig, devices } from "@playwright/test";

/**
 * Browser E2E for the vertical slice (synanton/platform#537).
 *
 * Run against the deployed demo UI:
 *   E2E_BASE_URL=http://<worker-ip>:30080 E2E_USERNAME=demo-user \
 *     pnpm --filter @synanton/web test:e2e
 *
 * Uses the system Chrome (channel: "chrome") so CI does not need a browser
 * download. In CI, run the UI stack first (see .github/workflows/e2e.yml).
 */
const baseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 300_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chrome",
      use: { ...devices["Desktop Chrome"], channel: "chrome" }
    }
  ]
});
