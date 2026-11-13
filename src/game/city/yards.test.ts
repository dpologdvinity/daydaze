// The yards between the rows of buildings: uses that fit, props that stay
// inside and clear of the walls, cheap to lay out.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pointInPolygon, type Vec2 } from "../walk.ts";
import { BUILDINGS, CITY_SURFACES } from "./layout.ts";
import { fits } from "./infill.ts";
import {
  YARD_CARS,
  YARD_FURNITURE,
  YARD_GROUND,
  YARD_TREES,
  YARDS,
  type Rect,
} from "./yards.ts";

const inside = (r: Rect, [x, z]: Vec2, pad = 0) =>
  x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
const overlap = (a: Rect, b: Rect, eps: number) =>
  a.x0 < b.x1 - eps &&
  b.x0 < a.x1 - eps &&
  a.z0 < b.z1 - eps &&
  b.z0 < a.z1 - eps;

test("each yard has a use that fits its size, and none overlaps another or a building", () => {
  assert.ok(YARDS.length >= 100, `${YARDS.length} yards`);
  for (const y of YARDS)
    assert.ok(fits(y.kind, y) || y.kind === "alley", `${y.kind}`);
  for (const [i, a] of YARDS.entries())
    for (const b of YARDS.slice(i + 1))
      assert.ok(!overlap(a, b, 1e-6), `${a.kind} and ${b.kind} overlap`);
  const footprints = BUILDINGS.map((b) => ({
    x0: Math.min(...b.footprint.map((p) => p[0])),
    x1: Math.max(...b.footprint.map((p) => p[0])),
    z0: Math.min(...b.footprint.map((p) => p[1])),
    z1: Math.max(...b.footprint.map((p) => p[1])),
  }));
  for (const y of YARDS)
    for (const f of footprints)
      assert.ok(!overlap(y, f, 0.3), `a ${y.kind} yard overlaps a building`);
});

test("the neighborhoods get their own kinds: back alleys between rows, Suburbia backyards, the beach sand", () => {
  assert.ok(new Set(YARDS.map((y) => y.kind)).size >= 5, "five or more uses");
  for (const y of YARDS) {
    if (y.neighborhood === "suburbia")
      assert.ok(["backyard", "park", "garden"].includes(y.kind), y.kind);
    if (y.kind === "backyard") assert.equal(y.neighborhood, "suburbia");
    if (y.kind === "sand")
      assert.ok(["beachside", "fairground"].includes(y.neighborhood));
  }
  assert.ok(YARDS.filter((y) => y.kind === "backalley").length >= 40);
});

test("everything in a yard stands inside it and clear of the walls", () => {
  const where = (p: Vec2) => YARDS.find((y) => inside(y, p, 0.9));
  for (const f of YARD_FURNITURE)
    assert.ok(where([f.x, f.z]), `${f.kind} at ${f.x},${f.z}`);
  for (const t of YARD_TREES) assert.ok(where(t), `tree at ${t}`);
  for (const c of YARD_CARS)
    assert.ok(where([c.x, c.z]), `car at ${c.x},${c.z}`);
  for (const f of YARD_FURNITURE)
    for (const b of BUILDINGS)
      assert.ok(
        !pointInPolygon(b.footprint, [f.x, f.z]),
        `${f.kind} in ${b.id}`,
      );
  for (const f of YARD_FURNITURE)
    for (const s of CITY_SURFACES)
      assert.ok(
        !pointInPolygon(s.polygon, [f.x, f.z]),
        `${f.kind} on a street at ${f.x},${f.z}`,
      );
});

test("alleys have their dumpsters, lots their cars, courts the court model, and the yards their trees and fences", () => {
  const count = (kind: string) =>
    YARD_FURNITURE.filter((f) => f.kind === kind).length;
  assert.ok(count("dumpster") >= 50 && count("bag") >= 50);
  assert.ok(count("court") >= 1);
  assert.ok(count("fence-chain") >= 40);
  assert.ok(YARD_TREES.length >= 30);
  assert.ok(YARD_CARS.length >= 20, `${YARD_CARS.length} cars`);
  // cars do not overlap one another (a stall is 2.7 m)
  for (const [i, a] of YARD_CARS.entries())
    for (const b of YARD_CARS.slice(i + 1))
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 2, `cars at ${a.x},${a.z}`);
});

test("yard ground is laid in pieces a cell can own, and low", () => {
  assert.ok(YARD_GROUND.length > 100);
  for (const g of YARD_GROUND) {
    assert.ok(
      Math.max(g.instance.sx, g.instance.sz) <= 48.001 || g.kind === "lane",
    );
    assert.ok(g.instance.y + g.instance.sy / 2 < 0.6, "no tall slab");
  }
});

test("the yards' props are a few thousand pieces, laid out at load without a stall", async () => {
  assert.ok(YARD_FURNITURE.length < 6000, `${YARD_FURNITURE.length} props`);
  assert.ok(YARD_GROUND.length < 3000, `${YARD_GROUND.length} slabs`);
  // fresh copies of the module, timed (the best of three, so a busy machine
  // does not fail it): the planning is pre-computed, so only the laying out
  // is left, about 10 to 25 ms
  let best = Infinity;
  for (let k = 0; k < 3; k++) {
    const t0 = performance.now();
    await import(`./yards.ts?fresh=${k}-${Date.now()}`);
    best = Math.min(best, performance.now() - t0);
  }
  assert.ok(best < 80, `${best} ms`);
});
