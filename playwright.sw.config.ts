import { defineConfig } from "@playwright/test";

// The service worker only registers in a production build, so these tests run
// against `vite preview` of a fresh build rather than the dev server.
const PORT = Number(process.env.PORT ?? 5198);

export default defineConfig({
  testDir: "tests",
  testMatch: "sw.spec.ts",
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 120_000 },
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure",
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
    command: `npx vite build --logLevel warn && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
