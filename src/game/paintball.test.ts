import { test } from "node:test";
import assert from "node:assert/strict";
import { clearLine, newRound, shoot, popOut } from "./laserTag.ts";
import { PAINT_ARENA, PAINT_FIELD, SPAWN } from "./paintball.ts";
import type { Vec2 } from "./walk.ts";

const inside = ([x, z]: Vec2) =>
  x > PAINT_ARENA.x0 &&
  x < PAINT_ARENA.x1 &&
  z > PAINT_ARENA.z0 &&
  z < PAINT_ARENA.z1;
const inCover = ([x, z]: Vec2) =>
  PAINT_FIELD.cover.some((c) => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1);

test("every paintball rival hides behind a bunker from the spawn", () => {
  for (const r of PAINT_FIELD.rivals) {
    assert.ok(inside(r.hide) && inside(r.peek));
    assert.ok(!inCover(r.hide) && !inCover(r.peek));
    assert.equal(
      clearLine(SPAWN, r.hide, PAINT_FIELD.cover),
      false,
      `${r.hide} is visible`,
    );
  }
});

test("at least three rivals pop out in sight of the spawn", () => {
  const seen = PAINT_FIELD.rivals.filter((r) =>
    clearLine(SPAWN, r.peek, PAINT_FIELD.cover),
  );
  assert.ok(seen.length >= 3);
});

test("a paintball round plays on its own field", () => {
  let r = newRound(5, PAINT_FIELD);
  assert.equal(r.downUntil.length, 5);
  while (!popOut(5, 4, r.t).out) r = { ...r, t: r.t + 0.05 };
  const peek = PAINT_FIELD.rivals[4]?.peek ?? [0, 0];
  const { shot } = shoot(r, 4, [peek[0], peek[1] + 2.5]);
  assert.equal(shot, "tag");
});
