// A wheel sits at its axle, rolls the way the car goes on both sides, and the
// front pair swings with the steering while the rear pair stays straight.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { BODY_WHEELS } from "../../game/driving/wheels.ts";
import { wheelMatrix } from "./wheelPlacement.ts";

const layout = BODY_WHEELS.sedan;
const matrix = new THREE.Matrix4();

/** Where a point of the wheel (relative to its center) lands, relative to the center. */
function offset(
  index: number,
  travel: number,
  steer: number,
  point: THREE.Vector3,
) {
  wheelMatrix(matrix, layout, index, travel, steer);
  const center = new THREE.Vector3().setFromMatrixPosition(matrix);
  return point.clone().applyMatrix4(matrix).sub(center);
}

test("wheels sit on the road at their axles, hubs outward", () => {
  const origin = new THREE.Vector3();
  const centers = [0, 1, 2, 3].map((i) => {
    wheelMatrix(matrix, layout, i, 0, 0);
    return origin.clone().applyMatrix4(matrix);
  });
  for (const c of centers) assert.equal(c.y, layout.radius);
  assert.deepEqual(
    centers.map((c) => Math.sign(c.x)),
    [1, -1, 1, -1],
  );
  assert.deepEqual(
    centers.map((c) => Math.sign(c.z)),
    [1, 1, -1, -1],
  );
  // the hub side (+x of the lone wheel) faces away from the car on both sides
  const hub = new THREE.Vector3(0.1, 0, 0);
  for (const i of [0, 2]) assert.ok(offset(i, 0, 0, hub).x > 0.09);
  for (const i of [1, 3]) assert.ok(offset(i, 0, 0, hub).x < -0.09);
});

test("rolling forward carries the top of every wheel forward", () => {
  const top = new THREE.Vector3(0, layout.radius, 0);
  const quarter = (Math.PI / 2) * layout.radius;
  for (const i of [0, 1, 2, 3]) {
    const moved = offset(i, quarter, 0, top);
    // a quarter turn: the top is now ahead of the axle, level with it
    assert.ok(Math.abs(moved.z - layout.radius) < 1e-9, `wheel ${i}`);
    assert.ok(Math.abs(moved.y) < 1e-9, `wheel ${i}`);
    // and backing up carries it the other way
    assert.ok(offset(i, -quarter, 0, top).z < -0.9 * layout.radius);
  }
});

test("only the front wheels steer", () => {
  const left = 0.4;
  for (const i of [0, 1, 2, 3]) {
    // a point on the wheel's leading edge (the left wheels are turned about,
    // so their local +z trails)
    const edge = new THREE.Vector3(0, 0, i % 2 === 0 ? 1 : -1);
    assert.ok(offset(i, 0, 0, edge).z > 0.99, `wheel ${i} edge`);
    const x = offset(i, 0, left, edge).x;
    if (i < 2) assert.ok(x > 0.3, `wheel ${i}: ${x}`);
    else assert.ok(Math.abs(x) < 1e-9, `wheel ${i}: ${x}`);
  }
});
