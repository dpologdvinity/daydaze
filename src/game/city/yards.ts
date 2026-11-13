// The city's yards and lanes: what stands in the gaps the infill plan
// (infill.ts, generated into infill.generated.ts) leaves between the rows of
// buildings, and on the lanes between the sub-blocks. Each yard has a use
// that suits its neighborhood: a narrow back alley (dumpsters, bags, bins), or
// a pocket lot with striped stalls and parked cars, a basketball court, a
// garden, a small park, a backyard behind a wood fence, or beach sand. Yards
// are scenery, not floor: they are not walkable, so the walk rules
// (layout.ts) are unchanged.
//
// The plan is static and comes pre-computed; what is left to do at load is to
// lay out each yard's props, a few thousand items in a few milliseconds. The
// result is ground slabs and stripes (`YARD_GROUND`, placed per cell by
// dressing.ts), furniture models (`YARD_FURNITURE`: dumpsters, fences, bags,
// benches, the court), trees (`YARD_TREES`) and parked cars (`YARD_CARS`).

import type { Vec2 } from "../walk.ts";
import { hash, pick } from "./hash.ts";
import type { Neighborhood } from "./layout.ts";
import type { FurnitureSpot } from "./furniture.ts";
import { INFILL_LANES, INFILL_YARDS } from "./infill.generated.ts";
import type { Rect, YardKind } from "./infill.ts";
import type { Instance, Kind } from "./plan.ts";

export type { Rect, YardKind };

export type Yard = Rect & { kind: YardKind; neighborhood: Neighborhood };

/** A ground slab or stripe, as plan.ts draws it: an instance of a kind. */
export type YardPiece = { at: Vec2; kind: Kind; instance: Instance };

/** A car parked in a lot (src/game/city/dressing.ts turns it into a ParkedSpot). */
export type YardCar = { x: number; z: number; yaw: number; r: number };

/** A tree to plant: plan.ts picks its model by the spot. */
export type YardTree = Vec2;

const w = (r: Rect) => r.x1 - r.x0;
const d = (r: Rect) => r.z1 - r.z0;

const isYardKind = (k: string): k is YardKind =>
  [
    "park",
    "lot",
    "court",
    "garden",
    "alley",
    "backalley",
    "backyard",
    "sand",
  ].includes(k);

/** Every yard in the city, from the generated plan. */
export const YARDS: readonly Yard[] = INFILL_YARDS.map(
  ([kind, neighborhood, x0, z0, x1, z1]): Yard => {
    if (!isYardKind(kind)) throw new Error(`unknown yard use ${kind}`);
    return { kind, neighborhood, x0, z0, x1, z1 };
  },
);

// ---- what fills a yard -----------------------------------------------------

/** Ground is laid low: a yard has no curb, so it needs no kerb's height. */
const SLAB_Y = 0.03;
const SLAB_H = 0.06;
/** Slabs are laid in pieces no longer than this, so the plan's per-cell
 * loading (a piece belongs to the cell its center is in) never drops half of a
 * big yard when the center is out of range. */
const SLAB_MAX = 48;

const LOT_PAINT = ["#8c8c96", "#7f7f8a", "#94949c"];
const ALLEY_PAINT = ["#7d7a74", "#6f6c68", "#8a867e"];
const LAWN = ["#8fcf6a", "#7fc25f", "#9ad675"];
const GARDEN_LAWN = "#6fae52";
const SAND = "#e6d3ab";
const PATH = "#cfc9bd";
const STRIPE = "#f2eee6";
const FLOWERS = ["#e8a0c8", "#f2d36b", "#e56b6b", "#9be07b", "#b99be8"];

type Acc = {
  ground: YardPiece[];
  furniture: FurnitureSpot[];
  trees: YardTree[];
  cars: YardCar[];
};

function slab(
  acc: Acc,
  kind: Kind,
  r: Rect,
  color: string,
  y = SLAB_Y,
  h = SLAB_H,
): void {
  const nx = Math.max(1, Math.ceil(w(r) / SLAB_MAX));
  const nz = Math.max(1, Math.ceil(d(r) / SLAB_MAX));
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const x0 = r.x0 + (w(r) * i) / nx;
      const x1 = r.x0 + (w(r) * (i + 1)) / nx;
      const z0 = r.z0 + (d(r) * j) / nz;
      const z1 = r.z0 + (d(r) * (j + 1)) / nz;
      const x = (x0 + x1) / 2;
      const z = (z0 + z1) / 2;
      acc.ground.push({
        at: [x, z],
        kind,
        instance: { x, y, z, sx: x1 - x0, sy: h, sz: z1 - z0, color },
      });
    }
}

