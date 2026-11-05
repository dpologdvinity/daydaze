// Quantized glTF geometry must survive node transforms before fitting props.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { bakedGeometry, floated } from "./bakedGeometry.ts";

test("floated positions retain values beyond the normalized range", () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Int16Array([32767, 0, 0]), 3, true),
  );
  const result = floated(geometry).applyMatrix4(
    new THREE.Matrix4().makeScale(3, 3, 3),
  );
  assert.equal(result.getAttribute("position").getX(0), 3);
});

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
  const baked = bakedGeometry(mesh);
  baked.computeBoundingBox();
  assert.ok(baked.boundingBox);
  assert.ok(Math.abs(baked.boundingBox.min.x - 7.6) < 0.00001);
  assert.ok(Math.abs(baked.boundingBox.max.x - 16.4) < 0.00001);
  assert.ok(Math.abs(baked.boundingBox.max.y - 5.9) < 0.00001);
  assert.equal(source.getAttribute("position").normalized, true);
  assert.equal(source.getAttribute("position").getX(0), -1);
});
