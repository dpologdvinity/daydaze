import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LOOK, validateLook } from "./look.ts";
import { GAITS, gaitOf, isGait } from "./gaits.ts";

test("every gait keeps arms close and strides in a human range", () => {
  for (const g of GAITS) {
    assert.ok(g.stride > 0.2 && g.stride < 0.5, g.id);
    assert.ok(g.armSwing < 0.35, g.id);
    assert.ok(g.bounce < 0.02, g.id);
  }
  assert.equal(new Set(GAITS.map((g) => g.id)).size, GAITS.length);
});

test("a look's walk style is optional and validated", () => {
  assert.equal(gaitOf(undefined).id, "natural");
  assert.equal(isGait("runway"), true);
  assert.equal(validateLook({ ...DEFAULT_LOOK, gait: "runway" }), true);
  assert.equal(validateLook({ ...DEFAULT_LOOK, gait: "moonwalk" }), false);
});
