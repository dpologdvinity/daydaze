import { test } from "node:test";
import assert from "node:assert/strict";
import type { Vec2 } from "../walk.ts";
import {
  ALL_CELLS,
  cellAt,
  cellsWithin,
  VIEW_RADIUS,
  type Cell,
} from "./cells.ts";
import { BUILDINGS, CITY_SPAWN } from "./layout.ts";
import { drawCallsOf, KINDS, planCity, trianglesOf } from "./plan.ts";

const origin: [number, number] = [0, 0];

function insideCells(
  p: { x: number; z: number },
  cells: readonly Cell[],
): boolean {
  return cells.some(
    (c) =>
      p.x >= c.x0 - 1e-6 &&
      p.x <= c.x1 + 1e-6 &&
      p.z >= c.z0 - 1e-6 &&
      p.z <= c.z1 + 1e-6,
  );
}

test("the full city draws every building and every neon sign", () => {
  const plan = planCity(ALL_CELLS, 0, origin);
  assert.equal(plan.instances.body.length, BUILDINGS.length);
  assert.equal(
    plan.instances.sign.length,
    BUILDINGS.filter((b) => b.sign).length,
  );
  assert.equal(
    plan.instances.queue.length,
    BUILDINGS.filter((b) => b.queue).length * 3,
  );
});

test("only the cells in view are drawn", () => {
  const corner: [number, number] = [-170, 170];
  const cells = cellsWithin(corner, 60);
  const plan = planCity(cells, 0, corner);
  assert.ok(plan.instances.body.length < BUILDINGS.length);
  // building kit (tanks, antennas) hangs off a building drawn whole, so it can
  // stand just outside the view; the ground kinds are clipped to the cells
  for (const kind of ["road", "sidewalk", "lane", "palmTrunk"] as const) {
    for (const i of plan.instances[kind]) {
      assert.ok(
        insideCells(i, cells),
        `${kind} at ${i.x},${i.z} is outside the view`,
      );
    }
  }
});

test("a building is drawn when any of its cells is in view", () => {
  const cell = cellAt([-160, 30]);
  const plan = planCity([cell], 0, origin);
  const expected = BUILDINGS.filter((b) =>
    b.footprint.some(
      ([x, z]) => x >= cell.x0 && x <= cell.x1 && z >= cell.z0 && z <= cell.z1,
    ),
  );
  assert.ok(expected.length > 0, "the test cell should hold a building");
  assert.equal(plan.instances.body.length, expected.length);
});

test("the real lights are the neon signs nearest the player", () => {
  const plan = planCity(ALL_CELLS, 2, [110, -20]);
  assert.equal(plan.lights.length, 2);
  const [first, second] = plan.lights;
  const dist = (l: { x: number; z: number }) => Math.hypot(l.x - 110, l.z + 20);
  assert.ok(dist(first) <= dist(second));
  // the nearest sign to the Velvet Room is its own
  assert.ok(dist(first) < 30, `nearest light is ${dist(first)} m away`);
});

test("no light count leaves a plan with more lights than asked", () => {
  assert.equal(planCity(ALL_CELLS, 0, origin).lights.length, 0);
  assert.ok(planCity(ALL_CELLS, 6, origin).lights.length <= 6);
});

test("wherever she stands, the streamed city fits the low tier budget: under 250 draw calls and 300k triangles", () => {
  // only the cells within VIEW_RADIUS are ever drawn, so the budget is per
  // view: sample the whole city on a 32 m grid
  let worst: { tris: number; at: Vec2 } = { tris: 0, at: [0, 0] };
  for (let x = -432; x <= 176; x += 32) {
    for (let z = -304; z <= 368; z += 32) {
      const at: Vec2 = [x, z];
      const plan = planCity(cellsWithin(at, VIEW_RADIUS), 2, at);
      assert.ok(
        drawCallsOf(plan) <= 250,
        `${drawCallsOf(plan)} draw calls at ${at}`,
      );
      const tris = trianglesOf(plan);
      if (tris > worst.tris) worst = { tris, at };
    }
  }
  assert.ok(worst.tris < 300_000, `${worst.tris} triangles at ${worst.at}`);
  assert.ok(drawCallsOf(planCity([], 2, origin)) === 0);
});

test("the streamed view stays inside the budget too", () => {
  const cells = cellsWithin(CITY_SPAWN.position, VIEW_RADIUS);
  const plan = planCity(cells, 2, CITY_SPAWN.position);
  assert.ok(drawCallsOf(plan) <= KINDS.length);
  assert.ok(trianglesOf(plan) < 300_000);
});

test("every instance has a finite position and a positive size", () => {
  const plan = planCity(ALL_CELLS, 2, origin);
  for (const kind of KINDS) {
    for (const i of plan.instances[kind]) {
      for (const v of [i.x, i.y, i.z, i.sx, i.sy, i.sz])
        assert.ok(Number.isFinite(v), kind);
      assert.ok(i.sx > 0 && i.sy > 0 && i.sz > 0, kind);
    }
  }
});
