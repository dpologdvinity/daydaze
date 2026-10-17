// Starboard Marina, through its gate on Shore Boulevard: a
// T of floating docks with yachts moored either side, the yacht club's bar
// on the landing, and a fishing spot at the end of the long dock looking
// out to sea (-z). One layout, shared by the room's floor and blockers
// (rooms.ts), its seats and the client's scene.
import type { Vec2 } from "./walk.ts";

/** The landing at the gangway's foot, where the bar stands. */
export const LANDING = { x0: -9, x1: 9, z0: 3, z1: 9 } as const;
/** The long dock out from the landing's middle. */
export const DOCK = { x0: -1.6, x1: 1.6, z0: -12, z1: 3 } as const;
/** The cross dock near its end, with the yachts' berths off it. */
export const CROSS = { x0: -8, x1: 8, z0: -7.4, z1: -5 } as const;
/** Where you stand to fish, at the end of the long dock, facing out. */
export const FISH_SPOT: Vec2 = [0, -11.2];
/** The yachts' berths: hull centre, length along z, beam. */
export const YACHTS: readonly {
  at: Vec2;
  length: number;
  beam: number;
  name: string;
  color: string;
}[] = [
  {
    at: [-5.2, -12.6],
    length: 10,
    beam: 3.4,
    name: "SEA GLASS",
    color: "#ff4fb3",
  },
  {
    at: [5.4, -13.6],
    length: 12,
    beam: 3.8,
    name: "GOLDEN HOUR",
    color: "#ffb02e",
  },
  { at: [-6, -1], length: 7, beam: 3, name: "LIL MERMAID", color: "#3fe0d0" },
];
/** The yacht club bar along the landing's east end. */
export const BAR = { x0: 5.4, x1: 8.6, z0: 4.2, z1: 5 } as const;
export const BAR_STOOLS: readonly Vec2[] = [5.9, 6.9, 7.9].map((x): Vec2 => [
  x,
  5.8,
]);
/** Benches on the landing's west end, facing the yachts. */
export const BENCH_Z = 8.2;
export const BENCH_SEATS: readonly Vec2[] = [-7.4, -6.6, -4.4, -3.6].map(
  (x): Vec2 => [x, BENCH_Z],
);

export const SPAWN: Vec2 = [0, 7.2];
export const EXIT: Vec2 = [0, 8.6];
/** The marina gate's door on Shore Boulevard, east of the pier (the gate
 * itself is one of the city's beach-front buildings). */
export const MARINA_DOOR = {
  position: [40, 244.4] as const,
  landing: [40, 247.6] as const,
};

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

/** The docks as one outline: the landing, down the long dock, round the
 * cross dock and back. */
export const FLOOR: readonly Vec2[] = [
  [LANDING.x0, LANDING.z1],
  [LANDING.x0, LANDING.z0],
  [DOCK.x0, LANDING.z0],
  [DOCK.x0, CROSS.z1],
  [CROSS.x0, CROSS.z1],
  [CROSS.x0, CROSS.z0],
  [DOCK.x0, CROSS.z0],
  [DOCK.x0, DOCK.z0],
  [DOCK.x1, DOCK.z0],
  [DOCK.x1, CROSS.z0],
  [CROSS.x1, CROSS.z0],
  [CROSS.x1, CROSS.z1],
  [DOCK.x1, CROSS.z1],
  [DOCK.x1, LANDING.z0],
  [LANDING.x1, LANDING.z0],
  [LANDING.x1, LANDING.z1],
];

export const BLOCKERS: readonly (readonly Vec2[])[] = [
  box(BAR.x0, BAR.z0, BAR.x1, BAR.z1),
];
