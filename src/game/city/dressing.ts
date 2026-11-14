// The art that makes the city glow: lit windows, neon signs and their names,
// blade signs, awnings, string lights, parked cars, street furniture, queues,
// puddles and steam. Pure and deterministic, so the city looks the same on
// every load. Layout decides where buildings and roads stand; this dresses them.
import { pointInPolygon, type Vec2 } from "../walk.ts";
import {
  BUILDINGS,
  isInfill,
  CITY_SURFACES,
  BONFIRES,
  BOARDWALK,
  BOARDWALK_SHOPS,
  WEST_EDGE,
  GALLERY_Z,
  PIER,
  PROPS,
  MOTEL_DOOR_NUMBERS,
  MOTEL_NAMES,
  MOTEL_PANEL_TEXTS,
  VOLLEYBALL,
  ROAD_EDGES,
  ROAD_NODES,
  type Building,
  type BuildingStyle,
} from "./layout.ts";
import type { Instance, Kind } from "./plan.ts";
import { hash, pick } from "./hash.ts";
import { CAR_COLORS } from "./traffic.ts";
import {
  FIXED_PAINT,
  TRAFFIC_MIX,
  pickBody,
  type BodyKey,
} from "../driving/bodies.ts";
import type { FurnitureKind, FurnitureSpot } from "./furniture.ts";
import { parkFurniture } from "./park.ts";
import { boardwalkFurniture } from "./boardwalk.ts";
import { detailBuilding } from "./detail.ts";
import { YARD_CARS, YARD_FURNITURE } from "./yards.ts";
import { DISTRICT_NAMES } from "./districtNames.ts";
import {
  LOT_SPECS,
  PALETTES,
  signBoard,
  type LotInstance,
} from "./districts.ts";

export { hash };

/** An instance on the ground at `at`, so the planner can cull it by cell. */
export type Placed = { at: Vec2; kind: Kind; instance: Instance };
export type Buckets = Record<Kind, Instance[]>;

/** Where a building faces the avenue, and which way is out of it. */
export type Front = {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  cx: number;
  cz: number;
  w: number;
  h: number;
  faceZ: number;
  out1: number;
};

/** Gate arches stand this tall; their beam hangs just under the top. */
export const ARCH_TOP = 17;

export const LABEL_INK = "#1a0b2e";
const NEON = ["#ff4fb3", "#4fe3ff", "#ffd84f", "#7dff6b", "#b06bff", "#ff8a3d"];
const PAINT = [...NEON, "#f2eefc", "#22203a", "#8a5cff"];
const WINDOW_COLORS = [
  "#ffc46b",
  "#ffc46b",
  "#8fe9ff",
  "#8fe9ff",
  "#ff7ac8",
  "#a58bff",
];
const UNLIT_WINDOW = "#2a2250";
const SILL = "#3a2f63";
const BULB_COLORS = ["#ffd08a", "#ff4fb3", "#4fe3ff", "#7dff6b", "#ffd84f"];
/** A string light bulb is a small round glow, this wide (m). */
const BULB_SIZE = 0.16;
const CORD_COLOR = "#2a2230";
/** Chinatown and Koreatown hang red and gold lights, not the party mix. */
const LANTERN_COLORS = ["#ff4a3d", "#ffb347", "#ff4a3d", "#ffd84f"];
const SHOPFRONT: ReadonlySet<BuildingStyle> = new Set<BuildingStyle>([
  "storefront",
  "club",
  "brick",
  "velvet",
  "warehouse",
  "gate",
]);
const WINDOW_STEP = 3.6;
const FLOOR = 3.4;

/** Neon names for the blade signs that stick out over the sidewalks. */
export const BLADE_SIGNS: Partial<
  Record<string, { text: string; color: string }>
> = {
  "noodle-lane": { text: "RAMEN COUNTER", color: "#ff8a3d" },
  "pixel-arcade": { text: "BOBA BAR", color: "#ff4fb3" },
  "thrift-house": { text: "NAIL SALON", color: "#b06bff" },
  "bus-shelter-block": { text: "24H DINER", color: "#ffd84f" },
  "arcade-square": { text: "UBE BAKERY", color: "#b06bff" },
  "karaoke-loft": { text: "KARAOKE BAR", color: "#4fe3ff" },
};

/** Flat-color ads on the faces of the towers. */
export const ADS: Partial<Record<string, { text: string; color: string }>> = {
  "glass-tower": { text: "MANGO FIZZ", color: "#ffd84f" },
  "vesper-hotel": { text: "NIGHT BUS PASS", color: "#7dff6b" },
  "city-trust": { text: "CHROME SNEAKERS", color: "#ff4fb3" },
  skydeck: { text: "LUNCH SPECIAL", color: "#ff8a3d" },
  "parking-deck": { text: "LOT 9 PARKING", color: "#4fe3ff" },
};

