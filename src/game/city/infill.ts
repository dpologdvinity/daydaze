// The infill plan: what goes in the city's empty blocks. Between the streets,
// whole blocks hold no building (about 250,000 m2), and the bare ground read
// as sprawl, not New York. This pure planner finds those gaps (free of every
// surface, building and solid, on a 2 m grid) and fills them like a real
// block: each big gap is cut into sub-blocks about 60 x 50 m by 6 m service
// lanes, and each sub-block gets two rows of buildings back to back, facing
// out onto the streets and lanes, with a narrow back alley between the rows
// (dumpsters, bags, bins) or, now and then, a pocket yard (a lot, a court, a
// garden, a small park). Small gaps and Suburbia, the beach and the fairground
// keep a single yard (backyards, sand, lots).
//
// The layout is static, so the plan is computed at build time:
// `scripts/gen-infill.ts` writes src/game/city/infill.generated.ts from
// `planInfill`, and infill.test.ts fails when the file is stale. Nothing here
// runs in the browser.
import { pointInPolygon, type Vec2 } from "../walk.ts";
import { hash } from "./hash.ts";
import type { BuildingStyle, Neighborhood } from "./layout.ts";

/** Meters per cell of the occupancy grid. */
const CELL = 2;
/** The smallest gap, in meters on a side, worth a yard. */
const MIN_GAP = 8;
/** Keep clear of a building's walls and a solid's edge by this much. */
const WALL_MARGIN = 1;
/** Keep clear of a street surface's edge by this much (the curb). */
const SURFACE_MARGIN = 0.5;
/** A single yard is cut no longer than this on its long side. */
const MAX_YARD = 44;
/** A yard is cut no narrower than this. */
const MIN_YARD = 12;
/** Yards stand this far in from the gap's edge, so neighbors have a seam. */
const SEAM = 0.75;
/** Service lanes between sub-blocks. */
export const LANE = 6;
/** Target sub-block size, and the least a gap's short side may be to be built on. */
const BLOCK_LONG = 62;
const BLOCK_SHORT = 50;
const MIN_BUILT = 29;
/** A back alley between rows of buildings. */
const ALLEY = 5;
/** The deepest a row of buildings goes. */
const MAX_DEPTH = 30;
/** Share of sub-blocks whose back is a pocket yard rather than an alley. */
const POCKET_SHARE = 0.18;
/** A building lot's usual width. */
const LOT_WIDTH = 24;

export type Rect = { x0: number; z0: number; x1: number; z1: number };

export type YardKind =
  | "park"
  | "lot"
  | "court"
  | "garden"
  | "alley"
  | "backalley"
  | "backyard"
  | "sand";

/** Everything the planner reads of the layout. */
export type InfillInput = {
  /** Walkable surfaces (streets, sidewalks, the park lawn...). */
  surfaces: readonly (readonly Vec2[])[];
  /** Solid things that are not buildings (fountain, posts, venues' props). */
  solids: readonly (readonly Vec2[])[];
  /** The footprints of the buildings the layout already has. */
  buildings: readonly (readonly Vec2[])[];
  /** The bounds the city fills: the walkable area's north-west and south-east corners, and the shore. */
  bounds: { x0: number; z0: number; x1: number; z1: number };
  /** The neighborhood at a point. */
  neighborhoodAt: (p: Vec2) => Neighborhood;
};

/** One infill building: where, how tall, in what style, and which wall is its front. */
export type InfillBuilding = {
  id: string;
  neighborhood: Neighborhood;
  rect: Rect;
  height: number;
  style: BuildingStyle;
  front: "zmin" | "zmax" | "xmin" | "xmax";
};

/** One yard: its rectangle, use and neighborhood. */
export type YardSpec = {
  kind: YardKind;
  neighborhood: Neighborhood;
  rect: Rect;
};

export type InfillPlan = {
  buildings: InfillBuilding[];
  yards: YardSpec[];
  /** Service lanes: asphalt strips between sub-blocks. */
  lanes: Rect[];
};

const w = (r: Rect) => r.x1 - r.x0;
const d = (r: Rect) => r.z1 - r.z0;

/**
 * The gaps: rectangles at least MIN_GAP on a side, clear of every surface,
 * building and solid, found as the largest free rectangle of the occupancy
 * grid again and again. The beach (south of the shore) is left to its sand.
 */
