// Quantized glTF geometry must survive node transforms before fitting props.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { floated } from "./floated.ts";

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