/** Every name drawn on the label atlas, each once, in a fixed order. */
const TEXTS = [
  ...BUILDINGS.flatMap((b) => (b.sign ? [b.sign.text] : [])),
  ...Object.values(BLADE_SIGNS).map((s) => s?.text ?? ""),
  ...Object.values(ADS).map((a) => a?.text ?? ""),
  ...MOTEL_NAMES,
  ...MOTEL_PANEL_TEXTS,
  ...MOTEL_DOOR_NUMBERS,
  ...Object.values(DISTRICT_NAMES).flat(),
];
export const LABELS: readonly string[] = [...new Set(TEXTS)];
export const LABEL_COLUMNS = 6;
export const LABEL_ROWS = Math.ceil(LABELS.length / LABEL_COLUMNS);

/** The atlas rectangle of a name: u, v, width and height, in texture space. */
export function labelUv(text: string): [number, number, number, number] {
  const i = LABELS.indexOf(text);
  if (i < 0) throw new Error(`no sign label for ${text}`);
  const col = i % LABEL_COLUMNS;
  const row = Math.floor(i / LABEL_COLUMNS);
  return [
    col / LABEL_COLUMNS,
    1 - (row + 1) / LABEL_ROWS,
    1 / LABEL_COLUMNS,
    1 / LABEL_ROWS,
  ];
}

function nodeX(id: string): number {
  const node = ROAD_NODES.find((n) => n.id === id);
  if (!node) throw new Error(`unknown road node ${id}`);
  return node.position[0];
}

/** x of each north-south street. */
const CROSS_X = [
  ...new Set(
    ROAD_EDGES.filter((e) => nodeX(e.from) === nodeX(e.to)).map((e) =>
      nodeX(e.from),
    ),
  ),
];

function nearCross(x: number, margin: number): boolean {
  return CROSS_X.some((cx) => Math.abs(x - cx) < margin);
}

/** Pavement (not lawn or sand) at this point: somewhere a front can face. */
function paved(p: Vec2): boolean {
  return CITY_SURFACES.some(
    (s) =>
      s.kind !== "lawn" && s.kind !== "sand" && pointInPolygon(s.polygon, p),
  );
}

/**
 * Which way a building faces, and its front in that frame. Fronts that face
 * north or south are in world space (yaw 0, out1 picks the side). A front
 * facing east or west is described as if it faced +z, in a frame turned
 * `yaw` about the building's center: dress it there, then turn what it
 * dresses by `yaw` (see plan.ts).
 */
export type Facing = { front: Front; yaw: number };

const facings = new WeakMap<Building, Facing>();

/** The face a building's dressing goes on: the one with its door, else the
 * one on a street (the avenue-facing side first), else the avenue side. */
export function facingOf(b: Building): Facing {
  const known = facings.get(b);
  if (known) return known;
  const xs = b.footprint.map(([x]) => x);
  const zs = b.footprint.map(([, z]) => z);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  type Face = "zmin" | "zmax" | "xmin" | "xmax";
  const outside: Record<Face, Vec2> = {
    zmin: [cx, z0 - 2],
    zmax: [cx, z1 + 2],
    xmin: [x0 - 2, cz],
    xmax: [x1 + 2, cz],
  };
  const avenue: Face = cz > 0 ? "zmin" : "zmax";
  let face: Face = avenue;
  if (b.door) {
    const [dx, dz] = b.door.position;
    const gaps: Record<Face, number> = {
      zmin: Math.abs(dz - z0),
      zmax: Math.abs(dz - z1),
      xmin: Math.abs(dx - x0),
      xmax: Math.abs(dx - x1),
    };
    face = (Object.keys(gaps) as Face[]).reduce((a, c) =>
      gaps[c] < gaps[a] ? c : a,
    );
  } else if (!paved(outside[avenue])) {
    const order: Face[] = [avenue === "zmin" ? "zmax" : "zmin", "xmin", "xmax"];
    face = order.find((f) => paved(outside[f])) ?? avenue;
  }
  if (b.front) face = b.front;
  let facing: Facing;
  if (face === "zmin" || face === "zmax") {
    facing = {
      yaw: 0,
      front: {
        x0,
        x1,
        z0,
        z1,
        cx,
        cz,
        w: x1 - x0,
        h: b.height,
        faceZ: face === "zmin" ? z0 : z1,
        out1: face === "zmin" ? -1 : 1,
      },
    };
  } else {
    // turned so the face lies along x, facing +z: half its length across,
    // half the building's depth out to the face
    const hw = (z1 - z0) / 2;
    const hd = (x1 - x0) / 2;
    facing = {
      yaw: face === "xmax" ? Math.PI / 2 : -Math.PI / 2,
      front: {
        x0: cx - hw,
        x1: cx + hw,
        z0: cz - hd,
        z1: cz + hd,
        cx,
        cz,
        w: hw * 2,
        h: b.height,
        faceZ: cz + hd,
        out1: 1,
      },
    };
  }
  facings.set(b, facing);
  return facing;
}

