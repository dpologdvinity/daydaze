// The low tier's whole streamed city against the render budget: the plan
// with the bays the low tier really draws, plus the street trees, the
// furniture and the park's undergrowth, each costed from its shipped GLB.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CITY_SPAWN } from "./layout.ts";
import { lowTierCost, MODEL_COST, modelsInBudget } from "./budget.ts";
import type { Vec2 } from "../walk.ts";

type Gltf = {
  meshes: {
    primitives: { indices?: number; attributes: { POSITION: number } }[];
  }[];
  accessors: { count: number }[];
};
const isGltf = (v: unknown): v is Gltf =>
  typeof v === "object" &&
  v !== null &&
  "meshes" in v &&
  Array.isArray(v.meshes) &&
  "accessors" in v &&
  Array.isArray(v.accessors);

/** Triangles and primitives in a GLB, read from its JSON chunk. */
function glbCost(path: string): { tris: number; parts: number } {
  const bytes = readFileSync(
    new URL(`../../../public/models/${path}.glb`, import.meta.url),
  );
  const length = bytes.readUInt32LE(12);
  const gltf: unknown = JSON.parse(bytes.subarray(20, 20 + length).toString());
  assert.ok(isGltf(gltf), path);
  let tris = 0;
  let parts = 0;
  for (const mesh of gltf.meshes)
    for (const p of mesh.primitives) {
      parts += 1;
      const n = gltf.accessors[p.indices ?? p.attributes.POSITION]?.count ?? 0;
      tris += n / 3;
    }
  return { tris: Math.round(tris), parts };
}

test("the budget's model costs match the shipped GLBs", () => {
  for (const path of modelsInBudget())
    assert.deepEqual(MODEL_COST[path], glbCost(path), path);
});

test("wherever she stands, the low tier's city (bays, trees, furniture, park) fits 250 draw calls and 300k triangles", () => {
  let worst = { tris: 0, at: [0, 0] as Vec2 };
  for (let x = -432; x <= 432; x += 32)
    for (let z = -320; z <= 368; z += 32) {
      const at: Vec2 = [x, z];
      const cost = lowTierCost(at);
      assert.ok(cost.drawCalls <= 250, `${cost.drawCalls} draw calls at ${at}`);
      if (cost.triangles > worst.tris) worst = { tris: cost.triangles, at };
    }
  // the park, where the undergrowth is thickest
  const park = lowTierCost([228, -292]);
  assert.ok(
    park.triangles < 300_000,
    `${park.triangles} triangles in the park`,
  );
  assert.ok(worst.tris < 300_000, `${worst.tris} triangles at ${worst.at}`);
});

test("the low tier's cost counts the bays it draws", () => {
  const at = CITY_SPAWN.position;
  const cost = lowTierCost(at);
  assert.ok(cost.bays > 0, "the spawn is near New York blocks");
  assert.ok(cost.triangles > cost.planTriangles);
});
