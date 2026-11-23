// Every hair style in the closet has its 3D model: the feminine and masculine
// builds, each with a low-poly twin. The two salon styles wear a neighbor's.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { HAIR_STYLES } from "./look.ts";

const WORN_AS: Record<string, string> = {
  "sleek-bob": "bob",
  "curl-cloud": "mid-curly",
};

test("every hair style has all four model files", () => {
  const missing: string[] = [];
  // bald wears no model at all
  for (const { id } of HAIR_STYLES.filter((h) => h.id !== "bald"))
    for (const suffix of ["", "-m", "-lo", "-m-lo"]) {
      const file = `public/models/doll/hair-${WORN_AS[id] ?? id}${suffix}.glb`;
      if (!existsSync(file)) missing.push(file);
    }
  assert.deepEqual(missing, []);
});

test("the textured styles are in the closet", () => {
  const ids: string[] = HAIR_STYLES.map((h) => h.id);
  for (const id of [
    "locs",
    "box-braids",
    "cornrows",
    "bantu-knots",
    "twist-out",
    "puffs",
  ])
    assert.ok(ids.includes(id), id);
});

/** The style ids a table in one of the Blender hair scripts builds: each
 * entry is a line `    "<id>": ...` between `start` and `end`. */
function builtIds(file: string, start: string, end: string): string[] {
  const src = readFileSync(`art/doll/blender/${file}`, "utf8");
  const block = src.slice(src.indexOf(start), src.indexOf(end));
  return [...block.matchAll(/^ {4}"([a-z-]+)": /gm)].map((m) => m[1] ?? "");
}

test("every hair the Blender build makes is in the closet", () => {
  const ids: string[] = HAIR_STYLES.map((h) => h.id);
  for (const [file, start, end, floor] of [
    ["pack_hair.py", "STYLES = {", "# pieces", 5],
    ["doll_hair.py", "COMMUNITY = {", "PROXY |=", 20],
    ["refit_hair.py", "STYLES: dict", "ALPHA_LEVELS =", 10],
  ] as const) {
    const built = builtIds(file, start, end);
    // a floor, so a parse that silently matches nothing fails
    assert.ok(built.length >= floor, `found ${built.length} in ${file}`);
    assert.deepEqual(
      built.filter((id) => !ids.includes(id)),
      [],
      file,
    );
  }
});

test("fetch_hair.sh downloads every model refit_hair.py refits", () => {
  const refit = readFileSync("art/doll/blender/refit_hair.py", "utf8");
  const fetch = readFileSync("art/doll/blender/fetch_hair.sh", "utf8");
  const sources = [...refit.matchAll(/"src": "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(sources.length >= 10, `found ${sources.length} sources`);
  assert.deepEqual(
    sources.filter((src) => !fetch.includes(`"${src ?? ""} `)),
    [],
  );
});