/** A building's dressed front, in its facing's frame (see facingOf). */
export function frontOf(b: Building): Front {
  return facingOf(b).front;
}

/** Where a building's main sign hangs: its height and the panel's size. */
export function signSpec(
  b: Building,
  f: Front,
): { y: number; sx: number; sy: number } {
  // the gate's name hangs low between the posts, where the first view sees it
  if (b.style === "gate") return { y: 7.4, sx: f.w + 1.4, sy: 3.2 };
  if (b.style === "billboard")
    return { y: f.h * 0.7, sx: Math.min(f.w * 0.8, 14), sy: 6 };
  if (b.style === "tower" || b.style === "glass")
    return { y: f.h * 0.5, sx: Math.min(f.w * 0.7, 12), sy: 2.8 };
  return { y: 4.4, sx: Math.min(f.w * 0.8, 10), sy: 2.2 };
}

/** How far out from its wall a board's pool of light lies on the pavement. */
const SPILL_OUT = 2.3;
/** A board hung higher than this (its lower edge) throws no pool: the light
 * would die before it reached the ground. */
const SPILL_REACH = 6;
/** Just above a sidewalk's top (0.14 m), so the pool is not buried in it. */
const SPILL_Y = 0.17;

/** The color of the light a pale board throws: its hue, pulled to a lit,
 * saturated tone (a cream board glows gold, a pale blue one sky blue), so the
 * pool reads as colored light rather than a gray patch. */
