// Usage: node utils/rename-mixamo-downloads.mjs <dir> <mixamo-manifest.json> [--apply]
// Renames Mixamo downloads (saved under the animation name, with Chrome's
// " (1)" suffix on repeats) to their descriptions. Dry run unless --apply.
// Assumes <dir> had no same-named files before the run.
import { existsSync, readFileSync, renameSync } from "node:fs";
import { extname, join } from "node:path";

const [dir, manifestPath, flag] = process.argv.slice(2);

if (!dir || !manifestPath) {
  console.error(
    "Usage: rename-mixamo-downloads.mjs <dir> <manifest.json> [--apply]",
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const seen = new Map();
const taken = new Set();
let renamed = 0;

for (const { savedName, description } of manifest) {
  const count = seen.get(savedName) ?? 0;
  seen.set(savedName, count + 1);

  const ext = extname(savedName);
  const stem = savedName.slice(0, -ext.length);
  const from = count === 0 ? savedName : `${stem} (${count})${ext}`;
  const base = description
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  let to = `${base}${ext}`;

  for (let n = 2; taken.has(to) || existsSync(join(dir, to)); n += 1) {
    to = `${base} (${n})${ext}`;
  }

  if (!existsSync(join(dir, from))) {
    console.warn(`missing: ${from}`);
    continue;
  }

  taken.add(to);
  console.log(`${from} -> ${to}`);

  if (flag === "--apply") {
    renameSync(join(dir, from), join(dir, to));
    renamed += 1;
  }
}

console.log(flag === "--apply" ? `renamed ${renamed}` : "dry run; add --apply");
