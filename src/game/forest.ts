// The Larkspur Forest Trail, behind its gate at the east end of Park Avenue:
// a winding dirt path from the trailhead north through the woods, over a
// creek on a plank bridge, past benches and clearings where deer, a fox and
// rabbits wander, up to a lookout deck. One layout, shared by the room's floor
// and blockers (rooms.ts) and the client's scene (client/rooms/Forest.tsx).
// Everything here is pure and deterministic: the same trees grow in the same
// places on every load.
import { hash } from "./city/hash.ts";
import type { Vec2 } from "./walk.ts";
import { rectFenceSpots, type Rect, type Spot } from "./zoo.ts";
import type { LandKind } from "./creatures.ts";

function box(x0: number, z0: number, x1: number, z1: number): Vec2[] {
  return [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
}

export const BOUNDS = { x0: -28, x1: 28, z0: -50, z1: 22 } as const;
export const SPAWN: Vec2 = [0, 18.5];
export const EXIT: Vec2 = [0, 20.5];

/** The city gate at the east end of Park Avenue, mirroring Sunny Acres'. */
export const FOREST_GATE_DOOR = {
  position: [445, -266] as const,
  landing: [445, -262] as const,
};

/** The creek crosses the room east-west, wandering about z = -14. */
export const CREEK = { z: -14, sway: 2.2, freq: 0.22, halfWidth: 1.8 } as const;
export const creekZ = (x: number): number =>
  CREEK.z + CREEK.sway * Math.sin(x * CREEK.freq);

/** The plank bridge over the creek, running north-south where the path crosses. */
export const BRIDGE = { x: 3, length: 5.2, width: 2.6 } as const;

/** The lookout deck at the trail's end, with a rail along its north edge. */
export const LOOKOUT: Rect = { x0: 0, z0: -49, x1: 14, z1: -42.5 };

/** The path's waypoints, trailhead to lookout; the bridge sits on the fourth. */
export const PATH_POINTS: readonly Vec2[] = [
  [0, 20],
  [0, 15],
  [-4, 9],
  [-4, 3],
  [0, -3],
  [4, -8],
  [BRIDGE.x, creekZ(BRIDGE.x)],
  [2, -18],
  [-4, -23],
  [-6, -29],
  [-2, -35],
  [3, -40],
  [6, -44],
];
export const PATH_WIDTH = 2.4;

/** The waypoints smoothed with a Catmull-Rom curve, `per` points to a span. */
export function smoothPath(points: readonly Vec2[], per = 6): Vec2[] {
  const out: Vec2[] = [];
  const at = (i: number): Vec2 =>
    points[Math.min(points.length - 1, Math.max(0, i))] as Vec2;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1] as Vec2);
  return out;
}

export const PATH: readonly Vec2[] = smoothPath(PATH_POINTS);

/** How far (meters) a point is from the path's centerline. */
export function distToPath(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i] as Vec2;
    const [bx, bz] = PATH[i + 1] as Vec2;
    const dx = bx - ax;
    const dz = bz - az;
    const len = dx * dx + dz * dz;
    const t =
      len === 0
        ? 0
        : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

/** How far (meters) a point is from the creek's centerline, measured in z. */
export const distToCreek = (x: number, z: number): number =>
  Math.abs(z - creekZ(x));

/** Where the creek's water is, as strips between x = -28 and 28 (for the blockers). */
const CREEK_STEP = 0.5;

/** The creek is a wall except at the bridge: one blocker quad per strip. */
function creekBlockers(): Vec2[][] {
  const out: Vec2[][] = [];
  for (let x = BOUNDS.x0; x < BOUNDS.x1; x += CREEK_STEP) {
    const xa = x;
    const xb = x + CREEK_STEP;
    // the bridge's deck is the one way across
    if (xb > BRIDGE.x - BRIDGE.width / 2 && xa < BRIDGE.x + BRIDGE.width / 2)
      continue;
    const h = CREEK.halfWidth - 0.2;
    out.push([
      [xa, creekZ(xa) - h],
      [xb, creekZ(xb) - h],
      [xb, creekZ(xb) + h],
      [xa, creekZ(xa) + h],
    ]);
  }
  return out;
}

/** Where deer, a fox and rabbits wander: clearings the trees keep out of. */
export const GLADES: Record<"west" | "east" | "meadow" | "burrow", Rect> = {
  west: { x0: -25, z0: -34, x1: -10, z1: -20 },
  east: { x0: 9, z0: -36, x1: 25, z1: -22 },
  meadow: { x0: 8, z0: -2, x1: 24, z1: 12 },
  burrow: { x0: -24, z0: -5, x1: -10, z1: 10 },
};

