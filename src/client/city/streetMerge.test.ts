// Tests for merging the street pieces into one geometry per material.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import type { StreetKind } from "../../game/city/streetPieces.ts";
import { PIECE_HEIGHT, mergePieces, type PieceModel } from "./streetMerge.ts";

/** A unit square on the ground, facing up, two triangles. */
const quad = (): PieceModel => ({
  position: new THREE.BufferAttribute(
    new Float32Array([-1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, 1]),
    3,
  ),
  normal: new THREE.BufferAttribute(
    new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
    3,
  ),
  uv: new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), 2),
  color: null,
  index: [0, 2, 1, 1, 2, 3],
});
const models = new Map<StreetKind, PieceModel>([
  ["crosswalk", quad()],
  ["stop", quad()],
]);

test("each piece is turned, stretched and moved to its spot", () => {
  const g = mergePieces(
    [{ kind: "crosswalk", x: 10, z: 20, yaw: Math.PI / 2, sx: 1, sz: 3 }],
    models,
    ["crosswalk"],
  );
  assert.ok(g);
  const pos = g.getAttribute("position");
  // the quad's z runs 3 m each way, then a quarter turn puts that along x
  const xs = Array.from({ length: pos.count }, (_, i) => pos.getX(i));
  assert.ok(Math.abs(Math.min(...xs) - 7) < 1e-5, `${Math.min(...xs)}`);
  assert.ok(Math.abs(Math.max(...xs) - 13) < 1e-5);
  for (let i = 0; i < pos.count; i++)
    assert.ok(Math.abs(pos.getY(i) - PIECE_HEIGHT.crosswalk) < 1e-6);
  // normals stay up
  assert.ok(Math.abs(g.getAttribute("normal").getY(0) - 1) < 1e-5);
});

test("pieces merge into one indexed geometry, each keeping its own triangles", () => {
  const g = mergePieces(
    [
      { kind: "crosswalk", x: 0, z: 0, yaw: 0, sx: 1, sz: 1 },
      { kind: "crosswalk", x: 5, z: 0, yaw: 0, sx: 1, sz: 1 },
    ],
    models,
    ["crosswalk"],
  );
  assert.ok(g);
  assert.equal(g.getAttribute("position").count, 8);
  const index = g.getIndex();
  assert.ok(index);
  assert.equal(index.count, 12);
  // the second quad's triangles point at its own four vertices
  assert.deepEqual(Array.from(index.array).slice(6), [4, 6, 5, 5, 6, 7]);
});

test("only the listed kinds go in, and none means no geometry", () => {
  const pieces = [{ kind: "stop", x: 0, z: 0, yaw: 0, sx: 1, sz: 1 }] as const;
  assert.equal(mergePieces(pieces, models, ["crosswalk"]), null);
  assert.equal(mergePieces([], models, ["stop"]), null);
  // a kind the kit lacks is skipped, not a crash
  assert.equal(
    mergePieces([{ kind: "drain", x: 0, z: 0, yaw: 0, sx: 1, sz: 1 }], models, [
      "drain",
    ]),
    null,
  );
});