export function freeRects(input: InfillInput): Rect[] {
  const { x0, z0, x1, z1 } = input.bounds;
  const cols = Math.round((x1 - x0) / CELL);
  const rows = Math.round((z1 - z0) / CELL);
  const taken = new Uint8Array(cols * rows);
  const mark = (poly: readonly Vec2[], pad: number) => {
    const px = poly.map((p) => p[0]);
    const pz = poly.map((p) => p[1]);
    const i0 = Math.max(0, Math.floor((Math.min(...px) - pad - x0) / CELL));
    const i1 = Math.min(cols, Math.ceil((Math.max(...px) + pad - x0) / CELL));
    const j0 = Math.max(0, Math.floor((Math.min(...pz) - pad - z0) / CELL));
    const j1 = Math.min(rows, Math.ceil((Math.max(...pz) + pad - z0) / CELL));
    for (let j = j0; j < j1; j++)
      for (let i = i0; i < i1; i++) taken[j * cols + i] = 1;
  };
  for (const poly of input.surfaces) mark(poly, SURFACE_MARGIN);
  for (const poly of input.solids) mark(poly, WALL_MARGIN);
  for (const poly of input.buildings) mark(poly, WALL_MARGIN);

  const out: Rect[] = [];
  const height = new Int32Array(cols);
  for (;;) {
    // the largest free rectangle, by the histogram stack method
    let best: { i: number; j: number; w: number; h: number } | null = null;
    let bestArea = 0;
    height.fill(0);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++)
        height[i] = taken[j * cols + i] ? 0 : (height[i] ?? 0) + 1;
      const stack: number[] = [];
      for (let i = 0; i <= cols; i++) {
        const cur = i < cols ? (height[i] ?? 0) : 0;
        while (
          stack.length &&
          (height[stack[stack.length - 1] ?? 0] ?? 0) >= cur
        ) {
          const top = stack.pop() ?? 0;
          const h = height[top] ?? 0;
          const left = stack.length ? (stack[stack.length - 1] ?? 0) + 1 : 0;
          const area = h * (i - left);
          if (area > bestArea) {
            bestArea = area;
            best = { i: left, j: j - h + 1, w: i - left, h };
          }
        }
        stack.push(i);
      }
    }
    if (!best || best.w * CELL < MIN_GAP || best.h * CELL < MIN_GAP) break;
    for (let j = best.j; j < best.j + best.h; j++)
      for (let i = best.i; i < best.i + best.w; i++) taken[j * cols + i] = 1;
    out.push({
      x0: x0 + best.i * CELL,
      z0: z0 + best.j * CELL,
      x1: x0 + (best.i + best.w) * CELL,
      z1: z0 + (best.j + best.h) * CELL,
    });
  }
  return out;
}

/** Cuts a gap into leaves no longer than MAX_YARD, never narrower than MIN_YARD. */
function cut(r: Rect): Rect[] {
  const long = Math.max(w(r), d(r));
  if (long <= MAX_YARD) return [r];
  const alongX = w(r) >= d(r);
  const span = alongX ? w(r) : d(r);
  // between 40% and 60% of the way, never leaving a sliver
  const at = Math.min(
    span - MIN_YARD,
    Math.max(MIN_YARD, span * (0.4 + 0.2 * hash(r.x0, r.z0, 61))),
  );
  const [a, b]: [Rect, Rect] = alongX
    ? [
        { ...r, x1: r.x0 + at },
        { ...r, x0: r.x0 + at },
      ]
    : [
        { ...r, z1: r.z0 + at },
        { ...r, z0: r.z0 + at },
      ];
  return [...cut(a), ...cut(b)];
}

/** What each neighborhood's single yards are used for, as odds out of 100. */
const USES: Record<Neighborhood, readonly (readonly [YardKind, number])[]> = {
  downtown: [
    ["lot", 35],
    ["alley", 20],
    ["park", 20],
    ["court", 10],
    ["garden", 15],
  ],
  "nightlife-row": [
    ["lot", 40],
    ["alley", 30],
    ["park", 10],
    ["court", 10],
    ["garden", 10],
  ],
  "arts-district": [
    ["garden", 30],
    ["alley", 20],
    ["park", 20],
    ["lot", 20],
    ["court", 10],
  ],
  "little-manila": [
    ["lot", 25],
    ["alley", 25],
    ["garden", 20],
    ["court", 15],
    ["park", 15],
  ],
  "chinatown-koreatown": [
    ["alley", 30],
    ["lot", 25],
    ["garden", 20],
    ["court", 15],
    ["park", 10],
  ],
  uptown: [
    ["park", 40],
    ["garden", 20],
    ["lot", 20],
    ["court", 10],
    ["alley", 10],
  ],
  suburbia: [
    ["backyard", 70],
    ["park", 15],
    ["garden", 15],
  ],
  beachside: [
    ["lot", 50],
    ["sand", 50],
  ],
  fairground: [
    ["lot", 70],
    ["sand", 30],
  ],
};

