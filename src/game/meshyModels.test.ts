// Every Meshy model the client loads by a hard-coded name has its GLB.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { MESHY_PROPS, meshyDir, type MeshyProp } from "./meshyModels.ts";

test("every named Meshy prop has a model file in its folder", () => {
  for (const name of Object.keys(MESHY_PROPS) as MeshyProp[]) {
    assert.ok(
      existsSync(`public/models/${meshyDir(name)}/${name}.glb`),
      `${name}.glb`,
    );
  }
});

test("meshyDir is the folder the Prop helpers load from", () => {
  assert.equal(meshyDir("boodle"), "meshy/food");
  assert.equal(meshyDir("mango-crate"), "meshy/mango");
  assert.equal(meshyDir("jeepney"), "meshy/museum");
});
