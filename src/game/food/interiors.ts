// The shared plan of every food interior: a 8 m wide room with the counter
// on the back wall, the entrance at the front and one exit to the street.
// Pure numbers, so the rooms and the city's storefront doors agree.
import type { Vec2 } from "../walk.ts";

/** The walkable floor; the counter's front edge is the back boundary. */
export const INTERIOR_FLOOR: readonly Vec2[] = [
  [-4, -0.6],
  [4, -0.6],
  [4, 5.4],
  [-4, 5.4],
];

/** Where the doll arrives from the street, facing the counter. */
export const INTERIOR_SPAWN = { position: [0, 3.8] as Vec2, yaw: Math.PI };

/** The step back out to the street, one meter past the spawn. */
export const INTERIOR_EXIT: Vec2 = [0, 5.0];

export const INTERIOR_COUNTER_Z = -0.6;
