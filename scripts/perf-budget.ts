// Checks the production build in dist/ against the performance budget, and
// fails (exit 1) when it's over: CI runs it after `npm run build`.
//
// - Initial JS: the entry script plus every module it preloads, gzipped, must
//   stay under 600 KB. That's what a first visit downloads before anything
//   else can run.
// - dist/ by asset class (JS, CSS, models, textures, sky maps, ...) is
//   printed every run, so growth shows in the CI log even under budget.
//
// The Downtown cold transfer needs a browser, so it is measured by hand
// (art/textures/.cache/bytes.mjs), not here.
//
//   npm run perf:budget

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

/** Initial JS, gzipped, in bytes. */
const INITIAL_JS_BUDGET = 600 * 1024;

/** The same-origin scripts index.html loads up front, relative to dist/. */
export function initialScripts(html: string): string[] {
  const tags = html.match(
    /<script[^>]*\ssrc="\/[^"]+"|<link[^>]*rel="modulepreload"[^>]*href="\/[^"]+"/g,
  );
  return (tags ?? []).map(
    (tag) => (/(?:src|href)="\/([^"]+)"/.exec(tag) ?? [])[1] ?? "",
  );
}

/** Every file under `dir`, recursively, with its size in bytes. */
function files(dir: string): { path: string; size: number }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? files(path)
      : [{ path, size: statSync(path).size }];
  });
}

/** The class a dist/ file counts under: its top folder, or its extension in assets/. */
function assetClass(path: string): string {
  const [top, ...rest] = path.split("/");
  if (!rest.length) return "root";
  if (top !== "assets") return top ?? "root";
  return path.slice(path.lastIndexOf(".") + 1);
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

if (import.meta.main) {
  const dist = "dist";
  const scripts = initialScripts(
    readFileSync(join(dist, "index.html"), "utf8"),
  );
  const initial = scripts.reduce(
    (sum, s) => sum + gzipSync(readFileSync(join(dist, s))).length,
    0,
  );
  const classes = new Map<string, number>();
  for (const f of files(dist)) {
    const c = assetClass(f.path.slice(dist.length + 1));
    classes.set(c, (classes.get(c) ?? 0) + f.size);
  }
  console.log("dist/ by asset class:");
  for (const [c, size] of [...classes].sort((a, b) => b[1] - a[1]))
    console.log(`  ${c.padEnd(10)} ${kb(size)}`);
  console.log(
    `Initial JS (${scripts.length} files, gzip): ${kb(initial)} of ${kb(INITIAL_JS_BUDGET)}`,
  );
  if (initial > INITIAL_JS_BUDGET) {
    console.error("Over budget: the initial JS grew past 600 KB gzipped.");
    process.exit(1);
  }
}
