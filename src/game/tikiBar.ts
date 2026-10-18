// The Coconut Grove, Beachside's tiki bar: a bamboo bar under a thatched
// roof, torches, glass-float lamps, surfboards on the walls, rattan
// lounges round a fire bowl and the open back looking out at the sunset
// over the water. One layout, shared by the room's floor and blockers
// (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -9, x1: 9, z0: -7, z1: 7 } as const;
export const SPAWN: Vec2 = [0, 5.6];
export const EXIT: Vec2 = [0, 6.6];
export const TIKI_DOOR = {
  position: [16, 244.5] as const,
  landing: [16, 247.6] as const,
};

/** The bamboo bar under its thatch, and its stools' line. */
export const BAR = { x0: -5, x1: 3, z0: -3.6, z1: -2.8 } as const;
export const STOOL_Z = -2.1;
export const STOOL_XS: readonly number[] = [-4.2, -2.8, -1.4, 0, 1.4, 2.4];
export const BARTENDER: Vec2 = [-1, -4.4];
/** Rattan lounges facing each other across the fire bowl, east side. */
export const FIRE: Vec2 = [6, 2.2];
export const LOUNGES: readonly { at: Vec2; yaw: number }[] = [
  { at: [6, 0.4], yaw: 0 },
  { at: [6, 4], yaw: Math.PI },
];

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  // the bar, and the back counter the bartender works from
  box(BAR.x0, BAR.z0, BAR.x1, BAR.z1),
  box(BAR.x0, -5.4, BAR.x1, -4.9),
  box(FIRE[0] - 0.6, FIRE[1] - 0.6, FIRE[0] + 0.6, FIRE[1] + 0.6),
  // each lounge's seat edge sits just in front of its sitters, so they walk
  // up to it from the fire side
  ...LOUNGES.map(({ at: [x, z], yaw }) =>
    yaw === 0
      ? box(x - 1.1, z - 0.5, x + 1.1, z + 0.12)
      : box(x - 1.1, z - 0.12, x + 1.1, z + 0.5),
  ),
];
