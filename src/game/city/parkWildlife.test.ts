import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { PARK, PATH_EW, PATH_NS, POND } from "./park.ts";
import { WILDLIFE, wildlifeNear } from "./parkWildlife.ts";

test("every park animal has a model and a pen on the lawn, off the paths and pond", () => {
  for (const w of WILDLIFE) {
    assert.ok(existsSync(`public/models/animals/${w.kind}.glb`), w.kind);
    const { x0, x1, z0, z1 } = w.pen;
    assert.ok(x0 >= PARK.x0 && x1 <= PARK.x1 && z0 >= PARK.z0 && z1 <= PARK.z1);
    // the Ice Rink lodge fills the north-east corner
    assert.ok(x1 <= 274 || z0 >= -292, `${w.kind} pen is in the lodge`);
    for (const p of [PATH_EW, PATH_NS])
      assert.ok(x1 <= p.x0 || x0 >= p.x1 || z1 <= p.z0 || z0 >= p.z1);
    const cx = Math.max(x0, Math.min(POND.x, x1));
    const cz = Math.max(z0, Math.min(POND.z, z1));
    assert.ok(Math.hypot(cx - POND.x, cz - POND.z) > POND.r);
  }
});

test("wildlife exists only near the park", () => {
  assert.ok(wildlifeNear(250, -280));
  assert.ok(!wildlifeNear(0, 0));
});
