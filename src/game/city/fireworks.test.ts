import assert from "node:assert/strict";
import test from "node:test";
import {
  BURN,
  RISE,
  SHOW_EVERY,
  SHOW_LENGTH,
  shellsAt,
  showOn,
} from "./fireworks.ts";

test("shows run for their length, then the sky is dark until the next", () => {
  const t0 = SHOW_EVERY * 100;
  assert.equal(showOn(t0 + 5), true);
  assert.equal(showOn(t0 + SHOW_LENGTH + 1), false);
  assert.ok(shellsAt(t0 + 10).length > 0);
  assert.deepEqual(shellsAt(t0 + SHOW_LENGTH + RISE + BURN + 1), []);
});

test("shells are the same for every player and stay over the sea", () => {
  const t = SHOW_EVERY * 7 + 30;
  assert.deepEqual(shellsAt(t), shellsAt(t));
  for (let s = 0; s < SHOW_LENGTH; s += 0.5)
    for (const shell of shellsAt(SHOW_EVERY * 7 + s)) {
      assert.ok(shell.z >= 420 && shell.height >= 18, `${shell.id}`);
      assert.ok(shell.age >= 0 && shell.age <= RISE + BURN);
    }
});

test("the finale fires in threes, and never more than a dozen at once", () => {
  let most = 0;
  for (let s = 0; s < SHOW_LENGTH + 5; s += 0.1)
    most = Math.max(most, shellsAt(SHOW_EVERY * 3 + s).length);
  assert.ok(most > 4 && most <= 12, `${most}`);
});
