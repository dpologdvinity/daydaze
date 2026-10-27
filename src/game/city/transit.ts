// Line 1: a deterministic street loop. Timetable and poses share the same
// arc-length path, so signs stay exact even after a tab sleeps or frames drop.
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
function leg(i: number) {
  const points: Vec2[] = [BUS_STOPS[i].road];
  const end = BUS_STOPS[(i + 1) % BUS_STOPS.length].road;
  for (const corner of corners[i]) {
    const start = points[points.length - 1];
    const a = Math.hypot(corner[0] - start[0], corner[1] - start[1]);
    const b = Math.hypot(end[0] - corner[0], end[1] - corner[1]);
    const r = 7;
    const before: Vec2 = [
      corner[0] + ((start[0] - corner[0]) * r) / a,
      corner[1] + ((start[1] - corner[1]) * r) / a,
    ];
    const after: Vec2 = [
      corner[0] + ((end[0] - corner[0]) * r) / b,
      corner[1] + ((end[1] - corner[1]) * r) / b,
    ];
    points.push(before);
    for (let j = 1; j <= 16; j++) {
      const t = j / 16,
        u = 1 - t;
      points.push([
        u * u * before[0] + 2 * u * t * corner[0] + t * t * after[0],
        u * u * before[1] + 2 * u * t * corner[1] + t * t * after[1],
      ]);
    }
  }
  points.push(end);
  const distances = [0];
  for (let j = 1; j < points.length; j++)
    distances.push(
      distances[j - 1] +
        Math.hypot(
          points[j][0] - points[j - 1][0],
          points[j][1] - points[j - 1][1],
        ),
    );
  return {
    points,
    distances,
    seconds: distances[distances.length - 1] / SPEED,
  };
}
const LEGS = BUS_STOPS.map((_, i) => leg(i));
const ARRIVALS: number[] = [];
let duration = 0;
for (const l of LEGS) {
  ARRIVALS.push(duration);
  duration += BUS_DWELL + l.seconds;
}
export const BUS_CYCLE = duration;
export type BusPose = {
  x: number;
  z: number;
  yaw: number;
  stop: number;
  next: number;
};
const phase = (seconds: number) =>
  ((seconds % BUS_CYCLE) + BUS_CYCLE) % BUS_CYCLE;

/** Writes into a pooled pose; no frame-rate dependence and no per-frame objects. */
export function busAt(seconds: number, out: BusPose): void {
  const t = phase(seconds);
  let i = BUS_STOPS.length - 1;
  while (i > 0 && t < ARRIVALS[i]) i--;
  const elapsed = t - ARRIVALS[i];
  const stop = BUS_STOPS[i];
  out.next = (i + 1) % BUS_STOPS.length;
  if (elapsed < BUS_DWELL) {
    out.x = stop.road[0];
    out.z = stop.road[1];
    out.yaw = stop.yaw;
    out.stop = i;
    return;
  }
  out.stop = -1;
  const l = LEGS[i],
    d = (elapsed - BUS_DWELL) * SPEED;
  let j = 1;
  while (j < l.distances.length - 1 && d >= l.distances[j]) j++;
  const a = l.points[j - 1],
    b = l.points[j];
  const f = (d - l.distances[j - 1]) / (l.distances[j] - l.distances[j - 1]);
  out.x = a[0] + (b[0] - a[0]) * f;
  out.z = a[1] + (b[1] - a[1]) * f;
  out.yaw = Math.atan2(a[1] - b[1], b[0] - a[0]);
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
