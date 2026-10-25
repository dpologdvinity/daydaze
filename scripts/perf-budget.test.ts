import assert from "node:assert/strict";
import { test } from "node:test";
import { initialScripts } from "./perf-budget.ts";

test("the initial JS is the entry script and everything it preloads", () => {
  const html = `<script type="module" crossorigin src="/assets/index-A.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/three-B.js">
    <link rel="stylesheet" crossorigin href="/assets/index-C.css">
    <script src="https://elsewhere.example/x.js"></script>`;
  assert.deepEqual(initialScripts(html), [
    "assets/index-A.js",
    "assets/three-B.js",
  ]);
});
