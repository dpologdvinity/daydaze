// Photon Zone's target range: glowing targets slide along three rails on the
// arena's north wall, and you light them up with a light pistol (more shots,
// a wider beam) or a light rifle (fewer shots, a tight beam, faster
// targets). The shooting-gallery math is the Midway's (midway/engine.ts):
// its lanes are the rails. Pure; the client keeps the clock.

import {
  CORKS,
  GALLERY_SECONDS,
  galleryTargets,
  shoot,
  TARGET_POINTS,
  targetX,
  type Level,
  type Target,
} from "../minigames/midway/engine.ts";
import { ARENA } from "./laserTag.ts";

export type { Target };
export type Gun = "pistol" | "rifle";

const LEVEL: Record<Gun, Level> = { pistol: "medium", rifle: "hard" };
/** Shots per drill, and the drill's length, s. */
export const SHOTS: Record<Gun, number> = {
  pistol: CORKS.medium,
  rifle: CORKS.hard,
};
export const DRILL_SECONDS = GALLERY_SECONDS;

/** The rails' heights (bottom to top), their wall z, and their x range. */
export const RAIL_Y = [1.6, 2.2, 2.8] as const;
export const RAIL_Z = ARENA.z0 + 0.35;
const LEFT = ARENA.x0 + 1.5;
const WIDTH = ARENA.x1 - ARENA.x0 - 3;
/** How far off a rail's line a beam still lands on that rail, m. */
const RAIL_REACH = 0.35;

/** A drill: the gun, its targets (lit flags), points, shots left. */
export type Drill = {
  readonly gun: Gun;
  readonly targets: readonly Target[];
  readonly score: number;
  readonly shots: number;
};

export function newDrill(gun: Gun, seed: number): Drill {
  return {
    gun,
    targets: galleryTargets(LEVEL[gun], seed),
    score: 0,
    shots: SHOTS[gun],
  };
}

/** Where a target is on the wall at time `t`: [x, y, z]. */
export function targetAt(target: Target, t: number): [number, number, number] {
  return [
    LEFT + targetX(target, t) * WIDTH,
    RAIL_Y[target.lane] ?? RAIL_Y[1],
    RAIL_Z,
  ];
}

/** A beam hitting the wall at (x, y) at time `t`: the target it lights. */
export function fireAt(
  d: Drill,
  x: number,
  y: number,
  t: number,
): { drill: Drill; lit: Target | null } {
  if (d.shots <= 0) return { drill: d, lit: null };
  const targets = d.targets.map((tg) => ({ ...tg }));
  let rail = -1;
  let best = RAIL_REACH;
  RAIL_Y.forEach((ry, i) => {
    const off = Math.abs(y - ry);
    if (off <= best) {
      best = off;
      rail = i;
    }
  });
  const lit =
    rail < 0 ? null : shoot(targets, LEVEL[d.gun], rail, (x - LEFT) / WIDTH, t);
  return {
    drill: {
      ...d,
      targets,
      score: d.score + (lit ? TARGET_POINTS[lit.kind] : 0),
      shots: d.shots - 1,
    },
    lit,
  };
}

export const drillOver = (d: Drill, t: number) =>
  d.shots <= 0 || t >= DRILL_SECONDS;