export type Wildlife = {
  kind: LandKind;
  pen: Rect;
  /** Meters per second while walking. */
  speed: number;
  /** Starting angle round the loop. */
  phase: number;
  dir: 1 | -1;
  /** Only drawn on the high quality tier. */
  highOnly?: boolean;
};

export const WILDLIFE: readonly Wildlife[] = [
  { kind: "deer", pen: GLADES.west, speed: 0.6, phase: 0, dir: 1 },
  { kind: "deer", pen: GLADES.east, speed: 0.5, phase: 2.4, dir: -1 },
  {
    kind: "doe",
    pen: GLADES.west,
    speed: 0.5,
    phase: 3.3,
    dir: -1,
    highOnly: true,
  },
  { kind: "fox", pen: GLADES.meadow, speed: 0.8, phase: 1, dir: 1 },
  { kind: "rabbit", pen: GLADES.burrow, speed: 0.5, phase: 0.5, dir: 1 },
  { kind: "rabbit", pen: GLADES.burrow, speed: 0.4, phase: 2.6, dir: -1 },
  { kind: "rabbit", pen: GLADES.burrow, speed: 0.45, phase: 4.4, dir: 1 },
];

/** A point `off` meters to one side of the path at `frac` (0..1) of its length,
 * and the yaw that faces back at the path. */
function beside(frac: number, side: 1 | -1, off: number, along = 0) {
  const i = Math.round(frac * (PATH.length - 1));
  const a = PATH[Math.max(0, i - 1)] as Vec2;
  const b = PATH[Math.min(PATH.length - 1, i + 1)] as Vec2;
  const c = PATH[i] as Vec2;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const tx = (b[0] - a[0]) / len;
  const tz = (b[1] - a[1]) / len;
  // the left-hand normal
  const nx = -tz * side;
  const nz = tx * side;
  const x = c[0] + nx * off + tx * along;
  const z = c[1] + nz * off + tz * along;
  return { x, z, yaw: Math.atan2(-nx, -nz) };
}

const spotAt = (p: { x: number; z: number; yaw: number }): Spot => ({
  ...p,
  sx: 1,
  sy: 1,
  sz: 1,
});

/** Benches beside the path facing it, and two on the lookout deck facing out. */
export const BENCH_SPOTS: readonly Spot[] = [
  spotAt(beside(0.14, 1, 2.1)),
  spotAt(beside(0.4, -1, 2.1)),
  spotAt(beside(0.68, 1, 2.1)),
  { x: 4.5, z: -46, yaw: Math.PI, sx: 1, sy: 1, sz: 1 },
  { x: 9.5, z: -46, yaw: Math.PI, sx: 1, sy: 1, sz: 1 },
];
/** A picnic table in the meadow by the trailhead. */
export const PICNIC_SPOT: Spot = { x: 9, z: 14, yaw: 0.4, sx: 1, sy: 1, sz: 1 };

/** The hikers on the trail, tappable (Hikers.tsx): where they stand and face. */
export const HIKERS: readonly { at: Vec2; yaw: number }[] = [
  (() => {
    const h = beside(0.14, 1, 2.1, 1.6);
    return { at: [h.x, h.z] as Vec2, yaw: h.yaw };
  })(),
  { at: [BRIDGE.x + 0.7, creekZ(BRIDGE.x) + 1.4], yaw: Math.PI },
  { at: [7, -44.8], yaw: Math.PI },
];

export type TreeId =
  | "pine-1"
  | "pine-3"
  | "birch-2"
  | "birch-4"
  | "autumn-2"
  | "autumn-4"
  | "willow-2"
  | "willow-4"
  | "dead-1"
  | "tree-3"
  | "tbirch-4"
  | "tpine-2";

/** Each tree model's height in meters at scale 1 and its triangle count. */
export const TREE_KINDS: Record<TreeId, { height: number; tris: number }> = {
  "pine-1": { height: 2.7, tris: 958 },
  "pine-3": { height: 3.3, tris: 1194 },
  "birch-2": { height: 4.03, tris: 802 },
  "birch-4": { height: 3.56, tris: 1201 },
  "autumn-2": { height: 3.12, tris: 1476 },
  "autumn-4": { height: 2.78, tris: 676 },
  "willow-2": { height: 3.32, tris: 1374 },
  "willow-4": { height: 3.39, tris: 785 },
  "dead-1": { height: 2.22, tris: 1180 },
  "tree-3": { height: 5.72, tris: 1002 },
  "tbirch-4": { height: 9.99, tris: 734 },
  "tpine-2": { height: 8.34, tris: 301 },
};

