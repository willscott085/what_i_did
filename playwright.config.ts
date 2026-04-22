import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://localhost:55001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "seed-chromium",
      testMatch: /global-setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["seed-chromium"],
    },
    {
      name: "seed-webkit",
      testMatch: /global-setup\.ts/,
      dependencies: ["chromium"],
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      dependencies: ["seed-webkit"],
    },
  ],
  webServer: {
    command: "pnpm db:migrate && pnpm dev",
    url: "http://localhost:55001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
