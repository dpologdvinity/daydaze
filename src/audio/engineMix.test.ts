import { test } from "node:test";
import assert from "node:assert/strict";
import { engineMix } from "./engineMix.ts";

test("the engine idles at a standstill and climbs with speed", () => {
  const idle = engineMix(0);
  const fast = engineMix(1);
  assert.ok(idle.engine.level > 0 && idle.tire.level === 0);
  assert.ok(fast.engine.rate > idle.engine.rate);
  assert.ok(fast.engine.level > idle.engine.level);
  assert.ok(fast.tire.level > 0);
});

test("speeds outside 0..1 and bad numbers are clamped", () => {
  assert.deepEqual(engineMix(5), engineMix(1));
  assert.deepEqual(engineMix(-2), engineMix(0));
  assert.deepEqual(engineMix(Number.NaN), engineMix(0));
});
