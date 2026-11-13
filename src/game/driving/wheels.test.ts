// The wheel table matches the bodies it describes, and the steering model turns
// the front wheels the way the car turns.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BODY_KEYS, BODY_LENGTH } from "./bodies.ts";
import { BODY_WHEELS, MAX_STEER, steerAngle } from "./wheels.ts";

test("every body has four wheels inside its length, front axle ahead of the rear", () => {
  for (const key of BODY_KEYS) {
    const w = BODY_WHEELS[key];
    assert.ok(w.radius > 0.2 && w.radius < 0.5, key);
    assert.ok(w.frontX > 0.5 && w.rearX > 0.5, key);
    assert.ok(w.frontZ > 0 && w.rearZ < 0, key);
    assert.ok(w.frontZ + w.radius < BODY_LENGTH[key] / 2, key);
    assert.ok(w.radius - w.rearZ < BODY_LENGTH[key] / 2, key);
  }
});

test("steering follows the turn, backs off in reverse, and never jumps", () => {
  // rolling forward 1 m while turning left (yaw up) steers left
  assert.ok(steerAngle(2.6, 0.1, 1) > 0);
  assert.ok(steerAngle(2.6, -0.1, 1) < 0);
  // the same turn while reversing swings the wheels the other way
  assert.ok(steerAngle(2.6, 0.1, -1) < 0);
  // bicycle model: a tight turn over a long roll
  assert.ok(Math.abs(steerAngle(2.6, 0.1, 5) - Math.atan(0.052)) < 1e-9);
  // a stopped car, or a bad number, keeps the wheels straight
  assert.equal(steerAngle(2.6, 1, 0), 0);
  assert.equal(steerAngle(2.6, Number.NaN, 1), 0);
  // a spin on the spot is clamped
  assert.equal(steerAngle(2.6, 3, 0.01), MAX_STEER);
  // a yaw that wrapped across pi is the short way round
  assert.ok(Math.abs(steerAngle(2.6, 2 * Math.PI + 0.1, 1)) < 0.3);
});
