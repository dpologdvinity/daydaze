import assert from "node:assert/strict";
import { test } from "node:test";
import { loftBody, profileSpan, type Pt } from "./carBody.ts";

// a plain sedan-ish lower body: [z share of length, height m], nose at +z
const SHELL: Pt[] = [
  [-0.5, 0.25],
  [-0.5, 0.7],
  [-0.4, 0.78],
  [0.35, 0.78],
  [0.5, 0.62],
  [0.5, 0.25],
];
const L = 4.2;
const W = 1.8;

const xs = (pos: Float32Array, keep: (y: number, z: number) => boolean) => {
  let max = 0;
  for (let i = 0; i < pos.length; i += 3)
    if (keep(pos[i + 1]!, pos[i + 2]!)) max = Math.max(max, Math.abs(pos[i]!));
  return max;
};

test("the profile's height at a point along the car", () => {
  const [lo, hi] = profileSpan(SHELL, 0) ?? [0, 0];
  assert.ok(Math.abs(lo - 0.25) < 1e-9 && Math.abs(hi - 0.78) < 1e-9);
  // over the sloped hood, the top drops toward the nose
  const nose = profileSpan(SHELL, 0.45);
  assert.ok(nose && nose[1] < 0.78 && nose[1] > 0.62);
  assert.equal(profileSpan(SHELL, 0.7), null);
});

test("a lofted body fills the car's length, width and height", () => {
  const { positions, indices } = loftBody(SHELL, { length: L, width: W });
  let [minZ, maxZ, maxY] = [Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    minZ = Math.min(minZ, positions[i + 2]!);
    maxZ = Math.max(maxZ, positions[i + 2]!);
    maxY = Math.max(maxY, positions[i + 1]!);
  }
  assert.ok(Math.abs(maxZ - L / 2) < 0.06 && Math.abs(minZ + L / 2) < 0.06);
  assert.ok(Math.abs(maxY - 0.78) < 0.02);
  assert.ok(xs(positions, () => true) <= W / 2 + 1e-9);
  for (const i of indices) assert.ok(i < positions.length / 3);
  assert.equal(indices.length % 3, 0);
});

test("the sides curve in toward the roof and toward the nose and tail", () => {
  const { positions } = loftBody(SHELL, { length: L, width: W });
  const mid = (z: number) => Math.abs(z) < 0.3;
  const belt = xs(positions, (y, z) => mid(z) && y > 0.4 && y < 0.55);
  const top = xs(positions, (y, z) => mid(z) && y > 0.74);
  assert.ok(top < belt * 0.95, `top ${top} vs belt ${belt}`);
  const nose = xs(positions, (y, z) => z > L / 2 - 0.12 && y > 0.4 && y < 0.55);
  assert.ok(nose < belt * 0.92, `nose ${nose} vs belt ${belt}`);
});

test("a finer loft has more triangles", () => {
  const coarse = loftBody(SHELL, { length: L, width: W, sections: 8, ring: 8 });
  const fine = loftBody(SHELL, { length: L, width: W, sections: 32, ring: 20 });
  assert.ok(fine.indices.length > coarse.indices.length * 4);
});
