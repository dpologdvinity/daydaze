import { test } from "node:test";
import assert from "node:assert/strict";
import { LINE_BANKS } from "./dialogue/index.ts";
import { loadDialogue, pickLine, seededRng } from "./dialogue/pick.ts";
import {
  SUPER_SLIDE,
  slideHeight,
  CAROUSEL_AT,
  CAROUSEL_RADIUS,
  COASTER_TRACK,
  FLUME_TRACK,
  CUP_RADIUS,
  RIDE_IDS,
  STARLIGHT_TRACK,
  SWING_AT,
  SWING_RADIUS,
  TEACUPS_AT,
  EXIT_SECONDS,
  FERRIS,
  PARK_CONTEXT,
  PARK_NPC_ROLES,
  RIDES,
  buildTrack,
  dropTowerHeight,
  ferrisPose,
  parseRide,
  rideProgress,
  rideSeconds,
  rideStep,
  ridePose,
  seatPose,
  stringPoints,
  trackPose,
  newPose,
  type RideState,
  type Vec3,
} from "./amusementPark.ts";
import { ROOMS } from "./rooms.ts";
import { pointInPolygon } from "./walk.ts";

function assertNear(actual: readonly number[], expected: readonly number[]) {
  assert.equal(actual.length, expected.length);
  actual.forEach((v, i) => {
    assert.ok(Math.abs(v - expected[i]) < 1e-9, `${actual} vs ${expected}`);
  });
}

const at = (p: { x: number; y: number; z: number }) => [p.x, p.y, p.z];

await loadDialogue();

test("calm rides take longer than normal rides", () => {
  for (const ride of ["ferris-wheel", "coaster"] as const) {
    assert.ok(rideSeconds(ride, false) > 0);
    assert.ok(rideSeconds(ride, true) > rideSeconds(ride, false), ride);
  }
});

test("both rides board from a spot on the midway floor", () => {
  const { walkable } = ROOMS["amusement-park"];
  for (const ride of Object.values(RIDES)) {
    assert.equal(pointInPolygon(walkable, ride.spot), true, `${ride.spot}`);
  }
});

test("ride progress is clamped and bad input counts as the start", () => {
  assert.equal(rideProgress(10, 20), 0.5);
  assert.equal(rideProgress(99, 20), 1);
  assert.equal(rideProgress(-3, 20), 0);
  assert.equal(rideProgress(Number.NaN, 20), 0);
  assert.equal(rideProgress(Number.POSITIVE_INFINITY, 20), 0);
  assert.equal(rideProgress(5, 0), 0);
});

test("the ferris wheel loads at the bottom and rides the rim", () => {
  const wheel = { hub: [-6, 9, -9] as const, radius: 7 };
  assertNear(at(ferrisPose(wheel, 0)), [-6, 2, -9]);
  assertNear(at(ferrisPose(wheel, 0.5)), [-6, 16, -9]);
  assertNear(at(ferrisPose(wheel, 1)), [-6, 2, -9]);
  for (let i = 0; i <= 20; i++) {
    const p = ferrisPose(wheel, i / 20);
    assert.ok(Math.abs(Math.hypot(p.x + 6, p.y - 9) - 7) < 1e-9);
    assert.equal(p.z, -9);
  }
});

test("a pose can be written into a caller's scratch object", () => {
  const out = newPose();
  const back = ferrisPose(FERRIS, 0.25, out);
  assert.equal(back, out);
});

const LOOP: readonly Vec3[] = [
  [0, 1, 0],
  [10, 4, 0],
  [12, 9, 8],
  [4, 12, 12],
  [-4, 6, 9],
  [-6, 1, 3],
];

test("a closed track loops back to its start", () => {
  const track = buildTrack(LOOP);
  assert.equal(track.samples.length, LOOP.length * 16);
  assertNear(at(trackPose(track, 0)), [0, 1, 0]);
  assertNear(at(trackPose(track, track.length)), [0, 1, 0]);
  assertNear(at(trackPose(track, -track.length)), [0, 1, 0]);
  assert.ok(track.length > 50, `length ${track.length}`);
});

test("the track passes through each control point", () => {
  const track = buildTrack(LOOP);
  for (let i = 0; i < LOOP.length; i++) {
    assertNear(at(trackPose(track, track.distances[i * 16])), LOOP[i]);
  }
});

test("track headings point along the way the rider travels", () => {
  const track = buildTrack(LOOP);
  const a = trackPose(track, 1);
  const b = trackPose(track, 2);
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  assert.ok(dx * Math.sin(a.yaw) + dz * Math.cos(a.yaw) > 0);
});

test("the coaster's track is a closed loop that starts at the station", () => {
  assertNear(at(trackPose(COASTER_TRACK, 0)), [6.5, 1.4, -10.5]);
  assertNear(
    at(trackPose(COASTER_TRACK, COASTER_TRACK.length)),
    at(trackPose(COASTER_TRACK, 0)),
  );
});

