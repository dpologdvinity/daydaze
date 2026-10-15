import { test } from "node:test";
import assert from "node:assert/strict";
import { pointInPolygon, type Vec2 } from "../walk.ts";
import { TICK_HZ } from "./fixedStep.ts";
import { stepCar, type CarInput, type CarState } from "./car.ts";
import { carById } from "./roster.ts";

const sedan = carById("quill-lite");
if (!sedan) throw new Error("starter sedan missing");
const spec = sedan;

const at = (position: Vec2, yaw = 0, speed = 0): CarState => ({
  position,
  yaw,
  speed,
});
const GAS: CarInput = { throttle: 1, brake: 0, steer: 0 };
const BRAKE: CarInput = { throttle: 0, brake: 1, steer: 0 };

function run(
  state: CarState,
  input: CarInput,
  ticks: number,
  walls: readonly (readonly Vec2[])[] = [],
) {
  let s = state;
  for (let i = 0; i < ticks; i++) s = stepCar(spec, s, input, walls);
  return s;
}

test("full throttle reaches top speed and never exceeds it", () => {
  let s = at([0, 0]);
  let max = 0;
  for (let i = 0; i < 60 * TICK_HZ; i++) {
    s = stepCar(spec, s, GAS, []);
    max = Math.max(max, s.speed);
  }
  assert.ok(Math.abs(s.speed - spec.topSpeed) < 1e-6);
  assert.ok(max <= spec.topSpeed + 1e-9);
});

test("braking from top speed stops within topSpeed / brake + 0.1 seconds", () => {
  let s = at([0, 0], 0, spec.topSpeed);
  const limit = Math.ceil((spec.topSpeed / spec.brake + 0.1) * TICK_HZ);
  let ticks = 0;
  while (s.speed > 0 && ticks < limit + 10) {
    s = stepCar(spec, s, BRAKE, []);
    ticks++;
  }
  assert.ok(ticks <= limit, `took ${ticks} ticks, limit ${limit}`);
});

test("steering right at speed turns yaw positive; at rest yaw holds", () => {
  const moving = run(
    at([0, 0], 0, 10),
    { throttle: 0.5, brake: 0, steer: 1 },
    10,
  );
  assert.ok(moving.yaw > 0);
  const still = run(at([0, 0]), { throttle: 0, brake: 0, steer: 1 }, 10);
  assert.equal(still.yaw, 0);
});

test("the car moves along +z at yaw 0", () => {
  const s = run(at([0, 0]), GAS, TICK_HZ);
  assert.ok(s.position[1] > 0);
  assert.ok(Math.abs(s.position[0]) < 1e-9);
});

test("holding throttle into a wall keeps the car out, speed bounded, and reverse frees it", () => {
  const wall: Vec2[] = [
    [-10, 5],
    [10, 5],
    [10, 8],
    [-10, 8],
  ];
  let s = run(at([0, 0]), GAS, 200, [wall]);
  assert.ok(!pointInPolygon(wall, s.position));
  assert.ok(Number.isFinite(s.speed) && s.speed <= spec.topSpeed);
  const stuckZ = s.position[1];
  s = run(s, BRAKE, 3 * TICK_HZ, [wall]);
  assert.ok(
    s.position[1] < stuckZ - 0.5,
    "reverse should back away from the wall",
  );
});

test("non-finite inputs are treated as zero", () => {
  for (const bad of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const s = run(
      at([0, 0], 0, 5),
      { throttle: bad, brake: bad, steer: bad },
      20,
    );
    assert.ok(Number.isFinite(s.position[0]) && Number.isFinite(s.position[1]));
    assert.ok(Number.isFinite(s.yaw) && Number.isFinite(s.speed));
  }
});
