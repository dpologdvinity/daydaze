// The infill plan: fresh, clear of everything, built in rows that face the
// streets, and suited to each neighborhood.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pointInPolygon, type Vec2 } from "../walk.ts";
import { neighborhoodAt } from "./cells.ts";
import { hash } from "./hash.ts";
import { planInfill, type Rect } from "./infill.ts";
import {
  INFILL_BUILDINGS,
  INFILL_LANES,
  INFILL_YARDS,
} from "./infill.generated.ts";
import { infillInput } from "./infillInput.ts";
import { BASE_BUILDINGS, CITY_SURFACES, BASE_SOLIDS } from "./layout.ts";

const plan = planInfill(infillInput(neighborhoodAt));
const rectOf = (b: readonly (readonly Vec2[])[]): Rect[] =>
  b.map((poly) => ({
    x0: Math.min(...poly.map((p) => p[0])),
    x1: Math.max(...poly.map((p) => p[0])),
    z0: Math.min(...poly.map((p) => p[1])),
    z1: Math.max(...poly.map((p) => p[1])),
  }));
const overlaps = (a: Rect, b: Rect, eps = 0.05) =>
  a.x0 < b.x1 - eps &&
  b.x0 < a.x1 - eps &&
  a.z0 < b.z1 - eps &&
  b.z0 < a.z1 - eps;

test("the generated file is the plan the layout gives today (regenerate with scripts/gen-infill.ts)", () => {
  assert.deepEqual(
    INFILL_BUILDINGS.map(([id, nb, x0, z0, x1, z1, h, style, front]) => ({
      id,
      neighborhood: nb,
      rect: { x0, z0, x1, z1 },
      height: h,
      style,
      front,
    })),
    plan.buildings,
  );
  assert.deepEqual(
    INFILL_YARDS.map(([kind, nb, x0, z0, x1, z1]) => ({
      kind,
      neighborhood: nb,
      rect: { x0, z0, x1, z1 },
    })),
    plan.yards,
  );
  assert.deepEqual(
    INFILL_LANES.map(([x0, z0, x1, z1]) => ({ x0, z0, x1, z1 })),
    plan.lanes,
  );
});

test("the infill is a real number of buildings, none on a street, a solid or another building", () => {
  assert.ok(plan.buildings.length >= 200, `${plan.buildings.length}`);
  const base = rectOf(BASE_BUILDINGS.map((b) => b.footprint));
  const solids = rectOf(BASE_SOLIDS);
  const surfaces = CITY_SURFACES.map((s) => s.polygon);
  for (const b of plan.buildings) {
    for (const other of [...base, ...solids])
      assert.ok(!overlaps(b.rect, other), `${b.id} overlaps a base solid`);
    for (const poly of surfaces)
      for (const p of [
        [b.rect.x0 + 0.1, b.rect.z0 + 0.1],
        [b.rect.x1 - 0.1, b.rect.z1 - 0.1],
        [(b.rect.x0 + b.rect.x1) / 2, (b.rect.z0 + b.rect.z1) / 2],
      ] satisfies Vec2[])
        assert.ok(!pointInPolygon(poly, p), `${b.id} stands on a surface`);
  }
  for (const [i, a] of plan.buildings.entries())
    for (const b of plan.buildings.slice(i + 1))
      assert.ok(!overlaps(a.rect, b.rect), `${a.id} overlaps ${b.id}`);
});

test("rows stand back to back with a narrow alley or a pocket yard between, and lanes between blocks", () => {
  assert.ok(plan.lanes.length >= 10);
  const alleys = plan.yards.filter((y) => y.kind === "backalley");
  assert.ok(alleys.length >= 40, `${alleys.length} alleys`);
  for (const a of alleys) {
    const lo = Math.min(a.rect.x1 - a.rect.x0, a.rect.z1 - a.rect.z0);
    assert.ok(lo >= 3 && lo <= 10, `an alley ${lo} m wide`);
  }
  // no yard overlaps a building or a lane
  for (const y of plan.yards)
    for (const o of [...plan.buildings.map((b) => b.rect), ...plan.lanes])
      assert.ok(!overlaps(y.rect, o, 0.5), `${y.kind} yard overlaps`);
});

test("every row turns its front to a street or lane, or to its yard", () => {
  for (const b of plan.buildings) {
    const cx = (b.rect.x0 + b.rect.x1) / 2;
    const cz = (b.rect.z0 + b.rect.z1) / 2;
    const out: Vec2 =
      b.front === "zmin"
        ? [cx, b.rect.z0 - 2.5]
        : b.front === "zmax"
          ? [cx, b.rect.z1 + 2.5]
          : b.front === "xmin"
            ? [b.rect.x0 - 2.5, cz]
            : [b.rect.x1 + 2.5, cz];
    const street =
      CITY_SURFACES.some((s) => pointInPolygon(s.polygon, out)) ||
      plan.lanes.some(
        (l) =>
          out[0] >= l.x0 && out[0] <= l.x1 && out[1] >= l.z0 && out[1] <= l.z1,
      );
    const yard = plan.yards.some(
      (y) =>
        out[0] >= y.rect.x0 - 0.8 &&
        out[0] <= y.rect.x1 + 0.8 &&
        out[1] >= y.rect.z0 - 0.8 &&
        out[1] <= y.rect.z1 + 0.8,
    );
    assert.ok(street || yard, `${b.id} fronts a wall at ${out}`);
  }
});

test("each neighborhood builds to its own height; Suburbia and the beach build nothing", () => {
  const limits: Record<string, readonly [number, number]> = {
    downtown: [14, 46],
    "nightlife-row": [12, 32],
    "arts-district": [10, 24],
    "little-manila": [8, 17],
    "chinatown-koreatown": [10, 24],
    uptown: [12, 32],
  };
  for (const b of plan.buildings) {
    const lim = limits[b.neighborhood];
    assert.ok(lim, `${b.neighborhood} is not built on`);
    assert.ok(b.height >= lim[0] && b.height <= lim[1], `${b.id} ${b.height}`);
    assert.ok(hash(1, 2) >= 0);
  }
  assert.ok(new Set(plan.buildings.map((b) => b.style)).size >= 4);
});
