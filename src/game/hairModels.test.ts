// Every hair style in the closet has its 3D model: the feminine and masculine
// builds, each with a low-poly twin. The two salon styles wear a neighbor's.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
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
  const ids = HAIR_STYLES.map((h) => h.id) as string[];
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