/** A thin painted stripe lying on a slab, centered on (x, z). */
function stripe(
  acc: Acc,
  x: number,
  z: number,
  sx: number,
  sz: number,
  color = STRIPE,
): void {
  acc.ground.push({
    at: [x, z],
    kind: "lane",
    instance: { x, y: SLAB_Y + SLAB_H / 2 + 0.01, z, sx, sy: 0.02, sz, color },
  });
}

function put(
  acc: Acc,
  kind: FurnitureSpot["kind"],
  x: number,
  z: number,
  yaw: number,
  scale = 1,
): void {
  acc.furniture.push({ kind, x, z, yaw, scale });
}

/** Panels of fence around a rectangle, each `PANEL` long, with a gate gap in
 * the middle of one side (which side is the yard's own hash). */
const PANEL = 4;
/** The fence models are one 3 m panel wide; a panel is stretched to its spot. */
const PANEL_MODEL = 3;
function fenceAround(
  acc: Acc,
  r: Rect,
  kind: "fence-chain" | "fence-wood",
  sides = 4,
): void {
  const gate = Math.floor(hash(r.x0, r.z0, 63) * 4);
  const side = (
    index: number,
    alongX: boolean,
    fixed: number,
    from: number,
    to: number,
  ) => {
    const n = Math.max(1, Math.round((to - from) / PANEL));
    const len = (to - from) / n;
    for (let k = 0; k < n; k++) {
      // the gate: a two-panel gap at the middle of its side
      if (index === gate && Math.abs(k - (n - 1) / 2) < 1.1) continue;
      const mid = from + (k + 0.5) * len;
      const spot = alongX ? ([mid, fixed] as const) : ([fixed, mid] as const);
      put(
        acc,
        kind,
        spot[0],
        spot[1],
        alongX ? 0 : Math.PI / 2,
        len / PANEL_MODEL,
      );
    }
  };
  // `sides` of the four, starting at a side of the yard's own choosing
  for (let k = 0; k < sides; k++) {
    const index = (gate + k) % 4;
    if (index === 0) side(0, true, r.z0, r.x0, r.x1);
    else if (index === 1) side(1, true, r.z1, r.x0, r.x1);
    else if (index === 2) side(2, false, r.x0, r.z0, r.z1);
    else side(3, false, r.x1, r.z0, r.z1);
  }
}

const inset = (r: Rect, m: number): Rect => ({
  x0: r.x0 + m,
  z0: r.z0 + m,
  x1: r.x1 - m,
  z1: r.z1 - m,
});

function fillPark(acc: Acc, y: Yard): void {
  slab(acc, "lawn", y, pick(LAWN, hash(y.x0, y.z0, 64)));
  const cx = (y.x0 + y.x1) / 2;
  const cz = (y.z0 + y.z1) / 2;
  // two paths crossing at the middle
  slab(
    acc,
    "sidewalk",
    { x0: y.x0, x1: y.x1, z0: cz - 1.2, z1: cz + 1.2 },
    PATH,
    0.05,
    0.1,
  );
  slab(
    acc,
    "sidewalk",
    { x0: cx - 1.2, x1: cx + 1.2, z0: y.z0, z1: y.z1 },
    PATH,
    0.05,
    0.1,
  );
  // trees on a jittered 8.5 m grid, off the paths
  for (let gx = y.x0 + 4; gx < y.x1 - 2; gx += 8.5)
    for (let gz = y.z0 + 4; gz < y.z1 - 2; gz += 8.5) {
      const x = gx + (hash(gx, gz, 65) - 0.5) * 3;
      const z = gz + (hash(gx, gz, 66) - 0.5) * 3;
      if (Math.abs(x - cx) < 3 || Math.abs(z - cz) < 3) continue;
      if (hash(gx, gz, 67) < 0.15) continue;
      acc.trees.push([x, z]);
    }
  // benches along the east-west path, facing it, and a bin at the crossing
  for (const [sx, sz, yaw] of [
    [-0.28, -1, 0],
    [0.28, 1, Math.PI],
    [-0.28, 1, Math.PI],
    [0.28, -1, 0],
  ] as const)
    put(acc, "bench", cx + sx * w(y), cz + sz * 2.1, yaw);
  put(acc, "trashcan", cx + 2, cz + 2.1, 0);
}

