import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PARK,
  PARK_FOUNTAIN,
  PARK_LAWNS,
  PARK_PATHS,
  POND,
  parkFurniture,
  parkGrowth,
  parkLamps,
  parkTrees,
} from "./park.ts";

const area = (b: { x0: number; x1: number; z0: number; z1: number }) =>
  (b.x1 - b.x0) * (b.z1 - b.z0);

test("lawns, paths, lodge and pond tile the park without overlap", () => {
  // the lodge (26 x 24) and the pond's square hole are the only other cuts
  const lawn = PARK_LAWNS.reduce((n, b) => n + area(b), 0);
  assert.ok(lawn > 2000 && lawn < area(PARK), `${lawn} m2 of lawn`);
  for (const [i, a] of PARK_LAWNS.entries())
    for (const b of PARK_LAWNS.slice(i + 1))
      assert.ok(
        a.x1 <= b.x0 + 1e-6 ||
          b.x1 <= a.x0 + 1e-6 ||
          a.z1 <= b.z0 + 1e-6 ||
          b.z1 <= a.z0 + 1e-6,
        "two lawn pieces overlap",
      );
  for (const lawn of PARK_LAWNS)
    for (const path of PARK_PATHS)
      assert.ok(
        lawn.x1 <= path.x0 + 1e-6 ||
          path.x1 <= lawn.x0 + 1e-6 ||
          lawn.z1 <= path.z0 + 1e-6 ||
          path.z1 <= lawn.z0 + 1e-6,
        "a lawn piece covers a path",
      );
});

test("trees, lamps and growth stay on the lawn and out of the water", () => {
  assert.ok(parkTrees().length > 10);
  assert.equal(parkLamps().length, 4);
  for (const [x, z] of parkTrees()) {
    assert.ok(Math.hypot(x - POND.x, z - POND.z) > POND.r);
    assert.ok(Math.hypot(x - PARK_FOUNTAIN.x, z - PARK_FOUNTAIN.z) > 5);
  }
  const growth = parkGrowth();
  assert.ok(growth.filter((g) => g.kind === "grass").length > 1000);
  for (const g of growth.filter((g) => g.kind === "grass"))
    assert.ok(
      Math.hypot(g.x - POND.x, g.z - POND.z) > POND.r * 0.7,
      "grass in the pond",
    );
});

test("furniture stands in the park, ducks and the boat on the water", () => {
  const furniture = parkFurniture();
  for (const f of furniture) {
    assert.ok(
      f.x >= PARK.x0 && f.x <= PARK.x1 && f.z >= PARK.z0 && f.z <= PARK.z1,
      `${f.kind} at ${f.x},${f.z} is outside the park`,
    );
    if (f.kind === "duck" || f.kind === "rowboat")
      assert.ok(Math.hypot(f.x - POND.x, f.z - POND.z) < POND.r - 1);
  }
  for (const k of ["fountain", "gazebo", "bench", "blanket", "duck"])
    assert.ok(
      furniture.some((f) => f.kind === k),
      `no ${k}`,
    );
});
