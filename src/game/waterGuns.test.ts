// Tests for the water-gun battle in the wave pool: floaties ride three rows
// across the pool, a squirt on one soaks it, and the battle ends when the
// tank or the clock runs out.

import { test } from "node:test";
import assert from "node:assert/strict";
import { POOL } from "./waterPark.ts";
import {
  BATTLE_SECONDS,
  battleOver,
  floatieAt,
  newBattle,
  squirt,
  TANK,
} from "./waterGuns.ts";

test("floaties ride three rows inside the pool", () => {
  const b = newBattle(7);
  assert.equal(b.targets.length, 15);
  for (const target of b.targets)
    for (const t of [0, 3.3, 17, 39]) {
      const [x, z] = floatieAt(target, t);
      assert.ok(x > POOL.x0 && x < POOL.x1, `x ${x}`);
      assert.ok(z > POOL.z0 && z < POOL.z1, `z ${z}`);
    }
  const rows = new Set(b.targets.map((t) => floatieAt(t, 0)[1]));
  assert.equal(rows.size, 3);
});

test("a squirt right on a floatie soaks it and scores; a miss only costs water", () => {
  let b = newBattle(3);
  const target = b.targets[4];
  assert.ok(target);
  const [x, z] = floatieAt(target, 2);
  const hit = squirt(b, x, z, 2);
  assert.equal(hit.soaked?.id, target.id);
  assert.ok(hit.battle.score > 0);
  assert.equal(hit.battle.water, TANK - 1);
  b = hit.battle;
  const miss = squirt(b, POOL.x0 + 0.01, POOL.z1 - 0.01, 2.5);
  assert.equal(miss.soaked, null);
  assert.equal(miss.battle.score, b.score);
  assert.equal(miss.battle.water, TANK - 2);
});

test("the battle ends when the tank is dry or the clock runs out", () => {
  let b = newBattle(1);
  assert.equal(battleOver(b, 0), false);
  assert.equal(battleOver(b, BATTLE_SECONDS), true);
  for (let i = 0; i < TANK; i++) b = squirt(b, 0, -5, 1).battle;
  assert.equal(battleOver(b, 1), true);
  // no water, no squirt
  assert.equal(squirt(b, 0, -5, 1).battle, b);
});
