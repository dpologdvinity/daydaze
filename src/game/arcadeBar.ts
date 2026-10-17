// Player 2: an arcade bar in the Arts District, in the warehouse on Gallery
// Row's south side. Cabinets down the back wall (three of them play the
// minigames), pinball along the left, the bar on the right and an air
// hockey table on the floor. One layout, shared by the room's floor and
// blockers (rooms.ts), its seats, hotspots and the client's scene.
import type { Vec2 } from "./walk.ts";

/** The walkable floor: the cabinets' fronts at the back, the door at the front. */
export const FLOOR_BOUNDS = { x0: -6, x1: 5.6, z0: -4.4, z1: 5.6 } as const;

/** Cabinets along the back wall, their screens facing the room. */
export const CABINET_Z = -5.2;
export const CABINET_XS: readonly number[] = Array.from(
  { length: 8 },
  (_, i) => -4.9 + i * 1.4,
);
/** The cabinets that play a minigame, by index into CABINET_XS. */
export const PLAYABLE = { gemGlam: 1, bassline: 3, midway: 5 } as const;
/** Where you stand to play a cabinet. */
export const playSpot = (i: number): Vec2 => [CABINET_XS[i], -3.8];

/** The bar along the right wall; its front at x = BAR.front. */
export const BAR = { front: 5.2, back: 6, z0: -2, z1: 4 } as const;
export const STOOL_X = 4.75;
export const STOOL_ZS: readonly number[] = [-1, 0.4, 1.8, 3.2];
/** Past the bar's end, where Last Call is played. */
export const LAST_CALL_SPOT: Vec2 = [4.3, -2.7];

/** Pinball machines down the left wall. */
export const PINBALL = { x0: -6, x1: -5, z0: -2.2, z1: 3.2 } as const;
/** The air hockey table, on the floor left of centre. */
export const HOCKEY: Vec2 = [-2.6, 1.4];

export const EXIT: Vec2 = [0, 5.2];
export const SPAWN: Vec2 = [0, 4.2];
export const ARCADE_DOOR = {
  position: [-132, -245.5] as const,
  landing: [-132, -249.5] as const,
};

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const FLOOR: readonly Vec2[] = box(
  FLOOR_BOUNDS.x0,
  FLOOR_BOUNDS.z0,
  FLOOR_BOUNDS.x1,
  FLOOR_BOUNDS.z1,
);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(BAR.front, BAR.z0, BAR.back, BAR.z1),
  box(PINBALL.x0, PINBALL.z0, PINBALL.x1, PINBALL.z1),
  box(HOCKEY[0] - 0.5, HOCKEY[1] - 1, HOCKEY[0] + 0.5, HOCKEY[1] + 1),
];
