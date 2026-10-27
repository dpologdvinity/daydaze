// Uptown's Park and Gardens: the lawn north of Park Avenue, laid out as a real
// park. Two paved paths cross at a fountain; a pond with a rowboat and ducks
// fills the north-west lawn; a bandstand (gazebo) faces picnic blankets on the
// south-west lawn; benches, lamps, trees, hedges, flower beds and grass fill
// the rest. Pure and deterministic, like the rest of the city's layout:
// layout.ts takes the lawns, paths, trees, lamps and blockers from here, the
// street dressing takes the furniture, and CityPark.tsx draws the grass,
// bushes and flowers near the player.
import type { Vec2 } from "../walk.ts";
import { hash } from "./hash.ts";
import type { FurnitureSpot } from "./furniture.ts";

export type ParkBox = { x0: number; z0: number; x1: number; z1: number };

/** Uptown's Park and Gardens: a lawn north of Park Avenue. */
export const PARK: ParkBox = { x0: 204, x1: 300, z0: -316, z1: -266 };
/** The Ice Rink's timber lodge fills the park's north-east corner. */
const LODGE: ParkBox = { x0: 274, z0: -316, x1: 300, z1: -292 };
/** The east-west path, along the lodge's front (its door is at x 287). */
export const PATH_EW: ParkBox = { x0: 204, z0: -290, x1: 300, z1: -287 };
/** The north-south path, down to Park Avenue's sidewalk. */
export const PATH_NS: ParkBox = { x0: 252.5, z0: -316, x1: 255.5, z1: -266 };

/** Ground level of lawns and paths: things stand on top of this. */
export const GROUND = 0.14;

/** The fountain, where the paths cross. */
export const PARK_FOUNTAIN = { x: 254, z: -288.5, r: 3.2 } as const;
/** The pond, with its rim of rocks at `r`. */
export const POND = { x: 228, z: -304, r: 9 } as const;
/** The bandstand on the south-west lawn. */
export const BANDSTAND = { x: 228, z: -277, r: 3.4 } as const;

const PAD = 1e-6;

/** The pieces of `box` left when `hole` is cut out (up to four rectangles). */
function subtract(box: ParkBox, hole: ParkBox): ParkBox[] {
  const x0 = Math.max(box.x0, hole.x0);
  const x1 = Math.min(box.x1, hole.x1);
  const z0 = Math.max(box.z0, hole.z0);
  const z1 = Math.min(box.z1, hole.z1);
  if (x0 >= x1 - PAD || z0 >= z1 - PAD) return [box];
  const out: ParkBox[] = [];
  if (z0 > box.z0) out.push({ ...box, z1: z0 });
  if (z1 < box.z1) out.push({ ...box, z0: z1 });
  if (x0 > box.x0) out.push({ x0: box.x0, x1: x0, z0, z1 });
  if (x1 < box.x1) out.push({ x0: x1, x1: box.x1, z0, z1 });
  return out;
}

/** The square cut out of the lawn under the pond's water. */
const POND_HOLE: ParkBox = {
  x0: POND.x - POND.r * 0.7,
  x1: POND.x + POND.r * 0.7,
  z0: POND.z - POND.r * 0.7,
  z1: POND.z + POND.r * 0.7,
};

/** The park's lawns: the park box less the lodge, the paths and the pond. */
export const PARK_LAWNS: readonly ParkBox[] = [
  LODGE,
  PATH_EW,
  PATH_NS,
  POND_HOLE,
].reduce<ParkBox[]>(
  (lawns, hole) => lawns.flatMap((b) => subtract(b, hole)),
  [PARK],
);

/** The paved paths, drawn as sidewalk (and walked by the park's strollers). */
export const PARK_PATHS: readonly ParkBox[] = [PATH_EW, PATH_NS];

const inBox = (b: ParkBox, x: number, z: number, pad = 0) =>
  x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad;

/** Whether (x, z) is on open lawn at least `pad` meters from everything else. */
function onLawn(x: number, z: number, pad: number): boolean {
  return (
    inBox(PARK, x, z, -pad) &&
    !inBox(LODGE, x, z, pad) &&
    !inBox(PATH_EW, x, z, pad) &&
    !inBox(PATH_NS, x, z, pad) &&
    Math.hypot(x - POND.x, z - POND.z) > POND.r + pad
  );
}

