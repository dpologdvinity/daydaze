// Every body's lamps sit at its ends, inside its width and its length.
import assert from "node:assert/strict";
import { test } from "node:test";
import { BODY_KEYS, BODY_LENGTH } from "./bodies.ts";
import { BODY_LAMPS } from "./lamps.ts";

test("head lamps are at the nose and tail lamps at the tail, off the ground", () => {
  for (const key of BODY_KEYS) {
    const { head, tail } = BODY_LAMPS[key];
    const half = BODY_LENGTH[key] / 2;
    assert.ok(head[2] > half * 0.8 && head[2] <= half, `${key} head`);
    assert.ok(tail[2] < -half * 0.8 && tail[2] >= -half, `${key} tail`);
    for (const [x, y] of [head, tail]) {
      assert.ok(x > 0.3 && x < 1.5, `${key} lamp x`);
      assert.ok(y > 0.3 && y < 1.2, `${key} lamp y`);
    }
  }
});
