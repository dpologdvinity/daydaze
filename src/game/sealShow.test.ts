import assert from "node:assert/strict";
import test from "node:test";
import { closeOut, judgesScore, newRoutine, press } from "./gymnastics.ts";
import { areaOf, isBlocked } from "./area.ts";
import { ROOMS } from "./rooms.ts";
import { POOL, SEAL_SPOT, SHOW, SHOW_SECONDS } from "./sealShow.ts";

test("the show's tricks come in order, inside its length", () => {
  SHOW.forEach((e, i) => {
    if (i) assert.ok(e.at > SHOW[i - 1].at, e.name);
    assert.ok(e.at < SHOW_SECONDS);
  });
  let r = newRoutine(SHOW);
  for (const e of SHOW) r = press(r, e.at, SHOW);
  assert.ok(judgesScore(r, SHOW) > 11);
  assert.ok(
    judgesScore(closeOut(newRoutine(SHOW), SHOW_SECONDS, SHOW), SHOW) < 10,
  );
});

test("the show pool is solid, and the hall still walks round it", () => {
  const area = areaOf(ROOMS.aquarium);
  assert.equal(isBlocked(area, SEAL_SPOT), true);
  assert.equal(
    isBlocked(area, [POOL.x0 - 0.6, (POOL.z0 + POOL.z1) / 2]),
    false,
  );
  assert.equal(isBlocked(area, ROOMS.aquarium.spawn.position), false);
});
