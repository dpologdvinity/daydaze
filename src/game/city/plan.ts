// What the renderer draws for the cells in view. Every kind becomes one
// InstancedMesh, so a plan is a handful of draw calls however many cells
// are loaded. Pure: the client writes these instances into its meshes.
import type { Vec2 } from "../walk.ts";
import { motelBuilding } from "./motel.ts";
import { roofLook } from "./roofs.ts";
import { YARD_GROUND, YARD_TREES } from "./yards.ts";
import {
  FAR_BOX_TRIANGLES,
  farWorthDrawing,
  farBoxOf,
  type FarBox,
} from "./far.ts";
import { VIEW_RADIUS } from "./tuning.ts";
import { cellAt, type Cell } from "./cells.ts";
import {
  BUILDINGS,
  isInfill,
  CITY_SURFACES,
  PROPS,
  type Building,
  type BuildingStyle,
  type PropKind,
  type Surface,
} from "./layout.ts";
import {
  isNyc,
  nycBays,
  BAY_TRIANGLES,
  HOUSE_MODEL_TRIANGLES,
  houseAt,
  isHouse,
  type HouseSpot,
  WALL_INSET,
  type BayInstance,
  isMotel,
} from "./nyc.ts";
import {
  dressBuilding,
  facingOf,
  frontOf,
  lotSign,
  signSpec,
  FURNITURE,
  STREET_DRESS,
} from "./dressing.ts";
import {
  LOT_NEAR,
  LOT_SPECS,
  LOT_WALL_INSET,
  isLotBlock,
  lotRow,
  type PlacedLot,
} from "./districts.ts";
import { LAMP_RANGE, type FurnitureSpot } from "./furniture.ts";
import {
  STREET_DRAW_CALLS,
  STREET_TRIANGLES,
  WIDE_ROAD,
  sidewalkPieces,
  streetPieces,
  type StreetPiece,
} from "./streetPieces.ts";

export const KINDS = [
  "road",
  "sidewalk",
  "ground",
  "lawn",
  "planks",
  "lane",
  "brick",
  "stucco",
  "concrete",
  "siding",
  "curtain",
  "band",
  "roof",
  "roofGravel",
  "roofSkin",
  "ledge",
  "glow",
  "awning",
  "sign",
  "tube",
  "pole",
  "lamp",
  "palmTrunk",
  "palmFrond",
  "treeTrunk",
  "treeCanopy",
  "window",
  "label",
  "panel",
  "arch",
  "bulb",
  "furniture",
  "glass",
  "puddle",
  "steam",
] as const;
export type Kind = (typeof KINDS)[number];

/** The materials a building's walls come in, one instanced mesh each. */
export const FACADE_KINDS = [
  "brick",
  "stucco",
  "concrete",
  "siding",
  "curtain",
] as const satisfies readonly Kind[];
export type FacadeKind = (typeof FACADE_KINDS)[number];

/** A unit mesh placed and scaled; `rot` is Euler XYZ-order YXZ in radians. */
export type Instance = {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rot?: readonly [number, number, number];
  color?: string;
  /** Atlas rectangle for a label: u, v, width and height. */
  uv?: readonly [number, number, number, number];
};

export type Light = { x: number; y: number; z: number; color: string };

/** A street tree: the client draws one of the tree models here
 * (src/client/city/CityTrees.tsx); `variant` picks the model, `scale` and
 * `yaw` keep a row of them from looking cloned. */
export type TreeSpot = {
  x: number;
  z: number;
  variant: number;
  scale: number;
  yaw: number;
};

/** How many tree models there are (public/models/nature/street-tree-*). */
export const TREE_VARIANTS = 9;
/** The first of the garden trees (two birches, two maples): the lawns of the
 * Uptown park and Suburbia wear them among the street trees. */
export const GARDEN_FIRST = 5;
/** Share of a lawn's trees that are birches and maples. */
const GARDEN_SHARE = 0.6;

/** Whether (x, z) is on a lawn that gets birches and maples: Suburbia (west of
 * x -192, as cells.ts cuts it) or the Uptown park (park.ts PARK, with a margin
 * for the trees flanking its gate). */
