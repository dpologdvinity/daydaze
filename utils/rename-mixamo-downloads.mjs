// Usage: node utils/rename-mixamo-downloads.mjs <dir> <mixamo-manifest.json> [--apply] [--dupes-only]
// Renames Mixamo downloads (saved under the animation name, with Chrome's
// " (1)" suffix on repeats) to their descriptions. Zips (packs) are skipped.
// --dupes-only renames just the names that were downloaded more than once.
// Dry run unless --apply.
// Assumes <dir> had no same-named files before the run.
import { existsSync, readFileSync, renameSync } from "node:fs";
import { extname, join } from "node:path";

const [dir, manifestPath, ...flags] = process.argv.slice(2);
const apply = flags.includes("--apply");
const dupesOnly = flags.includes("--dupes-only");

if (!dir || !manifestPath) {
  console.error(
    "Usage: rename-mixamo-downloads.mjs <dir> <manifest.json> [--apply] [--dupes-only]",
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const totals = new Map();

for (const { savedName } of manifest) {
  totals.set(savedName, (totals.get(savedName) ?? 0) + 1);
}

const seen = new Map();
const taken = new Set();
let renamed = 0;

for (const { savedName, description } of manifest) {
  const count = seen.get(savedName) ?? 0;
  seen.set(savedName, count + 1);

  const ext = extname(savedName);

  if (ext === ".zip" || (dupesOnly && totals.get(savedName) === 1)) {
    continue;
  }

  // Chrome saves "/" etc. in the Mixamo name as "_".
  const safeName = savedName.replace(/[\\/:*?"<>|]/g, "_");
  const from =
    count === 0
      ? safeName
      : `${safeName.slice(0, -ext.length)} (${count})${ext}`;
  const base = description
    .replace(/[\\/:*?"<>|\p{Cc}]/gu, "")
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

  if (apply) {
    renameSync(join(dir, from), join(dir, to));
    renamed += 1;
  }
}

console.log(apply ? `renamed ${renamed}` : "dry run; add --apply");