function fillLot(acc: Acc, y: Yard): void {
  slab(acc, "road", y, pick(LOT_PAINT, hash(y.x0, y.z0, 68)));
  // rows of stalls run along the long side
  const alongX = w(y) >= d(y);
  const u0 = alongX ? y.x0 : y.z0;
  const u1 = alongX ? y.x1 : y.z1;
  const v0 = alongX ? y.z0 : y.x0;
  const v1 = alongX ? y.z1 : y.x1;
  const STALL = 2.7;
  const DEPTH = 5.4;
  const AISLE = 6.4;
  const at = (u: number, v: number): Vec2 => (alongX ? [u, v] : [v, u]);
  const sized = (su: number, sv: number): [number, number] =>
    alongX ? [su, sv] : [sv, su];
  /** A row of stalls from v to v + dir * DEPTH (dir +1 or -1): lines, cars. */
  const row = (vFrom: number, dir: 1 | -1) => {
    const n = Math.floor((u1 - u0 - 2) / STALL);
    const start = u0 + (u1 - u0 - n * STALL) / 2;
    const vc = vFrom + (dir * DEPTH) / 2;
    for (let k = 0; k <= n; k++) {
      const u = start + k * STALL;
      const [px, pz] = at(u, vc);
      const [sx, sz] = sized(0.12, DEPTH);
      stripe(acc, px, pz, sx, sz);
    }
    for (let k = 0; k < n; k++) {
      if (hash(start + k, vc, 69) > 0.45) continue;
      const [px, pz] = at(start + (k + 0.5) * STALL, vc);
      // nose toward or away from the aisle, as a lot of cars does
      const base = alongX ? Math.PI / 2 : 0;
      acc.cars.push({
        x: px,
        z: pz,
        yaw: hash(px, pz, 70) < 0.5 ? base : base + Math.PI,
        r: hash(px, pz, 71),
      });
    }
  };
  let v = v0 + 0.8;
  while (v + DEPTH <= v1 - 0.8) {
    row(v, 1);
    v += DEPTH;
    if (v + AISLE + DEPTH <= v1 - 0.8) {
      // the aisle's center line, then the row on its far side
      const [px, pz] = at((u0 + u1) / 2, v + AISLE / 2);
      const [sx, sz] = sized(Math.max(0, u1 - u0 - 3), 0.1);
      stripe(acc, px, pz, sx, sz, "#e8c14b");
      row(v + AISLE + DEPTH, -1);
      v += AISLE + DEPTH;
    } else break;
  }
}

function fillCourt(acc: Acc, y: Yard): void {
  // the court model (15 x 29 m, with hoops and lines) in the middle of a paved apron
  slab(acc, "road", y, "#7a7a82");
  const alongX = w(y) >= d(y);
  const cx = (y.x0 + y.x1) / 2;
  const cz = (y.z0 + y.z1) / 2;
  put(acc, "court", cx, cz, alongX ? Math.PI / 2 : 0);
  put(acc, "bench", y.x0 + 2.5, y.z0 + 2, 0);
  put(acc, "trashcan", y.x1 - 2.5, y.z1 - 2, 0);
  fenceAround(acc, inset(y, 0.6), "fence-chain", 2);
}

function fillGarden(acc: Acc, y: Yard): void {
  slab(acc, "lawn", y, GARDEN_LAWN);
  const r = inset(y, 3);
  // flower beds are painted patches on the lawn (one slab each, no boxes)
  for (let z = r.z0 + 1; z < r.z1 - 0.7; z += 4.2) {
    for (let x = r.x0 + 2; x < r.x1 - 2; x += 6) {
      // a gap down the middle is the path, and a few beds lie fallow
      if (Math.abs(x - (r.x0 + r.x1) / 2) < 2.5 || hash(x, z, 73) < 0.25)
        continue;
      slab(
        acc,
        "lawn",
        { x0: x - 1.6, x1: x + 1.6, z0: z - 0.9, z1: z + 0.9 },
        pick(FLOWERS, hash(x, z, 74)),
        0.05,
        0.04,
      );
    }
  }
  for (const [tx, tz] of [
    [y.x0 + 2, y.z0 + 2],
    [y.x1 - 2, y.z1 - 2],
  ] as const)
    acc.trees.push([tx, tz]);
  put(acc, "bench", (y.x0 + y.x1) / 2, y.z1 - 1.8, Math.PI);
  fenceAround(acc, inset(y, 0.4), "fence-wood");
}