export function isGardenAt(x: number, z: number): boolean {
  return x < -192 || (x > 198 && x < 306 && z > -322 && z < -260);
}

export type CityPlan = {
  instances: Record<Kind, Instance[]>;
  /** The neon signs nearest the player, for the real point lights. */
  lights: Light[];
  trees: TreeSpot[];
  /** Street furniture models (lamps, hydrants, benches, ...), drawn by CityFurniture. */
  furniture: FurnitureSpot[];
  /** New York bays for the buildings within `bayRange` of the player. */
  bays: BayInstance[];
  /** District lots (Little Manila, Chinatown, Koreatown, Arts District,
   * Uptown) for the blocks within `bayRange` of the player. */
  lots: PlacedLot[];
  /** Suburbia houses within reach of the player, drawn as models. */
  houses: HouseSpot[];
  /** Crosswalks, corner blocks, center lines and street props (StreetPieces.tsx). */
  street: StreetPiece[];
  /** The buildings this plan does not draw (past the loaded cells, or infill
   * past its range), as plain boxes: the far city (far.ts, FarCity.tsx). */
  far: FarBox[];
};

/** How far off the infill buildings draw, by tier: they fill the blocks, so the
 * low tier (with the budget) draws them nearer in. */
export const INFILL_RANGE = { low: 60, high: 160 } as const;
/** The same pulled out to the overview, where the bays are gone. */
export const OVERVIEW_INFILL_RANGE = { low: 100, high: 160 } as const;
export const OVERVIEW_GROUND_RANGE = { low: 110, high: 160 } as const;
/** The yards' ground slabs, a touch farther: they are cheap and fill the view. */
export const GROUND_RANGE = { low: 80, high: 160 } as const;

/** Triangles per instance of each kind's unit geometry, upper bounds. */
export const TRIANGLES: Record<Kind, number> = {
  road: 12,
  sidewalk: 12,
  ground: 12,
  lawn: 12,
  planks: 12,
  lane: 2,
  brick: 10,
  stucco: 10,
  concrete: 10,
  siding: 10,
  curtain: 10,
  band: 10,
  roof: 10,
  roofGravel: 10,
  roofSkin: 10,
  ledge: 10,
  glow: 10,
  awning: 12,
  sign: 10,
  tube: 10,
  pole: 32,
  lamp: 160,
  palmTrunk: 32,
  palmFrond: 2,
  treeTrunk: 32,
  treeCanopy: 96,
  window: 2,
  label: 2,
  panel: 10,
  arch: 12,
  bulb: 20,
  furniture: 12,
  glass: 12,
  puddle: 12,
  steam: 48,
};

/** Which wall material each building style is built from. */
const FACADE: Record<BuildingStyle, FacadeKind> = {
  tower: "concrete",
  glass: "curtain",
  billboard: "concrete",
  storefront: "brick",
  deck: "concrete",
  brick: "brick",
  club: "stucco",
  warehouse: "siding",
  velvet: "stucco",
  gate: "concrete",
};

export const facadeOf = (style: BuildingStyle): FacadeKind => FACADE[style];

// Tints over each wall's photo: light enough that brick, plaster and steel
// keep their own color and grain, with the city's violet night in them.
const BODY_COLOR: Record<BuildingStyle, string> = {
  tower: "#9aa2dc",
  glass: "#a8bcf4",
  billboard: "#a894d0",
  storefront: "#e8c0bc",
  deck: "#aeaccc",
  brick: "#f4d0c6",
  club: "#cc9ee6",
  warehouse: "#b0acc0",
  velvet: "#e088b8",
  gate: "#a290d8",
};

const BAND_COLOR = "#6a5cff";
/** Stone trim: floor-line cornices and rooflines on non-nightlife buildings. */
export const CORNICE_COLOR = "#d8cfbf";

/** Nightlife buildings wear neon (corner tubes, glowing floor bands); the
 * rest of the city is brick, stucco and stone by day. */
