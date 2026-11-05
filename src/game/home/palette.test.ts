import { test } from "node:test";
import assert from "node:assert/strict";
import { TINT_COUNT, tintHsl } from "./palette.ts";

test("variant 0 keeps the model's own color", () => {
  const c = { h: 0.05, s: 0.6, l: 0.3 };
  assert.deepEqual(tintHsl(c, 0), c);
});

test("each look takes its hue and keeps dark darker than light", () => {
  for (let v = 1; v < TINT_COUNT; v++) {
    const dark = tintHsl({ h: 0.6, s: 0.3, l: 0.15 }, v);
    const light = tintHsl({ h: 0.6, s: 0.3, l: 0.7 }, v);
    assert.equal(dark.h, light.h);
    assert.ok(dark.l < light.l);
    assert.ok(light.l <= 0.92 && dark.l >= 0.1);
  }
});

test("an unknown look leaves the color alone", () => {
  const c = { h: 0.2, s: 0.5, l: 0.5 };
  assert.deepEqual(tintHsl(c, 42), c);
});
