// Shared traffic: every client that reads the same shared time holds the same
// reference fleet, however it got there (joined late, dropped frames, crossed
// an era), and the visible fleet is pulled onto it only where nobody can see.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATCH_UP_TICKS,
  TRAFFIC_ERA,
  advanceReference,
  createReference,
  reconcileTraffic,
} from "./trafficSync.ts";
import {
  TRAFFIC_COUNT,
  TRAFFIC_SEED,
  cabAtCurb,
  carPose,
  createTraffic,
  stepTraffic,
  type TrafficCar,
} from "./traffic.ts";

const DT = 1 / 50;
/** Some moment, on an era boundary so the offsets in the tests are plain. */
const ERA_START = 1_763_500_000 - (1_763_500_000 % TRAFFIC_ERA);
const FAR: [number, number] = [1e6, 1e6];
const pose = { x: 0, z: 0, yaw: 0 };

/** Runs the reference up to `wall` in as many calls as the budget needs. */
function catchUp(
  ref: ReturnType<typeof createReference>,
  wall: number,
  budget = CATCH_UP_TICKS,
): number {
  let calls = 1;
  while (!advanceReference(ref, wall, budget)) calls++;
  return calls;
}

/** What a car is, for comparing two fleets exactly. */
const state = (cars: readonly TrafficCar[]) =>
  cars.map((c) => [
    c.id,
    c.lane.edge,
    c.lane.way,
    c.s,
    c.speed,
    c.next,
    c.turns,
  ]);

test("a client that joins late holds exactly the fleet of one that ran all along", () => {
  const steady = createReference();
  for (let tenth = 10; tenth <= 1000; tenth++)
    advanceReference(steady, ERA_START + tenth / 10);
  const late = createReference();
  const calls = catchUp(late, ERA_START + 100);
  assert.ok(calls > 1, "a hundred seconds takes more than one frame");
  // the same tick: both ran 100 s / 0.02 s ticks of the same sim
  assert.equal(late.ticks, 100 * 50);
  assert.equal(steady.ticks, late.ticks);
  assert.deepEqual(state(late.traffic.cars), state(steady.traffic.cars));
});

test("one call never runs more ticks than its budget, and says when it has caught up", () => {
  const ref = createReference();
  assert.equal(advanceReference(ref, ERA_START + 60, 100), false);
  assert.equal(ref.ticks, 100);
  assert.equal(advanceReference(ref, ERA_START + 60, 100_000), true);
  assert.equal(ref.ticks, 60 * 50);
  // a frame later nothing is due
  assert.equal(advanceReference(ref, ERA_START + 60.005), true);
  assert.equal(ref.ticks, 60 * 50);
});

test("the reference's signal clock is the shared time at each tick", () => {
  const ref = createReference();
  catchUp(ref, ERA_START + 30);
  assert.ok(Math.abs(ref.traffic.time - (ERA_START + 30)) < DT);
});

test("a new era restarts the fleet from its seed", () => {
  const ref = createReference();
  catchUp(ref, ERA_START + TRAFFIC_ERA - 1);
  const before = ref.era;
  catchUp(ref, ERA_START + TRAFFIC_ERA + 1);
  assert.equal(ref.era, before + 1);
  assert.equal(ref.ticks, 50);
  const fresh = createTraffic(TRAFFIC_COUNT.high, TRAFFIC_SEED);
  for (let i = 0; i < 50; i++) {
    fresh.time = ERA_START + TRAFFIC_ERA + i * DT;
    stepTraffic(fresh, DT, null);
  }
  assert.deepEqual(state(ref.traffic.cars), state(fresh.cars));
});

test("a time that is not a number leaves the reference alone", () => {
  const ref = createReference();
  catchUp(ref, ERA_START + 5);
  const ticks = ref.ticks;
  for (const bad of [Number.NaN, Infinity, -Infinity])
    assert.equal(advanceReference(ref, bad), false);
  assert.equal(ref.ticks, ticks);
});

test("a fleet drifted far from the reference is pulled back where nobody can see", () => {
  const ref = createReference();
  catchUp(ref, ERA_START + 90);
  // a local fleet that began 20 s late: every car is somewhere else
  const local = createTraffic(TRAFFIC_COUNT.low, TRAFFIC_SEED);
  for (let i = 0; i < 20 * 50; i++) stepTraffic(local, DT, null);
  const moved = reconcileTraffic(local, ref, FAR, 80);
  assert.ok(moved > 0);
  for (const car of local.cars) {
    const truth = ref.traffic.cars[car.id];
    assert.deepEqual(
      [car.lane.edge, car.lane.way, car.s, car.speed, car.next, car.turns],
      [
        truth.lane.edge,
        truth.lane.way,
        truth.s,
        truth.speed,
        truth.next,
        truth.turns,
      ],
    );
  }
  // in step now: nothing more to do
  assert.equal(reconcileTraffic(local, ref, FAR, 80), 0);
});

test("a car near the player is never moved, even when it has drifted", () => {
  const ref = createReference();
  catchUp(ref, ERA_START + 90);
  const local = createTraffic(TRAFFIC_COUNT.low, TRAFFIC_SEED);
  for (let i = 0; i < 20 * 50; i++) stepTraffic(local, DT, null);
  const car = local.cars[0];
  carPose(car, pose);
  const was = [car.lane.edge, car.lane.way, car.s];
  // she stands on the car, and the reference's car (elsewhere) is out of view
  reconcileTraffic(local, ref, [pose.x, pose.z], 80);
  assert.deepEqual([car.lane.edge, car.lane.way, car.s], was);
  // and one that is near only in the reference stays too: it would pop in
  const truth = ref.traffic.cars[0];
  carPose(truth, pose);
  const other = local.cars[1];
  const otherWas = [other.lane.edge, other.lane.way, other.s];
  reconcileTraffic(local, ref, [pose.x, pose.z], 80);
  assert.deepEqual([other.lane.edge, other.lane.way, other.s], otherWas);
});

test("the first reconcile can adopt every car at once, in view or not", () => {
  const ref = createReference();
  catchUp(ref, ERA_START + 45);
  const local = createTraffic(TRAFFIC_COUNT.low, TRAFFIC_SEED);
  reconcileTraffic(local, ref, [0, 0], 1e9, true);
  assert.deepEqual(
    state(local.cars),
    state(ref.traffic.cars.slice(0, TRAFFIC_COUNT.low)),
  );
});

test("a taxi and cars the reference does not have are left alone", () => {
  const ref = createReference();
  catchUp(ref, ERA_START + 30);
  const local = createTraffic(TRAFFIC_COUNT.low, TRAFFIC_SEED);
  const cab = cabAtCurb(500, [0, 0], [3, 3]);
  local.cars.push(cab);
  const was = [cab.lane.edge, cab.lane.way, cab.s];
  reconcileTraffic(local, ref, FAR, 80, true);
  assert.deepEqual([cab.lane.edge, cab.lane.way, cab.s], was);
  assert.ok(cab.trip);
});

test("a car stopped after a hit keeps its halt until it is out of sight", () => {
  const ref = createReference();
  catchUp(ref, ERA_START + 30);
  const local = createTraffic(TRAFFIC_COUNT.low, TRAFFIC_SEED);
  reconcileTraffic(local, ref, FAR, 80, true);
  const car = local.cars[0];
  car.halt = 3;
  car.seen = 2;
  car.s += 30;
  reconcileTraffic(local, ref, FAR, 80);
  assert.equal(car.halt, 0);
  assert.equal(car.seen, 0);
});
