// What the renderer draws for the cells in view. Every kind becomes one
// InstancedMesh, so a plan is a handful of draw calls however many cells
// are loaded. Pure: the client writes these instances into its meshes.
import type { Vec2 } from "../walk.ts";
import { cellAt, type Cell } from "./cells.ts";
import {
  BUILDINGS,
  CITY_SURFACES,
  PROPS,
  type Building,
  type BuildingStyle,
  type PropKind,
  type Surface,
} from "./layout.ts";
import {
  dressBuilding,
  facingOf,
  frontOf,
  signSpec,
  FURNITURE,
  STREET_DRESS,
} from "./dressing.ts";
import type { FurnitureSpot } from "./furniture.ts";

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
  "ledge",
  "glow",
  "awning",
  "sign",
  "tube",
  "queue",
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
  "car",
  "carGlass",
  "furniture",
  "glass",
  "crowd",
  "head",
  "hair",
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

/** How many tree models there are (public/models/nature/commontree-*). */
export const TREE_VARIANTS = 5;

export type CityPlan = {
  instances: Record<Kind, Instance[]>;
  /** The neon signs nearest the player, for the real point lights. */
  lights: Light[];
  trees: TreeSpot[];
  /** Street furniture models (lamps, hydrants, benches, ...), drawn by CityFurniture. */
  furniture: FurnitureSpot[];
};

