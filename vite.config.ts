import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// This checkout's own worktrees folder. A glob like "**/.worktrees/**" would
// also match every file when the server runs inside a worktree, and HMR there
// would silently stop.
const worktrees = fileURLToPath(new URL("./.worktrees/", import.meta.url));

// `npm run dev -- --port <n>` overrides the default port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
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
