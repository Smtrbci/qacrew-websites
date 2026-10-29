import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173/forge/",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-390-chromium", use: { ...devices["iPhone 13"], browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ],
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1 --directory .",
    url: "http://127.0.0.1:4173/forge/",
    reuseExistingServer: !process.env.CI,
    timeout: 10_000
  }
});
