// Quantized glTF vertices must become floats before baking a node's meter scale.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { modelGeometry } from "./modelGeometry.ts";

test("baking quantized mesh transforms preserves dimensions and source geometry", () => {
  const source = new THREE.BufferGeometry();
  source.setAttribute(
    "position",
    new THREE.Int16BufferAttribute(
      [-32767, 0, 0, 32767, 0, 0, 0, 32767, 0],
      3,
      true,
    ),
  );
  const mesh = new THREE.Mesh(source);
  mesh.position.set(12, 1.5, 2);
  mesh.scale.setScalar(4.4);
  mesh.updateMatrixWorld(true);
  const baked = modelGeometry(mesh);
  baked.computeBoundingBox();
  assert.ok(baked.boundingBox);
  assert.ok(Math.abs(baked.boundingBox.min.x - 7.6) < 0.00001);
  assert.ok(Math.abs(baked.boundingBox.max.x - 16.4) < 0.00001);
  assert.ok(Math.abs(baked.boundingBox.max.y - 5.9) < 0.00001);
  assert.equal(source.getAttribute("position").normalized, true);
  assert.equal(source.getAttribute("position").getX(0), -1);
});
