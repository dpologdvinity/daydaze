import assert from "node:assert/strict";
import { test } from "node:test";
import { pruneMorphs, readGlb, writeGlb } from "./pruneMorphs.ts";

/** A one-mesh GLB whose targets move by the given extents, in meters. */
function glbWith(extents: number[]) {
  const target = (_: number, i: number) => ({ POSITION: i, NORMAL: i });
  const json = {
    asset: { version: "2.0" },
    accessors: extents.map((e) => ({
      count: 3,
      type: "VEC3",
      componentType: 5126,
      min: [-e, 0, 0],
      max: [e / 2, 0, 0],
    })),
    meshes: [
      {
        weights: extents.map(() => 0),
        extras: { targetNames: extents.map((_, i) => `k${i}`) },
        primitives: [0, 1].map(() => ({
          attributes: {},
          targets: extents.map(target),
        })),
      },
    ],
  };
  return writeGlb(json, new Uint8Array([1, 2, 3, 4]));
}

test("drops the morph targets that move no vertex, keeps the rest", () => {
  const { glb, dropped } = pruneMorphs(glbWith([0, 0.006, 0, 0.00001, 0.02]));
  assert.equal(dropped, 3);
  const { json } = readGlb(glb);
  const mesh = json.meshes[0];
  assert.deepEqual(mesh.extras?.targetNames, ["k1", "k4"]);
  assert.deepEqual(mesh.weights, [0, 0]);
  for (const p of mesh.primitives)
    assert.deepEqual(
      p.targets?.map((t) => t.POSITION),
      [1, 4],
    );
});

test("a mesh left with no targets loses its targets and weights", () => {
  const { glb } = pruneMorphs(glbWith([0, 0]));
  const mesh = readGlb(glb).json.meshes[0];
  assert.equal(mesh.weights, undefined);
  assert.equal(mesh.extras?.targetNames, undefined);
  for (const p of mesh.primitives) assert.equal(p.targets, undefined);
});

test("the binary chunk passes through untouched", () => {
  const { bin } = readGlb(pruneMorphs(glbWith([0, 0.01])).glb);
  assert.deepEqual([...bin], [1, 2, 3, 4]);
});

test("tuck keys (skin sinking under clothes) lose their normals; others keep them", () => {
  const json = readGlb(glbWith([0.01, 0.01])).json;
  const mesh = json.meshes[0];
  if (mesh?.extras) mesh.extras.targetNames = ["tuck_jeans", "smile"];
  const { glb } = pruneMorphs(writeGlb(json, new Uint8Array([1, 2, 3, 4])));
  for (const p of readGlb(glb).json.meshes[0]?.primitives ?? []) {
    assert.equal(p.targets?.[0]?.NORMAL, undefined);
    assert.equal(p.targets?.[1]?.NORMAL, 1);
  }
});