/** Whether a gap of this size can hold the use. */
export function fits(kind: YardKind, r: Rect): boolean {
  const lo = Math.min(w(r), d(r));
  const hi = Math.max(w(r), d(r));
  switch (kind) {
    case "park":
      return lo >= 16;
    case "lot":
      return lo >= 14;
    case "court":
      return hi >= 31 && lo >= 17;
    case "garden":
      return lo >= 12;
    case "backalley":
      return lo <= 10;
    default:
      return true;
  }
}

/** The use of the yard in this rectangle: odds by neighborhood, among those that fit. */
function yardUseFor(r: Rect, neighborhood: Neighborhood): YardKind {
  const options = USES[neighborhood].filter(([k]) => fits(k, r));
  const total = options.reduce((n, [, odds]) => n + odds, 0);
  let roll = hash(r.x0, r.z0, 62) * total;
  for (const [kind, odds] of options) {
    roll -= odds;
    if (roll < 0) return kind;
  }
  return "alley";
}

/** How tall a neighborhood's buildings stand, in meters. */
const HEIGHTS: Partial<Record<Neighborhood, readonly [number, number]>> = {
  downtown: [16, 44],
  "nightlife-row": [14, 30],
  "arts-district": [12, 22],
  "little-manila": [9, 15],
  "chinatown-koreatown": [11, 22],
  uptown: [14, 30],
};

/** The styles a neighborhood's infill wears, as odds. Brick, storefront and
 * tower are dressed in New York bays or district lots near the player. */
const STYLES: Partial<
  Record<Neighborhood, readonly (readonly [BuildingStyle, number])[]>
> = {
  downtown: [
    ["brick", 45],
    ["storefront", 25],
    ["tower", 30],
  ],
  "nightlife-row": [
    ["brick", 55],
    ["warehouse", 25],
    ["storefront", 20],
  ],
  "arts-district": [
    ["warehouse", 35],
    ["brick", 35],
    ["storefront", 30],
  ],
  "little-manila": [
    ["storefront", 60],
    ["brick", 40],
  ],
  "chinatown-koreatown": [
    ["storefront", 50],
    ["brick", 40],
    ["warehouse", 10],
  ],
  uptown: [
    ["brick", 60],
    ["storefront", 40],
  ],
};

function styleOf(
  neighborhood: Neighborhood,
  height: number,
  seed: number,
): BuildingStyle {
  // a tower needs the height to be one
  const options = (STYLES[neighborhood] ?? []).filter(
    ([s]) => s !== "tower" || height >= 30,
  );
  const total = options.reduce((n, [, odds]) => n + odds, 0);
  let roll = hash(seed, height, 64) * total;
  for (const [style, odds] of options) {
    roll -= odds;
    if (roll < 0) return style;
  }
  return "brick";
}