test("a ride pose is a pure function of time", () => {
  const a = ridePose("coaster", 7.5, false);
  const b = ridePose("coaster", 7.5, false);
  assert.deepEqual(a, b);
  // calm rides move slower, so the same time finds the doll earlier on the loop
  const calm = ridePose("coaster", 7.5, true);
  assert.notDeepEqual(calm, a);
});

test("the ferris ride ends back at the bottom of the wheel", () => {
  const end = ridePose(
    "ferris-wheel",
    rideSeconds("ferris-wheel", false),
    false,
  );
  assertNear(at(end), at(ferrisPose(FERRIS, 0)));
});

test("the idle and boarding phases have no seat, so the doll walks freely", () => {
  assert.equal(seatPose({ phase: "idle" }, 0, false), null);
  assert.equal(
    seatPose({ phase: "boarding", ride: "coaster" }, 0, false),
    null,
  );
});

test("the state machine runs idle, boarding, riding, exiting and back to idle", () => {
  let s: RideState = { phase: "idle" };
  s = rideStep(s, { type: "board", ride: "coaster" });
  assert.deepEqual(s, { phase: "boarding", ride: "coaster" });
  s = rideStep(s, { type: "arrive", now: 10, calm: false });
  assert.deepEqual(s, {
    phase: "riding",
    ride: "coaster",
    start: 10,
    seconds: rideSeconds("coaster", false),
  });
  const seconds = rideSeconds("coaster", false);
  s = rideStep(s, { type: "tick", now: 10 + seconds - 0.1 });
  assert.equal(s.phase, "riding");
  s = rideStep(s, { type: "tick", now: 10 + seconds + 0.3 });
  // the step-off starts at the moment the ride really ended
  assert.deepEqual(s, {
    phase: "exiting",
    ride: "coaster",
    start: 10 + seconds,
  });
  s = rideStep(s, { type: "tick", now: 10 + seconds + EXIT_SECONDS - 0.01 });
  assert.equal(s.phase, "exiting");
  s = rideStep(s, { type: "tick", now: 10 + seconds + EXIT_SECONDS });
  assert.deepEqual(s, { phase: "idle" });
});

test("walking away while boarding cancels the ride", () => {
  const s = rideStep(
    { phase: "boarding", ride: "ferris-wheel" },
    { type: "cancel" },
  );
  assert.deepEqual(s, { phase: "idle" });
});

test("events that do not apply to the phase change nothing", () => {
  const riding: RideState = {
    phase: "riding",
    ride: "coaster",
    start: 0,
    seconds: 22,
  };
  assert.equal(rideStep(riding, { type: "board", ride: "coaster" }), riding);
  assert.equal(rideStep(riding, { type: "cancel" }), riding);
  assert.deepEqual(rideStep({ phase: "idle" }, { type: "tick", now: 5 }), {
    phase: "idle",
  });
});

test("the seat follows the ride, then steps off to the boarding spot", () => {
  const riding: RideState = {
    phase: "riding",
    ride: "ferris-wheel",
    start: 0,
    seconds: 24,
  };
  assertNear(at(seatPose(riding, 0, false)!), at(ferrisPose(FERRIS, 0)));
  const exiting: RideState = {
    phase: "exiting",
    ride: "ferris-wheel",
    start: 24,
  };
  const [sx, sz] = RIDES["ferris-wheel"].spot;
  assertNear(at(seatPose(exiting, 24, false)!), at(ferrisPose(FERRIS, 1)));
  const landed = seatPose(exiting, 24 + EXIT_SECONDS, false)!;
  assertNear([landed.x, landed.y, landed.z], [sx, 0, sz]);
});

test("the drop tower rests, lifts, holds, drops and repeats", () => {
  const bottom = 0.5;
  const top = 18;
  assert.equal(dropTowerHeight(0, bottom, top), bottom);
  let peak = 0;
  for (let t = 0; t < 40; t += 0.05) {
    const h = dropTowerHeight(t, bottom, top);
    assert.ok(h >= bottom - 1e-9 && h <= top + 1e-9, `${t}: ${h}`);
    peak = Math.max(peak, h);
  }
  assert.ok(Math.abs(peak - top) < 1e-9);
  assert.ok(
    Math.abs(
      dropTowerHeight(3.3, bottom, top) - dropTowerHeight(3.3 + 8, bottom, top),
    ) < 1e-9,
  );
});

