import { test } from "node:test";
import assert from "node:assert/strict";
import { BUMPER_CAR } from "../driving/roster.ts";
import { ARENA, stepBumpers, type Bumper } from "./bumper.ts";

const R = BUMPER_CAR.width / 2 + 0.1;
const GAS = { throttle: 1, brake: 0, steer: 0 };
const gap = (a: Bumper, b: Bumper) =>
  Math.hypot(
    a.state.position[0] - b.state.position[0],
    a.state.position[1] - b.state.position[1],
  );

test("a head-on hit leaves no overlap, bounces both cars apart and counts a hit each", () => {
  let cars: readonly Bumper[] = [
    {
      id: "player",
      isPlayer: true,
      hits: 0,
      state: {
        position: [-4, 0],
        yaw: Math.PI / 2,
        speed: BUMPER_CAR.topSpeed,
      },
    },
    {
      id: "bot-1",
      isPlayer: false,
      hits: 0,
      state: {
        position: [4, 0],
        yaw: -Math.PI / 2,
        speed: BUMPER_CAR.topSpeed,
      },
    },
  ];
  let tick = 0;
  while (cars[0].hits === 0 && tick < 200)
    cars = stepBumpers(cars, GAS, tick++);
  assert.equal(cars[0].hits, 1);
  assert.equal(cars[1].hits, 1);
  assert.ok(
    gap(cars[0], cars[1]) >= 2 * R - 1e-6,
    "cars still overlap after the hit",
  );
  for (const c of cars) assert.ok(Number.isFinite(c.state.speed));
  const before = gap(cars[0], cars[1]);
  cars = stepBumpers(cars, { throttle: 0, brake: 0, steer: 0 }, tick);
  assert.ok(
    gap(cars[0], cars[1]) > before,
    "cars should move apart after bouncing",
  );
});

test("six bots stay inside the arena for 3000 ticks with finite numbers", () => {
  let cars: readonly Bumper[] = Array.from({ length: 6 }, (_, i) => ({
    id: `bot-${i}`,
    isPlayer: false,
    hits: 0,
    state: {
      position: [-8 + i * 3, i % 2 ? 3 : -3] as const,
      yaw: i,
      speed: 0,
    },
  }));
  const [hx, hz] = ARENA.size.map((s) => s / 2);
  for (let t = 0; t < 3000; t++) cars = stepBumpers(cars, GAS, t);
  for (const c of cars) {
    const [x, z] = c.state.position;
    assert.ok(
      Number.isFinite(x) && Number.isFinite(z) && Number.isFinite(c.state.yaw),
    );
    assert.ok(
      Math.abs(x) <= hx && Math.abs(z) <= hz,
      `${c.id} left the arena at ${x}, ${z}`,
    );
  }
  assert.ok(
    cars.some((c) => c.hits > 0),
    "bots should bump into each other",
  );
});

test("a slow touch against a car pinned to the wall is not counted as a hit", () => {
  const wall = ARENA.size[0] / 2 - R;
  const cars: readonly Bumper[] = [
    {
      id: "player",
      isPlayer: true,
      hits: 0,
      state: { position: [-wall, 0], yaw: Math.PI / 2, speed: 0 },
    },
    {
      id: "bot-1",
      isPlayer: false,
      hits: 0,
      state: {
        position: [-wall + 2 * R - 0.01, 0],
        yaw: -Math.PI / 2,
        speed: 0.3,
      },
    },
  ];
  const next = stepBumpers(cars, { throttle: 0, brake: 0, steer: 0 }, 0);
  assert.equal(next[0].hits, 0);
  assert.equal(next[1].hits, 0);
});

test("a car pinned to the wall passes its unapplied push to the other car", () => {
  const wall = ARENA.size[0] / 2 - R;
  const cars: readonly Bumper[] = [
    {
      id: "player",
      isPlayer: true,
      hits: 0,
      state: { position: [-wall, 0], yaw: Math.PI / 2, speed: 0 },
    },
    {
      id: "bot-1",
      isPlayer: false,
      hits: 0,
      state: { position: [-wall + 2 * R - 0.2, 0], yaw: 0, speed: 0 },
    },
  ];
  const next = stepBumpers(cars, { throttle: 0, brake: 0, steer: 0 }, 0);
  assert.ok(
    gap(next[0], next[1]) >= 2 * R - 1e-6,
    "the free car should take the whole push",
  );
});
