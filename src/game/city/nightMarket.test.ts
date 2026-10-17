import { test } from "node:test";
import assert from "node:assert/strict";
import { isBlocked, stepInArea } from "../area.ts";
import { FOOD_ROOM_EXITS } from "../food/storefronts.ts";
import { validateLook } from "../look.ts";
import type { Vec2 } from "../walk.ts";
import { neighborhoodAt } from "./cells.ts";
import { BUILDINGS, CITY_AREA, CITY_SURFACES } from "./layout.ts";
import {
  LANTERNS,
  LANTERN_POLES,
  MARKET_FOODS,
  MARKET_PEOPLE,
  STALLS,
  nearestMarketPeople,
  stallFootprint,
} from "./nightMarket.ts";

type Box = { x0: number; z0: number; x1: number; z1: number };
const boxOf = (poly: readonly Vec2[]): Box => ({
  x0: Math.min(...poly.map(([x]) => x)),
  z0: Math.min(...poly.map(([, z]) => z)),
  x1: Math.max(...poly.map(([x]) => x)),
  z1: Math.max(...poly.map(([, z]) => z)),
});
const inside = (b: Box, [x, z]: Vec2) =>
  x >= b.x0 - 1e-9 && x <= b.x1 + 1e-9 && z >= b.z0 - 1e-9 && z <= b.z1 + 1e-9;
const overlaps = (a: Box, b: Box) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

const ROADS = CITY_SURFACES.filter((s) => s.kind === "road").map((s) =>
  boxOf(s.polygon),
);
const PAVED = CITY_SURFACES.filter(
  (s) => s.kind === "sidewalk" || s.kind === "square",
).map((s) => boxOf(s.polygon));

test("the market's stalls stand in Chinatown and Koreatown, on paving, off the road", () => {
  assert.ok(STALLS.length >= 10);
  for (const stall of STALLS) {
    const box = boxOf(stallFootprint(stall));
    for (const corner of stallFootprint(stall)) {
      assert.equal(neighborhoodAt(corner), "chinatown-koreatown");
      assert.ok(
        PAVED.some((p) => inside(p, corner)),
        `${stall.food} off the paving`,
      );
    }
    assert.ok(
      !ROADS.some((r) => overlaps(r, box)),
      `${stall.food} over a road`,
    );
    assert.ok(
      !BUILDINGS.some((b) => overlaps(boxOf(b.footprint), box)),
      `${stall.food} inside a building`,
    );
  }
  // every food on the signs has a stall
  for (const food of MARKET_FOODS)
    assert.ok(
      STALLS.some((s) => s.food === food),
      food,
    );
});

test("no stall or lantern pole stands near a door or where a doll lands leaving one", () => {
  const spots: Vec2[] = [
    ...BUILDINGS.flatMap((b) => (b.door ? [b.door.position] : [])),
    ...FOOD_ROOM_EXITS.map((e) => e.landing),
  ];
  const solid = [...STALLS.map((s) => boxOf(stallFootprint(s)))];
  for (const [x, z] of LANTERN_POLES)
    solid.push({ x0: x, z0: z, x1: x, z1: z });
  for (const spot of spots) {
    for (const b of solid) {
      const dx = Math.max(b.x0 - spot[0], 0, spot[0] - b.x1);
      const dz = Math.max(b.z0 - spot[1], 0, spot[1] - b.z1);
      assert.ok(Math.hypot(dx, dz) > 3, `blocks the door at ${spot}`);
    }
  }
});

test("the stalls are solid, and the lane between them walks in from the sidewalk", () => {
  for (const stall of STALLS) assert.ok(isBlocked(CITY_AREA, stall.at));
  let pos: Vec2 = [313, 53];
  const goal: Vec2 = [280, 53];
  for (let i = 0; i < 400; i++) pos = stepInArea(CITY_AREA, pos, goal, 0.2);
  assert.ok(Math.hypot(pos[0] - goal[0], pos[1] - goal[1]) < 0.01);
});

test("lanterns hang overhead, and every market person is a valid look", () => {
  assert.ok(LANTERNS.length > 40);
  for (const l of LANTERNS) assert.ok(l.y > 4 && Number.isFinite(l.phase));
  for (const p of MARKET_PEOPLE) assert.equal(validateLook(p.look), true);
  const near = nearestMarketPeople([290, 53], 3, 30);
  assert.equal(near.length, 3);
  assert.deepEqual(nearestMarketPeople([0, 0], 3, 30), []);
});