/** The kinds that grow in the woods, by weight (pines and birches dominate). */
const WOODS: readonly TreeId[] = [
  "pine-1",
  "pine-1",
  "tpine-2",
  "tpine-2",
  "tpine-2",
  "pine-3",
  "birch-2",
  "birch-4",
  "tbirch-4",
  "tbirch-4",
  "tree-3",
  "autumn-4",
  "autumn-2",
  "dead-1",
];
const BANKSIDE: readonly TreeId[] = ["willow-2", "willow-4"];

export type Tree = Spot & { id: TreeId; rank: number };

const inside = (r: Rect, x: number, z: number, pad: number) =>
  x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;

/** True where no tree may grow: the path, the creek's water, clearings, the
 * lookout, the trailhead, the benches and the picnic table. */
function kept(x: number, z: number): boolean {
  if (distToPath(x, z) < PATH_WIDTH / 2 + 1.4) return true;
  if (distToCreek(x, z) < CREEK.halfWidth + 1.2) return true;
  if (Object.values(GLADES).some((g) => inside(g, x, z, 1.5))) return true;
  if (inside(LOOKOUT, x, z, 1.5)) return true;
  if (BENCH_SPOTS.some((b) => Math.hypot(b.x - x, b.z - z) < 2.2)) return true;
  if (Math.hypot(PICNIC_SPOT.x - x, PICNIC_SPOT.z - z) < 3) return true;
  return Math.hypot(SPAWN[0] - x, SPAWN[1] - z) < 4;
}

/** Cell size of the jittered grid the trees grow on. */
const GRID = 4.2;
/** Meters the trees keep inside the walls, so the edge reads as dense woods. */
const MARGIN = 0.8;

/**
 * Every tree: a jittered grid, thinned where the path, creek and clearings
 * are. `rank` (0..1, evenly spread) lets the low tier keep only the lowest
 * ranks: the same woods, thinner.
 */
export function forestTrees(): Tree[] {
  const out: Tree[] = [];
  let n = 0;
  for (let gx = BOUNDS.x0 + MARGIN; gx < BOUNDS.x1 - MARGIN; gx += GRID) {
    for (let gz = BOUNDS.z0 + MARGIN; gz < BOUNDS.z1 - MARGIN; gz += GRID) {
      const x = gx + hash(gx, gz, 1) * GRID * 0.8;
      const z = gz + hash(gx, gz, 2) * GRID * 0.8;
      if (x > BOUNDS.x1 - MARGIN || z > BOUNDS.z1 - MARGIN || kept(x, z))
        continue;
      const bank = distToCreek(x, z) < CREEK.halfWidth + 4.5;
      const list = bank ? BANKSIDE : WOODS;
      const id = list[
        Math.min(list.length - 1, Math.floor(hash(gx, gz, 3) * list.length))
      ] as TreeId;
      // meters tall: 6.5 to 10.5
      const target = 6.5 + hash(gx, gz, 4) * 4;
      const k = target / TREE_KINDS[id].height;
      out.push({
        id,
        x,
        z,
        yaw: hash(gx, gz, 5) * Math.PI * 2,
        sx: k,
        sy: k,
        sz: k,
        rank: 0,
      });
      n++;
    }
  }
  // rank by a stable shuffle so thinning stays even across the room
  const order = out
    .map((_, i) => hash(i, 77))
    .map((h, i) => [h, i] as const)
    .sort((a, b) => a[0] - b[0]);
  order.forEach(([, i], r) => {
    const t = out[i];
    if (t) t.rank = r / Math.max(1, n - 1);
  });
  return out;
}

export const TREES: readonly Tree[] = forestTrees();

/** Share of the trees the low tier keeps. */
export const LOW_TREE_SHARE = 0.5;

export type PlantId =
  | "bush-1"
  | "bush-berries-1"
  | "flowers"
  | "grass"
  | "grass-short"
  | "log"
  | "log-moss"
  | "stump"
  | "stump-moss"
  | "rock-moss-1"
  | "rock-moss-3"
  | "rock-5";

/** A plant's height in meters at scale 1 (grass-short is a tuft, the rest as built). */
const PLANTS: readonly {
  id: PlantId;
  weight: number;
  near: "path" | "creek" | "any";
  size: number;
}[] = [
  { id: "grass", weight: 5, near: "path", size: 0.9 },
  { id: "grass-short", weight: 4, near: "any", size: 1 },
  { id: "flowers", weight: 3, near: "path", size: 1 },
  { id: "bush-1", weight: 3, near: "any", size: 1.2 },
  { id: "bush-berries-1", weight: 2, near: "any", size: 1.2 },
  { id: "rock-moss-1", weight: 2, near: "creek", size: 1.4 },
  { id: "rock-moss-3", weight: 2, near: "creek", size: 1.5 },
  { id: "rock-5", weight: 1, near: "any", size: 1.5 },
  { id: "log", weight: 1, near: "any", size: 1.3 },
  { id: "log-moss", weight: 1, near: "any", size: 1.3 },
  { id: "stump", weight: 1, near: "path", size: 1.2 },
  { id: "stump-moss", weight: 1, near: "any", size: 1.2 },
];
const PLANT_BAG: readonly (typeof PLANTS)[number][] = PLANTS.flatMap((p) =>
  Array.from({ length: p.weight }, () => p),
);

