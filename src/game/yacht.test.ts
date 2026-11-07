// Tests for the Starlight yacht's cruise-route and timing logic (src/game/yacht.ts).
// Run with: node --test src/game/yacht.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOARD_WINDOW_S,
  CRUISE_SPEED,
  deckBob,
  deckRoll,
  DISEMBARK_AT,
  GANGWAY_AT,
  LEG_COUNT,
  LOOP_PERIOD_S,
  ROUTE,
  ROUTE_LENGTH_M,
  WAYPOINT_RADIUS,
  YACHT_SPAWN,
  yachtStateAt,
} from "./yacht.ts";

test("route has at least 4 waypoints forming a closed loop", () => {
  assert.ok(LEG_COUNT >= 4, "need at least four legs");
  assert.equal(ROUTE.length, LEG_COUNT);
  // First and last waypoints are distinct (loop closes through motion, not coincidence).
  const first = ROUTE[0];
  const last = ROUTE[LEG_COUNT - 1];
  assert.ok(
    Math.hypot(last.x - first.x, last.z - first.z) > 1,
    "last waypoint is not the same as first",
  );
});

test("LOOP_PERIOD_S is consistent with route length and speed", () => {
  const expected = BOARD_WINDOW_S + ROUTE_LENGTH_M / CRUISE_SPEED;
  assert.ok(
    Math.abs(LOOP_PERIOD_S - expected) < 0.001,
    `LOOP_PERIOD_S ${LOOP_PERIOD_S.toFixed(2)} should equal BOARD_WINDOW_S + length/speed ${expected.toFixed(2)}`,
  );
});

test("BOARD_WINDOW_S is positive and shorter than LOOP_PERIOD_S", () => {
  assert.ok(BOARD_WINDOW_S > 0);
  assert.ok(BOARD_WINDOW_S < LOOP_PERIOD_S);
});

test("at t=0 the yacht is at the dock with atDock=true", () => {
  const s = yachtStateAt(0);
  assert.equal(s.atDock, true);
  assert.equal(s.x, ROUTE[0].x);
  assert.equal(s.z, ROUTE[0].z);
  assert.equal(s.loopProgress, 0);
  assert.equal(s.leg, 0);
});

test("at t=BOARD_WINDOW_S/2 the yacht is still at the dock", () => {
  const s = yachtStateAt(BOARD_WINDOW_S / 2);
  assert.equal(s.atDock, true);
});

test("just after BOARD_WINDOW_S the yacht leaves the dock", () => {
  const s = yachtStateAt(BOARD_WINDOW_S + 0.5);
  assert.equal(s.atDock, false);
  // Should be near waypoint[0] still (barely moved).
  assert.ok(Math.abs(s.x - ROUTE[0].x) < 5, "close to dock x");
  assert.ok(Math.abs(s.z - ROUTE[0].z) < 5, "close to dock z");
});

test("yacht progresses through all legs during one loop", () => {
  const legsVisited = new Set<number>();
  const steps = 1000;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * LOOP_PERIOD_S;
    const s = yachtStateAt(t);
    legsVisited.add(s.leg);
    assert.ok(s.leg >= 0 && s.leg < LEG_COUNT, `leg ${s.leg} in range`);
  }
  // All legs should be visited.
  assert.equal(legsVisited.size, LEG_COUNT, "all legs visited in one loop");
});

test("loopProgress monotonically increases within one loop (excluding dock time)", () => {
  // Sample cruise phase only; last sample wraps, so stop before LOOP_PERIOD_S.
  let prev = -1;
  for (let i = 0; i <= 100; i++) {
    const t =
      BOARD_WINDOW_S + (i / 101) * (LOOP_PERIOD_S - BOARD_WINDOW_S - 0.1);
    const s = yachtStateAt(t);
    assert.ok(
      s.loopProgress >= prev - 1e-6,
      `loopProgress ${s.loopProgress} not less than prev ${prev}`,
    );
    prev = s.loopProgress;
  }
});

test("yachtStateAt is periodic: t and t+LOOP_PERIOD_S give the same result", () => {
  const offsets = [0, 5, BOARD_WINDOW_S + 1, LOOP_PERIOD_S / 2];
  for (const t of offsets) {
    const a = yachtStateAt(t);
    const b = yachtStateAt(t + LOOP_PERIOD_S);
    assert.ok(
      Math.abs(a.x - b.x) < 0.01,
      `x matches at t=${t}: ${a.x} vs ${b.x}`,
    );
    assert.ok(
      Math.abs(a.z - b.z) < 0.01,
      `z matches at t=${t}: ${a.z} vs ${b.z}`,
    );
    assert.equal(a.atDock, b.atDock, `atDock matches at t=${t}`);
  }
});

test("heading is a finite number in -π..π at all points", () => {
  for (let i = 0; i < 50; i++) {
    const t = (i / 50) * LOOP_PERIOD_S;
    const { heading } = yachtStateAt(t);
    assert.ok(isFinite(heading), `heading finite at t=${t}`);
    assert.ok(
      heading >= -Math.PI && heading <= Math.PI,
      `heading in range at t=${t}`,
    );
  }
});

test("deckBob returns a small vertical offset (< 0.15 m)", () => {
  for (let t = 0; t < 20; t++) {
    const bob = deckBob(t);
    assert.ok(typeof bob === "number" && isFinite(bob));
    assert.ok(Math.abs(bob) < 0.15, `bob ${bob} too large`);
  }
});

test("deckRoll returns a small angle (< 0.03 rad)", () => {
  for (let t = 0; t < 20; t++) {
    const roll = deckRoll(t);
    assert.ok(typeof roll === "number" && isFinite(roll));
    assert.ok(Math.abs(roll) < 0.03, `roll ${roll} too large`);
  }
});

test("WAYPOINT_RADIUS is positive and smaller than the shortest leg", () => {
  assert.ok(WAYPOINT_RADIUS > 0);
  const shortest = Math.min(
    ...ROUTE.map((a, i) => {
      const b = ROUTE[(i + 1) % ROUTE.length];
      return Math.hypot(b.x - a.x, b.z - a.z);
    }),
  );
  assert.ok(WAYPOINT_RADIUS < shortest, "radius smaller than shortest leg");
});

test("GANGWAY_AT and YACHT_SPAWN are 2-element tuples", () => {
  assert.equal(GANGWAY_AT.length, 2);
  assert.equal(YACHT_SPAWN.length, 2);
  assert.equal(DISEMBARK_AT.length, 2);
});

test("CRUISE_SPEED is a positive number between 1 and 10 m/s", () => {
  assert.ok(CRUISE_SPEED > 1 && CRUISE_SPEED < 10);
});

test("yachtStateAt mutates and returns the optional out object without allocations", () => {
  const target = {
    x: 0,
    z: 0,
    heading: 0,
    atDock: false,
    loopProgress: 0,
    leg: 0,
  };
  const returned = yachtStateAt(10, target);
  assert.equal(returned, target);
  assert.equal(target.atDock, true);
  yachtStateAt(25, target);
  assert.equal(target.atDock, false);
});
