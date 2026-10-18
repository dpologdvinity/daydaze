// Museo ng Little Manila, the neighbourhood's heritage museum: one hall of
// exhibits round the walls, each on its plinth with a plaque, and a docent
// by the door. One layout, shared by the room's floor and blockers
// (rooms.ts) and the client's scene and exhibit panel.
import type { Vec2 } from "./walk.ts";

export const FLOOR_BOUNDS = { x0: -8, x1: 8, z0: -6, z1: 6 } as const;
export const SPAWN: Vec2 = [0, 4.6];
export const EXIT: Vec2 = [0, 5.6];
/** The museum's door on Little Manila's avenue front. */
export const MUSEUM_DOOR = {
  position: [-262, 12.5] as const,
  landing: [-262, 9] as const,
};

export type ExhibitKind =
  | "bahay-kubo"
  | "jeepney"
  | "parol"
  | "baybayin"
  | "banig"
  | "islands"
  | "barong"
  | "sari-sari";

export type Exhibit = {
  kind: ExhibitKind;
  title: string;
  plaque: string;
  /** The plinth's centre. */
  at: Vec2;
  /** Which way the exhibit faces: towards the middle of the hall. */
  yaw: number;
};

export const EXHIBITS: readonly Exhibit[] = [
  {
    kind: "bahay-kubo",
    title: "The bahay kubo",
    plaque:
      "The bahay kubo is a country house of bamboo and nipa palm, raised on stilts to keep it dry in the rains and cool in the heat.",
    at: [-5.6, -4],
    yaw: 0.6,
  },
  {
    kind: "jeepney",
    title: "The jeepney",
    plaque:
      "Jeepneys grew out of the military jeeps left behind after the Second World War: stretched, roofed and painted, they became the Philippines' best-loved ride.",
    at: [-1.8, -4.6],
    yaw: 0,
  },
  {
    kind: "parol",
    title: "The parol",
    plaque:
      "The parol is a star lantern hung for Christmas, which in the Philippines starts with the 'ber' months, in September.",
    at: [1.8, -4.6],
    yaw: 0,
  },
  {
    kind: "baybayin",
    title: "Baybayin",
    plaque:
      "Baybayin is a script used in the Philippines before Spanish rule. Each character is a syllable, and it is still written in art and on tattoos today.",
    at: [5.6, -4],
    yaw: -0.6,
  },
  {
    kind: "banig",
    title: "Banig weaving",
    plaque:
      "A banig is a hand-woven mat of pandan or palm leaves, dyed and plaited into bright patterns, slept on and given as gifts.",
    at: [-7, 0],
    yaw: Math.PI / 2,
  },
  {
    kind: "islands",
    title: "Seven thousand islands",
    plaque:
      "The Philippines is an archipelago of more than seven thousand islands, grouped into Luzon, the Visayas and Mindanao.",
    at: [7, 0],
    yaw: -Math.PI / 2,
  },
  {
    kind: "barong",
    title: "Barong and terno",
    plaque:
      "The barong tagalog is a sheer, embroidered formal shirt, often of piña fibre from pineapple leaves; the terno is a gown known for its butterfly sleeves.",
    at: [-5.6, 3],
    yaw: Math.PI * 0.8,
  },
  {
    kind: "sari-sari",
    title: "The sari-sari store",
    plaque:
      "A sari-sari store is the neighbourhood corner shop, selling a little of everything: snacks, soap and single sachets through a window in the front of a house.",
    at: [5.6, 3],
    yaw: -Math.PI * 0.8,
  },
];

/** Where you stand to look at an exhibit: a step in front of it. */
export function viewpoint(e: Exhibit): Vec2 {
  return [e.at[0] + Math.sin(e.yaw) * 2, e.at[1] + Math.cos(e.yaw) * 2];
}

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

/** Each plinth, a metre and a bit square. */
export const BLOCKERS: readonly (readonly Vec2[])[] = EXHIBITS.map(
  ({ at: [x, z] }) => box(x - 0.7, z - 0.7, x + 0.7, z + 0.7),
);
