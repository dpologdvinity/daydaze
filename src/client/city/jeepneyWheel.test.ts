// The jeepney's wheel is what the budget prices, rolls like a body's wheel in
// its own frame, and stays one draw (one material, vertex colors).
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { JEEPNEY_TRIS, JEEPNEY_WHEEL_TRIS } from "../../game/city/budget.ts";
import { JEEPNEY_WHEELS } from "../../game/driving/wheels.ts";
import {
  JEEPNEY_CHROME,
  JEEPNEY_DARK,
  JEEPNEY_SHELL,
  JEEPNEY_TRIM,
  JEEPNEY_WHEEL,
} from "./carGeometry.ts";
import { wheelMatrix } from "./wheelPlacement.ts";

const tris = (g: THREE.BufferGeometry) =>
  g.getAttribute("position").count / (g.index ? 1 : 3) / (g.index ? 3 : 1);

test("the budget prices the wheel and the jeepney from their geometry", () => {
  assert.equal(tris(JEEPNEY_WHEEL), JEEPNEY_WHEEL_TRIS);
  const body = [JEEPNEY_SHELL, JEEPNEY_TRIM, JEEPNEY_CHROME, JEEPNEY_DARK]
    .map(tris)
    .reduce((a, b) => a + b, 0);
  // four wheels and four 12-triangle lamp boxes ride on top
  assert.equal(JEEPNEY_TRIS, body + 4 * JEEPNEY_WHEEL_TRIS + 4 * 12);
});

test("the wheel carries its own colors: tyre, rim and spokes in one mesh", () => {
  const color = JEEPNEY_WHEEL.getAttribute("color");
  assert.equal(color.count, JEEPNEY_WHEEL.getAttribute("position").count);
  const lums = new Set<number>();
  for (let i = 0; i < color.count; i++)
    lums.add(Math.round(color.getX(i) * 100));
  assert.ok(lums.size >= 3);
});

test("a jeepney's wheels sit at its old axles once the frame is turned onto it, and roll along +x", () => {
  const turn = new THREE.Matrix4().makeRotationY(Math.PI / 2);
  const m = new THREE.Matrix4();
  const at = (k: number) => {
    wheelMatrix(m, JEEPNEY_WHEELS, k, 0, 0);
    return new THREE.Vector3().setFromMatrixPosition(m.premultiply(turn));
  };
  // nose +x, axles along z, the wheels on the road
  const expected = [
    [1.95, 0.36, -0.9],
    [1.95, 0.36, 0.9],
    [-1.7, 0.36, -0.9],
    [-1.7, 0.36, 0.9],
  ];
  expected.forEach(([x, y, z], k) => {
    const p = at(k);
    assert.ok(
      Math.abs(p.x - x!) < 1e-9 &&
        Math.abs(p.y - y!) < 1e-9 &&
        Math.abs(p.z - z!) < 1e-9,
      `wheel ${k}`,
    );
  });
  // rolling forward 1 m turns a point on the tyre's top backward: its top moves toward +x
  wheelMatrix(m, JEEPNEY_WHEELS, 2, 0.5, 0);
  const top0 = new THREE.Vector3(0, 0.36, 0).applyMatrix4(
    m.clone().premultiply(turn),
  );
  wheelMatrix(m, JEEPNEY_WHEELS, 2, 0.6, 0);
  const top1 = new THREE.Vector3(0, 0.36, 0).applyMatrix4(
    m.clone().premultiply(turn),
  );
  assert.ok(top1.x > top0.x, "the top of the tyre travels forward");
});

test("the front wheels steer and the rear wheels stay straight", () => {
  const point = new THREE.Vector3(0.1, 0, 0);
  const m = new THREE.Matrix4();
  const turn = (k: number, steer: number) => {
    wheelMatrix(m, JEEPNEY_WHEELS, k, 0, steer);
    const c = new THREE.Vector3().setFromMatrixPosition(m);
    return point.clone().applyMatrix4(m).sub(c);
  };
  assert.ok(turn(0, 0.5).distanceTo(turn(0, 0)) > 0.02, "front turns");
  assert.ok(turn(2, 0.5).distanceTo(turn(2, 0)) < 1e-9, "rear does not");
});