const NEON_STYLES: ReadonlySet<BuildingStyle> = new Set([
  "club",
  "velvet",
  "billboard",
]);
export const wearsNeon = (style: BuildingStyle) => NEON_STYLES.has(style);
// street paint as it is by day (faded yellow and white); lane paint is flat-lit,
// so laneTint (daylight.ts) tints it down to a violet dusk at night
const DASH_COLOR = "#e6bf4a";
const SURFACE_COLOR = {
  // real asphalt and concrete: the night's color comes from the lights
  road: "#4a4a52",
  // the concrete texture and its lift carry the tone (sidewalkLook.ts), so
  // the instance color only tints a little: the plaza a shade warmer
  sidewalk: "#ffffff",
  square: "#f5eee2",
  // Beachside at night: weathered planks, moonlit sand
  boardwalk: "#d6cbbb",
  sand: "#e6d3ab",
  lawn: "#88c46a",
};

type Box = { x0: number; z0: number; x1: number; z1: number };

function boundsOf(poly: readonly Vec2[]): Box {
  const xs = poly.map(([x]) => x);
  const zs = poly.map(([, z]) => z);
  return {
    x0: Math.min(...xs),
    z0: Math.min(...zs),
    x1: Math.max(...xs),
    z1: Math.max(...zs),
  };
}

/** District lots (a few hundred triangles a meter of wall more than a bay)
 * dress blocks within this share of the bay range; farther lot blocks stay
 * boxes with painted windows. */
const LOT_RANGE = 0.85;
/** Back walls wear bays within this fraction of the bay range. */
const BACK_RANGE = 0.6;
/** Fire escapes, the dearest bay, show within this share of the bay range. */
const ESCAPE_RANGE = 0.6;
/** Window sills show on blocks within this multiple of the bay range. */
const SILL_RANGE = 1.2;

/** How far a point is from a box (0 inside it). */
function distanceToBox(p: Vec2, b: Box): number {
  return Math.hypot(
    Math.max(b.x0 - p[0], 0, p[0] - b.x1),
    Math.max(b.z0 - p[1], 0, p[1] - b.z1),
  );
}

function overlap(a: Box, b: Box): Box | null {
  const box = {
    x0: Math.max(a.x0, b.x0),
    z0: Math.max(a.z0, b.z0),
    x1: Math.min(a.x1, b.x1),
    z1: Math.min(a.z1, b.z1),
  };
  return box.x1 - box.x0 > 1e-6 && box.z1 - box.z0 > 1e-6 ? box : null;
}

export function emptyInstances(): Record<Kind, Instance[]> {
  return {
    road: [],
    sidewalk: [],
    ground: [],
    lawn: [],
    planks: [],
    lane: [],
    brick: [],
    stucco: [],
    concrete: [],
    siding: [],
    curtain: [],
    band: [],
    roof: [],
    roofGravel: [],
    roofSkin: [],
    ledge: [],
    glow: [],
    awning: [],
    sign: [],
    tube: [],
    pole: [],
    lamp: [],
    palmTrunk: [],
    palmFrond: [],
    treeTrunk: [],
    treeCanopy: [],
    window: [],
    label: [],
    panel: [],
    arch: [],
    bulb: [],
    furniture: [],
    glass: [],
    puddle: [],
    steam: [],
  };
}

/** Asphalt lies flat and low; sidewalks and the square stand a little proud. */
function surfaceStyle(surface: Surface): {
  kind: Kind;
  y: number;
  h: number;
  color: string;
} {
  if (surface.kind === "road") {
    return { kind: "road", y: 0.02, h: 0.04, color: SURFACE_COLOR.road };
  }
  // sand, lawns and boardwalk planks each have their own texture; the rest
  // is concrete paving
  const kind =
    surface.kind === "sand"
      ? "ground"
      : surface.kind === "lawn"
        ? "lawn"
        : surface.kind === "boardwalk"
          ? "planks"
          : "sidewalk";
  return { kind, y: 0.07, h: 0.14, color: SURFACE_COLOR[surface.kind] };
}

const ROAD_SURFACES = CITY_SURFACES.filter((s) => s.kind === "road").map((s) =>
  boundsOf(s.polygon),
);

/** Dashes stop this far from a crossing road's edge, clear of its crosswalk. */
const CROSSING_GAP = 6.5;

