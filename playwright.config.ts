import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3199";
export default defineConfig({
  testDir: "./tests/e2e", workers: 1, timeout: 45000,
  use: { baseURL },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next start --hostname localhost --port 3199",
    url: baseURL + "/api/health",
    env: { DEMO_STORE: "file", DEMO_DATA_DIR: ".care4all-test-data", COOKIE_SECURE: "false", APP_ORIGIN: baseURL, AI_PROVIDER: "mock" },
    reuseExistingServer: false,
  },
});
