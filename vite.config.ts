import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `npm run dev -- --port <n>` overrides the default port.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rolldownOptions: {
      input: { index: "index.html", minigames: "minigames.html" },
    },
  },
});