/** Dashes down the middle of each road, skipping the crossings. */
function laneDashes(cells: readonly Cell[], out: Instance[]): void {
  const inCells = (x: number, z: number) =>
    cells.some((c) => cellAt([x, z]).key === c.key);
  for (const road of ROAD_SURFACES) {
    // wide roads wear a double yellow line instead (streetPieces.ts)
    if (Math.min(road.x1 - road.x0, road.z1 - road.z0) >= WIDE_ROAD) continue;
    const horizontal = road.x1 - road.x0 >= road.z1 - road.z0;
    const crossings = ROAD_SURFACES.filter(
      (other) => other.x1 - other.x0 >= other.z1 - other.z0 !== horizontal,
    );
    if (horizontal) {
      const z = (road.z0 + road.z1) / 2;
      for (let x = road.x0 + 3; x < road.x1 - 3; x += 6) {
        const crossing = crossings.some(
          (c) => x > c.x0 - CROSSING_GAP && x < c.x1 + CROSSING_GAP,
        );
        if (!crossing && inCells(x, z)) {
          out.push({
            x,
            y: 0.045,
            z,
            sx: 3,
            sy: 0.02,
            sz: 0.25,
            color: DASH_COLOR,
          });
        }
      }
    } else {
      const x = (road.x0 + road.x1) / 2;
      for (let z = road.z0 + 3; z < road.z1 - 3; z += 6) {
        const crossing = crossings.some(
          (c) => z > c.z0 - CROSSING_GAP && z < c.z1 + CROSSING_GAP,
        );
        if (!crossing && inCells(x, z)) {
          out.push({
            x,
            y: 0.045,
            z,
            sx: 0.25,
            sy: 0.02,
            sz: 3,
            color: DASH_COLOR,
          });
        }
      }
    }
  }
}

// the sidewalks as drawn, cut back from the cross streets (streetPieces.ts)
const CUT_SIDEWALKS: readonly Box[] = sidewalkPieces();
const SIDEWALK_BOXES: readonly Box[] = [
  ...CITY_SURFACES.filter(
    (s) => s.kind !== "road" && s.kind !== "sidewalk",
  ).map((s) => boundsOf(s.polygon)),
  ...CUT_SIDEWALKS,
];
const CURB_COLOR = "#c8c3ba";
const CURB_EPS = 1e-6;

/** The shared edge of two boxes that touch along a line, or null. */
function touching(
  a: Box,
  b: Box,
): { axis: "x" | "z"; line: number; lo: number; hi: number } | null {
  const shared = (lo: number, hi: number): { lo: number; hi: number } | null =>
    hi - lo > CURB_EPS ? { lo, hi } : null;
  for (const [edge, other] of [
    [a.z1, b.z0],
    [a.z0, b.z1],
  ] as const) {
    if (Math.abs(edge - other) > CURB_EPS) continue;
    const span = shared(Math.max(a.x0, b.x0), Math.min(a.x1, b.x1));
    if (span) return { axis: "z", line: edge, ...span };
  }
  for (const [edge, other] of [
    [a.x1, b.x0],
    [a.x0, b.x1],
  ] as const) {
    if (Math.abs(edge - other) > CURB_EPS) continue;
    const span = shared(Math.max(a.z0, b.z0), Math.min(a.z1, b.z1));
    if (span) return { axis: "x", line: edge, ...span };
  }
  return null;
}

/** Each box as an instance in the cells it overlaps. */
function pieces(
  box: Box,
  cells: readonly Cell[],
  out: Instance[],
  m: Partial<Instance>,
): void {
  for (const cell of cells) {
    const p = overlap(box, cell);
    if (!p) continue;
    out.push({
      x: (p.x0 + p.x1) / 2,
      y: 0,
      z: (p.z0 + p.z1) / 2,
      sx: p.x1 - p.x0,
      sy: 0,
      sz: p.z1 - p.z0,
      ...m,
    });
  }
}

/** A raised lip where each sidewalk meets the road beside it: the static pairs
 * of boxes are found once, not on every plan reload. */
const CURB_LIPS: readonly Box[] = (() => {
  const half = 0.12;
  const lips: Box[] = [];
  for (const side of SIDEWALK_BOXES) {
    for (const road of ROAD_SURFACES) {
      const edge = touching(side, road);
      if (!edge) continue;
      lips.push(
        edge.axis === "z"
          ? {
              x0: edge.lo,
              x1: edge.hi,
              z0: edge.line - half,
              z1: edge.line + half,
            }
          : {
              x0: edge.line - half,
              x1: edge.line + half,
              z0: edge.lo,
              z1: edge.hi,
            },
      );
    }
  }
  return lips;
})();