/** Two rows of buildings back to back in a sub-block, with the yard between. */
function fillBlock(
  block: Rect,
  neighborhood: Neighborhood,
  out: InfillPlan,
  count: { n: number },
  street: (p: Vec2) => boolean,
): void {
  const alongX = w(block) >= d(block);
  const long = alongX ? w(block) : d(block);
  const short = alongX ? d(block) : w(block);
  // the back of the block: a narrow alley, or a pocket yard for some
  const pocket =
    short >= 2 * 14 + 16 && hash(block.x0, block.z0, 65) < POCKET_SHARE;
  let depth = (short - (pocket ? 18 : ALLEY)) / 2;
  let back = short - 2 * depth;
  if (depth > MAX_DEPTH) {
    depth = MAX_DEPTH;
    back = short - 2 * depth;
  }
  const [lo, hi] = HEIGHTS[neighborhood] ?? [12, 20];
  const base = lo + hash(block.x0, block.z0, 66) * (hi - lo);
  // a row fronts the street or lane it stands on; where its outer edge is no
  // street (the back of a neighbor), it turns to face the yard instead
  const edgeIsStreet = (side: -1 | 1) => {
    const at = side < 0 ? -2.5 : short + 2.5;
    const probes = [0.25, 0.5, 0.75].map((t): Vec2 => {
      const u = long * t;
      return alongX
        ? [block.x0 + u, block.z0 + at]
        : [block.x0 + at, block.z0 + u];
    });
    return probes.filter(street).length >= 2;
  };
  const lowStreet = edgeIsStreet(-1);
  const highStreet = edgeIsStreet(1);
  const [lowOut, lowIn, highOut, highIn] = alongX
    ? (["zmin", "zmax", "zmax", "zmin"] as const)
    : (["xmin", "xmax", "xmax", "xmin"] as const);
  const rows: { from: number; to: number; front: InfillBuilding["front"] }[] = [
    { from: 0, to: depth, front: lowStreet ? lowOut : lowIn },
    { from: short - depth, to: short, front: highStreet ? highOut : highIn },
  ];
  for (const row of rows) {
    const n = Math.max(1, Math.round(long / LOT_WIDTH));
    for (let k = 0; k < n; k++) {
      const u0 = (long * k) / n;
      const u1 = (long * (k + 1)) / n;
      const rect: Rect = alongX
        ? {
            x0: block.x0 + u0,
            x1: block.x0 + u1,
            z0: block.z0 + row.from,
            z1: block.z0 + row.to,
          }
        : {
            x0: block.x0 + row.from,
            x1: block.x0 + row.to,
            z0: block.z0 + u0,
            z1: block.z0 + u1,
          };
      const seed = rect.x0 * 7 + rect.z0 * 13;
      // heights step along a row like a street of lots, and never leave a window-less stub
      const height =
        Math.round(
          Math.min(
            hi,
            Math.max(lo, base + (hash(seed, 67) - 0.5) * (hi - lo) * 0.5),
          ) / 3.4,
        ) * 3.4;
      out.buildings.push({
        id: `infill-${count.n++}`,
        neighborhood,
        rect,
        height: Math.round(height * 10) / 10,
        style: styleOf(neighborhood, height, seed),
        front: row.front,
      });
    }
  }
  const yard: Rect = alongX
    ? {
        x0: block.x0,
        x1: block.x1,
        z0: block.z0 + depth,
        z1: block.z0 + depth + back,
      }
    : {
        x0: block.x0 + depth,
        x1: block.x0 + depth + back,
        z0: block.z0,
        z1: block.z1,
      };
  const pocketYard = seamed(yard);
  out.yards.push({
    kind: pocket ? yardUseFor(pocketYard, neighborhood) : "backalley",
    neighborhood,
    rect: pocket ? pocketYard : yard,
  });
}

/** Cuts a big gap into sub-blocks and lanes, and builds each one. */
function fillGap(
  gap: Rect,
  neighborhood: Neighborhood,
  out: InfillPlan,
  count: { n: number },
  onStreet: (p: Vec2) => boolean,
): void {
  const nx = Math.max(1, Math.round((w(gap) + LANE) / (BLOCK_LONG + LANE)));
  const nz = Math.max(1, Math.round((d(gap) + LANE) / (BLOCK_SHORT + LANE)));
  const sw = (w(gap) - (nx - 1) * LANE) / nx;
  const sd = (d(gap) - (nz - 1) * LANE) / nz;
  const lanes: Rect[] = [];
  for (let i = 1; i < nx; i++) {
    const x = gap.x0 + i * (sw + LANE) - LANE;
    lanes.push({ x0: x, x1: x + LANE, z0: gap.z0, z1: gap.z1 });
  }
  for (let j = 1; j < nz; j++) {
    const z = gap.z0 + j * (sd + LANE) - LANE;
    lanes.push({ x0: gap.x0, x1: gap.x1, z0: z, z1: z + LANE });
  }
  out.lanes.push(...lanes);
  const street = (p: Vec2) =>
    onStreet(p) ||
    lanes.some(
      (l) => p[0] >= l.x0 && p[0] <= l.x1 && p[1] >= l.z0 && p[1] <= l.z1,
    );
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const x0 = gap.x0 + i * (sw + LANE);
      const z0 = gap.z0 + j * (sd + LANE);
      fillBlock(
        { x0, z0, x1: x0 + sw, z1: z0 + sd },
        neighborhood,
        out,
        count,
        street,
      );
    }
}

