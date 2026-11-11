// Tests for the street dressing: sidewalks cut back from the cross streets,
// the corner blocks and crosswalks that take their place, center lines,
// props, and the costs the budget prices them at.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ALL_CELLS, cellsWithin } from "./cells.ts";
import { SHORE_Z, SIDEWALK } from "./layout.ts";
import { drawCallsOf, planCity, trianglesOf } from "./plan.ts";
import {
  STREET_KINDS,
  STREET_TRIANGLES,
  cornerYaw,
  cornerBlocks,
  roadBoxes,
  sidewalkPieces,
  streetPieces,
  type Box,
} from "./streetPieces.ts";

type Kit = {
  meshes: { name: string; primitives: { indices: number }[] }[];
  accessors: { count: number }[];
};
const isKit = (v: unknown): v is Kit =>
  typeof v === "object" &&
  v !== null &&
  "meshes" in v &&
  Array.isArray(v.meshes) &&
  "accessors" in v &&
  Array.isArray(v.accessors);

const overlaps = (a: Box, b: Box) =>
  Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 1e-6 &&
  Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > 1e-6;
const area = (b: Box) => (b.x1 - b.x0) * (b.z1 - b.z0);
const inside = (x: number, z: number, b: Box) =>
  x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
const all = streetPieces(ALL_CELLS);
const crosswalksNear = (x: number, z: number, r = 12) =>
  all.filter((p) => p.kind === "crosswalk" && Math.hypot(p.x - x, p.z - z) < r);

test("no paved sidewalk runs across a road", () => {
  for (const s of sidewalkPieces())
    for (const r of roadBoxes())
      assert.ok(!overlaps(s, r), JSON.stringify([s, r]));
});

test("cutting the cross streets out takes away only the mouths and the corner blocks", () => {
  const before = sidewalkPieces({ cut: false });
  const after = sidewalkPieces();
  const lost =
    before.reduce((n, b) => n + area(b), 0) -
    after.reduce((n, b) => n + area(b), 0);
  assert.ok(lost > 0);
  // every lost square meter is a road mouth or a corner block
  const blocks = cornerBlocks();
  let expected = 0;
  for (const b of before) {
    for (const r of roadBoxes()) {
      if (!overlaps(b, r)) continue;
      expected +=
        (Math.min(b.x1, r.x1) - Math.max(b.x0, r.x0)) *
        (Math.min(b.z1, r.z1) - Math.max(b.z0, r.z0));
    }
  }
  // blocks overlap two sidewalks each and sit beside a road, not on it
  const blockArea = blocks.reduce((n, b) => n + area(b), 0);
  assert.ok(lost >= expected - 1e-6);
  assert.ok(lost <= expected + 2 * blockArea + 1e-6);
});

test("a four-way crossing has four corner blocks, each a sidewalk square beside two roads", () => {
  // Main Avenue (z -7..7) crosses the cross street at x -69..-59
  const near = cornerBlocks().filter(
    (b) => b.x0 > -80 && b.x1 < -48 && b.z0 > -14 && b.z1 < 14,
  );
  assert.equal(near.length, 4);
  for (const b of near) {
    assert.equal(b.x1 - b.x0, SIDEWALK);
    assert.equal(b.z1 - b.z0, SIDEWALK);
    for (const r of roadBoxes()) assert.ok(!overlaps(b, r));
  }
  assert.ok(
    near.some((b) => b.x0 === -73 && b.z0 === 7),
    "south-west block",
  );
});

test("a corner block's rounded kerb turns toward the crossing", () => {
  // the model rounds its -x, +z corner; turned about y, that corner must
  // land on each of the four diagonals
  const rotate = (yaw: number, [x, z]: [number, number]) => [
    Math.round(x * Math.cos(yaw) + z * Math.sin(yaw)),
    Math.round(-x * Math.sin(yaw) + z * Math.cos(yaw)),
  ];
  for (const toward of [
    [-1, 1],
    [1, 1],
    [1, -1],
    [-1, -1],
  ] as const)
    assert.deepEqual(rotate(cornerYaw(toward[0], toward[1]), [-1, 1]), [
      ...toward,
    ]);
});

test("every crosswalk lies on a road, as long as the road is wide", () => {
  const roads = roadBoxes();
  const crosswalks = all.filter((p) => p.kind === "crosswalk");
  assert.ok(crosswalks.length > 20);
  for (const c of crosswalks) {
    const road = roads.find((r) => inside(c.x, c.z, r));
    assert.ok(road, `crosswalk at ${c.x}, ${c.z}`);
    const across =
      Math.abs(c.yaw) < 1e-6 ? road.z1 - road.z0 : road.x1 - road.x0;
    // the decal is 11.42 m long, stretched to fit the road less a margin
    assert.ok(Math.abs(c.sz * 11.42 - (across - 1)) < 0.01, `${c.x}, ${c.z}`);
  }
});