/**
 * Curbs, the marks that make a street read as a street
 * rather than a flat stripe of color. (Crosswalks, manholes and the rest are
 * the kit's models: streetPieces.ts.)
 */
function streetMarks(
  cells: readonly Cell[],
  out: Record<Kind, Instance[]>,
): void {
  for (const lip of CURB_LIPS)
    pieces(lip, cells, out.ledge, { y: 0.11, sy: 0.22, color: CURB_COLOR });
}

/** Every instance a building contributes; its light, when it has a sign.
 * A building facing east or west is dressed as if it faced +z, then turned
 * into place about its center. */
function buildingInstancesFresh(
  b: Building,
  out: Record<Kind, Instance[]>,
  lights: Light[],
  kit: boolean,
  sills = true,
  lots = false,
): void {
  const { yaw, front } = facingOf(b);
  if (yaw === 0) {
    buildingInstancesFacing(b, out, lights, kit, sills, lots);
    return;
  }
  const local = emptyInstances();
  const localLights: Light[] = [];
  buildingInstancesFacing(b, local, localLights, kit, sills, lots);
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  // three.js turns (x, z) about y as (x cos + z sin, -x sin + z cos)
  const turn = (x: number, z: number): [number, number] => {
    const dx = x - front.cx;
    const dz = z - front.cz;
    return [front.cx + dx * cos + dz * sin, front.cz - dx * sin + dz * cos];
  };
  for (const kind of KINDS)
    for (const item of local[kind]) {
      const [x, z] = turn(item.x, item.z);
      const [rx = 0, ry = 0, rz = 0] = item.rot ?? [];
      out[kind].push({ ...item, x, z, rot: [rx, ry + yaw, rz] });
    }
  for (const light of localLights) {
    const [x, z] = turn(light.x, light.z);
    lights.push({ ...light, x, z });
  }
}

/** What a building dresses to for one combination of bays, sills and lots
 * (kept: the dressing is static, so a plan reload reuses the very same
 * instance objects and allocates nothing for the buildings it already knew). */
const dressed = new Map<
  string,
  { instances: Record<Kind, Instance[]>; lights: Light[] }
>();

/** `buildingInstancesFresh`, remembered per building and flags. The instances
 * are shared between plans, so nothing may change them afterwards. */
function buildingInstances(
  b: Building,
  out: Record<Kind, Instance[]>,
  lights: Light[],
  kit: boolean,
  sills = true,
  lots = false,
): void {
  const key = `${b.id}|${kit ? 1 : 0}${sills ? 1 : 0}${lots ? 1 : 0}`;
  let hit = dressed.get(key);
  if (!hit) {
    hit = { instances: emptyInstances(), lights: [] };
    buildingInstancesFresh(b, hit.instances, hit.lights, kit, sills, lots);
    dressed.set(key, hit);
  }
  for (const kind of KINDS) {
    const list = hit.instances[kind];
    for (let i = 0; i < list.length; i++) out[kind].push(list[i] as Instance);
  }
  for (const light of hit.lights) lights.push(light);
}

