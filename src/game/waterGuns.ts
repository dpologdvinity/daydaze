// The water-gun battle in the Water Park's wave pool: floaties ride three
// rows across the pool, and you soak them with a water pistol before the
// tank runs dry or the clock runs out. The shooting-gallery math is the
// Midway's (midway/engine.ts): its three lanes become the pool's rows, its
// corks your squirts. Pure; the client keeps the clock.

import {
  CORKS,
  GALLERY_SECONDS,
  galleryTargets,
  shoot,
  TARGET_POINTS,
  targetX,
  type Target,
} from "../minigames/midway/engine.ts";
import { POOL } from "./waterPark.ts";

export type { Target };

/** Squirts in a full tank, and the battle's length, s. */
export const TANK = CORKS.easy;
export const BATTLE_SECONDS = GALLERY_SECONDS;

/** The rows' z (near the deck to the far side) and the floaties' x range. */
const ROW_Z = [POOL.z1 - 1.8, (POOL.z0 + POOL.z1) / 2, POOL.z0 + 1.8];
const LEFT = POOL.x0 + 0.8;
const WIDTH = POOL.x1 - POOL.x0 - 1.6;
/** How far off a row's line a squirt still lands in that row, m. */
const ROW_REACH = 0.9;

/** A battle: the floaties (with their soaked flags), points, squirts left. */
export type Battle = {
  readonly targets: readonly Target[];
  readonly score: number;
  readonly water: number;
};

/** A fresh battle: a full tank and the seed's floaties. */
export function newBattle(seed: number): Battle {
  return { targets: galleryTargets("easy", seed), score: 0, water: TANK };
}

/** Where a floatie bobs on the pool at time `t`: [x, z]. */
export function floatieAt(target: Target, t: number): [number, number] {
  return [
    LEFT + targetX(target, t) * WIDTH,
    ROW_Z[target.lane] ?? ROW_Z[1] ?? 0,
  ];
}

/**
 * A squirt landing at (x, z) at time `t`: the floatie it soaks, if any, and
 * the battle after it. An empty tank squirts nothing.
 */
export function squirt(
  b: Battle,
  x: number,
  z: number,
  t: number,
): { battle: Battle; soaked: Target | null } {
  if (b.water <= 0) return { battle: b, soaked: null };
  const targets = b.targets.map((tg) => ({ ...tg }));
  let row = -1;
  let best = ROW_REACH;
  ROW_Z.forEach((rz, i) => {
    const d = Math.abs(z - rz);
    if (d <= best) {
      best = d;
      row = i;
    }
  });
  const soaked =
    row < 0 ? null : shoot(targets, "easy", row, (x - LEFT) / WIDTH, t);
  return {
    battle: {
      targets,
      score: b.score + (soaked ? TARGET_POINTS[soaked.kind] : 0),
      water: b.water - 1,
    },
    soaked,
  };
}

/** Whether the battle is done at time `t`. */
export const battleOver = (b: Battle, t: number) =>
  b.water <= 0 || t >= BATTLE_SECONDS;