test("Main Avenue and its cross street each get crosswalks at the four corners", () => {
  const near = crosswalksNear(-64, 0, 12);
  assert.equal(near.length, 4);
  // two across the avenue, in line with the cross street's sidewalks
  const across = near.filter((c) => Math.abs(c.yaw) < 1e-6);
  assert.deepEqual(
    across.map((c) => c.x).sort((a, b) => a - b),
    [-71, -57],
  );
  // two across the cross street, in line with the avenue's
  const stem = near.filter((c) => Math.abs(c.yaw) > 1e-6);
  assert.deepEqual(
    stem.map((c) => c.z).sort((a, b) => a - b),
    [-9, 9],
  );
});

test("a T has one crosswalk, across its stem", () => {
  // Gallery Row's cross street branches south off the avenue at x -64
  const stem = crosswalksNear(-64, -256, 12);
  assert.equal(stem.length, 1);
});

test("a stop word waits before a cross street's crossing, a slow word before Shore Boulevard's", () => {
  const stops = all.filter((p) => p.kind === "stop");
  const slows = all.filter((p) => p.kind === "slow");
  assert.ok(stops.length > 4);
  assert.ok(slows.length >= 2);
  for (const s of slows)
    assert.ok(Math.abs(s.z - SHORE_Z) < 22, `slow at ${s.z}`);
  for (const s of stops) assert.ok(Math.abs(s.z - SHORE_Z) > 9);
});

test("double yellow lines run down the wide roads and stop short of every crossing", () => {
  const lines = all.filter((p) => p.kind === "doubleYellow");
  assert.ok(lines.length > 100);
  const roads = roadBoxes();
  for (const l of lines) {
    const road = roads.find((r) => inside(l.x, l.z, r));
    assert.ok(road, `line at ${l.x}, ${l.z}`);
    assert.ok(
      Math.min(road.x1 - road.x0, road.z1 - road.z0) >= 12,
      "only roads of two wide lanes",
    );
    for (const c of all.filter((p) => p.kind === "crosswalk"))
      assert.ok(Math.hypot(l.x - c.x, l.z - c.z) > 3, "clear of crosswalks");
  }
});

test("manholes sit on the road clear of the crossings, drains on the kerb, bollards on the corner blocks", () => {
  const roads = roadBoxes();
  const blocks = cornerBlocks();
  const kinds = (k: string) => all.filter((p) => p.kind === k);
  assert.ok(kinds("manhole").length > 20);
  for (const m of kinds("manhole"))
    assert.ok(
      roads.some((r) => inside(m.x, m.z, r)),
      "manhole on a road",
    );
  assert.ok(kinds("drain").length >= 8);
  for (const d of kinds("drain"))
    assert.ok(
      roads.some((r) => inside(d.x, d.z, r)),
      "drain in a road",
    );
  assert.ok(kinds("bollard").length >= 8);
  for (const b of kinds("bollard"))
    assert.ok(
      blocks.some((blk) => inside(b.x, b.z, blk)),
      "bollard on a corner block",
    );
  assert.equal(kinds("corner").length, blocks.length);
});

test("a view of the city holds only the pieces in its cells", () => {
  const cells = cellsWithin([-64, 0], 40);
  const some = streetPieces(cells);
  assert.ok(some.length > 0 && some.length < all.length);
  for (const p of some)
    assert.ok(
      cells.some((c) => inside(p.x, p.z, c)),
      `${p.kind} at ${p.x}, ${p.z}`,
    );
});

test("the costs match the shipped street kit", () => {
  const bytes = readFileSync(
    new URL("../../../public/models/street/kit.glb", import.meta.url),
  );
  const json: unknown = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  if (!isKit(json)) throw new Error("not a glTF");
  const kit: Kit = json;
  for (const kind of STREET_KINDS) {
    const meshes = kit.meshes.filter((m) => m.name === kind);
    assert.equal(meshes.length, 1, `${kind} is in the kit once`);
    const primitives = meshes[0]?.primitives ?? [];
    assert.equal(primitives.length, 1, kind);
    const indices = primitives[0]?.indices ?? -1;
    const count = kit.accessors[indices]?.count ?? 0;
    assert.equal(count / 3, STREET_TRIANGLES[kind], kind);
  }
});

test("the plan carries the pieces and prices them: their triangles and two draw calls", () => {
  const cells = cellsWithin([-64, 0], 60);
  const plan = planCity(cells, 0, [-64, 0]);
  assert.deepEqual(plan.street, streetPieces(cells));
  const bare = { ...plan, street: [] };
  const extra = plan.street.reduce((n, p) => n + STREET_TRIANGLES[p.kind], 0);
  assert.ok(extra > 1000);
  assert.equal(trianglesOf(plan) - trianglesOf(bare), extra);
  assert.equal(drawCallsOf(plan) - drawCallsOf(bare), 2);
  // wide roads wear the decal line, so the dashes are gone from them
  assert.ok(plan.instances.lane.every((d) => !(d.sz === 0.25 && d.z === 0)));
});