/** A building's instances in its facing's frame (see facingOf). */
function buildingInstancesFacing(
  b: Building,
  out: Record<Kind, Instance[]>,
  lights: Light[],
  kit: boolean,
  sills: boolean,
  lots: boolean,
): void {
  const f = frontOf(b);
  const signColor = b.sign?.color;
  // behind the kit's bays the wall steps back, so their trim stands proud
  const inset = lots ? 2 * LOT_WALL_INSET : kit ? 2 * WALL_INSET : 0;

  out[FACADE[b.style]].push({
    x: f.cx,
    y: f.h / 2,
    z: f.cz,
    sx: f.w - inset,
    sy: f.h,
    sz: f.z1 - f.z0 - inset,
    color: b.color ?? BODY_COLOR[b.style],
  });
  // neon tubes up the four corners, on nightlife buildings only
  const neon = wearsNeon(b.style);
  const corners: [number, number][] = neon
    ? [
        [f.x0, f.z0],
        [f.x1, f.z0],
        [f.x1, f.z1],
        [f.x0, f.z1],
      ]
    : [];
  for (const [x, z] of corners) {
    out.tube.push({
      x,
      y: f.h / 2,
      z,
      sx: 0.18,
      sy: f.h,
      sz: 0.18,
      color: signColor ?? BAND_COLOR,
    });
  }
  // lots keep their own parapets and rooftop AC units and pipes: the roof is
  // a thin skin flush with the parapet top, not a slab that buries them. Each
  // roof is tar paper, gravel or a membrane in its own color (roofs.ts)
  const roof = roofLook(f.cx, f.cz);
  out[roof.kind].push({
    x: f.cx,
    y: lots ? f.h - 0.04 : f.h + 0.25,
    z: f.cz,
    sx: lots ? f.w : f.w + 0.4,
    sy: lots ? 0.08 : 0.5,
    sz: lots ? f.z1 - f.z0 : f.z1 - f.z0 + 0.4,
    color: roof.color,
  });
  // neon bands at every floor on nightlife buildings; on everything else a
  // stone belt course over the storefronts (lit by the sun and the street,
  // not glowing) and a deeper cornice crowning the roofline, as on a NYC
  // walk-up
  for (let y = 3.6; y < f.h - 1 && !kit; y += 3.6) {
    if (!neon && y > 3.6) break;
    const band = {
      x: f.cx,
      y,
      z: f.cz,
      sx: f.w + 0.12,
      sy: 0.35,
      sz: f.z1 - f.z0 + 0.12,
    };
    if (neon) out.band.push({ ...band, color: BAND_COLOR });
    else out.ledge.push({ ...band, sy: 0.22, color: CORNICE_COLOR });
  }
  if (!neon && !kit)
    out.ledge.push({
      x: f.cx,
      y: f.h - 0.3,
      z: f.cz,
      sx: f.w + 0.5,
      sy: 0.6,
      sz: f.z1 - f.z0 + 0.5,
      color: CORNICE_COLOR,
    });
  if (!kit)
    out.glow.push({
      x: f.cx,
      y: 1.6,
      z: f.faceZ + f.out1 * 0.06,
      sx: f.w * 0.86,
      sy: 2.6,
      sz: 0.12,
      // shopfronts glow warm; signed fronts stay dim so the neon carries the color
      color: b.style === "storefront" ? "#f2b26b" : "#3a2452",
    });

  if (b.sign && !lots) {
    const s = signSpec(b, f);
    lights.push({
      x: f.cx,
      y: s.y,
      z: f.faceZ + f.out1 * 1.2,
      color: b.sign.color,
    });
  }
  dressBuilding(b, out, kit, sills, lots);
}

function propInstances(
  x: number,
  z: number,
  propKind: PropKind,
  out: Record<Kind, Instance[]>,
  spots: FurnitureSpot[],
  from: Vec2,
): void {
  if (propKind === "lamp") {
    spots.push({ kind: "lamp", x, z, yaw: 0, scale: 1 });
    // the post is a model (CityFurniture); this is the bulb glowing in its
    // glass, and it goes with the model (a bulb alone reads as a floating dot)
    if (Math.hypot(x - from[0], z - from[1]) > LAMP_RANGE) return;
    out.lamp.push({
      x,
      y: 5.05,
      z,
      sx: 0.28,
      sy: 0.34,
      sz: 0.28,
      color: "#ffd08a",
    });
  } else if (propKind === "palm") {
    // the palm is a model (CityFurniture)
    spots.push({
      // two palm models, so a row of palms isn't one palm cloned
      kind: fract(x * 0.73 + z * 0.19) < 0.5 ? "palm" : "palm-2",
      x,
      z,
      yaw: yawAt(x, z),
      scale: 0.9 + 0.2 * fract(x * 0.37 + z * 0.61),
    });
  }
}

const fract = (v: number) => v - Math.floor(v);
/** A fixed turn for the prop at (x, z), so the same palm faces the same way every visit. */
const yawAt = (x: number, z: number) =>
  fract(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) * Math.PI * 2;