/** The narrow alley between two rows of buildings: bare floor with dumpsters,
 * bags and bins along both walls and a chain fence across each end. */
function fillBackAlley(acc: Acc, y: Yard): void {
  slab(acc, "sidewalk", y, pick(ALLEY_PAINT, hash(y.x0, y.z0, 75)), 0.05, 0.1);
  const alongX = w(y) >= d(y);
  const length = alongX ? w(y) : d(y);
  const width = alongX ? d(y) : w(y);
  const mid = alongX ? (y.z0 + y.z1) / 2 : (y.x0 + y.x1) / 2;
  const start = alongX ? y.x0 : y.z0;
  const at = (u: number, v: number): Vec2 => (alongX ? [u, v] : [v, u]);
  // facing the opposite wall: a dumpster against the near wall of the alley
  const faceAcross = (side: -1 | 1) =>
    alongX ? (side < 0 ? 0 : Math.PI) : side < 0 ? Math.PI / 2 : -Math.PI / 2;
  for (const side of [-1, 1] as const) {
    const v = mid + side * (width / 2 - 1.1);
    for (let u = start + 5; u < start + length - 4; u += 11) {
      const slot = u + (hash(u, v, 77) - 0.5) * 4;
      if (hash(slot, v, 76) < 0.4) continue;
      const [px, pz] = at(slot, v);
      put(acc, "dumpster", px, pz, faceAcross(side));
      for (let b = 0; b < 1 + Math.floor(hash(px, pz, 78) * 1.6); b++) {
        const [bx, bz] = at(
          slot + (hash(px, b, 79) - 0.5) * 3.4,
          v + side * -0.2,
        );
        put(acc, "bag", bx, bz, hash(px, pz, b) * 6.28);
      }
    }
    for (let u = start + 8; u < start + length - 4; u += 13) {
      if (hash(u, v, 80) < 0.5) continue;
      const [px, pz] = at(u, v);
      put(acc, "trashcan", px, pz, 0);
    }
  }
  // a chain fence across the alley at each end, with the middle left open to
  // walk through (the gate)
  for (const u of [start + 0.4, start + length - 0.4]) {
    const [px, pz] = at(u, mid);
    put(
      acc,
      "fence-chain",
      px,
      pz,
      alongX ? Math.PI / 2 : 0,
      width / PANEL_MODEL,
    );
  }
}

function fillAlley(acc: Acc, y: Yard): void {
  slab(acc, "sidewalk", y, pick(ALLEY_PAINT, hash(y.x0, y.z0, 75)), 0.05, 0.1);
  const r = inset(y, 2.4);
  // a service lane of asphalt down the long side, with a dashed center line
  const alongX = w(y) >= d(y);
  const cx = (y.x0 + y.x1) / 2;
  const cz = (y.z0 + y.z1) / 2;
  const lane: Rect = alongX
    ? { x0: y.x0, x1: y.x1, z0: cz - 2.8, z1: cz + 2.8 }
    : { x0: cx - 2.8, x1: cx + 2.8, z0: y.z0, z1: y.z1 };
  slab(acc, "road", lane, "#8a8a92", 0.04, 0.08);
  for (
    let u = (alongX ? y.x0 : y.z0) + 3;
    u < (alongX ? y.x1 : y.z1) - 3;
    u += 5
  ) {
    if (alongX) stripe(acc, u, cz, 2, 0.12, "#e8c14b");
    else stripe(acc, cx, u, 0.12, 2, "#e8c14b");
  }
  const n = Math.min(5, 2 + Math.floor((w(y) * d(y)) / 450));
  for (let k = 0; k < n; k++) {
    const edge = Math.floor(hash(y.x0, k, 76) * 4);
    const t = hash(y.z0, k, 77);
    const x = edge < 2 ? r.x0 + t * w(r) : edge === 2 ? r.x0 : r.x1;
    const z = edge < 2 ? (edge === 0 ? r.z0 : r.z1) : r.z0 + t * d(r);
    // dumpsters stand against the wall they are nearest, face out
    const yaw =
      edge === 0
        ? 0
        : edge === 1
          ? Math.PI
          : edge === 2
            ? Math.PI / 2
            : -Math.PI / 2;
    put(acc, "dumpster", x, z, yaw);
    for (let b = 0; b < 1 + Math.floor(hash(x, z, 78) * 3); b++)
      put(
        acc,
        "bag",
        x + (hash(x, b, 79) - 0.5) * 3.4,
        z + (hash(z, b, 80) - 0.5) * 3.4,
        hash(x, z, b) * 6.28,
      );
  }
  // bins and cones about the yard, off the lane
  const offLane = (x: number, z: number) =>
    alongX ? Math.abs(z - cz) > 3.6 : Math.abs(x - cx) > 3.6;
  const scatter = (
    kind: FurnitureSpot["kind"],
    count: number,
    seed: number,
  ) => {
    for (let k = 0, placed = 0; k < count * 4 && placed < count; k++) {
      const x = r.x0 + hash(y.x0, k, seed) * w(r);
      const z = r.z0 + hash(y.z0, k, seed + 1) * d(r);
      if (!offLane(x, z)) continue;
      put(acc, kind, x, z, hash(x, z, seed + 2) * 6.28);
      placed++;
    }
  };
  scatter("trashcan", 3, 81);
  fenceAround(acc, inset(y, 0.4), "fence-chain", 2);
}

