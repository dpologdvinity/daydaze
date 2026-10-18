// The Blowout Bar, a hair salon on Gallery Row, and Ink & Needle, the
// piercing parlor down the street. Each is one room: the salon's styling
// chairs face mirrors along the back wall, the parlor's piercing chair sits
// by its glass jewelry cases. One layout each, shared by the rooms' floors
// and blockers (rooms.ts), their seats and the client's scenes.
import type { Vec2 } from "./walk.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const SALON = {
  bounds: { x0: -6, x1: 6, z0: -5, z1: 5 },
  spawn: [0, 3.8] as Vec2,
  exit: [0, 4.8] as Vec2,
  /** The styling chairs, a step out from the mirrors on the back wall. */
  chairs: [-3.6, 0, 3.6].map((x): Vec2 => [x, -3.2]),
  /** The stylist's spot beside the middle chair, where you book. */
  stylist: [1.1, -3.4] as Vec2,
  /** The reception desk by the door. */
  desk: { x0: 3, x1: 5.4, z0: 2.4, z1: 3.2 },
  door: { position: [-27, -266.4] as const, landing: [-27, -263] as const },
} as const;

export const PARLOR = {
  bounds: { x0: -5, x1: 5, z0: -4, z1: 4 },
  spawn: [0, 2.8] as Vec2,
  exit: [0, 3.8] as Vec2,
  /** The piercing chair, reclined, against the back wall. */
  chair: [0, -2.6] as Vec2,
  piercer: [1.2, -2.4] as Vec2,
  /** Glass jewelry cases down both side walls. */
  cases: [
    { x0: -4.9, x1: -4.1, z0: -2.5, z1: 1.5 },
    { x0: 4.1, x1: 4.9, z0: -2.5, z1: 1.5 },
  ],
  door: { position: [-126, -266.4] as const, landing: [-126, -263] as const },
} as const;

export const SALON_FLOOR = box(
  SALON.bounds.x0,
  SALON.bounds.z0,
  SALON.bounds.x1,
  SALON.bounds.z1,
);
export const SALON_BLOCKERS: readonly (readonly Vec2[])[] = [
  box(SALON.desk.x0, SALON.desk.z0, SALON.desk.x1, SALON.desk.z1),
  // the mirror counter along the back wall
  box(SALON.bounds.x0, SALON.bounds.z0, SALON.bounds.x1, SALON.bounds.z0 + 0.8),
];

export const PARLOR_FLOOR = box(
  PARLOR.bounds.x0,
  PARLOR.bounds.z0,
  PARLOR.bounds.x1,
  PARLOR.bounds.z1,
);
export const PARLOR_BLOCKERS: readonly (readonly Vec2[])[] = PARLOR.cases.map(
  (c) => box(c.x0, c.z0, c.x1, c.z1),
);
