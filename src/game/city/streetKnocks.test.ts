// Walkers and cars: a knocked-down walker lands where the car threw her, gets
// up and walks on from where she was hit; a walker notices a car after about
// a second and dodges or freezes; bystanders stop and look; nobody jumps.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PEDESTRIANS, pedestrianAt } from "./pedestrians.ts";
import {
  RETURN_SECONDS,
  freezes,
  evadeFastCar,
  knock,
  newStreet,
  noticeDelay,
  settle,
  startle,
  streetPose,
  threatened,
  touches,
  watch,
  type CarNow,
  type StreetPose,
} from "./streetKnocks.ts";
import { yawTowards } from "../walk.ts";
import { isBlocked } from "../area.ts";
import { CITY_AREA } from "./layout.ts";

const p = PEDESTRIANS[3];
const fresh = (): StreetPose => ({
  x: 0,
  z: 0,
  yaw: 0,
  held: false,
  reaction: null,
});
const dist = (a: StreetPose, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);

test("nearby speeding cars and sirens make walkers flinch, then resume", () => {
  const at = pedestrianAt(p, 10);
  const car = { x: at.x + 8, z: at.z, speed: 16, siren: false };
  const s = newStreet();
  evadeFastCar(s, p, 10, car);
  assert.equal(streetPose(p, s, 10.3, fresh()).reaction, "hit-front");
  assert.equal(streetPose(p, s, 15, fresh()).held, false);
  const siren = newStreet();
  evadeFastCar(siren, p, 10, { ...car, speed: 0, siren: true });
  assert.ok(streetPose(p, siren, 10.3, fresh()).held);
  for (const other of [
    { ...car, speed: 15 },
    { ...car, x: at.x + 13 },
  ]) {
    const unaffected = newStreet();
    evadeFastCar(unaffected, p, 10, other);
    assert.equal(unaffected.ev, null);
  }
});

test("evasion moves sideways within the sidewalk even when the car is behind", () => {
  const walker = {
    ...p,
    a: [0, 0] as const,
    b: [20, 0] as const,
    speed: 0,
    bounds: [-1, 21, -2, 2] as const,
  };
  for (const car of [
    { x: -8, z: 0, speed: 20, siren: false },
    { x: 0, z: 1, speed: 20, siren: false },
    { x: 0, z: -1, speed: 20, siren: false },
  ]) {
    const s = newStreet();
    evadeFastCar(s, walker, 0, car);
    const at = streetPose(walker, s, 0.8, fresh());
    assert.equal(at.x, 0);
    assert.ok(Math.abs(at.z) > 0.5 && Math.abs(at.z) <= 2);
    if (car.z !== 0) assert.ok(at.z * car.z < 0);
  }
});

test("evasion does not move walkers into city blockers", () => {
  for (const walker of PEDESTRIANS) {
    const at = pedestrianAt(walker, 10);
    if (isBlocked(CITY_AREA, [at.x, at.z])) continue;
    for (const offset of [-2, 2]) {
      const s = newStreet();
      evadeFastCar(s, walker, 10, {
        x: at.x + offset,
        z: at.z + offset,
        speed: 20,
        siren: false,
      });
      const pose = streetPose(walker, s, 10.8, fresh());
      assert.equal(isBlocked(CITY_AREA, [pose.x, pose.z]), false);
    }
  }
});

test("a pending car dodge takes priority over a nearby siren", () => {
  const s = newStreet();
  const at = pedestrianAt(p, 10);
  const car = { x: at.x - 8, z: at.z, fx: 1, fz: 0, speed: 10 };
  startle(s, p, 0, 10, car);
  evadeFastCar(s, p, 10.1, { ...car, siren: true });
  assert.equal(s.ev, null);
});

test("with nothing happening she walks her usual path", () => {
  const s = newStreet();
  for (const t of [0, 13.7, 99]) {
    const a = streetPose(p, s, t, fresh());
    const b = pedestrianAt(p, t);
    assert.ok(dist(a, b) < 1e-9);
    assert.equal(a.held, false);
    assert.equal(a.reaction, null);
  }
});

test("a knockdown throws her along the car's way, then she gets up and walks on from there", () => {
  const s = newStreet();
  const t0 = 50;
  const hitAt = pedestrianAt(p, t0);
  knock(s, t0, 9, 1, 0);
  // thrown along +x, lying there through the fall
  const down = streetPose(p, s, t0 + 1, fresh());
  assert.ok(down.held);
  assert.equal(down.reaction, "trip-fall");
  assert.ok(
    down.x - hitAt.x > 1.5,
    `thrown ${(down.x - hitAt.x).toFixed(1)} m`,
  );
  assert.ok(Math.abs(down.z - hitAt.z) < 1e-6);
  // then the get-up, still where she landed
  const hold = s.ev?.hold ?? 0;
  const up = streetPose(p, s, t0 + hold - 0.2, fresh());
  assert.equal(up.reaction, "get-up");
  assert.ok(dist(up, down) < 1e-6);
  // long after, she is back on her path, as far along as if the fall took no
  // time from her walk
  const later = t0 + hold + RETURN_SECONDS + 5;
  settle(s, later);
  assert.equal(s.ev, null);
  const back = streetPose(p, s, later, fresh());
  assert.ok(dist(back, pedestrianAt(p, later - hold)) < 1e-6);
});

test("nothing jumps: a knock, its get-up and her walk back are smooth", () => {
  const s = newStreet();
  knock(s, 20, 14, 0, 1);
  let prev = streetPose(p, s, 20, fresh());
  for (let t = 20; t < 32; t += 0.02) {
    settle(s, t);
    const now = streetPose(p, s, t, fresh());
    // the throw itself is the fastest thing: a few meters in a third of a second
    assert.ok(dist(now, prev) < 0.5, `jump of ${dist(now, prev)} at ${t}`);
    prev = now;
  }
});