function fillBackyard(acc: Acc, y: Yard): void {
  slab(acc, "lawn", y, pick(LAWN, hash(y.x0, y.z0, 83)));
  const cx = (y.x0 + y.x1) / 2;
  const cz = (y.z0 + y.z1) / 2;
  const n = 1 + Math.floor(hash(y.x0, y.z0, 84) * 3);
  for (let k = 0; k < n; k++)
    acc.trees.push([
      y.x0 + 3 + hash(y.x0, k, 85) * Math.max(1, w(y) - 6),
      y.z0 + 3 + hash(y.z0, k, 86) * Math.max(1, d(y) - 6),
    ]);
  put(acc, "picnic-table", cx, cz, hash(cx, cz, 87) * 6.28);
  fenceAround(acc, inset(y, 0.4), "fence-wood");
}

function fillSand(acc: Acc, y: Yard): void {
  slab(acc, "ground", y, SAND);
  const n = 2 + Math.floor((w(y) * d(y)) / 700);
  for (let k = 0; k < Math.min(n, 8); k++) {
    const x = y.x0 + 2 + hash(y.x0, k, 88) * Math.max(1, w(y) - 4);
    const z = y.z0 + 2 + hash(y.z0, k, 89) * Math.max(1, d(y) - 4);
    put(
      acc,
      hash(x, z, 90) < 0.5 ? "palm" : "palm-2",
      x,
      z,
      hash(x, z, 91) * 6.28,
    );
  }
}

const FILL: Record<YardKind, (acc: Acc, y: Yard) => void> = {
  park: fillPark,
  lot: fillLot,
  court: fillCourt,
  garden: fillGarden,
  alley: fillAlley,
  backalley: fillBackAlley,
  backyard: fillBackyard,
  sand: fillSand,
};

const CONTENT: Acc = { ground: [], furniture: [], trees: [], cars: [] };
for (const yard of YARDS) FILL[yard.kind](CONTENT, yard);
// the service lanes between sub-blocks: asphalt with a dashed center line
for (const [x0, z0, x1, z1] of INFILL_LANES) {
  slab(CONTENT, "road", { x0, z0, x1, z1 }, "#8a8a92");
  if (x1 - x0 >= z1 - z0)
    for (let x = x0 + 4; x < x1 - 4; x += 10)
      stripe(CONTENT, x, (z0 + z1) / 2, 4, 0.15, "#e8c14b");
  else
    for (let z = z0 + 4; z < z1 - 4; z += 10)
      stripe(CONTENT, (x0 + x1) / 2, z, 0.15, 4, "#e8c14b");
}

/** Ground slabs, stripes and beds of every yard, as plan instances. */
export const YARD_GROUND: readonly YardPiece[] = CONTENT.ground;
/** The furniture models of every yard (fences, dumpsters, courts, bags, benches). */
export const YARD_FURNITURE: readonly FurnitureSpot[] = CONTENT.furniture;
/** The trees of every yard. */
export const YARD_TREES: readonly YardTree[] = CONTENT.trees;
/** The cars parked in every lot. */
export const YARD_CARS: readonly YardCar[] = CONTENT.cars;
