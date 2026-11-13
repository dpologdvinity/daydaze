// The near plane grows with the camera's distance so the overview's depth
// buffer can tell asphalt from the ground under it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { NEAR_MAX, NEAR_MIN, nearPlaneFor } from "./nearPlane.ts";

/** The depth a 24-bit buffer resolves at `d` meters, for a far plane of 600 m. */
const resolution = (near: number, d: number) => (d * d) / (near * 2 ** 24);

test("a street view keeps the close near plane", () => {
  assert.equal(nearPlaneFor(0), NEAR_MIN);
  assert.equal(nearPlaneFor(4), NEAR_MIN);
});

test("the near plane grows with distance, never past its cap, in steps", () => {
  let last = 0;
  for (let away = 0; away <= 600; away += 5) {
    const near = nearPlaneFor(away);
    assert.ok(near >= last && near <= NEAR_MAX, `${away}: ${near}`);
    last = near;
  }
  assert.equal(nearPlaneFor(255), NEAR_MAX);
  // a slow zoom changes it in steps, not every few centimeters
  assert.equal(nearPlaneFor(100.1), nearPlaneFor(100.8));
});

test("from the overview, asphalt 4 cm over the ground is resolved out to the far plane", () => {
  const near = nearPlaneFor(255);
  assert.ok(resolution(near, 600) < 0.04, `${resolution(near, 600)} m`);
  // what the world camera's 0.05 m near plane gave
  assert.ok(resolution(0.05, 300) > 0.04);
});
