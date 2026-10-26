import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FURNITURE_KINDS,
  FURNITURE_RANGE,
  furnitureVisible,
} from "./furniture.ts";

test("small props vanish sooner than lamps, and sooner on the low tier", () => {
  assert.ok(furnitureVisible("lamp", 80, true));
  assert.ok(!furnitureVisible("meter", 80, false));
  assert.ok(furnitureVisible("meter", 25, true));
  for (const kind of FURNITURE_KINDS) {
    const [low, high] = FURNITURE_RANGE[kind];
    assert.ok(low <= high, `${kind}: low range ${low} > high range ${high}`);
  }
});
