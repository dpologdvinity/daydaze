import { test } from "node:test";
import assert from "node:assert/strict";
import * as MARKET from "./market.ts";
import * as BAR from "./arcadeBar.ts";
import * as ARCADE from "./boardwalkArcade.ts";
import { pointInPolygon, type Vec2 } from "./walk.ts";
import {
  DRINKS,
  REACH,
  ROOM_MACHINES,
  buyDrink,
  machineBox,
  machineColor,
  machineNear,
} from "./vending.ts";

const ROOMS = {
  market: MARKET,
  "arcade-bar": BAR,
  "boardwalk-arcade": ARCADE,
} as const;

/** The corners' bounding rectangle. */
const bounds = (poly: readonly Vec2[]) => ({
  x0: Math.min(...poly.map((p) => p[0])),
  x1: Math.max(...poly.map((p) => p[0])),
  z0: Math.min(...poly.map((p) => p[1])),
  z1: Math.max(...poly.map((p) => p[1])),
});

test("a room machine stands against a wall, blocks the floor there alone, and has room in front", () => {
  for (const [room, machines] of Object.entries(ROOM_MACHINES)) {
    const { FLOOR, BLOCKERS } = ROOMS[room as keyof typeof ROOMS];
    const f = bounds(FLOOR);
    for (const m of machines) {
      const b = bounds(machineBox(m));
      // inside the floor, touching a wall
      assert.ok(b.x0 >= f.x0 - 1e-9 && b.x1 <= f.x1 + 1e-9, room);
      assert.ok(b.z0 >= f.z0 - 1e-9 && b.z1 <= f.z1 + 1e-9, room);
      assert.ok(
        [b.x0 - f.x0, f.x1 - b.x1, b.z0 - f.z0, f.z1 - b.z1].some(
          (gap) => gap < 0.15,
        ),
        `${room} against a wall`,
      );
      // its own blocker is in the room's list, and nothing else covers it
      assert.equal(
        BLOCKERS.filter((p) => pointInPolygon(p, [m.x, m.z])).length,
        1,
        room,
      );
      const front: Vec2 = [
        m.x + Math.sin(m.yaw) * 1.2,
        m.z + Math.cos(m.yaw) * 1.2,
      ];
      assert.ok(pointInPolygon(FLOOR, front), `${room} front on the floor`);
      assert.ok(
        !BLOCKERS.some((p) => pointInPolygon(p, front)),
        `${room} front is clear`,
      );
    }
  }
});

test("a machine is near within reach and not beyond it", () => {
  const m = { x: 0, z: 0, yaw: 0 };
  assert.ok(machineNear([m], 0, 1));
  assert.ok(!machineNear([m], 0, REACH + 1));
  assert.ok(!machineNear([], 0, 0));
});

test("a drink costs its price and no more than the wallet holds", () => {
  const d = DRINKS[0];
  assert.equal(buyDrink(10, d.id), 10 - d.price);
  assert.equal(buyDrink(d.price - 1, d.id), null);
  assert.equal(buyDrink(10, "nope"), null);
});

test("the soda has made-up brands and costs a few coins", () => {
  assert.ok(DRINKS.length >= 3);
  for (const d of DRINKS) assert.ok(d.price >= 1 && d.price <= 5);
  assert.equal(new Set(DRINKS.map((d) => d.id)).size, DRINKS.length);
});

test("machine colors are brand colors, steady, and not all one", () => {
  const colors = DRINKS.map((d) => d.color) as string[];
  const spots = Array.from({ length: 40 }, (_, i) => ({ x: i * 13.7, z: 9.9 }));
  for (const m of spots) {
    assert.ok(colors.includes(machineColor(m)));
    assert.equal(machineColor(m), machineColor({ ...m }));
  }
  assert.ok(new Set(spots.map(machineColor)).size > 1);
});
