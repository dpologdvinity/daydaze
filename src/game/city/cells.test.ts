import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_CELLS,
  CELL_SIZE,
  cellAt,
  cellsWithin,
  neighborhoodAt,
  VIEW_RADIUS,
} from "./cells.ts";
import { CITY_SPAWN } from "./layout.ts";

test("the grid is 14 cells across and 11 down, 64 m each: Little Manila west, Chinatown and Koreatown east, Beachside south", () => {
  assert.equal(ALL_CELLS.length, 154);
  assert.equal(CELL_SIZE, 64);
  const xs = ALL_CELLS.map((c) => c.x0);
  const zs = ALL_CELLS.map((c) => c.z0);
  assert.equal(Math.min(...xs), -448);
  assert.equal(Math.max(...xs) + CELL_SIZE, 448);
  assert.equal(Math.min(...zs), -320);
  assert.equal(Math.max(...zs) + CELL_SIZE, 384);
  assert.equal(new Set(ALL_CELLS.map((c) => c.key)).size, 154);
  assert.equal(neighborhoodAt([320, 0]), "chinatown-koreatown");
  assert.equal(neighborhoodAt([0, -256]), "arts-district");
  assert.equal(neighborhoodAt([-320, 0]), "little-manila");
  // the old city is Downtown and Nightlife Row; south of z 192 is Beachside
  assert.equal(neighborhoodAt([0, 300]), "beachside");
  assert.equal(neighborhoodAt([0, 100]), "downtown");
  assert.equal(cellAt([0, 300]).neighborhood, "beachside");
});

test("a point maps to the cell that holds it, clamped at the edge", () => {
  assert.equal(cellAt([-447, -319]).key, "0,0");
  assert.equal(cellAt([0, 0]).key, "7,5");
  assert.equal(cellAt([500, -500]).key, "13,0");
});

test("the cells within 160 m include the player's own cell and skip the far corners", () => {
  const near = cellsWithin(CITY_SPAWN.position, VIEW_RADIUS);
  assert.ok(near.some((c) => c.key === cellAt(CITY_SPAWN.position).key));
  assert.ok(near.length < ALL_CELLS.length);
  for (const cell of near) {
    const nx = Math.min(Math.max(CITY_SPAWN.position[0], cell.x0), cell.x1);
    const nz = Math.min(Math.max(CITY_SPAWN.position[1], cell.z0), cell.z1);
    assert.ok(
      Math.hypot(nx - CITY_SPAWN.position[0], nz - CITY_SPAWN.position[1]) <=
        VIEW_RADIUS,
    );
  }
});

test("a small radius loads only the player's cell", () => {
  const cells = cellsWithin([10, 10], 1);
  assert.deepEqual(
    cells.map((c) => c.key),
    [cellAt([10, 10]).key],
  );
});

test("cells east of the x = 64 cross street are Nightlife Row", () => {
  assert.equal(neighborhoodAt([-10, 0]), "downtown");
  assert.equal(neighborhoodAt([64, 0]), "nightlife-row");
  assert.equal(cellAt([120, 0]).neighborhood, "nightlife-row");
  assert.equal(cellAt([-120, 0]).neighborhood, "downtown");
});
