import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `npm run dev -- --port <n>` overrides the default port.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Agents edit files in .worktrees/; watching them reloads the open game.
    watch: {
      ignored: ["**/.worktrees/**", "**/test-results/**", "**/docs/**"],
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
