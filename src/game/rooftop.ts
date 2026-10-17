// The Skylark: a rooftop bar 30 m above Nightlife Row, up the lift in the
// tower at the east end of the Back Room's block. One layout, shared by the
// room's floor and blockers (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

/** The walkable deck: from the bar's front to the south rail. */
export const DECK = { x0: -7.6, x1: 7.6, z0: -4, z1: 6.9 } as const;

/** The bar counter along the back, its front at z = `front`. */
export const BAR = { x0: -4.8, x1: 1.6, front: -4.4, back: -5.2 } as const;

/** Stools along the bar's front, at these x positions. */
export const STOOL_XS: readonly number[] = [-4.1, -3.1, -2.1, -1.1, -0.1, 0.9];
export const STOOL_Z = -3.85;

/** The lounge: a long sofa against the west rail, facing across the deck
 * (+x), with a fire pit at its north end. Nothing stands in front of it, so
 * a straight walk from the lift reaches every cushion. */
export const SOFA = {
  at: [-7.0, 1.5] as Vec2,
  cushions: [
    [-6.85, 0.5],
    [-6.85, 1.5],
    [-6.85, 2.5],
  ] as readonly Vec2[],
};
export const FIRE: Vec2 = [-6.6, -1.2];

/** Standing tables on the east side, where regulars lean. */
export const HIGH_TABLES: readonly Vec2[] = [
  [4.6, 2.8],
  [6.4, 0.6],
];

/** The DJ booth in the north-east corner, facing the deck. */
export const DJ_BOOTH = { x0: 4.3, x1: 6.5, z0: -4, z1: -2.7 } as const;

/** The lift: a kiosk in the deck's south-west corner (x from KIOSK.x0 to
 * KIOSK.x1), its doors facing north, and where you step out of them. */
export const KIOSK = { x0: -8.2, x1: -4.8, front: 5.9 } as const;
export const LIFT = { door: [-6.5, 5.5] as Vec2, spawn: [-5.6, 4.6] as Vec2 };

/** Where the tower's street door stands on Nightlife Row, and its exit lands. */
export const SKYLARK_DOOR = {
  position: [172, -12.5] as const,
  landing: [172, -9] as const,
};

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const FLOOR: readonly Vec2[] = box(DECK.x0, DECK.z0, DECK.x1, DECK.z1);

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  // the sofa (its seat front left clear by a body's width, so the cushions
  // can be walked up to) and its fire pit
  box(-7.6, -0.1, -6.75, 3.1),
  box(FIRE[0] - 0.5, FIRE[1] - 0.5, FIRE[0] + 0.5, FIRE[1] + 0.5),
  ...HIGH_TABLES.map(([x, z]) => box(x - 0.35, z - 0.35, x + 0.35, z + 0.35)),
  box(DJ_BOOTH.x0, DJ_BOOTH.z0, DJ_BOOTH.x1, DJ_BOOTH.z1),
  box(KIOSK.x0, KIOSK.front, KIOSK.x1, DECK.z1 + 0.3),
];
