import assert from "node:assert/strict";
import { test } from "node:test";
import {
  inPocket,
  newRide,
  pocketAt,
  RIDE,
  step,
  surfScore,
  trick,
  TRICK_POINTS,
} from "./surf.ts";

/** Leans toward where the pocket is: a rider who knows what they're doing. */
function ride(seed: number, steer: boolean) {
  let s = newRide(seed);
  while (s.state === "riding") {
    const gap = pocketAt(seed, s.t + 0.25) - (s.x + s.v * 0.25);
    const lean = !steer || Math.abs(gap) < 0.1 ? 0 : gap > 0 ? 1 : -1;
    s = step(s, lean, 1 / 30);
  }
  return s;
}

test("chasing the pocket rides the whole wave and scores", () => {
  const s = ride(5, true);
  assert.equal(s.state, "done");
  assert.ok(s.t >= RIDE);
  assert.ok(surfScore(s) > 200, String(surfScore(s)));
});

test("standing still drifts out of the pocket and wipes out", () => {
  const s = ride(5, false);
  assert.equal(s.state, "wiped");
  assert.ok(s.t < RIDE);
});

test("a trick needs a full charge in the pocket", () => {
  const fresh = newRide(1);
  assert.equal(trick(fresh).landed, false);
  let s = { ...fresh, x: pocketAt(1, 0), charge: 1 };
  assert.ok(inPocket(s));
  const r = trick(s);
  assert.equal(r.landed, true);
  assert.equal(r.surf.points, TRICK_POINTS);
  assert.equal(r.surf.charge, 0);
  s = { ...s, x: pocketAt(1, 0) + 3 };
  assert.equal(trick(s).landed, false);
});

test("a finished ride doesn't move", () => {
  const s = { ...newRide(2), state: "done" as const };
  assert.equal(step(s, 1, 0.1), s);
});
