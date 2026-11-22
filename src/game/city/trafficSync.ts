// Shared city traffic (#9): a player-less reference fleet that every client
// steps on the shared clock, so any two players hold the same cars. The
// visible fleet keeps dodging its own player and is pulled back onto the
// reference only where its player cannot see the correction. Pure.
import { TICK_HZ } from "../driving/fixedStep.ts";
import type { Vec2 } from "../walk.ts";
import {
  TRAFFIC_COUNT,
  TRAFFIC_SEED,
  carPose,
  createTraffic,
  stepTraffic,
  syncClock,
  type Traffic,
} from "./traffic.ts";

/**
 * Seconds in an era. Each era restarts the reference from `createTraffic`, so
 * a client that joins mid-era replays at most this much (9000 ticks) to catch
 * up; it is also how often the unseen cars are re-seeded.
 */
export const TRAFFIC_ERA = 180;
/** Ticks one `advanceReference` call may run (about 5 ms), so a join never
 * hitches a frame. */
export const CATCH_UP_TICKS = 150;
const DT = 1 / TICK_HZ;
/** A car this close (m) to its reference spot, on the same lane, is in step. */
const IN_STEP = 0.5;

/** The reference fleet, the era it belongs to and the ticks it has run in it. */
export type TrafficReference = { traffic: Traffic; era: number; ticks: number };

/** An empty reference; the first `advanceReference` seeds it. */
export const createReference = (): TrafficReference => ({
  traffic: { cars: [], time: 0, alarms: 0 },
  era: -1,
  ticks: 0,
});

/**
 * Steps the reference towards shared time `wall` (seconds), at most `budget`
 * ticks. Returns true once it is up to date. The fleet is the largest tier's,
 * so every smaller tier's cars (same ids) are a prefix of it; it ignores the
 * player, the bus, the food truck and any hailed taxi, which are local.
 */
export function advanceReference(
  ref: TrafficReference,
  wall: number,
  budget = CATCH_UP_TICKS,
): boolean {
  if (!Number.isFinite(wall)) return false;
  const era = Math.floor(wall / TRAFFIC_ERA);
  const start = era * TRAFFIC_ERA;
  if (ref.era !== era) {
    ref.traffic = createTraffic(TRAFFIC_COUNT.high, TRAFFIC_SEED);
    ref.era = era;
    ref.ticks = 0;
  }
  const due = Math.floor((wall - start) * TICK_HZ);
  const stop = Math.min(due, ref.ticks + budget);
  while (ref.ticks < stop) {
    // the lights read the sim's own clock: the shared time of this very tick
    syncClock(ref.traffic, start + ref.ticks * DT);
    stepTraffic(ref.traffic, DT, null);
    ref.ticks++;
  }
  return ref.ticks >= due;
}

const here = { x: 0, z: 0, yaw: 0 };
const there = { x: 0, z: 0, yaw: 0 };

/**
 * Pulls the visible fleet `local` onto the reference. A car out of step is
 * copied from its reference twin (the car with the same id) only when neither
 * is within `range` meters of `at`, the player, so nobody sees it jump; with
 * `adopt` every car is copied (the moment of joining). Cars with no twin and
 * cars on a trip (the taxi) are left alone. Returns how many were copied.
 * Allocates only for a car that is mid-turn, and only when it is copied.
 */
export function reconcileTraffic(
  local: Traffic,
  ref: TrafficReference,
  at: Vec2,
  range: number,
  adopt = false,
): number {
  let copied = 0;
  for (const car of local.cars) {
    const twin = ref.traffic.cars[car.id];
    if (!twin || car.trip) continue;
    if (!adopt) {
      if (
        car.lane.edge === twin.lane.edge &&
        car.lane.way === twin.lane.way &&
        Math.abs(car.s - twin.s) < IN_STEP
      )
        continue;
      carPose(car, here);
      carPose(twin, there);
      if (
        Math.hypot(here.x - at[0], here.z - at[1]) <= range ||
        Math.hypot(there.x - at[0], there.z - at[1]) <= range
      )
        continue;
    }
    car.lane.edge = twin.lane.edge;
    car.lane.way = twin.lane.way;
    car.s = twin.s;
    car.speed = twin.speed;
    car.next = twin.next && { ...twin.next };
    car.turns = twin.turns;
    car.seen = 0;
    car.halt = 0;
    copied++;
  }
  return copied;
}
