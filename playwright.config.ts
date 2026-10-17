import { defineConfig } from "@playwright/test";

// PORT overrides the default when another server already holds 5195.
const PORT = Number(process.env.PORT ?? 5195);

// Headless WebGL is SwiftShader on the CPU: a frame can take seconds, so
// timeouts are generous and only two browsers run at once.
export default defineConfig({
  testDir: "tests",
  testMatch: "client.spec.ts",
  // tests are independent pages, so CI's shards can split the one file
  fullyParallel: true,
  workers: 2,
  timeout: 180_000,
  expect: { timeout: 60_000 },
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ],
    },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