export type Plant = Spot & { id: PlantId };

/** Undergrowth: tufts and flowers along the path's edge, rocks on the creek
 * banks, logs, stumps and bushes among the trees. */
export function undergrowth(count = 260): Plant[] {
  const out: Plant[] = [];
  for (let i = 0; i < count * 4 && out.length < count; i++) {
    const x =
      BOUNDS.x0 + MARGIN + hash(i, 11) * (BOUNDS.x1 - BOUNDS.x0 - 2 * MARGIN);
    const z =
      BOUNDS.z0 + MARGIN + hash(i, 12) * (BOUNDS.z1 - BOUNDS.z0 - 2 * MARGIN);
    const pick = PLANT_BAG[Math.floor(hash(i, 13) * PLANT_BAG.length)];
    if (!pick) continue;
    const dPath = distToPath(x, z);
    if (dPath < PATH_WIDTH / 2 + 0.3) continue;
    if (distToCreek(x, z) < CREEK.halfWidth + 0.2) continue;
    if (inside(LOOKOUT, x, z, 0.5)) continue;
    if (BENCH_SPOTS.some((b) => Math.hypot(b.x - x, b.z - z) < 1.4)) continue;
    if (pick.near === "path" && dPath > 5) continue;
    if (pick.near === "creek" && distToCreek(x, z) > CREEK.halfWidth + 2.2)
      continue;
    const k = pick.size * (0.8 + hash(i, 14) * 0.5);
    out.push({
      id: pick.id,
      x,
      z,
      yaw: hash(i, 15) * Math.PI * 2,
      sx: k,
      sy: k,
      sz: k,
    });
  }
  return out;
}
export const PLANTS_SPOTS: readonly Plant[] = undergrowth();

/** Ducks on the creek: where each floats. */
export const DUCK_SPOTS: readonly Spot[] = [-15, -11, 8, 15].map((x, i) => ({
  x,
  z: creekZ(x),
  yaw: i * 1.7,
  sx: 1,
  sy: 1,
  sz: 1,
}));

export const FLOOR: readonly Vec2[] = box(
  BOUNDS.x0,
  BOUNDS.z0,
  BOUNDS.x1,
  BOUNDS.z1,
);

/** Rail panels on the lookout's north, east and west edges (the south is the way in). */
export const LOOKOUT_RAIL: readonly Spot[] = (() => {
  const all = rectFenceSpots([LOOKOUT], 1, 1.6);
  const count = (len: number) => Math.max(1, Math.round(len / 2.2));
  const n0 = count(LOOKOUT.x1 - LOOKOUT.x0);
  const n1 = count(LOOKOUT.z1 - LOOKOUT.z0);
  const n2 = n0;
  return [...all.slice(0, n0 + n1), ...all.slice(n0 + n1 + n2)];
})();

/** Half the side of a trunk's blocker. */
const TRUNK = 0.4;

/** Solid things: the creek (but for the bridge), tree trunks, the benches and
 * the picnic table, and the lookout's rail. */
export const BLOCKERS: readonly (readonly Vec2[])[] = [
  ...creekBlockers(),
  ...TREES.map((t) => box(t.x - TRUNK, t.z - TRUNK, t.x + TRUNK, t.z + TRUNK)),
  ...BENCH_SPOTS.map((b) => {
    // the bench is 2 m long across its facing
    const turned = Math.abs(Math.sin(b.yaw)) > 0.7;
    const [hx, hz] = turned ? [0.4, 1] : [1, 0.4];
    return box(b.x - hx, b.z - hz, b.x + hx, b.z + hz);
  }),
  box(
    PICNIC_SPOT.x - 1.4,
    PICNIC_SPOT.z - 1.1,
    PICNIC_SPOT.x + 1.4,
    PICNIC_SPOT.z + 1.1,
  ),
  // the rail along the lookout's north edge
  box(LOOKOUT.x0, LOOKOUT.z0 - 0.3, LOOKOUT.x1, LOOKOUT.z0 + 0.1),
  box(LOOKOUT.x0 - 0.1, LOOKOUT.z0, LOOKOUT.x0 + 0.1, LOOKOUT.z1),
  box(LOOKOUT.x1 - 0.1, LOOKOUT.z0, LOOKOUT.x1 + 0.1, LOOKOUT.z1),
];
