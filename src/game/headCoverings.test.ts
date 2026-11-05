// The head coverings are hair styles with their own models: each has the
// feminine and masculine builds and a low-poly twin of both, and a closet tile.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { HAIR_STYLES } from "./look.ts";

const COVERINGS = ["hijab", "head-wrap", "turban"];

test("every head covering is in the closet with all its files", () => {
  const ids = HAIR_STYLES.map((h) => h.id) as string[];
  const missing: string[] = [];
  for (const id of COVERINGS) {
    assert.ok(ids.includes(id), id);
    for (const suffix of ["", "-m", "-lo", "-m-lo"]) {
      const file = `public/models/doll/hair-${id}${suffix}.glb`;
      if (!existsSync(file)) missing.push(file);
    }
    if (!existsSync(`public/closet/hair-${id}.webp`))
      missing.push(`public/closet/hair-${id}.webp`);
  }
  assert.deepEqual(missing, []);
});
