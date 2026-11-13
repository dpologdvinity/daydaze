import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FURNITURE_KINDS,
  FURNITURE_RANGE,
  furnitureVisible,
} from "./furniture.ts";

test("small props vanish sooner than lamps, and sooner on the low tier", () => {
  assert.ok(furnitureVisible("lamp", 58, true));
  assert.ok(furnitureVisible("lamp", 70, false));
  // pulled out to the overview, props near her are not drawn, lamps included
  assert.ok(!furnitureVisible("bench", 30, true, true));
  assert.ok(furnitureVisible("bench", 10, true, true));
  assert.ok(!furnitureVisible("meter", 80, false));
  assert.ok(furnitureVisible("meter", 20, true));
  for (const kind of FURNITURE_KINDS) {
    const [low, high] = FURNITURE_RANGE[kind];
    assert.ok(low <= high, `${kind}: low range ${low} > high range ${high}`);
  }
});