/** A street tree at (x, z): a model, size and turn picked from its spot. */
function treeAt(x: number, z: number): TreeSpot {
  const h = (k: number) => {
    const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    x,
    z,
    variant:
      isGardenAt(x, z) && h(4) < GARDEN_SHARE
        ? GARDEN_FIRST + Math.floor(h(1) * (TREE_VARIANTS - GARDEN_FIRST))
        : Math.floor(h(1) * GARDEN_FIRST),
    scale: 0.8 + h(2) * 0.4,
    yaw: h(3) * Math.PI * 2,
  };
}

/**
 * The instances for the given cells. A surface or building is drawn only
 * in the cells it overlaps, and a building counts if any of its cells is
 * loaded. Lights are the nearest `lightCount` neon signs to `from`.
 */
export function planCity(
  cells: readonly Cell[],
  lightCount: number,
  from: Vec2,
  bayRange = 0,
  /** Infill buildings (layout.ts) draw only within this many meters of `from`. */
  infillRange = Infinity,
  /** The yards' ground (yards.ts) likewise. */
  groundRange = Infinity,
): CityPlan {
  const instances = emptyInstances();
  const lights: Light[] = [];
  const inView = (box: Box) => cells.some((c) => overlap(box, c));

  const surface = (box: Box, style: ReturnType<typeof surfaceStyle>) => {
    for (const cell of cells) {
      const piece = overlap(box, cell);
      if (!piece) continue;
      instances[style.kind].push({
        x: (piece.x0 + piece.x1) / 2,
        y: style.y,
        z: (piece.z0 + piece.z1) / 2,
        sx: piece.x1 - piece.x0,
        sy: style.h,
        sz: piece.z1 - piece.z0,
        color: style.color,
      });
    }
  };
  const SIDEWALK_STYLE = surfaceStyle({ kind: "sidewalk", polygon: [] });
  for (const s of CITY_SURFACES)
    if (s.kind !== "sidewalk") surface(boundsOf(s.polygon), surfaceStyle(s));
  for (const box of CUT_SIDEWALKS) surface(box, SIDEWALK_STYLE);

  laneDashes(cells, instances.lane);
  streetMarks(cells, instances);

  const bays: BayInstance[] = [];
  const lots: PlacedLot[] = [];
  const houses: HouseSpot[] = [];
  const far: FarBox[] = [];
  // a building the plan leaves out is a far box, unless it is lost in the fog
  const farBox = (b: Building, box: Box) => {
    const size = Math.max(box.x1 - box.x0, box.z1 - box.z0, b.height);
    if (farWorthDrawing(size, distanceToBox(from, box))) far.push(farBoxOf(b));
  };
  for (const b of BUILDINGS) {
    const box = boundsOf(b.footprint);
    if (!inView(box)) {
      farBox(b, box);
      continue;
    }
    // the infill is scenery that fills the blocks: drawn out to its own range
    if (isInfill(b) && distanceToBox(from, box) > infillRange) {
      farBox(b, box);
      continue;
    }
    // a near Suburbia lot is a real house; far ones stay boxes
    if (isHouse(b) && distanceToBox(from, box) < bayRange * 2) {
      houses.push(houseAt(b));
      continue;
    }
    if (isMotel(b)) {
      // motels past the view radius (a loaded cell can reach in by a corner)
      // are left out, and far ones are bare bodies, as far houses are boxes
      const away = distanceToBox(from, box);
      if (away <= VIEW_RADIUS) motelBuilding(b, instances, away < bayRange * 2);
      else farBox(b, box);
      continue;
    }
    // near New York blocks wear the kit's bays instead of box walls and
    // painted windows; the rest of the city keeps the cheap boxes
    const d = distanceToBox(from, box);
    // the five districts wear finished buildings (districts.ts) instead
    const lotBlock = isLotBlock(b);
    const lotted = d < bayRange * LOT_RANGE && lotBlock ? lotRow(b) : [];
    const dressed = !lotBlock && isNyc(b) && d < bayRange ? nycBays(b) : [];
    const kit = dressed.length > 0 || lotted.length > 0;
    // window sills (a 10-triangle box under every 2-triangle window, 0.14 m
    // tall) are a detail of walls within SILL_RANGE bay ranges
    buildingInstances(
      b,
      instances,
      lights,
      kit,
      // (never on infill: scenery has painted windows and no sills)
      !isInfill(b) && (bayRange === 0 || d < bayRange * SILL_RANGE),
      lotted.length > 0,
    );
    for (const lot of lotted) {
      if (lot.back && d >= bayRange * BACK_RANGE) continue;
      lots.push({
        ...lot,
        far: Math.hypot(lot.x - from[0], lot.z - from[1]) >= LOT_NEAR,
      });
      lotSign(instances, lot);
    }
    // back walls dress only the nearest blocks, the street faces farther out
    // fire escapes (366 triangles a storey) are add-ons to a wall bay, so each
    // is judged by its own distance: a long block's far end is no nearer than
    // any other far wall
    bays.push(
      ...dressed.filter(
        (bay) =>
          (!bay.back || d < bayRange * BACK_RANGE) &&
          (bay.kind !== "fireEscape" ||
            Math.hypot(bay.x - from[0], bay.z - from[1]) <
              bayRange * ESCAPE_RANGE),
      ),
    );
  }

  const loaded = new Set(cells.map((c) => c.key));
  for (const p of STREET_DRESS) {
    if (loaded.has(cellAt(p.at).key)) instances[p.kind].push(p.instance);
  }
  // the yards' slabs, stripes and lanes, out to the same range as the infill
  for (const p of YARD_GROUND)
    if (
      Math.hypot(p.at[0] - from[0], p.at[1] - from[1]) <= groundRange &&
      loaded.has(cellAt(p.at).key)
    )
      instances[p.kind].push(p.instance);

  const trees: TreeSpot[] = [];
  const furniture: FurnitureSpot[] = [];
  for (const f of FURNITURE)
    if (loaded.has(cellAt([f.x, f.z]).key)) furniture.push(f);
  for (const [x, z] of YARD_TREES)
    if (loaded.has(cellAt([x, z]).key)) trees.push(treeAt(x, z));
  for (const prop of PROPS) {
    const [x, z] = prop.position;
    if (cells.some((c) => cellAt([x, z]).key === c.key)) {
      if (prop.kind === "tree") trees.push(treeAt(x, z));
      else propInstances(x, z, prop.kind, instances, furniture, from);
    }
  }

  lights.sort(
    (a, b) =>
      (a.x - from[0]) ** 2 +
      (a.z - from[1]) ** 2 -
      ((b.x - from[0]) ** 2 + (b.z - from[1]) ** 2),
  );
  return {
    instances,
    lights: lights.slice(0, Math.max(0, lightCount)),
    trees,
    furniture,
    bays,
    lots,
    houses,
    street: streetPieces(cells),
    far,
  };
}