export function glowOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  // HSL with s = 0.85 and l = 0.55 back to RGB
  const c = (1 - Math.abs(2 * 0.55 - 1)) * 0.85;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = 0.55 - c / 2;
  const [cr, cg, cb] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][Math.floor(h) % 6];
  const hexOf = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hexOf(cr)}${hexOf(cg)}${hexOf(cb)}`;
}

/**
 * The soft colored light a lit board throws at night, faked: a glow disc
 * flat on the pavement in front of it and one on the wall below it, both on
 * the puddle kind (one draw call, additive, faded out by day with the neon in
 * dimForDay). `at` is the board's middle on its wall, `yaw` turns the wall's
 * +z front to face out, `y` and `h` are the board's center and height and `w`
 * its width. A `wall` of false (a gate has no wall behind its sign) skips the
 * wash.
 */
function signSpill(
  out: Buckets,
  at: Vec2,
  yaw: number,
  y: number,
  w: number,
  h: number,
  color: string,
  wall = true,
): void {
  const nx = Math.sin(yaw);
  const nz = Math.cos(yaw);
  const base = y - h / 2;
  if (wall)
    out.puddle.push({
      x: at[0] + nx * 0.1,
      y: base - 0.9,
      z: at[1] + nz * 0.1,
      sx: w * 1.7,
      sy: 3,
      sz: 1,
      rot: [0, yaw, 0],
      color,
    });
  if (base > SPILL_REACH) return;
  // the disc lies flat, so its two sizes follow the wall: along it, and out
  const along = Math.max(w * 1.5, 3);
  const across = Math.abs(nx) > 0.5;
  out.puddle.push({
    x: at[0] + nx * SPILL_OUT,
    y: SPILL_Y,
    z: at[1] + nz * SPILL_OUT,
    sx: across ? 3.6 : along,
    sy: across ? along : 3.6,
    sz: 1,
    rot: [-Math.PI / 2, 0, 0],
    color,
  });
}

/** A panel on a face, with its name printed on the front at 4:1 or wider. */
function panel(
  out: Buckets,
  kind: "sign" | "panel",
  f: Front,
  y: number,
  sx: number,
  sy: number,
  color: string,
  text: string,
  wall = true,
): void {
  if (kind === "sign")
    signSpill(
      out,
      [f.cx, f.faceZ],
      f.out1 > 0 ? 0 : Math.PI,
      y,
      sx,
      sy,
      color,
      wall,
    );
  out[kind].push({
    x: f.cx,
    y,
    z: f.faceZ + f.out1 * 0.12,
    sx,
    sy,
    sz: 0.2,
    color,
  });
  const lw = Math.min(sx, sy * 4);
  out.label.push({
    x: f.cx,
    y,
    z: f.faceZ + f.out1 * 0.23,
    sx: lw,
    sy: lw / 4,
    sz: 1,
    rot: [0, f.out1 > 0 ? 0 : Math.PI, 0],
    color: LABEL_INK,
    uv: labelUv(text),
  });
}

/** The painted shop board over a district lot's door, named in the district's
 * own language (a panel and its label, on the lot's front plane). */
export function lotSign(out: Buckets, lot: LotInstance): void {
  if (!lot.sign) return;
  const w = LOT_SPECS[lot.model].w * lot.sx;
  const sx = Math.min(w * 0.8, 3.4);
  const { y, h } = signBoard(lot.model, lot.sy);
  // the name is 4:1: as wide as the board allows, no taller than it
  const lw = Math.min(sx * 0.92, h * 0.8 * 4);
  const nx = Math.sin(lot.yaw);
  const nz = Math.cos(lot.yaw);
  const color = PALETTES[lot.palette].sign;
  signSpill(out, [lot.x, lot.z], lot.yaw, y, sx, h, glowOf(color));
  out.panel.push({
    x: lot.x + nx * 0.16,
    y,
    z: lot.z + nz * 0.16,
    sx,
    sy: h,
    sz: 0.2,
    rot: [0, lot.yaw, 0],
    color,
  });
  out.label.push({
    x: lot.x + nx * 0.27,
    y,
    z: lot.z + nz * 0.27,
    sx: lw,
    sy: lw / 4,
    sz: 1,
    rot: [0, lot.yaw, 0],
    color: LABEL_INK,
    uv: labelUv(lot.sign),
  });
}

/** A blade sign: a panel that sticks out over the sidewalk, named on both sides. */
function blade(out: Buckets, f: Front, text: string, color: string): void {
  const x = f.x0 + 1.4;
  const z = f.faceZ + f.out1 * 1.4;
  out.panel.push({ x, y: 5.6, z, sx: 0.14, sy: 1.6, sz: 2.8, color });
  for (const [side, rot] of [
    [1, Math.PI / 2],
    [-1, -Math.PI / 2],
  ] as const) {
    out.label.push({
      x: x + side * 0.09,
      y: 5.6,
      z,
      sx: 2.8,
      sy: 0.7,
      sz: 1,
      rot: [0, rot, 0],
      color: LABEL_INK,
      uv: labelUv(text),
    });
  }
}

/**
 * Windows on all four faces, each with a sill under it. About half are lit,
 * warm, cool or pink; the rest are dark glass with the frame showing.
 */
function windows(b: Building, f: Front, out: Buckets, sills: boolean): void {
  if (b.style === "gate") return;
  for (let y = 5; y < f.h - 1.5; y += FLOOR) {
    for (const [z, dz, rot] of [
      [f.z0, -1, Math.PI],
      [f.z1, 1, 0],
    ] as const) {
      for (let x = f.x0 + WINDOW_STEP / 2; x < f.x1 - 1; x += WINDOW_STEP) {
        const lit = hash(x, y, z) <= 0.55;
        out.window.push({
          x,
          y,
          z: z + dz * 0.07,
          sx: 1.9,
          sy: 2.2,
          sz: 1,
          rot: [0, rot, 0],
          color: lit ? pick(WINDOW_COLORS, hash(y, x, z, 3)) : UNLIT_WINDOW,
        });
        if (sills)
          out.ledge.push({
            x,
            y: y - 1.25,
            z: z + dz * 0.25,
            sx: 2.2,
            sy: 0.14,
            sz: 0.5,
            color: SILL,
          });
      }
    }
    for (const [x, dx, rot] of [
      [f.x0, -1, -Math.PI / 2],
      [f.x1, 1, Math.PI / 2],
    ] as const) {
      for (let z = f.z0 + WINDOW_STEP / 2; z < f.z1 - 1; z += WINDOW_STEP) {
        const lit = hash(z, y, x) <= 0.55;
        out.window.push({
          x: x + dx * 0.07,
          y,
          z,
          sx: 1.9,
          sy: 2.2,
          sz: 1,
          rot: [0, rot, 0],
          color: lit ? pick(WINDOW_COLORS, hash(y, z, x, 3)) : UNLIT_WINDOW,
        });
        if (sills)
          out.ledge.push({
            x: x + dx * 0.25,
            y: y - 1.25,
            z,
            sx: 0.5,
            sy: 0.14,
            sz: 2.2,
            color: SILL,
          });
      }
    }
  }
}

/** Striped awnings: the accent color and cream, four stripes across the front. */
function awning(out: Buckets, f: Front, accent: string): void {
  const width = Math.min(f.w * 0.7, 9);
  const stripe = width / 4;
  for (let i = 0; i < 4; i++) {
    out.awning.push({
      x: f.cx - width / 2 + stripe * (i + 0.5),
      y: 3.2,
      z: f.faceZ + f.out1 * 0.7,
      sx: stripe,
      sy: 0.3,
      sz: 1.4,
      color: i % 2 ? "#fff1dc" : accent,
    });
  }
}

/**
 * A boardwalk stand's front: three serving windows lit warm, each with a
 * counter and its own striped awning, and chalkboard menus either side, so the
 * ground floor reads as open counters, not a dark wall behind a sign.
 */
function servingWindows(out: Buckets, f: Front, accent: string): void {
  const z = f.faceZ + f.out1;
  for (const dx of [-4.2, 0, 4.2]) {
    const x = f.cx + dx;
    // the lit window, its counter and the striped awning over it
    out.glow.push({
      x,
      y: 1.75,
      z: z * 1 - f.out1 * 0.9,
      sx: 2.8,
      sy: 1.5,
      sz: 0.1,
      color: "#ffcf8a",
    });
    out.ledge.push({
      x,
      y: 1.0,
      z: z - f.out1 * 0.4,
      sx: 3.1,
      sy: 0.12,
      sz: 0.7,
      color: "#f2e6d0",
    });
    for (let i = 0; i < 6; i++)
      out.awning.push({
        x: x - 1.4 + 0.47 * (i + 0.5),
        y: 2.75,
        z: z + f.out1 * 0.1,
        sx: 0.47,
        sy: 0.08,
        sz: 1.3,
        rot: [f.out1 * 0.32, 0, 0],
        color: i % 2 ? "#fff6e6" : accent,
      });
  }
  // chalkboard menus at the ends, with a few lines of chalk
  for (const side of [-1, 1]) {
    const x = f.cx + side * (f.w / 2 - 1.1);
    out.furniture.push({
      x,
      y: 1.5,
      z: z - f.out1 * 0.85,
      sx: 1.1,
      sy: 1.5,
      sz: 0.1,
      color: "#1d2a24",
    });
    for (let k = 0; k < 4; k++)
      out.glow.push({
        x: x - 0.25 + hash(f.cx, k, side) * 0.3,
        y: 1.95 - k * 0.3,
        z: z - f.out1 * 0.78,
        sx: 0.5 + hash(k, f.cx, 7) * 0.3,
        sy: 0.07,
        sz: 0.04,
        color: "#f4efe0",
      });
  }
}

/** Steam from a rooftop vent: three puffs stacked up, drifting in the shader. */
function vent(out: Buckets, x: number, y: number, z: number): void {
  for (let k = 0; k < 3; k++) {
    out.steam.push({
      x,
      y: y + k * 0.9,
      z,
      sx: 1.8,
      sy: 1.8,
      sz: 1.8,
      color: "#e8e0ff",
    });
  }
}

/** Gate arches: two tall neon posts, one each side of the door, under the sign beam. */
function arch(out: Buckets, f: Front, color: string): void {
  out.arch.push({
    x: f.cx,
    y: ARCH_TOP - 0.4,
    z: f.faceZ + f.out1 * 0.6,
    sx: f.w + 1.6,
    sy: 0.8,
    sz: 0.9,
    color,
  });
  for (const x of [f.x0 - 0.2, f.x1 + 0.2]) {
    out.arch.push({
      x,
      y: ARCH_TOP / 2,
      z: f.faceZ + f.out1 * 0.6,
      sx: 0.9,
      sy: ARCH_TOP,
      sz: 0.9,
      color,
    });
  }
}

/** A door on a wall other than the dressed front (off an alley, or on the
 * street side of a block whose front faces away): a lit doorway, a lamp
 * over it and its light spilling onto the ground, so it can be found. */
function sideDoor(b: Building, f: Front, out: Buckets, accent: string): void {
  const door = b.door;
  // a turned front is the door's own face; a north or south one may not be
  if (!door || facingOf(b).yaw !== 0) return;
  if (Math.abs(door.position[1] - f.faceZ) < 3) return;
  const [dx, dz] = door.position;
  // the wall the door is nearest, and which way is out of it
  const walls = [
    { d: Math.abs(dx - f.x0), x: f.x0, z: dz, ox: -1, oz: 0 },
    { d: Math.abs(dx - f.x1), x: f.x1, z: dz, ox: 1, oz: 0 },
    { d: Math.abs(dz - f.z0), x: dx, z: f.z0, ox: 0, oz: -1 },
    { d: Math.abs(dz - f.z1), x: dx, z: f.z1, ox: 0, oz: 1 },
  ];
  const w = walls.reduce((a, c) => (c.d < a.d ? c : a));
  const across = w.ox !== 0;
  out.glow.push({
    x: w.x + w.ox * 0.06,
    y: 1.3,
    z: w.z + w.oz * 0.06,
    sx: across ? 0.06 : 1.6,
    sy: 2.6,
    sz: across ? 1.6 : 0.06,
    color: accent,
  });
  out.glow.push({
    x: w.x + w.ox * 0.25,
    y: 3.1,
    z: w.z + w.oz * 0.25,
    sx: across ? 0.4 : 0.5,
    sy: 0.16,
    sz: across ? 0.5 : 0.4,
    color: "#ffd2a0",
  });
  out.puddle.push({
    x: w.x + w.ox * 1.4,
    y: 0.05,
    z: w.z + w.oz * 1.4,
    sx: 2.4,
    sy: 2.6,
    sz: 1,
    rot: [-Math.PI / 2, 0, 0],
    color: accent,
  });
}

/** Everything a building adds to its own frontage, after its body is drawn. */
export function dressBuilding(
  b: Building,
  out: Buckets,
  kit = false,
  sills = true,
  lots = false,
): void {
  const f = frontOf(b);
  const accent = b.sign?.color ?? pick(PAINT, hash(f.cx, f.cz));
  if (SHOPFRONT.has(b.style)) {
    // storefront glow spills onto the pavement in front
    out.puddle.push({
      x: f.cx,
      y: 0.05,
      z: f.faceZ + f.out1 * 2.1,
      sx: f.w * 0.9,
      sy: 3.2,
      sz: 1,
      rot: [-Math.PI / 2, 0, 0],
      color: b.style === "storefront" ? "#ffb36b" : accent,
    });
  }
  // the kit's bays have their own windows and sills
  if (!kit) windows(b, f, out, sills);
  // infill is scenery: windows and walls only, no awnings, vents, signs, tanks
  if (isInfill(b)) return;
  // one 9 m striped awning at the middle of the block would cut across the
  // lots' own doors and shop boards (their models carry awnings)
  if (!lots) awning(out, f, accent);
  if (b.id.startsWith("boardwalk-shop")) servingWindows(out, f, accent);
  if (SHOPFRONT.has(b.style) && b.style !== "gate") {
    vent(out, f.cx + (hash(f.cx, 8) - 0.5) * f.w * 0.4, f.h + 0.5, f.cz);
  }
  // a district block wearing lots is named by their shop boards: its own
  // board (up to 10 m wide, 2.2 m tall) would bury them and the upper windows
  if (b.sign && !lots) {
    const s = signSpec(b, f);
    panel(
      out,
      "sign",
      f,
      s.y,
      s.sx,
      s.sy,
      b.sign.color,
      b.sign.text,
      b.style !== "gate",
    );
  }
  const blades = BLADE_SIGNS[b.id];
  if (blades) blade(out, f, blades.text, blades.color);
  const ad = ADS[b.id];
  if (ad)
    panel(
      out,
      "panel",
      f,
      f.h * 0.22,
      Math.min(f.w * 0.7, 11),
      4,
      ad.color,
      ad.text,
    );
  // the roof's small details are for blocks near enough to see them (the
  // same range as the window sills)
  detailBuilding(b, f, out, lots, sills);
  if (b.style === "gate") arch(out, f, b.sign?.color ?? accent);
  sideDoor(b, f, out, accent);
}

function put(out: Placed[], kind: Kind, instance: Instance): void {
  out.push({ at: [instance.x, instance.z], kind, instance });
}

function garland(
  out: Placed[],
  from: Vec2,
  to: Vec2,
  y: number,
  sag: number,
  n: number,
  seed: number,
  palette: readonly string[] = BULB_COLORS,
): void {
  const point = (i: number): [number, number, number] => {
    const t = i / n;
    return [
      from[0] + (to[0] - from[0]) * t,
      y - sag * 4 * t * (1 - t),
      from[1] + (to[1] - from[1]) * t,
    ];
  };
  for (let i = 0; i <= n; i++) {
    const [x, py, z] = point(i);
    // each round bulb hangs just under its cord
    put(out, "bulb", {
      x,
      y: py - 0.1,
      z,
      sx: BULB_SIZE,
      sy: BULB_SIZE,
      sz: BULB_SIZE,
      color: pick(palette, hash(i, seed, x)),
    });
    if (i === n) continue;
    // the thin dark cord to the next point, so the lights read as a string
    const [nx, ny, nz] = point(i + 1);
    const run = Math.hypot(nx - x, nz - z);
    put(out, "ledge", {
      x: (x + nx) / 2,
      y: (py + ny) / 2,
      z: (z + nz) / 2,
      sx: 0.03,
      sy: 0.03,
      sz: Math.hypot(run, ny - py),
      // yaw about y, then pitch about the cord's own x axis
      rot: [-Math.atan2(ny - py, run), Math.atan2(nx - x, nz - z), 0],
      color: CORD_COLOR,
    });
  }
}

/** A car parked at a kerb: where it stands, which way its nose points (yaw
 * about y, 0 faces +x as the traffic's cars do), and what it wears. Drawn by
 * src/client/city/ParkedCars.tsx from the downloaded car bodies. */
export type ParkedSpot = {
  x: number;
  z: number;
  yaw: number;
  body: BodyKey;
  color: string;
  /** Parked in a yard's lot (yards.ts), not at a kerb: drawn a shorter way off. */
  lot?: true;
};

/** The parked cars wear the bodies of ordinary traffic, never a bus. */
function parked(
  out: ParkedSpot[],
  x: number,
  z: number,
  yaw: number,
  r: number,
): void {
  const body = pickBody(TRAFFIC_MIX, hash(x, z, 41));
  out.push({
    x,
    z,
    // half of them face the other way, as a street of parked cars does
    yaw: hash(x, z, 43) < 0.5 ? yaw : yaw + Math.PI,
    body,
    color: FIXED_PAINT[body] ?? pick(CAR_COLORS, r),
  });
}

/** Parked cars at the kerbs: a row along the avenue and along each cross street. */
function parkedCars(): ParkedSpot[] {
  const out: ParkedSpot[] = [];
  for (let x = -186; x <= 186; x += 13) {
    if (nearCross(x, 9)) continue;
    for (const z of [-5.2, 5.2]) {
      if (hash(x, z) < 0.3) continue;
      parked(out, x, z, 0, hash(z, x));
    }
  }
  for (const cx of CROSS_X) {
    for (const x of [cx - 3.7, cx + 3.7]) {
      for (let z = -186; z <= 186; z += 13) {
        if (Math.abs(z) < 11 || hash(x, z) < 0.3) continue;
        parked(out, x, z, Math.PI / 2, hash(x, z));
      }
    }
  }
  return out;
}

/** The cars in the block yards' parking lots, wearing ordinary traffic bodies. */
function lotCars(): ParkedSpot[] {
  return YARD_CARS.map((car) => {
    const body = pickBody(TRAFFIC_MIX, hash(car.x, car.z, 41));
    return {
      x: car.x,
      z: car.z,
      yaw: car.yaw,
      body,
      color: FIXED_PAINT[body] ?? pick(CAR_COLORS, car.r),
      lot: true,
    };
  });
}

export const PARKED_CARS: readonly ParkedSpot[] = [
  ...parkedCars(),
  ...lotCars(),
];

/** Parked cars draw out to this many meters, by quality tier. */
export const PARKED_RANGE = { low: 70, high: 150 } as const;
/** The lots' cars are scenery, so they draw nearer in. */
export const LOT_RANGE = { low: 30, high: 110 } as const;

/** How far off a parked car is drawn on a tier. */
export const parkedRange = (car: ParkedSpot, tier: "low" | "high"): number =>
  (car.lot ? LOT_RANGE : PARKED_RANGE)[tier];

/** Puddles on the avenue lanes, lit faintly by the neon they lie under. */
function puddles(out: Placed[]): void {
  for (let x = -180; x <= 180; x += 9) {
    if (nearCross(x, 8)) continue;
    for (const z of [-3, 3]) {
      if (hash(x, z, 3) < 0.75) continue;
      const r = 1.2 + hash(x, z, 5);
      put(out, "puddle", {
        x,
        y: 0.05,
        z,
        sx: r * 2,
        sy: r * 2,
        sz: 1,
        rot: [-Math.PI / 2, 0, 0],
        color: pick(NEON, hash(x, z, 6)),
      });
    }
  }
}

/** Steam rising from the sidewalk grates, between the lamp and palm rows. */
function grates(out: Placed[]): void {
  for (const x of [-23, 37, 127]) {
    for (let k = 0; k < 3; k++) {
      put(out, "steam", {
        x,
        y: 0.3 + k * 1,
        z: 9.5,
        sx: 1.2,
        sy: 1.2,
        sz: 1.2,
        color: "#e8e0ff",
      });
    }
  }
}

/** String lights: across the avenue on Nightlife Row, and over the square. */
function strings(out: Placed[]): void {
  for (const x of [104, 128, 150, 172]) {
    garland(out, [x, -13.5], [x, 13.5], 7.2, 0.8, 24, x);
  }
  for (const z of [18, 28, 38]) {
    garland(out, [-48, z], [48, z], 6.6, 1, 40, z);
  }
  // Chinatown and Koreatown: red lantern strings across the avenue
  for (let x = 206; x <= 440; x += 18) {
    if (Math.abs(x - 320) < 12) continue;
    garland(out, [x, -13.5], [x, 13.5], 7, 1.1, 14, x + 7, LANTERN_COLORS);
  }
  // the boardwalk: string lights from lamp post to lamp post along the deck's
  // sea edge (the lamps stand every 31 m from the west edge + 6)
  for (let x = WEST_EDGE + 6 + 31 * 8; x < 190; x += 31)
    garland(
      out,
      [x, BOARDWALK.z1 - 0.6],
      [x + 31, BOARDWALK.z1 - 0.6],
      5,
      0.7,
      14,
      x,
    );
  // Little Manila: lantern strings across the avenue
  for (let x = -440; x <= -204; x += 22) {
    if (Math.abs(x + 320) < 12) continue;
    garland(out, [x, -13.5], [x, 13.5], 6.8, 0.9, 18, x);
  }
}

/** Everything on the streets and squares, placed once for the whole city. */
function streetDress(): Placed[] {
  const out: Placed[] = [];
  puddles(out);
  grates(out);
  strings(out);
  return out;
}

export const STREET_DRESS: readonly Placed[] = streetDress();

/** Where the bus shelters stand: the north avenue sidewalk, between lamps and palms. */
const BUS_STOPS = [-112.5, 97.5];

/**
 * The street furniture models (Street Pack, Poly Haven, originals; see
 * art/street/build_street.py) along the avenue sidewalks, in slots around
 * each lamp: a lamp's neighbors get a hydrant, bin, bench, mailbox and so on,
 * each by its own odds, so no two stretches of pavement are alike. Models face
 * +z, so a prop on the north (z > 0) sidewalk turns round to face the street.
 */
function furnitureSpots(): FurnitureSpot[] {
  const out: FurnitureSpot[] = [];
  const slots: readonly (readonly [number, FurnitureKind, number, number])[] = [
    // [x from the lamp, kind, |z| on the sidewalk, odds]
    [-11, "hydrant", 8.4, 0.6],
    [-8, "bikerack", 9.6, 0.3],
    [-5, "mailbox", 9.9, 0.4],
    [-2.5, "meter", 8.0, 0.5],
    [3, "bench", 10, 0.5],
    [6, "planter", 9.6, 0.5],
    [8.5, "newsbox", 9.9, 0.4],
    [11, "trashcan", 9.7, 0.9],
    [13.5, "meter", 8.0, 0.5],
    // clear of the trees 15 m either side of each lamp
    [-13.2, "vending", 9.9, 0.3],
  ];
  for (const p of PROPS) {
    if (p.kind !== "lamp") continue;
    const [x, z] = p.position;
    // the lamp rows down the avenue and down Gallery Row (Park Avenue goes on
    // along it); lamps elsewhere (boardwalk, pier) have no pavement to dress
    const center = [0, GALLERY_Z].find(
      (c) => Math.abs(Math.abs(z - c) - (c ? 8 : 9)) < 0.01,
    );
    if (center === undefined) continue;
    const side = z > center ? 1 : -1;
    const half = Math.abs(z - center);
    slots.forEach(([dx, kind, dz, odds], i) => {
      if (nearCross(x + dx, 7) || hash(x, z, 20 + i) >= odds) return;
      out.push({
        kind,
        x: x + dx,
        // slots are written for the avenue's 9 m half width
        z: center + side * (half + dz - 9),
        yaw: side > 0 ? Math.PI : 0,
        scale: 1,
      });
    });
  }
  for (const x of [152.5, 160])
    out.push({ kind: "planter", x, z: -9.5, yaw: 0, scale: 1 });
  // a signal on the avenue pavement, one each side of every cross street (the
  // lit bulbs cycle in Traffic.tsx)
  for (const cx of CROSS_X)
    for (const side of [-1, 1])
      out.push({
        kind: "trafficlight",
        x: cx + 7,
        z: side * 9,
        yaw: 0,
        scale: 1,
      });
  out.push(...parkFurniture());
  out.push(
    ...boardwalkFurniture(BOARDWALK_SHOPS, (x, z) => {
      if (Math.abs(x - PIER.x) < 8) return true;
      if (BONFIRES.some(([bx, bz]) => Math.hypot(x - bx, z - bz) < 7))
        return true;
      return (
        Math.abs(x - VOLLEYBALL.x) < VOLLEYBALL.half + 4 &&
        Math.abs(z - VOLLEYBALL.z) < VOLLEYBALL.depth + 4
      );
    }),
  );
  for (const x of BUS_STOPS)
    out.push({ kind: "busstop", x, z: -9, yaw: 0, scale: 1 });
  // stop signs and no-parking signs at the cross streets' corners
  for (const cx of CROSS_X) {
    for (const side of [-1, 1]) {
      out.push({
        kind: "sign-stop",
        x: cx - 7,
        z: side * 8.2,
        yaw: side > 0 ? Math.PI : 0,
        scale: 1,
      });
      out.push({
        kind: "sign-noparking",
        x: cx + 12,
        z: side * 8.2,
        yaw: side > 0 ? Math.PI : 0,
        scale: 1,
      });
    }
  }
  return out;
}

export const FURNITURE: readonly FurnitureSpot[] = [
  ...furnitureSpots(),
  ...YARD_FURNITURE,
];
