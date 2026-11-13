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
import { isMotel } from "./nyc.ts";
import { BAY_RANGE } from "./tuning.ts";
import { LOT_NEAR } from "./districts.ts";
import {
  drawCallsOf,
  CORNICE_COLOR,
  FACADE_KINDS,
  facadeOf,
  wearsNeon,
  KINDS,
  GARDEN_FIRST,
  isGardenAt,
  planCity,
  TREE_VARIANTS,
  trianglesOf,
  type CityPlan,
} from "./plan.ts";

const origin: [number, number] = [0, 0];

/** Buildings drawn: one facade instance each, whatever its material. */
const facades = (plan: CityPlan) =>
  FACADE_KINDS.reduce((n, k) => n + plan.instances[k].length, 0);

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
  // the motels (Palm Court, 184 m south of the origin) are past the view radius
  const plan = planCity(ALL_CELLS, 0, origin);
  assert.equal(facades(plan), BUILDINGS.filter((b) => !isMotel(b)).length);
  assert.equal(
    plan.instances.sign.length,
    BUILDINGS.filter((b) => b.sign).length,
  );
  const court = planCity(ALL_CELLS, 0, [0, 250]);
  assert.ok(facades(court) > facades(plan), "motels near Palm Court are drawn");
});

test("each building's walls take its style's material", () => {
  assert.equal(facadeOf("brick"), "brick");
  assert.equal(facadeOf("storefront"), "brick");
  assert.equal(facadeOf("club"), "stucco");
  assert.equal(facadeOf("tower"), "concrete");
  assert.equal(facadeOf("warehouse"), "siding");
  assert.equal(facadeOf("glass"), "curtain");
  const plan = planCity(ALL_CELLS, 0, origin);
  for (const kind of FACADE_KINDS)
    assert.equal(
      plan.instances[kind].length,
      BUILDINGS.filter((b) => !isMotel(b) && facadeOf(b.style) === kind).length,
      kind,
    );
});

test("only the cells in view are drawn", () => {
  const corner: [number, number] = [-170, 170];
  const cells = cellsWithin(corner, 60);
  const plan = planCity(cells, 0, corner);
  assert.ok(facades(plan) < BUILDINGS.length);
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
  assert.equal(facades(plan), expected.length);
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
  for (let x = -432; x <= 432; x += 32) {
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

test("only nightlife buildings wear neon; the rest get stone cornices", () => {
  assert.equal(wearsNeon("club"), true);
  assert.equal(wearsNeon("velvet"), true);
  assert.equal(wearsNeon("brick"), false);
  assert.equal(wearsNeon("storefront"), false);
  // one plain building on its own: cornices at each floor, no neon bands
  const plain = BUILDINGS.find((b) => !wearsNeon(b.style) && b.height > 9);
  assert.ok(plain);
  const cell = cellAt(plain.footprint[0] ?? [0, 0]);
  const plan = planCity([cell], 0, origin);
  const bandsOnIt = plan.instances.band.filter(
    (i) =>
      Math.abs(i.x - (plain.footprint[0]?.[0] ?? 0)) < 40 &&
      Math.abs(i.z - (plain.footprint[0]?.[1] ?? 0)) < 40 &&
      BUILDINGS.filter((b) => b !== plain && wearsNeon(b.style)).every(
        (b) =>
          Math.hypot(
            i.x - (b.footprint[0]?.[0] ?? 0),
            i.z - (b.footprint[0]?.[1] ?? 0),
          ) > 60,
      ),
  );
  assert.equal(bandsOnIt.length, 0);
  assert.ok(plan.instances.ledge.some((l) => l.color === CORNICE_COLOR));
});

test("street trees come as spots for the tree models, not boxes and balls", () => {
  const plan = planCity(ALL_CELLS, 0, origin);
  const props = BUILDINGS.length; // keep the import used
  assert.ok(props > 0);
  assert.ok(plan.trees.length > 50, `${plan.trees.length} trees`);
  for (const t of plan.trees) {
    assert.ok(
      Number.isInteger(t.variant) &&
        t.variant >= 0 &&
        t.variant < TREE_VARIANTS,
    );
    assert.ok(t.scale > 0.6 && t.scale < 1.4);
  }
  // every variant shows up, so streets aren't one tree cloned
  assert.equal(new Set(plan.trees.map((t) => t.variant)).size, TREE_VARIANTS);
  // birches and maples grow on Suburbia's and the park's lawns, not on the avenues
  const garden = (t: { variant: number }) => t.variant >= GARDEN_FIRST;
  for (const t of plan.trees)
    if (garden(t)) assert.ok(isGardenAt(t.x, t.z), `${t.x},${t.z}`);
  const lawns = plan.trees.filter((t) => isGardenAt(t.x, t.z));
  assert.ok(
    lawns.length > 20 && lawns.filter(garden).length > lawns.length / 3,
  );
  // the old sphere canopies are only the palms' coconuts now
  assert.ok(plan.instances.treeTrunk.length === 0);
  // the same spot always grows the same tree
  assert.deepEqual(planCity(ALL_CELLS, 0, origin).trees, plan.trees);
});

test("the five districts wear district lots near the player, Downtown wears bays", () => {
  // Little Manila, Chinatown, Koreatown, the Arts District and Uptown
  for (const at of [
    [-300, -8],
    [262, -8],
    [372, -8],
    [-96, -256],
    [264, -256],
  ] satisfies Vec2[]) {
    const plan = planCity(cellsWithin(at, VIEW_RADIUS), 2, at, BAY_RANGE.low);
    assert.ok(plan.lots.length > 10, `lots at ${at}`);
    // the shop boards ride on the plan's panels and labels
    assert.ok(plan.lots.some((l) => l.sign !== null));
    assert.ok(plan.lots.every((l) => !l.back || l.sign === null));
  }
  const downtown: Vec2 = [-30, -6];
  const plan = planCity(
    cellsWithin(downtown, VIEW_RADIUS),
    2,
    downtown,
    BAY_RANGE.low,
  );
  assert.ok(plan.bays.length > 0, "Downtown keeps its bays");
});

test("a block wears lots or bays, never both; far blocks are plain boxes", () => {
  const at: Vec2 = [-300, -8];
  const near = planCity(cellsWithin(at, VIEW_RADIUS), 2, at, BAY_RANGE.low);
  const none = planCity(cellsWithin(at, VIEW_RADIUS), 2, at, 0);
  assert.equal(none.lots.length, 0);
  assert.equal(none.bays.length, 0);
  const reach = BAY_RANGE.low * 0.85;
  for (const lot of near.lots)
    assert.ok(
      Math.hypot(lot.x - at[0], lot.z - at[1]) < reach + 40,
      "lots stay within the lot range plus the block's own size",
    );
});

test("lots past LOT_NEAR from the player draw their far twin, nearer ones the full model", () => {
  const at: Vec2 = [262, -8];
  const plan = planCity(cellsWithin(at, VIEW_RADIUS), 2, at, BAY_RANGE.low);
  assert.ok(plan.lots.some((l) => l.far) && plan.lots.some((l) => !l.far));
  for (const lot of plan.lots)
    assert.equal(lot.far, Math.hypot(lot.x - at[0], lot.z - at[1]) >= LOT_NEAR);
});