/** Upper bound on triangles the plan draws. */
export function trianglesOf(plan: CityPlan): number {
  return (
    KINDS.reduce(
      (sum, kind) => sum + plan.instances[kind].length * TRIANGLES[kind],
      0,
    ) +
    plan.bays.reduce((sum, bay) => sum + BAY_TRIANGLES[bay.kind], 0) +
    plan.lots.reduce(
      (sum, lot) =>
        sum + (lot.far ? LOT_SPECS[lot.model].lo : LOT_SPECS[lot.model].tris),
      0,
    ) +
    plan.houses.reduce(
      (sum, h) => sum + (HOUSE_MODEL_TRIANGLES[h.variant] ?? 0),
      0,
    ) +
    plan.street.reduce((sum, p) => sum + STREET_TRIANGLES[p.kind], 0) +
    plan.far.length * FAR_BOX_TRIANGLES
  );
}

/** One draw call per kind that has instances, plus the street pieces' two. */
export function drawCallsOf(plan: CityPlan): number {
  return (
    KINDS.filter((kind) => plan.instances[kind].length > 0).length +
    (plan.street.length > 0 ? STREET_DRAW_CALLS : 0) +
    new Set(plan.bays.map((bay) => bay.kind)).size +
    new Set(plan.lots.map((lot) => `${lot.model}${lot.far}`)).size +
    // the far city's buildings
    (plan.far.length > 0 ? 1 : 0)
  );
}
