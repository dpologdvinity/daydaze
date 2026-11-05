// Line 1: a deterministic street loop. Timetable and poses share the same
// arc-length path, so signs stay exact even after a tab sleeps or frames drop.
import { streetLoop, type StreetPose } from "./streetLoop.ts";
import type { Vec2 } from "../walk.ts";

export const BUS_DWELL = 10;
const SPEED = 9;
export const BUS_STOPS: readonly {
  name: string;
  at: Vec2;
  road: Vec2;
  yaw: number;
}[] = [
  { name: "Downtown Square", at: [-24, 9], road: [-24, 4.7], yaw: 0 },
  {
    name: "Nightlife Row",
    at: [71, -100],
    road: [67.7, -100],
    yaw: Math.PI / 2,
  },
  { name: "Gallery Row", at: [15, -264], road: [15, -260.5], yaw: Math.PI },
  {
    name: "Downtown West",
    at: [-71, -100],
    road: [-67.7, -100],
    yaw: -Math.PI / 2,
  },
];

// Rounded junctions stay on the streets; all allocation happens at module load.
const corners: readonly Vec2[][] = [
  [[67.7, 4.7]],
  [[67.7, -260.5]],
  [[-67.7, -260.5]],
  [[-67.7, 4.7]],
];
const route = streetLoop(BUS_STOPS, corners, BUS_DWELL, SPEED);
export const BUS_CYCLE = route.cycle;
export type BusPose = StreetPose;
export const busAt = route.at;
const phase = route.phase;
const ARRIVALS = route.arrivals;

/** A stop's position in the repeating timetable, including its dwell. */
export function busStopPhase(seconds: number, stop: number): number {
  const elapsed = phase(seconds) - ARRIVALS[stop];
  return elapsed > -1e-9 ? Math.max(0, elapsed) : elapsed + BUS_CYCLE;
}

/** Two visible riders per stop: one boards, one leaves at each arrival. */
export function busRiderAt(
  seconds: number,
  stop: number,
  leaving: boolean,
  out: BusPose,
): boolean {
  const t = busStopPhase(seconds, stop);
  const s = BUS_STOPS[stop];
  const walk = 4;
  let progress: number;
  if (leaving) {
    if (t >= walk) return false;
    progress = 1 - t / walk;
  } else {
    if (t < BUS_CYCLE - walk && t >= walk) return false;
    progress = t >= BUS_CYCLE - walk ? 0 : t / walk;
  }
  const doorX = s.road[0] + (s.at[0] - s.road[0]) * 0.2;
  const doorZ = s.road[1] + (s.at[1] - s.road[1]) * 0.2;
  out.x = s.at[0] + (doorX - s.at[0]) * progress;
  out.z = s.at[1] + (doorZ - s.at[1]) * progress;
  out.yaw =
    Math.atan2(doorX - s.at[0], doorZ - s.at[1]) + (leaving ? Math.PI : 0);
  return true;
}

/** Zero while doors are open; otherwise seconds until this stop's next arrival. */
export function nextBusIn(seconds: number, stop: number): number {
  const t = phase(seconds),
    arrival = ARRIVALS[stop];
  if (t >= arrival && t < arrival + BUS_DWELL) return 0;
  return (arrival - t + BUS_CYCLE) % BUS_CYCLE;
}

export function canBoard(
  bus: BusPose,
  stop: number,
  at: Vec2,
  occupied: boolean,
): boolean {
  const s = BUS_STOPS[stop];
  return (
    !occupied &&
    !!s &&
    bus.stop === stop &&
    Math.hypot(at[0] - s.at[0], at[1] - s.at[1]) <= 4
  );
}
export function canGetOff(bus: BusPose): boolean {
  return bus.stop >= 0;
}
