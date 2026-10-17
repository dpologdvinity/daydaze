// The Aquarium's seal show: Pepper the seal does her tricks on your cues,
// judged like the gym's floor routine (gymnastics.ts). The show pool is in
// the hall's front-right corner, by the side tank.
import type { Element } from "./gymnastics.ts";
import type { Vec2 } from "./walk.ts";

export type Trick = "wave" | "ball" | "spin" | "hoop" | "clap" | "flip" | "bow";

export const SHOW: readonly (Element & { trick: Trick })[] = [
  {
    name: "Flipper wave",
    at: 2.5,
    move: "groove",
    difficulty: 0.1,
    trick: "wave",
  },
  {
    name: "Nose balance",
    at: 4.6,
    move: "groove",
    difficulty: 0.2,
    trick: "ball",
  },
  {
    name: "Barrel roll",
    at: 6.6,
    move: "groove",
    difficulty: 0.2,
    trick: "spin",
  },
  {
    name: "Hoop dive",
    at: 8.6,
    move: "groove",
    difficulty: 0.3,
    trick: "hoop",
  },
  {
    name: "Applause",
    at: 10.5,
    move: "groove",
    difficulty: 0.1,
    trick: "clap",
  },
  {
    name: "Backflip",
    at: 12.5,
    move: "groove",
    difficulty: 0.3,
    trick: "flip",
  },
  {
    name: "Ball toss",
    at: 14.4,
    move: "groove",
    difficulty: 0.2,
    trick: "ball",
  },
  {
    name: "Take a bow",
    at: 16.5,
    move: "groove",
    difficulty: 0.1,
    trick: "bow",
  },
];
export const SHOW_SECONDS = 18;

/** The show pool, its rim a step up from the floor. */
export const POOL = { x0: 4.4, x1: 7.4, z0: 1.6, z1: 5 } as const;
/** Where Pepper performs: on the pool's rock. */
export const SEAL_SPOT: Vec2 = [5.9, 3.2];

export const POOL_BLOCKER: readonly Vec2[] = [
  [POOL.x0, POOL.z0],
  [POOL.x1, POOL.z0],
  [POOL.x1, POOL.z1],
  [POOL.x0, POOL.z1],
];