const octagon = (cx: number, cz: number, r: number): Vec2[] =>
  Array.from({ length: 8 }, (_, i): Vec2 => {
    const a = (i / 8) * Math.PI * 2;
    return [cx + Math.sin(a) * r, cz + Math.cos(a) * r];
  });

/** What stops the walk: the fountain's basin, the pond and the bandstand. */
export const PARK_BLOCKERS: readonly (readonly Vec2[])[] = [
  octagon(PARK_FOUNTAIN.x, PARK_FOUNTAIN.z, PARK_FOUNTAIN.r - 0.2),
  octagon(POND.x, POND.z, POND.r - 0.4),
  octagon(BANDSTAND.x, BANDSTAND.z, BANDSTAND.r),
];

/** Street trees over the lawn: a jittered 9 m grid, thinned, clear of the paths. */
export function parkTrees(): Vec2[] {
  const out: Vec2[] = [];
  for (let gx = PARK.x0 + 6; gx < PARK.x1; gx += 9) {
    for (let gz = PARK.z0 + 6; gz < PARK.z1; gz += 9) {
      const x = gx + (hash(gx, gz, 1) - 0.5) * 6;
      const z = gz + (hash(gx, gz, 2) - 0.5) * 6;
      if (hash(gx, gz, 3) < 0.2 || !onLawn(x, z, 2.5)) continue;
      // keep the bandstand's front and the fountain's plaza open
      if (Math.hypot(x - BANDSTAND.x, z - BANDSTAND.z) < 8) continue;
      if (Math.hypot(x - PARK_FOUNTAIN.x, z - PARK_FOUNTAIN.z) < 9) continue;
      out.push([x, z]);
    }
  }
  // trees flanking the park's entrance, where the path meets Park Avenue
  for (const t of [
    [247.5, -270.5],
    [260.5, -270],
    [245, -279],
    [263, -280],
  ] as const)
    out.push([t[0], t[1]]);
  return out;
}

/** Whether (x, z) is inside the park (the player hears birds and the fountain). */
export const inPark = (x: number, z: number) => inBox(PARK, x, z);

/** Lamps down the east-west path, alternating its sides. */
export function parkLamps(): Vec2[] {
  return [214, 236, 268, 296].map((x, i): Vec2 => [
    x,
    i % 2 === 0 ? PATH_EW.z0 - 0.8 : PATH_EW.z1 + 0.8,
  ]);
}

/** The picnic blankets on the lawn. */
const BLANKETS: readonly Vec2[] = [
  [238, -275],
  [236, -268.5],
  [218, -273],
  [221, -267.5],
  [268, -272],
  [284, -277],
];

const spot = (
  kind: FurnitureSpot["kind"],
  x: number,
  z: number,
  yaw = 0,
  scale = 1,
  y: number = GROUND,
): FurnitureSpot => ({ kind, x, z, yaw, scale, y });

/** The park's furniture: benches, tables, blankets, the fountain, bandstand, boat and ducks. */
export function parkFurniture(): FurnitureSpot[] {
  const out: FurnitureSpot[] = [
    spot("fountain", PARK_FOUNTAIN.x, PARK_FOUNTAIN.z),
    spot("gazebo", BANDSTAND.x, BANDSTAND.z),
    spot("rowboat", POND.x + 2.5, POND.z + 3, 0.7, 1.6, 0.1),
  ];
  // benches along the path, facing it, and round the pond, facing the water
  for (const x of [222, 244, 262, 278]) {
    out.push(spot("bench", x, PATH_EW.z1 + 1.2, Math.PI));
    if (x < 270) out.push(spot("bench", x + 7, PATH_EW.z0 - 1.2, 0));
  }
  out.push(spot("bench", POND.x, POND.z + POND.r + 1.4, Math.PI));
  out.push(spot("bench", POND.x - POND.r - 1.4, POND.z, Math.PI / 2));
  out.push(spot("bench", POND.x + POND.r + 1.4, POND.z, -Math.PI / 2));
  out.push(spot("bench", PATH_NS.x1 + 1.2, -276, -Math.PI / 2));
  // ducks on the water
  for (let i = 0; i < 6; i++) {
    const a = hash(i, 11) * Math.PI * 2;
    const d = 2 + hash(i, 12) * (POND.r - 4.5);
    out.push(
      spot(
        "duck",
        POND.x + Math.cos(a) * d,
        POND.z + Math.sin(a) * d,
        hash(i, 13) * Math.PI * 2,
        2 + hash(i, 14) * 0.5,
        0.15,
      ),
    );
  }
  // picnics: blankets with baskets on the lawn in front of the bandstand,
  // and tables on the south-east strip
  BLANKETS.forEach(([x, z], i) => {
    out.push(spot("blanket", x, z, hash(i, 21) * Math.PI, 1, GROUND + 0.02));
    out.push(spot("basket", x + 0.5, z - 0.3, hash(i, 22) * 6, 1));
  });
  out.push(spot("picnic-table", 276, -270, 0.2));
  out.push(spot("picnic-table", 290, -270, -0.3));
  return out;
}

