// The far city: boxes for the buildings the near plan leaves out.
import assert from "node:assert/strict";
import { test } from "node:test";
import { cellsWithin } from "./cells.ts";
import {
  FAR_BOX_TRIANGLES,
  FAR_CAPACITY,
  FAR_RANGE,
  FAR_ROADS,
  farBoxOf,
  farWorthDrawing,
} from "./far.ts";
import { BUILDINGS, isInfill } from "./layout.ts";
import { planView } from "./budget.ts";
import { isMotel } from "./nyc.ts";
import { planCity } from "./plan.ts";

test("a far box is the footprint and height, in a hex wall color", () => {
  assert.equal(FAR_CAPACITY, BUILDINGS.length);
  for (const b of BUILDINGS) {
    const box = farBoxOf(b);
    const xs = b.footprint.map(([x]) => x);
    assert.equal(box.sx, Math.max(...xs) - Math.min(...xs));
    assert.equal(box.h, b.height);
    assert.match(box.color, /^#[0-9a-f]{6}$/);
  }
  // memoized: the same box each time
  assert.equal(farBoxOf(BUILDINGS[0]!), farBoxOf(BUILDINGS[0]!));
});

test("small buildings drop out with distance, towers last, all of them past the fog", () => {
  assert.ok(farWorthDrawing(9, 100));
  assert.ok(!farWorthDrawing(9, 300));
  assert.ok(farWorthDrawing(60, 400));
  assert.ok(!farWorthDrawing(64, FAR_RANGE + 1));
});

test("with no cells loaded the far city is every building the range and size allow", () => {
  const plan = planCity([], 0, [0, 0]);
  assert.ok(plan.far.length > 100);
  assert.ok(plan.far.length < BUILDINGS.length);
  // the box list holds nothing the near plan would also draw
  const near = planView([8, 12], "low");
  const cells = cellsWithin([8, 12], 160);
  const inCells = new Set(
    BUILDINGS.filter((b) => {
      const xs = b.footprint.map(([x]) => x);
      const zs = b.footprint.map(([, z]) => z);
      return cells.some(
        (c) =>
          Math.min(...xs) < c.x1 &&
          Math.max(...xs) > c.x0 &&
          Math.min(...zs) < c.z1 &&
          Math.max(...zs) > c.z0,
      );
    })
      // (a motel past the view radius is left to the far city too)
      .filter((b) => !isInfill(b) && !isMotel(b))
      .map((b) => farBoxOf(b)),
  );
  for (const f of near.far) assert.ok(!inCells.has(f));
});

test("every road is a far strip", () => {
  assert.ok(FAR_ROADS.length > 10);
  for (const [x0, z0, x1, z1] of FAR_ROADS) assert.ok(x1 > x0 && z1 > z0);
  assert.equal(FAR_BOX_TRIANGLES, 10);
});
