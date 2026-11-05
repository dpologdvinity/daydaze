// Orbit 9: a club on a space station, in the old warehouse on Gallery Row's
// south side. A dance floor under one huge window (a ringed planet and the
// stars outside), the DJ's deck at the window, a soda bar along the east
// wall, a lounge along the west and a Star Siege cabinet. One layout, shared
// by the room's floor and blockers (rooms.ts), its seats, its hotspots and
// the client's scene.
import type { Vec2 } from "./walk.ts";

/** The walkable floor: the DJ stage at the back (z = -5.6), the door at the front. */
export const FLOOR_BOUNDS = { x0: -7.6, x1: 7.6, z0: -5.6, z1: 6.6 } as const;

/** The window wall; the room's back. The stage and deck stand in front of it. */
export const WINDOW_Z = -8.2;

/** The DJ's raised stage along the window. */
export const STAGE = {
  x0: -3.2,
  x1: 3.2,
  z0: -7.8,
  z1: -5.6,
  height: 0.35,
} as const;

/** The dance floor's center, on its LED tiles. */
export const DANCE: Vec2 = [0, -1.2];

/** The soda bar along the east wall; its front at x = BAR.front. */
export const BAR = { front: 6.5, back: 7.5, z0: -1.4, z1: 4 } as const;
export const STOOL_X = 6.05;
export const STOOL_ZS: readonly number[] = [-0.6, 0.7, 2, 3.3];

/** The lounge along the west wall: chairs round two low tables. */
export const LOUNGE_TABLES: readonly Vec2[] = [
  [-6.3, 0.6],
  [-6.3, 3.4],
];
/** Each chair: where it stands and the table it faces. */
export const LOUNGE_CHAIRS: readonly { at: Vec2; table: number }[] = [
  { at: [-4.9, 0.6], table: 0 },
  { at: [-6.3, -0.8], table: 0 },
  { at: [-4.9, 3.4], table: 1 },
  { at: [-6.3, 4.8], table: 1 },
];

/** Where the jukebox stands, by the window on the west. */
export const JUKEBOX: Vec2 = [-6.6, -4.9];
/** The Star Siege cabinet, by the window on the east. */
export const CABINET: Vec2 = [6.4, -5.1];
/** In front of the DJ stage, where Bassline is played on the decks. */
export const DECKS_SPOT: Vec2 = [2.2, -4.7];
/** In front of the Star Siege cabinet. */
export const CABINET_SPOT: Vec2 = [6.4, -4.2];

/** The airlock door at the front: the exit pad, and where you step in. */
export const EXIT: Vec2 = [0, 6.2];
export const SPAWN: Vec2 = [0, 5];
export const ORBIT_DOOR = {
  position: [104, -245.5] as const,
  landing: [104, -249.5] as const,
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
  ...LOUNGE_TABLES.map(([x, z]) => box(x - 0.4, z - 0.4, x + 0.4, z + 0.4)),
  box(JUKEBOX[0] - 0.5, JUKEBOX[1] - 0.4, JUKEBOX[0] + 0.5, JUKEBOX[1] + 0.4),
  box(CABINET[0] - 0.5, CABINET[1] - 0.4, CABINET[0] + 0.5, CABINET[1] + 0.4),
];
