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
import { dressBuilding, frontOf, signSpec, STREET_DRESS } from "./dressing.ts";

export const KINDS = [
  "road",
  "sidewalk",
  "lane",
  "body",
  "band",
  "roof",
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

export type CityPlan = {
  instances: Record<Kind, Instance[]>;
  /** The neon signs nearest the player, for the real point lights. */
  lights: Light[];
};

/** Triangles per instance of each kind's unit geometry, upper bounds. */
export const TRIANGLES: Record<Kind, number> = {
  road: 12,
  sidewalk: 12,
  lane: 12,
  body: 12,
  band: 12,
  roof: 12,
  glow: 12,
  awning: 12,
  sign: 12,
  tube: 12,
  queue: 200,
  pole: 32,
  lamp: 160,
  palmTrunk: 32,
  palmFrond: 12,
  treeTrunk: 32,
  treeCanopy: 160,
  window: 2,
  label: 2,
  panel: 12,
  arch: 12,
  bulb: 12,
  car: 12,
  carGlass: 12,
  furniture: 12,
  glass: 12,
  crowd: 200,
  head: 160,
  hair: 160,
  puddle: 12,
  steam: 48,
};

const BODY_COLOR: Record<BuildingStyle, string> = {
  tower: "#3d4f9e",
  glass: "#3a5aa8",
  billboard: "#4a2a7a",
  storefront: "#5a3a7a",
  deck: "#5c5a8a",
  brick: "#a4483f",
  club: "#6a2a7a",
  warehouse: "#55505c",
  velvet: "#7a1f55",
  gate: "#4f2f8a",
};

const BAND_COLOR = "#6a5cff";
const DASH_COLOR = "#ffe6a8";
const SURFACE_COLOR = {
  road: "#2a2050",
  sidewalk: "#5a4a8a",
  square: "#6a5a9a",
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
    lane: [],
    body: [],
    band: [],
    roof: [],
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
  const color =
    surface.kind === "square" ? SURFACE_COLOR.square : SURFACE_COLOR.sidewalk;
  return { kind: "sidewalk", y: 0.07, h: 0.14, color };
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

/** Every instance a building contributes; its light, when it has a sign. */
function buildingInstances(
  b: Building,
  out: Record<Kind, Instance[]>,
  lights: Light[],
): void {
  const f = frontOf(b);
  const signColor = b.sign?.color;

  out.body.push({
    x: f.cx,
    y: f.h / 2,
    z: f.cz,
    sx: f.w,
    sy: f.h,
    sz: f.z1 - f.z0,
    color: BODY_COLOR[b.style],
  });
  // neon tubes up the four corners: cheap glow on every facade
  for (const [x, z] of [
    [f.x0, f.z0],
    [f.x1, f.z0],
    [f.x1, f.z1],
    [f.x0, f.z1],
  ]) {
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
    color: "#1c1438",
  });
  for (let y = 3.6; y < f.h - 1; y += 3.6) {
    out.band.push({
      x: f.cx,
      y,
      z: f.cz,
      sx: f.w + 0.12,
      sy: 0.35,
      sz: f.z1 - f.z0 + 0.12,
      color: BAND_COLOR,
    });
  }
  out.glow.push({
    x: f.cx,
    y: 1.6,
    z: f.faceZ + f.out1 * 0.06,
    sx: f.w * 0.86,
    sy: 2.6,
    sz: 0.12,
    // shopfronts glow warm; signed fronts stay dim so the neon carries the colour
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
): void {
  if (propKind === "lamp") {
    out.pole.push({ x, y: 3, z, sx: 0.14, sy: 6, sz: 0.14, color: "#2a2440" });
    out.lamp.push({
      x,
      y: 6.2,
      z,
      sx: 0.6,
      sy: 0.5,
      sz: 0.6,
      color: "#ffd08a",
    });
  } else if (propKind === "palm") {
    out.palmTrunk.push({ x, y: 3.5, z, sx: 0.3, sy: 7, sz: 0.3 });
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3;
      out.palmFrond.push({
        x: x + Math.cos(a) * 1.5,
        y: 6.9,
        z: z + Math.sin(a) * 1.5,
        sx: 0.9,
        sy: 3,
        sz: 0.9,
        rot: [0, -a, -Math.PI / 2],
      });
    }
  } else {
    out.treeTrunk.push({ x, y: 2, z, sx: 0.25, sy: 4, sz: 0.25 });
    out.treeCanopy.push({
      x,
      y: 4.6,
      z,
      sx: 3.2,
      sy: 3,
      sz: 3.2,
      color: "#1f6b52",
    });
  }
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

  for (const b of BUILDINGS) {
    if (inView(boundsOf(b.footprint))) buildingInstances(b, instances, lights);
  }

  const loaded = new Set(cells.map((c) => c.key));
  for (const p of STREET_DRESS) {
    if (loaded.has(cellAt(p.at).key)) instances[p.kind].push(p.instance);
  }

  for (const prop of PROPS) {
    const [x, z] = prop.position;
    if (cells.some((c) => cellAt([x, z]).key === c.key)) {
      propInstances(x, z, prop.kind, instances);
    }
  }

  lights.sort(
    (a, b) =>
      (a.x - from[0]) ** 2 +
      (a.z - from[1]) ** 2 -
      ((b.x - from[0]) ** 2 + (b.z - from[1]) ** 2),
  );
  return { instances, lights: lights.slice(0, Math.max(0, lightCount)) };
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