export type GrowthKind =
  "grass" | "wispy" | "fern" | "bush" | "flowers3" | "flowers4" | "rock";

/** A plant or rock on the lawn; CityPark draws these near the player. */
export type Growth = {
  kind: GrowthKind;
  x: number;
  z: number;
  yaw: number;
  scale: number;
};

/**
 * The park's undergrowth: tufts of grass over every lawn, hedges of bushes
 * round the edges, flower beds round the fountain and the benches, and the
 * pond's rim of rocks and ferns.
 */
export function parkGrowth(): Growth[] {
  const out: Growth[] = [];
  const add = (kind: GrowthKind, x: number, z: number, i: number, s = 1) =>
    out.push({
      kind,
      x,
      z,
      yaw: hash(x, z, i) * Math.PI * 2,
      scale: s * (0.8 + hash(x, z, i + 1) * 0.5),
    });
  // grass: a jittered grid over each lawn
  for (const lawn of PARK_LAWNS) {
    for (let gx = lawn.x0 + 0.8; gx < lawn.x1; gx += 1.1) {
      for (let gz = lawn.z0 + 0.8; gz < lawn.z1; gz += 1.1) {
        const x = gx + (hash(gx, gz, 30) - 0.5) * 0.9;
        const z = gz + (hash(gx, gz, 31) - 0.5) * 0.9;
        if (!inBox(lawn, x, z, -0.2)) continue;
        // bare patches where people sit
        if (blanketNear(x, z)) continue;
        add(hash(gx, gz, 32) < 0.35 ? "wispy" : "grass", x, z, 33);
      }
    }
  }
  // hedges along the north and west edges
  for (let x = PARK.x0 + 2; x < LODGE.x0 - 2; x += 4.5)
    if (hash(x, 40) < 0.8) add("bush", x, PARK.z0 + 1.2, 41, 1.2);
  for (let z = PARK.z0 + 6; z < PARK.z1 - 4; z += 5)
    if (hash(z, 42) < 0.8 && onLawn(PARK.x0 + 1.2, z, 0.5))
      add("bush", PARK.x0 + 1.2, z, 43, 1.1);
  // flower beds: a ring round the fountain's plaza, drifts by the benches
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = PARK_FOUNTAIN.x + Math.cos(a) * 7.2;
    const z = PARK_FOUNTAIN.z + Math.sin(a) * 7.2;
    if (onLawn(x, z, 0.8)) add(i % 2 ? "flowers3" : "flowers4", x, z, 50);
  }
  for (let x = PARK.x0 + 10; x < PARK.x1 - 6; x += 7) {
    const z = x % 14 < 7 ? PATH_EW.z1 + 2.6 : PATH_EW.z0 - 2.6;
    if (hash(x, 60) < 0.55 && onLawn(x, z, 0.5)) add("flowers3", x, z, 61);
  }
  // the pond's rim
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const r = POND.r + 0.4;
    const x = POND.x + Math.cos(a) * r;
    const z = POND.z + Math.sin(a) * r;
    if (!inBox(PARK, x, z, -0.5)) continue;
    add(i % 3 === 0 ? "fern" : "rock", x, z, 70, i % 3 === 0 ? 1 : 1.1);
  }
  return out;
}

function blanketNear(x: number, z: number): boolean {
  return BLANKETS.some(([bx, bz]) => Math.hypot(x - bx, z - bz) < 1.6);
}
