import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// This checkout's own worktrees folder. A glob like "**/.worktrees/**" would
// also match every file when the server runs inside a worktree, and HMR there
// would silently stop.
const worktrees = fileURLToPath(new URL("./.worktrees/", import.meta.url));

const workerPort = process.env.WORKER_PORT ?? "8787";

// `npm run dev -- --port <n>` overrides the default port.
export default defineConfig({
  plugins: [react()],
  // names the service worker's cache: each build gets its own (public/sw.js)
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  server: {
    port: 5173,
    // online play in development: `npm run dev:server` runs the Worker on
    // 8787 (WORKER_PORT if that's taken); proxying keeps its cookie and
    // sockets on this origin
    proxy: {
      "/api": `http://127.0.0.1:${workerPort}`,
      "/ws": { target: `ws://127.0.0.1:${workerPort}`, ws: true },
    },
    // Agents edit files in .worktrees/; watching them reloads the open game.
    watch: {
      ignored: [
        (path: string) => path.startsWith(worktrees),
        "**/test-results/**",
        "**/docs/**",
      ],
    },
  },
  // Only scan the real entry points for dependencies, not worktree copies.
  optimizeDeps: { entries: ["index.html", "minigames.html"] },
  build: {
    // shortcut: three.js, R3F and drei ship as one ~1.4 MB chunk; code-split
    // when the client grows a second entry point or lazy minigames.
    chunkSizeWarningLimit: 1600,
    rolldownOptions: {
      input: { index: "index.html", minigames: "minigames.html" },
    },
  },
});
