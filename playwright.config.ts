import { defineConfig, devices } from "@playwright/test";

/** Dedicated port so `next dev` never falls back to :3001 while Playwright still probes :3000. */
const E2E_PORT = process.env.E2E_PORT || "3330";
const defaultBaseURL = process.env.BASE_URL || `http://127.0.0.1:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: defaultBaseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        /** Wait for a real API route so `next dev` has compiled handlers before tests (avoids flaky 404). */
        command: `next dev -H 127.0.0.1 -p ${E2E_PORT}`,
        url: `${defaultBaseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
