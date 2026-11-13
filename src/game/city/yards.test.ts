// The block yards: gaps found clear of everything, cut into yards that suit
// their neighborhood, filled with props that stay inside and clear of walls.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pointInPolygon, type Vec2 } from "../walk.ts";
import { BUILDINGS, CITY_AREA } from "./layout.ts";
import {
  YARD_CARS,
  YARD_FURNITURE,
  YARD_GROUND,
  YARD_TREES,
  YARDS,
  freeRects,
  type Rect,
  type Yard,
} from "./yards.ts";

const inside = (r: Rect, [x, z]: Vec2, pad = 0) =>
  x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;
/** The corners and center of a rectangle: a cheap overlap probe. */
const probes = (r: Rect): Vec2[] => [
  [r.x0, r.z0],
  [r.x1, r.z0],
  [r.x1, r.z1],
  [r.x0, r.z1],
  [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2],
];
const solids: readonly (readonly Vec2[])[] = [
  ...CITY_AREA.surfaces,
  ...CITY_AREA.blockers,
  ...BUILDINGS.map((b) => b.footprint),
];

test("the gaps are real: big, and clear of every surface, building and solid", () => {
  const gaps = freeRects();
  assert.ok(gaps.length >= 20, `${gaps.length} gaps`);
  const area = gaps.reduce((n, g) => n + (g.x1 - g.x0) * (g.z1 - g.z0), 0);
  assert.ok(area > 150_000, `${area} m2`);
  for (const g of gaps) {
    assert.ok(g.x1 - g.x0 >= 8 && g.z1 - g.z0 >= 8);
    for (const p of probes(g))
      for (const s of solids)
        assert.ok(!pointInPolygon(s, p), `${p} is inside a solid`);
  }
});

test("yards cover the gaps and each has a use that fits its size", () => {
  const area = YARDS.reduce((n, y) => n + (y.x1 - y.x0) * (y.z1 - y.z0), 0);
  assert.ok(area > 140_000, `${area} m2 of yards`);
  for (const y of YARDS) {
    const lo = Math.min(y.x1 - y.x0, y.z1 - y.z0);
    if (y.kind === "park") assert.ok(lo >= 14, "a park is not a strip");
    if (y.kind === "lot") assert.ok(lo >= 12);
    if (y.kind === "court")
      assert.ok(Math.max(y.x1 - y.x0, y.z1 - y.z0) >= 30 && lo >= 16);
  }
  // no two yards overlap
  for (const [i, a] of YARDS.entries())
    for (const b of YARDS.slice(i + 1))
      assert.ok(
        a.x1 <= b.x0 + 1e-6 ||
          b.x1 <= a.x0 + 1e-6 ||
          a.z1 <= b.z0 + 1e-6 ||
          b.z1 <= a.z0 + 1e-6,
        `${a.kind} and ${b.kind} overlap`,
      );
});

test("the neighborhoods get their own kinds: Downtown lots and alleys, Suburbia backyards", () => {
  const kinds = (n: Yard["neighborhood"]) =>
    new Set(YARDS.filter((y) => y.neighborhood === n).map((y) => y.kind));
  assert.ok(new Set(YARDS.map((y) => y.kind)).size >= 5, "five or more uses");
  for (const y of YARDS) {
    if (y.neighborhood === "suburbia")
      assert.ok(["backyard", "park", "garden"].includes(y.kind), y.kind);
    if (y.kind === "backyard") assert.equal(y.neighborhood, "suburbia");
    if (y.kind === "sand")
      assert.ok(["beachside", "fairground"].includes(y.neighborhood));
  }
  assert.ok(kinds("downtown").size + kinds("little-manila").size >= 4);
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
});

test("a lot parks cars in its stalls, a court has its model, an alley its dumpsters", () => {
  assert.ok(YARDS.some((y) => y.kind === "lot"));
  assert.ok(YARD_CARS.length >= 40, `${YARD_CARS.length} cars`);
  const count = (kind: string) =>
    YARD_FURNITURE.filter((f) => f.kind === kind).length;
  assert.ok(count("dumpster") >= 8 && count("bag") >= 8);
  assert.equal(count("court") >= 1, true);
  assert.ok(count("fence-chain") > 30 && count("fence-wood") > 20);
  assert.ok(YARD_TREES.length > 30);
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

test("the yards are the same on every load", () => {
  assert.deepEqual(freeRects(), freeRects());
});
