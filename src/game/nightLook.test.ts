import assert from "node:assert/strict";
import { test } from "node:test";
import { CLUB_NIGHTS } from "./events.ts";
import {
  CANNON_PERIOD,
  cannonAge,
  confettiAt,
  laserAim,
  NIGHT_LOOKS,
} from "./nightLook.ts";

test("every look belongs to a real night and stays within sane ranges", () => {
  const ids = new Set(CLUB_NIGHTS.map((n) => n.id));
  for (const [id, look] of Object.entries(NIGHT_LOOKS)) {
    assert.ok(ids.has(id as (typeof CLUB_NIGHTS)[number]["id"]), id);
    for (const k of [look.lights, look.key, look.tint]) {
      assert.ok(k >= 0 && k <= 1, `${id} scale ${k}`);
    }
  }
});

test("the mall rave and UV night each get a signature and a dark room", () => {
  assert.equal(NIGHT_LOOKS["mall-rave"]?.signature, "lasers");
  assert.equal(NIGHT_LOOKS["uv-night"]?.signature, "blacklight");
  for (const id of ["mall-rave", "uv-night"] as const) {
    assert.ok((NIGHT_LOOKS[id]?.lights ?? 1) <= 0.3, `${id} dims the room`);
  }
});

test("laser beams fan out evenly and sweep without ever pointing up", () => {
  const n = 6;
  const gaps: number[] = [];
  for (let i = 0; i < n; i++) {
    const [yaw] = laserAim(i, n, 0);
    const [next] = laserAim((i + 1) % n, n, 0);
    gaps.push((((next - yaw) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
  }
  for (const g of gaps) assert.ok(Math.abs(g - (2 * Math.PI) / n) < 1e-9);
  for (let t = 0; t < 30; t += 0.37) {
    for (let i = 0; i < n; i++) {
      const [, tilt] = laserAim(i, n, t);
      assert.ok(tilt > 0.15 && tilt < Math.PI / 2, `tilt ${tilt}`);
    }
  }
  // the fan turns
  assert.notEqual(laserAim(0, n, 0)[0], laserAim(0, n, 1)[0]);
});

test("a cannon fires on its own beat, offset from its neighbors", () => {
  assert.equal(cannonAge(0, 0), 0);
  // the next cannon is a quarter beat into its cycle when the first fires
  assert.equal(cannonAge(1, 0), CANNON_PERIOD / 4);
  assert.equal(cannonAge(1, (CANNON_PERIOD * 3) / 4), 0);
  for (let t = 0; t < 40; t += 0.5)
    for (let k = 0; k < 4; k++) {
      const a = cannonAge(k, t);
      assert.ok(a >= 0 && a < CANNON_PERIOD, `age ${a}`);
    }
});

test("confetti shoots up, slows, flutters down and is gone by landing", () => {
  const out: [number, number, number] = [0, 0, 0];
  confettiAt(0.2, 0.5, 0.5, 9, out);
  const early = out[1];
  assert.ok(early > 0.5, "airborne right after the shot");
  confettiAt(1.2, 0.5, 0.5, 9, out);
  const peak = out[1];
  assert.ok(peak > early, "still climbing");
  confettiAt(4.5, 0.5, 0.5, 9, out);
  assert.ok(out[1] < peak, "drifting down");
  confettiAt(4.5, 0.5, 0.5, 9, out);
  assert.ok(out[1] > 0, "not underground while falling");
  // past its life it is parked out of sight, never at floor height
  confettiAt(CANNON_PERIOD, 0.5, 0.5, 9, out);
  assert.ok(out[1] < -50);
});