test("string lights space bulbs between two anchors and sag", () => {
  const bulbs = stringPoints([0, 4, 0], [6, 4, 0], 0.5, 1);
  assert.ok(bulbs.length >= 10 && bulbs.length <= 14, `${bulbs.length}`);
  for (const [x, y] of bulbs) {
    assert.ok(x > 0 && x < 6);
    assert.ok(y < 4 && y > 3, `${y}`);
  }
  // a quadratic curve reaches half its control depth at the middle
  const middle = bulbs[Math.floor(bulbs.length / 2)];
  assert.ok(
    Math.abs(middle[1] - 3.5) < 0.05,
    `the middle sags, got ${middle[1]}`,
  );
});

test("parseRide accepts only the rides in the park", () => {
  assert.equal(parseRide("coaster"), "coaster");
  assert.equal(parseRide("ferris-wheel"), "ferris-wheel");
  for (const value of ["toString", "Coaster", "", null]) {
    assert.equal(parseRide(value), null, String(value));
  }
});

test("every park NPC's role has tapped lines for the fairground", () => {
  for (const [npc, role] of Object.entries(PARK_NPC_ROLES)) {
    const picked = pickLine({
      role,
      situation: "tapped",
      context: PARK_CONTEXT,
      rng: seededRng(npc.length),
    });
    assert.notEqual(picked.text, "...", `${npc} (${role}) has no tapped line`);
    assert.ok(LINE_BANKS[role].tapped?.length, role);
  }
});

test("the Starlight's track stays above the ground and climbs to a 20 m lift", () => {
  const ys = STARLIGHT_TRACK.samples.map((p) => p[1]);
  assert.ok(Math.min(...ys) > 0.8, `lowest ${Math.min(...ys)}`);
  assert.ok(Math.max(...ys) > 19, `highest ${Math.max(...ys)}`);
});

test("every ride's seat is finite all the way round, and the turning rides keep her on them", () => {
  for (const id of RIDE_IDS) {
    for (let t = 0; t < rideSeconds(id, false); t += 0.7) {
      const p = ridePose(id, t, false, newPose(), 100 + t);
      for (const v of [p.x, p.y, p.z, p.yaw]) assert.ok(Number.isFinite(v), id);
      assert.ok(p.y > -0.6 && p.y < 24, `${id} height ${p.y}`);
    }
  }
  const near = (
    at: readonly [number, number],
    r: number,
    p: { x: number; z: number },
  ) => Math.abs(Math.hypot(p.x - at[0], p.z - at[1]) - r) < 1e-6;
  for (let now = 0; now < 30; now += 1.3) {
    assert.ok(
      near(
        CAROUSEL_AT,
        CAROUSEL_RADIUS,
        ridePose("carousel", 0, false, newPose(), now),
      ),
    );
    assert.ok(
      near(
        SWING_AT,
        SWING_RADIUS,
        ridePose("swings", 0, false, newPose(), now),
      ),
    );
    assert.ok(
      near(
        TEACUPS_AT,
        CUP_RADIUS,
        ridePose("teacups", 0, true, newPose(), now),
      ),
    );
  }
});

test("every ride steps her off onto its boarding ring", () => {
  for (const id of RIDE_IDS) {
    const state = {
      phase: "exiting" as const,
      ride: id,
      start: 50,
    };
    const end = seatPose(state, 50 + EXIT_SECONDS, false);
    assert.ok(end, id);
    assert.ok(Math.abs(end.x - RIDES[id].spot[0]) < 1e-6, id);
    assert.ok(Math.abs(end.z - RIDES[id].spot[1]) < 1e-6, id);
    assert.ok(Math.abs(end.y) < 1e-6, id);
  }
});

test("the log flume floats above the ground, lifts 9 m and drops steeply into the pool", () => {
  const ys = FLUME_TRACK.samples.map((p) => p[1]);
  assert.ok(Math.min(...ys) > 0.3, `lowest ${Math.min(...ys)}`);
  assert.ok(Math.max(...ys) > 8.5, `highest ${Math.max(...ys)}`);
  // the chute: somewhere the water falls at least 35 degrees
  let steepest = 0;
  const pose = newPose();
  for (let d = 0; d < FLUME_TRACK.length; d += 0.5)
    steepest = Math.min(steepest, trackPose(FLUME_TRACK, d, pose).pitch);
  assert.ok(steepest < -0.6, `steepest ${steepest}`);
});

test("the Super Slide climbs the lift, then runs down its lane to the bottom", () => {
  assert.equal(slideHeight(0), SUPER_SLIDE.top);
  assert.equal(slideHeight(1), 0);
  // humps, but downhill overall: every half of the run ends lower
  assert.ok(slideHeight(0.5) < slideHeight(0.25));
  const seconds = RIDES["super-slide"].seconds.normal;
  const top = ridePose("super-slide", seconds * SUPER_SLIDE.climb, false);
  const end = ridePose("super-slide", seconds, false);
  assert.ok(top.y > 6);
  assert.ok(Math.abs(end.z - SUPER_SLIDE.bottomZ) < 0.01);
  assert.ok(end.y < 0.2);
});
