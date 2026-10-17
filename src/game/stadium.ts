// Seaside Stadium: a football ground on the Fairground forecourt. The
// penalty end of the pitch, a goal with its net, stands round three sides
// and floodlights at the corners; in from the forecourt down the players'
// tunnel. One layout, shared by the room's floor and blockers (rooms.ts)
// and the client.
import { POST_X, SPOT_Z } from "./penalty.ts";
import type { Vec2 } from "./walk.ts";

/** The goal line's centre: goal space's origin. */
export const GOAL: Vec2 = [0, -8];

/** A point in goal space (x across, z out from the line) in the room. */
export function goalToRoom([x, z]: Vec2): Vec2 {
  return [GOAL[0] + x, GOAL[1] + z];
}

export const SPOT: Vec2 = goalToRoom([0, SPOT_Z]);
export const PITCH = { x0: -12, x1: 12, z0: -7.6, z1: 9 } as const;
/** The dugout's bench along the west touchline, facing the pitch. */
export const DUGOUT_X = -11.6;
export const DUGOUT_SEATS: readonly Vec2[] = [-1, 0, 1].map((z): Vec2 => [
  DUGOUT_X,
  z,
]);

export const EXIT: Vec2 = [0, 8.6];
export const SPAWN: Vec2 = [0, 7.4];
export const STADIUM_DOOR = {
  position: [419, 240.5] as const,
  landing: [419, 243.6] as const,
};
export const STADIUM_LOT = { x0: 404, x1: 434, z0: 211, z1: 239 } as const;

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const FLOOR: readonly Vec2[] = box(
  PITCH.x0,
  PITCH.z0,
  PITCH.x1,
  PITCH.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  // the goal's posts and net, just behind the line
  box(
    GOAL[0] - POST_X - 0.2,
    GOAL[1] - 2,
    GOAL[0] + POST_X + 0.2,
    GOAL[1] + 0.2,
  ),
  box(DUGOUT_X - 0.6, -1.6, DUGOUT_X - 0.15, 1.6),
];
