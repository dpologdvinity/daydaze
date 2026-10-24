// Tests for the ball's flight: a lob lands where it was aimed, peaks at its
// apex, and each bounce keeps less energy than the last.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ballAt, bounce, GRAVITY, lob, type Vec3 } from "./ball.ts";

const near = (a: number, b: number, eps = 1e-6) =>
  assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("a lob starts at its launch spot and lands at its target", () => {
  const flight = lob([0, 1, 0], [6, 0.2, -3], 4);
  const out: Vec3 = [0, 0, 0];
  ballAt(flight, 0, out);
  assert.deepEqual(out, [0, 1, 0]);
  ballAt(flight, flight.duration, out);
  near(out[0], 6);
  near(out[1], 0.2);
  near(out[2], -3);
});

test("a lob peaks at its apex height and follows a parabola", () => {
  const flight = lob([0, 1, 0], [6, 0, 0], 4);
  const out: Vec3 = [0, 0, 0];
  let top = -Infinity;
  for (let i = 0; i <= 1000; i++) {
    ballAt(flight, (i / 1000) * flight.duration, out);
    top = Math.max(top, out[1]);
  }
  near(top, 4, 1e-3);
  // constant downward acceleration: second differences equal -g dt²
  const dt = 0.01;
  const y = (t: number) => ballAt(flight, t, out)[1];
  near(y(0.3) - 2 * y(0.31) + y(0.32), -GRAVITY * dt * dt);
});

test("an apex below the launch spot is raised to it, never NaN", () => {
  const flight = lob([0, 2, 0], [3, 0, 0], 1);
  assert.ok(Number.isFinite(flight.duration) && flight.duration > 0);
  const out = ballAt(flight, flight.duration, [0, 0, 0]);
  near(out[0], 3);
});

test("a bounce leaves from the landing spot with less energy", () => {
  const flight = lob([0, 1, 0], [4, 0, 0], 3);
  const next = bounce(flight, 0.6);
  const land = ballAt(flight, flight.duration, [0, 0, 0]);
  assert.deepEqual(next.from, land);
  const speed2 = (v: Vec3) => v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
  const landing: Vec3 = [
    flight.velocity[0],
    flight.velocity[1] - GRAVITY * flight.duration,
    flight.velocity[2],
  ];
  assert.ok(speed2(next.velocity) < speed2(landing));
  assert.ok(next.velocity[1] > 0, "it goes back up");
  // and it comes back down to the same height
  near(ballAt(next, next.duration, [0, 0, 0])[1], land[1]);
});

test("restitution is clamped below 1", () => {
  const flight = lob([0, 1, 0], [4, 0, 0], 3);
  const next = bounce(flight, 5);
  const before = Math.abs(flight.velocity[1] - GRAVITY * flight.duration);
  assert.ok(next.velocity[1] < before);
});
