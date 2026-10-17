// Mermaid Cove, through a gate on Shore Boulevard: a crescent of sand
// round a moonlit lagoon (to -z), rocks where the mermaids sit and swim,
// the sea cave's arch beyond, and four singing shells at the water's edge
// for Siren Song. One layout, shared by the room's floor (rooms.ts), its
// seats and the client's scene.
import type { Vec2 } from "./walk.ts";

export const SAND = { x0: -10, x1: 10, z0: 2, z1: 9 } as const;
/** The singing shells along the waterline, one per note. */
export const SHELL_SPOTS: readonly Vec2[] = [-4.5, -1.5, 1.5, 4.5].map(
  (x): Vec2 => [x, 2.7],
);
/** Driftwood logs up the beach to sit on, facing the lagoon. */
export const LOG_SEATS: readonly Vec2[] = [-7.6, -6.8, 6.8, 7.6].map(
  (x): Vec2 => [x, 6.2],
);
export const SPAWN: Vec2 = [0, 7.6];
export const EXIT: Vec2 = [0, 8.7];
export const COVE_DOOR = {
  position: [172, 244.4] as const,
  landing: [172, 247.6] as const,
};

export const FLOOR: readonly Vec2[] = [
  [SAND.x0, SAND.z0],
  [SAND.x1, SAND.z0],
  [SAND.x1, SAND.z1],
  [SAND.x0, SAND.z1],
];
