import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";
import base from "./playwright.config.ts";

// Two players against a local Worker: wrangler dev (with a throwaway D1) on
// WORKER_PORT, Vite proxying /api and /ws to it, the client at ?online=1.
const PORT = Number(process.env.PORT ?? 5197);
const WORKER_PORT = Number(process.env.WORKER_PORT ?? 8798);
const persist = mkdtempSync(join(tmpdir(), "daydaze-online-e2e-"));
const wrangler = (args: string) =>
  `npx wrangler ${args} --config server/wrangler.jsonc --persist-to ${persist}`;

export default defineConfig({
  ...base,
  testMatch: "online.spec.ts",
  workers: 1,
  timeout: 1_200_000,
  use: { ...base.use, baseURL: `http://localhost:${PORT}` },
  webServer: [
    {
      // the Worker serves dist/, so build first
      command: [
        "npx vite build --logLevel warn",
        `CI=1 ${wrangler("d1 migrations apply DB --local")}`,
        wrangler(
          `dev --ip 127.0.0.1 --port ${WORKER_PORT} --inspector-port 0 --var ALLOWED_ORIGINS:http://localhost:${PORT}`,
        ),
      ].join(" && "),
      url: `http://127.0.0.1:${WORKER_PORT}/api/rooms/plaza`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `WORKER_PORT=${WORKER_PORT} npm run dev -- --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