/** Triangles per instance of each kind's unit geometry, upper bounds. */
export const TRIANGLES: Record<Kind, number> = {
  road: 12,
  sidewalk: 12,
  ground: 12,
  lawn: 12,
  planks: 12,
  lane: 12,
  brick: 12,
  stucco: 12,
  concrete: 12,
  siding: 12,
  curtain: 12,
  band: 12,
  roof: 12,
  ledge: 12,
  glow: 12,
  awning: 12,
  sign: 12,
  tube: 12,
  queue: 200,
  pole: 32,
  lamp: 160,
  palmTrunk: 32,
  palmFrond: 2,
  treeTrunk: 32,
  treeCanopy: 96,
  window: 2,
  label: 2,
  panel: 12,
  arch: 12,
  bulb: 12,
  // lofted (carGeometry.ts): 4 slices x 8 around, and 3 x 6, plus end caps
  car: 80,
  carGlass: 48,
  furniture: 12,
  glass: 12,
  crowd: 200,
  head: 160,
  hair: 160,
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
const FROND_COLORS = ["#1f7a4f", "#2fa36b", "#25905c", "#3dbf7a"];
// street paint as it is by day (faded yellow and white); lane paint is flat-lit,
// so laneTint (daylight.ts) tints it down to a violet dusk at night
const DASH_COLOR = "#e6bf4a";
const SURFACE_COLOR = {
  // real asphalt and concrete: the night's color comes from the lights
  road: "#4a4a52",
  sidewalk: "#a39e96",
  square: "#b3ab9e",
  // Beachside at night: weathered planks, moonlit sand
  boardwalk: "#9a6a4a",
  sand: "#c9a274",
  lawn: "#2e5e3a",
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

function overlap(a: Box, b: Box): Box | null {
  const box = {
    x0: Math.max(a.x0, b.x0),
    z0: Math.max(a.z0, b.z0),
    x1: Math.min(a.x1, b.x1),
    z1: Math.min(a.z1, b.z1),
  };
  return box.x1 - box.x0 > 1e-6 && box.z1 - box.z0 > 1e-6 ? box : null;
}

function emptyInstances(): Record<Kind, Instance[]> {
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
    ledge: [],
    glow: [],
    awning: [],
    sign: [],
    tube: [],
    queue: [],
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
    car: [],
    carGlass: [],
    furniture: [],
    glass: [],
    crowd: [],
    head: [],
    hair: [],
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

/** Dashes down the middle of each road, skipping the crossings. */
function laneDashes(cells: readonly Cell[], out: Instance[]): void {
  const inCells = (x: number, z: number) =>
    cells.some((c) => cellAt([x, z]).key === c.key);
  for (const road of ROAD_SURFACES) {
    const horizontal = road.x1 - road.x0 >= road.z1 - road.z0;
    const crossings = ROAD_SURFACES.filter(
      (other) => other.x1 - other.x0 >= other.z1 - other.z0 !== horizontal,
    );
    if (horizontal) {
      const z = (road.z0 + road.z1) / 2;
      for (let x = road.x0 + 3; x < road.x1 - 3; x += 6) {
        const crossing = crossings.some((c) => x > c.x0 - 3 && x < c.x1 + 3);
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
        const crossing = crossings.some((c) => z > c.z0 - 3 && z < c.z1 + 3);
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

const SIDEWALK_BOXES: readonly Box[] = CITY_SURFACES.filter(
  (s) => s.kind !== "road",
).map((s) => boundsOf(s.polygon));
const PAVED_BOXES: readonly Box[] = CITY_SURFACES.filter(
  (s) => s.kind !== "road" && s.kind !== "sand" && s.kind !== "lawn",
).map((s) => boundsOf(s.polygon));
const CURB_COLOR = "#aaa59c";
const SEAM_COLOR = "#85807a";
const ZEBRA_COLOR = "#ebe8df";
const MANHOLE_COLOR = "#2a2a2f";
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

/**
 * Curbs, zebra crossings, manholes and sidewalk seams: the marks that make a
 * street read as a street rather than a flat stripe of color.
 */
function streetMarks(
  cells: readonly Cell[],
  out: Record<Kind, Instance[]>,
): void {
  const inCells = (x: number, z: number) =>
    cells.some((c) => cellAt([x, z]).key === c.key);

  // a raised lip where each sidewalk meets the road beside it
  for (const side of SIDEWALK_BOXES) {
    for (const road of ROAD_SURFACES) {
      const edge = touching(side, road);
      if (!edge) continue;
      const half = 0.12;
      const lip: Box =
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
            };
      pieces(lip, cells, out.ledge, { y: 0.11, sy: 0.22, color: CURB_COLOR });
    }
  }

  // zebra stripes on each road, at the two ends of every crossing
  for (let i = 0; i < ROAD_SURFACES.length; i++) {
    for (let j = i + 1; j < ROAD_SURFACES.length; j++) {
      const a = ROAD_SURFACES[i];
      const b = ROAD_SURFACES[j];
      const I = overlap(a, b);
      if (!I) continue;
      for (const road of [a, b]) {
        const vertical = road.z1 - road.z0 > road.x1 - road.x0;
        const ends = vertical ? [I.z0 - 2, I.z1 + 2] : [I.x0 - 2, I.x1 + 2];
        for (const end of ends) {
          for (let k = -1.2; k <= 1.2; k += 0.8) {
            const at = end + k;
            if (vertical) {
              const x = (road.x0 + road.x1) / 2;
              if (!inCells(x, at)) continue;
              out.lane.push({
                x,
                y: 0.045,
                z: at,
                sx: road.x1 - road.x0,
                sy: 0.02,
                sz: 0.4,
                color: ZEBRA_COLOR,
              });
            } else {
              const z = (road.z0 + road.z1) / 2;
              if (!inCells(at, z)) continue;
              out.lane.push({
                x: at,
                y: 0.045,
                z,
                sx: 0.4,
                sy: 0.02,
                sz: road.z1 - road.z0,
                color: ZEBRA_COLOR,
              });
            }
          }
        }
      }
    }
  }

  // manholes every 30 m along each road, clear of the crossings and the dashes
  for (const road of ROAD_SURFACES) {
    const vertical = road.z1 - road.z0 > road.x1 - road.x0;
    const from = vertical ? road.z0 : road.x0;
    const to = vertical ? road.z1 : road.x1;
    for (let at = from + 12; at < to - 6; at += 30) {
      const x = vertical ? (road.x0 + road.x1) / 2 + 2.2 : at;
      const z = vertical ? at : (road.z0 + road.z1) / 2 + 2.2;
      const clear = ROAD_SURFACES.every(
        (o) =>
          o === road ||
          x < o.x0 - 4 ||
          x > o.x1 + 4 ||
          z < o.z0 - 4 ||
          z > o.z1 + 4,
      );
      if (clear && inCells(x, z)) {
        out.lane.push({
          x,
          y: 0.05,
          z,
          sx: 1.1,
          sy: 0.03,
          sz: 1.1,
          color: MANHOLE_COLOR,
        });
      }
    }
  }

  // paving joints across every sidewalk, every 2.5 m (sand has none)
  for (const s of PAVED_BOXES) {
    const along = s.x1 - s.x0 >= s.z1 - s.z0;
    const from = along ? s.x0 : s.z0;
    const to = along ? s.x1 : s.z1;
    for (let at = from + 2.5; at < to; at += 2.5) {
      const seam: Box = along
        ? { x0: at - 0.04, x1: at + 0.04, z0: s.z0, z1: s.z1 }
        : { x0: s.x0, x1: s.x1, z0: at - 0.04, z1: at + 0.04 };
      pieces(seam, cells, out.lane, { y: 0.145, sy: 0.01, color: SEAM_COLOR });
    }
  }
}

/** Every instance a building contributes; its light, when it has a sign.
 * A building facing east or west is dressed as if it faced +z, then turned
 * into place about its center. */
function buildingInstances(
  b: Building,
  out: Record<Kind, Instance[]>,
  lights: Light[],
): void {
  const { yaw, front } = facingOf(b);
  if (yaw === 0) {
    buildingInstancesFacing(b, out, lights);
    return;
  }
  const local = emptyInstances();
  const localLights: Light[] = [];
  buildingInstancesFacing(b, local, localLights);
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

/** A building's instances in its facing's frame (see facingOf). */
function buildingInstancesFacing(
  b: Building,
  out: Record<Kind, Instance[]>,
  lights: Light[],
): void {
  const f = frontOf(b);
  const signColor = b.sign?.color;

  out[FACADE[b.style]].push({
    x: f.cx,
    y: f.h / 2,
    z: f.cz,
    sx: f.w,
    sy: f.h,
    sz: f.z1 - f.z0,
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
  out.roof.push({
    x: f.cx,
    y: f.h + 0.25,
    z: f.cz,
    sx: f.w + 0.4,
    sy: 0.5,
    sz: f.z1 - f.z0 + 0.4,
    // tar and gravel
    color: "#4a4744",
  });
  // neon bands at every floor on nightlife buildings; on everything else a
  // stone belt course over the storefronts (lit by the sun and the street,
  // not glowing) and a deeper cornice crowning the roofline, as on a NYC
  // walk-up
  for (let y = 3.6; y < f.h - 1; y += 3.6) {
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
  if (!neon)
    out.ledge.push({
      x: f.cx,
      y: f.h - 0.3,
      z: f.cz,
      sx: f.w + 0.5,
      sy: 0.6,
      sz: f.z1 - f.z0 + 0.5,
      color: CORNICE_COLOR,
    });
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

  if (b.sign) {
    const s = signSpec(b, f);
    lights.push({
      x: f.cx,
      y: s.y,
      z: f.faceZ + f.out1 * 1.2,
      color: b.sign.color,
    });
  }
  dressBuilding(b, out);
}

function propInstances(
  x: number,
  z: number,
  propKind: PropKind,
  out: Record<Kind, Instance[]>,
  spots: FurnitureSpot[],
): void {
  if (propKind === "lamp") {
    spots.push({ kind: "lamp", x, z, yaw: 0, scale: 1 });
    // the post is a model (CityFurniture); this is the bulb glowing in its glass
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
    out.palmTrunk.push({ x, y: 3.5, z, sx: 0.3, sy: 7, sz: 0.3 });
    // nine fronds of three lengths, each drooping a little more than the last
    for (let k = 0; k < 9; k++) {
      const a = (k * Math.PI * 2) / 9 + (k % 2) * 0.12;
      const len = 2.8 + (k % 3) * 0.5;
      const droop = 0.3 + (k % 4) * 0.14;
      const reach = len / 2 + 0.3;
      out.palmFrond.push({
        x: x + Math.cos(a) * reach,
        y: 6.8 - droop * reach * 0.5,
        z: z + Math.sin(a) * reach,
        sx: 1.6,
        sy: len,
        sz: 1,
        rot: [0, -a, -Math.PI / 2 - droop],
        color: FROND_COLORS[k % FROND_COLORS.length],
      });
    }
    // coconuts tucked under the crown
    for (const [dx, dz] of [
      [0.3, 0.2],
      [-0.25, 0.3],
      [0.1, -0.3],
    ]) {
      out.treeCanopy.push({
        x: x + dx,
        y: 6.3,
        z: z + dz,
        sx: 0.4,
        sy: 0.4,
        sz: 0.4,
        color: "#5a3a1f",
      });
    }
  }
}

/** A street tree at (x, z): a model, size and turn picked from its spot. */
function treeAt(x: number, z: number): TreeSpot {
  const h = (k: number) => {
    const v = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    x,
    z,
    variant: Math.floor(h(1) * TREE_VARIANTS),
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
): CityPlan {
  const instances = emptyInstances();
  const lights: Light[] = [];
  const inView = (box: Box) => cells.some((c) => overlap(box, c));

  for (const surface of CITY_SURFACES) {
    const box = boundsOf(surface.polygon);
    const style = surfaceStyle(surface);
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
  }

  laneDashes(cells, instances.lane);
  streetMarks(cells, instances);

  for (const b of BUILDINGS) {
    if (inView(boundsOf(b.footprint))) buildingInstances(b, instances, lights);
  }

  const loaded = new Set(cells.map((c) => c.key));
  for (const p of STREET_DRESS) {
    if (loaded.has(cellAt(p.at).key)) instances[p.kind].push(p.instance);
  }

  const trees: TreeSpot[] = [];
  const furniture: FurnitureSpot[] = [];
  for (const f of FURNITURE)
    if (loaded.has(cellAt([f.x, f.z]).key)) furniture.push(f);
  for (const prop of PROPS) {
    const [x, z] = prop.position;
    if (cells.some((c) => cellAt([x, z]).key === c.key)) {
      if (prop.kind === "tree") trees.push(treeAt(x, z));
      else propInstances(x, z, prop.kind, instances, furniture);
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
  };
}

/** Upper bound on triangles the plan draws. */
export function trianglesOf(plan: CityPlan): number {
  return KINDS.reduce(
    (sum, kind) => sum + plan.instances[kind].length * TRIANGLES[kind],
    0,
  );
}

/** One draw call per kind that has instances. */
export function drawCallsOf(plan: CityPlan): number {
  return KINDS.filter((kind) => plan.instances[kind].length > 0).length;
}