/** A rectangle a seam in from its edges. */
const seamed = (r: Rect): Rect => ({
  x0: r.x0 + SEAM,
  z0: r.z0 + SEAM,
  x1: r.x1 - SEAM,
  z1: r.z1 - SEAM,
});

const round1 = (v: number) => Math.round(v * 10) / 10;
const roundRect = (r: Rect): Rect => ({
  x0: round1(r.x0),
  z0: round1(r.z0),
  x1: round1(r.x1),
  z1: round1(r.z1),
});

/** The plan for a layout: infill buildings, yards and lanes for every gap. */
export function planInfill(input: InfillInput): InfillPlan {
  const out: InfillPlan = { buildings: [], yards: [], lanes: [] };
  const count = { n: 0 };
  const onStreet = (p: Vec2) =>
    input.surfaces.some((poly) => pointInPolygon(poly, p));
  const built = new Set<Neighborhood>(Object.keys(HEIGHTS) as Neighborhood[]);
  for (const gap of freeRects(input)) {
    const neighborhood = input.neighborhoodAt([
      (gap.x0 + gap.x1) / 2,
      (gap.z0 + gap.z1) / 2,
    ]);
    if (built.has(neighborhood) && Math.min(w(gap), d(gap)) >= MIN_BUILT) {
      fillGap(gap, neighborhood, out, count, onStreet);
      continue;
    }
    // a small gap, Suburbia, the beach: one yard per leaf
    for (const leaf of cut(gap)) {
      const nb = input.neighborhoodAt([
        (leaf.x0 + leaf.x1) / 2,
        (leaf.z0 + leaf.z1) / 2,
      ]);
      const rect = seamed(leaf);
      out.yards.push({ kind: yardUseFor(rect, nb), neighborhood: nb, rect });
    }
  }
  // round everything to a decimeter, so the generated file is short and stable
  return {
    buildings: out.buildings.map((b) => ({ ...b, rect: roundRect(b.rect) })),
    yards: out.yards.map((y) => ({ ...y, rect: roundRect(y.rect) })),
    lanes: out.lanes.map(roundRect),
  };
}

/** The generated module's text for a plan (scripts/gen-infill.ts writes it, then formats it). */
export function renderInfill(plan: InfillPlan): string {
  const tuple = (values: readonly (string | number)[]) =>
    `[${values.map((v) => JSON.stringify(v)).join(", ")}]`;
  const rect = (r: Rect) => [r.x0, r.z0, r.x1, r.z1] as const;
  return `// Generated by scripts/gen-infill.ts from src/game/city/infill.ts. Do not edit:
// run \`node --experimental-strip-types scripts/gen-infill.ts\` (infill.test.ts
// fails when this file is stale).
import type { BuildingStyle, Neighborhood } from "./layout.ts";

/** id, neighborhood, x0, z0, x1, z1, height, style, front wall. */
export type InfillBuildingTuple = readonly [
  id: string,
  neighborhood: Neighborhood,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  height: number,
  style: BuildingStyle,
  front: "zmin" | "zmax" | "xmin" | "xmax",
];
/** use, neighborhood, x0, z0, x1, z1. */
export type InfillYardTuple = readonly [
  kind: string,
  neighborhood: Neighborhood,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
];
/** x0, z0, x1, z1. */
export type InfillLaneTuple = readonly [x0: number, z0: number, x1: number, z1: number];

export const INFILL_BUILDINGS: readonly InfillBuildingTuple[] = [
${plan.buildings
  .map(
    (b) =>
      `  ${tuple([b.id, b.neighborhood, ...rect(b.rect), b.height, b.style, b.front])},`,
  )
  .join("\n")}
];

export const INFILL_YARDS: readonly InfillYardTuple[] = [
${plan.yards.map((y) => `  ${tuple([y.kind, y.neighborhood, ...rect(y.rect)])},`).join("\n")}
];

export const INFILL_LANES: readonly InfillLaneTuple[] = [
${plan.lanes.map((l) => `  ${tuple(rect(l))},`).join("\n")}
];
`;
}
