import { defineConfig, devices } from "@playwright/test";

// The default target is the PWA container, the address people open. nginx forwards /api/ to the backend, and the
// backend's APP_ORIGIN is that same address, so the API specs and the browser journeys all run against it.
export default defineConfig({
  testDir: "./tests/e2e", workers: 1, timeout: 45000,
  use: { baseURL: process.env.CARE_TEST_URL || process.env.FRONTEND_TEST_URL || "http://localhost:8080" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
