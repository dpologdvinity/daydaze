import assert from "node:assert/strict";
import { test } from "node:test";
import { seededRng } from "../dialogue/pick.ts";
import {
  BOWL,
  DOG_PARK_BLOCKERS,
  FENCE_PANEL,
  GATE,
  GEAR,
  fenceSpots,
  inDogPark,
  newDog,
  newWorld,
  stepDog,
  stepWorld,
  type DogMode,
} from "./dogPark.ts";
import { DOG_PARK, PARK, PATH_EW } from "./park.ts";
import type { Vec2 } from "../walk.ts";

const inside = (poly: readonly Vec2[], [x, z]: Vec2) =>
  x > poly[0][0] && x < poly[1][0] && z > poly[0][1] && z < poly[2][1];
const blockedAt = (p: Vec2) => DOG_PARK_BLOCKERS.some((b) => inside(b, p));

test("the yard sits on the lawn, clear of the path and the lodge", () => {
  assert.ok(DOG_PARK.x0 > 255.5, "east of the north-south path");
  assert.ok(DOG_PARK.x1 < 274, "west of the lodge");
  assert.ok(
    DOG_PARK.z0 > PARK.z0 && DOG_PARK.z1 < PATH_EW.z0,
    "north of the path",
  );
  assert.ok(inDogPark(265, -300));
  assert.ok(!inDogPark(265, -290));
});

test("the fence is closed except for the gate", () => {
  const spots = fenceSpots();
  // the perimeter less the gate, each panel within a stretch of the nominal one
  const perimeter =
    2 * (DOG_PARK.x1 - DOG_PARK.x0) +
    2 * (DOG_PARK.z1 - DOG_PARK.z0) -
    GATE.width;
  const total = spots.reduce((n, s) => n + s.scale * FENCE_PANEL, 0);
  assert.ok(Math.abs(total - perimeter) < 1e-6, `${total} vs ${perimeter}`);
  for (const s of spots)
    assert.ok(s.scale > 0.8 && s.scale < 1.2, `${s.scale}`);
  // you can walk in through the gate but not through the fence
  assert.ok(!blockedAt([GATE.x, DOG_PARK.z1]));
  assert.ok(!blockedAt([GATE.x + 1.1, DOG_PARK.z1]));
  assert.ok(blockedAt([GATE.x + 1.5, DOG_PARK.z1]));
  assert.ok(blockedAt([DOG_PARK.x0, -305]));
  assert.ok(blockedAt([DOG_PARK.x1, -305]));
  assert.ok(blockedAt([262, DOG_PARK.z0]));
});

test("the gear fits in the yard and leaves the gate's lane open", () => {
  for (const g of GEAR) {
    assert.ok(
      g.box.x0 > DOG_PARK.x0 + 0.8 && g.box.x1 < DOG_PARK.x1 - 0.8,
      g.kind,
    );
    assert.ok(
      g.box.z0 > DOG_PARK.z0 + 0.8 && g.box.z1 < DOG_PARK.z1 - 0.8,
      g.kind,
    );
    // nothing stands in the lane from the gate to the middle
    assert.ok(
      g.box.x1 < GATE.x - 1 ||
        g.box.x0 > GATE.x + 1 ||
        g.box.z1 < DOG_PARK.z1 - 8,
      `${g.kind} blocks the gate`,
    );
  }
});

for (const seed of [7, 21, 99]) {
  test(`dogs stay inside the fence and out of the gear, and do everything (seed ${seed})`, () => {
    const world = newWorld();
    const roll = seededRng(seed);
    const seen = new Set<DogMode>();
    for (let i = 0; i < 60 * 600; i++) {
      stepWorld(world, 1 / 20, roll);
      for (const d of world.dogs) {
        seen.add(d.mode);
        assert.ok(
          inDogPark(d.x, d.z),
          `${d.kind} left the yard at ${d.x}, ${d.z}`,
        );
        for (const g of GEAR)
          assert.ok(
            !(
              d.x > g.box.x0 &&
              d.x < g.box.x1 &&
              d.z > g.box.z0 &&
              d.z < g.box.z1
            ),
            `${d.kind} stands in the ${g.kind}`,
          );
      }
    }
    for (const m of [
      "roam",
      "sniff",
      "chase",
      "drink",
      "rest",
      "fetch",
      "return",
    ] as const)
      assert.ok(seen.has(m), `no dog ever did ${m}`);
    assert.ok(
      world.fetches >= 5,
      `only ${world.fetches} fetches in ten minutes`,
    );
  });
}

test("the fetcher brings the ball back to the bench-sitter's feet", () => {
  const world = newWorld();
  const roll = seededRng(3);
  const last = world.fetches;
  for (let i = 0; i < 20 * 120 && world.fetches === last; i++)
    stepWorld(world, 1 / 20, roll);
  assert.equal(world.fetches, last + 1);
  assert.equal(world.ball.state, "rest");
  assert.ok(Math.hypot(world.ball.x - 261, world.ball.z + 297.4) < 1.5);
});

test("a dog gets to the bowl and laps at it", () => {
  const world = newWorld();
  const roll = seededRng(11);
  let lapped = false;
  for (let i = 0; i < 20 * 600 && !lapped; i++) {
    stepWorld(world, 1 / 20, roll);
    lapped = world.dogs.some(
      (d) =>
        d.mode === "drink" &&
        d.clip === "graze" &&
        Math.hypot(d.x - BOWL.x, d.z - BOWL.z) < 1.6,
    );
  }
  assert.ok(lapped);
});

test("your own pet romps by the same rules and stays in the yard", () => {
  const world = newWorld();
  const pet = newDog("cat", 265, -295);
  const roll = seededRng(5);
  for (let i = 0; i < 20 * 300; i++) {
    stepWorld(world, 1 / 20, roll);
    stepDog(pet, 1 / 20, world, roll);
    assert.ok(inDogPark(pet.x, pet.z));
  }
  assert.notEqual(pet.mode, "fetch", "only the resident fetcher plays fetch");
});
