// @ts-check
// Lint rules for the whole repo: ESLint's and typescript-eslint's recommended
// sets, plus React's hooks rules for the client. Formatting is Prettier's job,
// so nothing here is about style.
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [
      "docs/agents/**",
      "dist/",
      "coverage/",
      "test-results/",
      "playwright-report/",
      ".worktrees/",
      // agent and harness scratch (git-excluded)
      ".claude/",
      ".agents/",
      ".codex/",
      ".superpowers/",
      ".impeccable/",
      "skills/",
      "tmp/",
      "art/",
      // early exploration builds, kept for reference
      "prototypes/",
      "public/",
      "server/worker-configuration.d.ts",
      "server/.wrangler/",
    ],
  },
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // unused bindings are errors, except deliberate `_` placeholders
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
);
