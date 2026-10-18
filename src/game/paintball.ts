// Splat City, indoor paintball in the old Pawn and Gadgets store on the
// avenue: a speedball field of inflatable bunkers (snakes, cans and
// temples). Same rules as laser tag (laserTag.ts), five rivals and a wider
// field; a hit leaves a splat.
import type { Box, Field } from "./laserTag.ts";
import type { Vec2 } from "./walk.ts";

export const PAINT_ARENA = { x0: -12, x1: 12, z0: -9, z1: 8 } as const;
export const SPAWN: Vec2 = [0, 6.6];
export const EXIT: Vec2 = [0, 7.6];
export const SPLAT_DOOR = {
  position: [-124, -12.5] as const,
  landing: [-124, -9] as const,
};

export type Bunker = Box & { shape: "snake" | "can" | "temple" };

export const BUNKERS: readonly Bunker[] = [
  { shape: "snake", x0: -8, z0: -1, x1: -5, z1: -0.4 },
  { shape: "snake", x0: 5, z0: -1, x1: 8, z1: -0.4 },
  { shape: "can", x0: -0.6, z0: -4.6, x1: 0.6, z1: -3.4 },
  { shape: "can", x0: -3.6, z0: 2.4, x1: -2.4, z1: 3.6 },
  { shape: "can", x0: 2.4, z0: 2.4, x1: 3.6, z1: 3.6 },
  { shape: "temple", x0: -10.4, z0: -5.4, x1: -8.8, z1: -3.8 },
  { shape: "temple", x0: 8.8, z0: -5.4, x1: 10.4, z1: -3.8 },
  { shape: "temple", x0: -5.6, z0: -6.6, x1: -4, z1: -5.6 },
  { shape: "temple", x0: 4, z0: -6.6, x1: 5.6, z1: -5.6 },
  { shape: "can", x0: -9, z0: 2.4, x1: -7.8, z1: 3.6 },
  { shape: "can", x0: 7.8, z0: 2.4, x1: 9, z1: 3.6 },
];

export const PAINT_FIELD: Field = {
  cover: BUNKERS,
  rivals: [
    { hide: [-9.6, -6.2], peek: [-8.2, -3] },
    { hide: [9.6, -6.2], peek: [8.2, -3] },
    { hide: [-4.8, -7.4], peek: [-3.4, -6.1] },
    { hide: [4.8, -7.4], peek: [3.4, -6.1] },
    { hide: [0, -5.4], peek: [1.3, -4] },
  ],
};