test("a fast car throws her into a hard fall, a slow one only makes her stumble", () => {
  const hard = newStreet();
  knock(hard, 0, 14, 1, 0);
  assert.equal(streetPose(p, hard, 0.5, fresh()).reaction, "hard-landing");
  const bump = newStreet();
  knock(bump, 0, 2, 1, 0);
  assert.equal(streetPose(p, bump, 0.5, fresh()).reaction, "stumble");
  // too slow to matter
  const none = newStreet();
  knock(none, 0, 0.2, 1, 0);
  assert.equal(none.ev, null);
});

test("people notice a car after about a second, each in her own time; a few freeze", () => {
  const delays = PEDESTRIANS.map((_, i) => noticeDelay(i));
  for (const d of delays) assert.ok(d >= 0.7 && d <= 1.5, `${d}`);
  assert.ok(new Set(delays.map((d) => d.toFixed(2))).size > 10);
  const share =
    PEDESTRIANS.filter((_, i) => freezes(i)).length / PEDESTRIANS.length;
  assert.ok(share > 0.1 && share < 0.35, `${share}`);
});

/** A car `back` meters behind where she is at `t`, heading straight at her. */
function carAt(t: number, back: number, speed = 10): CarNow {
  const at = pedestrianAt(p, t);
  return { x: at.x - back, z: at.z, fx: 1, fz: 0, speed };
}

test("a car bearing down is a threat; one passing beside or behind her is not", () => {
  const at = pedestrianAt(p, 0);
  assert.equal(threatened(carAt(0, 15), at), true);
  assert.equal(threatened(carAt(0, 60), at), false);
  assert.equal(threatened({ ...carAt(0, 15), z: at.z + 4 }, at), false);
  assert.equal(threatened({ ...carAt(0, -5) }, at), false);
  assert.equal(threatened(carAt(0, 15, 0.3), at), false);
});

test("she reacts only after her notice delay, then gets out of the car's line or freezes", () => {
  const dodger = PEDESTRIANS.findIndex((_, i) => !freezes(i));
  const freezer = PEDESTRIANS.findIndex((_, i) => freezes(i));
  for (const i of [dodger, freezer]) {
    const q = PEDESTRIANS[i];
    const s = newStreet();
    const car: CarNow = (() => {
      const at = pedestrianAt(q, 10);
      return { x: at.x - 20, z: at.z, fx: 1, fz: 0, speed: 10 };
    })();
    // seen, but not yet noticed
    startle(s, q, i, 10, car);
    startle(s, q, i, 10 + noticeDelay(i) - 0.1, car);
    assert.equal(s.ev, null);
    startle(s, q, i, 10 + noticeDelay(i) + 0.05, car);
    assert.ok(s.ev);
    const t = 10 + noticeDelay(i) + 0.6;
    const pose = streetPose(q, s, t, fresh());
    if (i === dodger) {
      // out of the car's line, sideways
      assert.ok(Math.abs(pose.z - car.z) > 1.4, `${pose.z - car.z}`);
      assert.match(pose.reaction ?? "", /^hit-/);
    } else {
      assert.ok(pose.held);
      assert.equal(pose.reaction, "hit-front");
      // she faces the car
      assert.ok(Math.abs(Math.sin(pose.yaw) - -1) < 1e-6);
    }
  }
});

test("a notice cut short by a stare starts over: the next car still takes her delay", () => {
  const i = PEDESTRIANS.findIndex((_, k) => !freezes(k));
  const q = PEDESTRIANS[i];
  const s = newStreet();
  const at = pedestrianAt(q, 10);
  const car: CarNow = { x: at.x - 20, z: at.z, fx: 1, fz: 0, speed: 10 };
  // she sees the car, then turns to stare at a hit nearby before reacting
  startle(s, q, i, 10, car);
  watch(s, q, 10.2, [at.x + 5, at.z]);
  startle(s, q, i, 10.5, car);
  // long after the stare, a new car: no instant dodge
  const later = 30;
  settle(s, later);
  const now = streetPose(q, s, later, fresh());
  const next: CarNow = { x: now.x - 20, z: now.z, fx: 1, fz: 0, speed: 10 };
  startle(s, q, i, later, next);
  assert.equal(s.ev, null);
});

test("bystanders stop and turn to look at the spot", () => {
  const s = newStreet();
  const at = pedestrianAt(p, 5);
  const spot: [number, number] = [at.x + 6, at.z + 6];
  watch(s, p, 5, spot);
  const pose = streetPose(p, s, 5.5, fresh());
  assert.ok(pose.held);
  assert.ok(Math.abs(pose.yaw - yawTowards([at.x, at.z], spot)) < 1e-6);
  // and a knock still overrides a look
  knock(s, 6, 9, 1, 0);
  assert.equal(streetPose(p, s, 6.5, fresh()).reaction, "trip-fall");
  // but not the other way around
  watch(s, p, 6.6, spot);
  assert.equal(streetPose(p, s, 6.7, fresh()).reaction, "trip-fall");
});

test("a car touches someone inside its outline, not beside or behind it", () => {
  const car: CarNow = { x: 0, z: 0, fx: 0, fz: 1, speed: 5 };
  assert.equal(touches(car, 4.4, 1.9, { x: 0, z: 2.3 }), true);
  assert.equal(touches(car, 4.4, 1.9, { x: 1.1, z: 0 }), true);
  assert.equal(touches(car, 4.4, 1.9, { x: 2, z: 0 }), false);
  assert.equal(touches(car, 4.4, 1.9, { x: 0, z: 3 }), false);
  assert.equal(touches(car, 4.4, 1.9, { x: 0, z: -3 }), false);
});
