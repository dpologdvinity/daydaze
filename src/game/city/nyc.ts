// New York facades: which kit "bay" goes where on a building. Downtown,
// Uptown and the Arts District walk-ups and prewar blocks are tiled on their
// street faces with storey-high bays (public/models/nyc/bays.glb, built from
// Quaternius' Downtown City MegaKit by art/city/nyc_bays.py): a ground floor
// of shopfronts and doors, window bays above, a cornice on top, posts at the
// corners and the odd fire escape. Each face is cut into "lots" two or three
// bays wide, and every lot picks its own window bay, brick tint and cornice,
// so one 40 m wall reads as a row of different houses. Pure and seeded by
// the building, so a block looks the same on every load.
import { pointInPolygon, type Vec2 } from "../walk.ts";
import { hash, pick } from "./hash.ts";
import {
  CITY_SURFACES,
  GALLERY_Z,
  type Building,
  type BuildingStyle,
  type Neighborhood,
} from "./layout.ts";

/** The most bays of one kind in any view (the busiest high-tier view holds
 * about 300; nyc.test.ts keeps this within 4x of it). Sizes each kind's
 * InstancedMesh, so it is not much bigger than a view needs. */
export const BAY_CAPACITY = 1024;

/** The bays the client draws, one InstancedMesh each (node names in bays.glb). */
export const BAY_KINDS = [
  "winA",
  "winB",
  "winC",
  "winD",
  "winE",
  "winF",
  "blank",
  "shopA",
  "shopB",
  "shopW",
  "doorA",
  "doorB",
  "stoop",
  "corniceT",
  "corniceB",
  "corniceM",
  "post",
  "fireEscape",
] as const;
export type BayKind = (typeof BAY_KINDS)[number];

/** One bay placed in the world: `yaw` turns its +z front to face out. */
export type BayInstance = {
  kind: BayKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Width and height stretch, around 1. */
  sx: number;
  sy: number;
  /** On a back wall rather than a street face (drawn only when close). */
  back: boolean;
  /** Tint over the brick (stone and metal keep their own colors). */
  color: string;
};

/** Triangles of each bay as built (art/city/nyc_bays.py prints them). */
export const BAY_TRIANGLES: Record<BayKind, number> = {
  winA: 92,
  winB: 75,
  winC: 53,
  winD: 53,
  winE: 81,
  winF: 72,
  blank: 4,
  shopA: 98,
  shopB: 72,
  shopW: 44,
  doorA: 133,
  doorB: 82,
  stoop: 252,
  corniceT: 43,
  corniceB: 12,
  corniceM: 24,
  post: 32,
  fireEscape: 366,
};

export const BAY_WIDTH = 4;
export const BAY_HEIGHT = 3;
/** The cornice is one meter tall; the wall below it is whole storeys. */
const CORNICE_HEIGHT = 1;
/** Kit walls sit this far in front of the box behind them. */
export const WALL_INSET = 0.25;

const NYC_NEIGHBORHOODS: ReadonlySet<Neighborhood> = new Set([
  "downtown",
  "uptown",
  "arts-district",
  "little-manila",
  "chinatown-koreatown",
]);
const NYC_STYLES: ReadonlySet<BuildingStyle> = new Set<BuildingStyle>([
  "storefront",
  "brick",
  "tower",
]);

/** Whether a building is dressed in New York bays when it is near. */
export const isNyc = (b: Building): boolean =>
  NYC_NEIGHBORHOODS.has(b.neighborhood) && NYC_STYLES.has(b.style);

// Brick tints over the photo: oxblood, rust, brownstone, tan, soot.
const BRICKS = [
  "#c6705c",
  "#a85a4a",
  "#8f5646",
  "#b98866",
  "#7a5a52",
  "#d09a7a",
];
// Prewar limestone and terra cotta.
const STONES = ["#e8dcc4", "#d8ccb4", "#e0d0b8", "#cfc0a8"];
// Little Manila's shophouses: sun-faded pastels over the brick photo.
const PASTELS = [
  "#e8b4a0",
  "#e6c27a",
  "#9cc9a8",
  "#d98a8a",
  "#8fb8d8",
  "#d9a3c4",
];
// Chinatown and Koreatown: lacquer red, jade and lantern gold.
const LACQUER = [
  "#b83a30",
  "#9c2f2a",
  "#c98b3a",
  "#4a7a62",
  "#8a3a3a",
  "#c4574a",
];
const UPPER: Record<"storefront" | "brick" | "tower", readonly BayKind[]> = {
  storefront: ["winA", "winB", "winE", "winF"],
  brick: ["winB", "winE", "winF", "winC", "winA"],
  tower: ["winC", "winB", "winD", "winA"],
};
const CORNICES: readonly BayKind[] = ["corniceT", "corniceB", "corniceM"];

type Face = {
  /** Outward normal: yaw 0 faces +z. */
  yaw: number;
  /** Where the face starts and which way it runs, in the world. */
  ox: number;
  oz: number;
  dx: number;
  dz: number;
  /** Outward unit vector. */
  nx: number;
  nz: number;
  length: number;
  /** Faces a street (shopfronts and doors); the rest are plain back walls. */
  street: boolean;
};

const paved = (p: Vec2): boolean =>
  CITY_SURFACES.some(
    (s) =>
      s.kind !== "lawn" && s.kind !== "sand" && pointInPolygon(s.polygon, p),
  );

/** The four faces of a building's bounding box, each marked street or back
 * (a street face looks onto pavement, or has the door). Three.js turns yaw about y: +z at 0, +x at pi/2. */
function facesOf(b: Building): Face[] {
  const xs = b.footprint.map(([x]) => x);
  const zs = b.footprint.map(([, z]) => z);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const all: (Omit<Face, "street"> & { mid: Vec2 })[] = [
    {
      yaw: 0,
      ox: x0,
      oz: z1,
      dx: 1,
      dz: 0,
      nx: 0,
      nz: 1,
      length: x1 - x0,
      mid: [cx, z1 + 2],
    },
    {
      yaw: Math.PI,
      ox: x1,
      oz: z0,
      dx: -1,
      dz: 0,
      nx: 0,
      nz: -1,
      length: x1 - x0,
      mid: [cx, z0 - 2],
    },
    {
      yaw: Math.PI / 2,
      ox: x1,
      oz: z1,
      dx: 0,
      dz: -1,
      nx: 1,
      nz: 0,
      length: z1 - z0,
      mid: [x1 + 2, cz],
    },
    {
      yaw: -Math.PI / 2,
      ox: x0,
      oz: z0,
      dx: 0,
      dz: 1,
      nx: -1,
      nz: 0,
      length: z1 - z0,
      mid: [x0 - 2, cz],
    },
  ];
  const door = b.door?.position;
  const doorGap = (f: (typeof all)[number]) =>
    door
      ? Math.abs(
          f.nx !== 0
            ? door[0] - (f.nx > 0 ? x1 : x0)
            : door[1] - (f.nz > 0 ? z1 : z0),
        )
      : Infinity;
  const nearestDoor = door
    ? all.reduce((a, c) => (doorGap(c) < doorGap(a) ? c : a))
    : null;
  return all.map(({ mid, ...face }) => ({
    ...face,
    // a sidewalk or road within 10 m of the face makes it a street face
    street:
      face === nearestDoor ||
      [1, 4, 8].some((k) =>
        paved([mid[0] + face.nx * k, mid[1] + face.nz * k]),
      ),
  }));
}

/** The bays that dress one building: ground floor, window storeys, cornice,
 * corner posts and fire escapes. `floors` fits the height; `sy` stretches
 * each storey to land exactly on it. */
export function nycBays(b: Building): BayInstance[] {
  const out: BayInstance[] = [];
  const faces = facesOf(b);
  // a block with no street to face (inside a lot) keeps its plain walls
  if (!faces.some((f) => f.street)) return out;
  const seed = hash(b.footprint[0][0], b.footprint[0][1], 11);
  const floors = Math.max(
    1,
    Math.round((b.height - CORNICE_HEIGHT) / BAY_HEIGHT),
  );
  const sy = (b.height - CORNICE_HEIGHT) / (floors * BAY_HEIGHT);
  const tints =
    b.neighborhood === "little-manila"
      ? PASTELS
      : b.neighborhood === "chinatown-koreatown"
        ? LACQUER
        : b.style === "tower"
          ? STONES
          : BRICKS;
  const upper = UPPER[b.style as keyof typeof UPPER];

  for (const face of faces) {
    const bays = Math.max(1, Math.round(face.length / BAY_WIDTH));
    const sx = face.length / (bays * BAY_WIDTH);
    // lots: runs of two or three bays that share a window bay and a tint
    let lotStart = 0;
    let lot = 0;
    while (lotStart < bays) {
      const size = Math.min(
        bays - lotStart,
        2 + Math.floor(hash(seed, face.yaw, lot, 1) * 2),
      );
      const r = (k: number) => hash(seed, face.yaw, lot, k);
      const color = pick(tints, r(2));
      const window = pick(upper, r(3));
      const cornice = face.street ? pick(CORNICES, r(4)) : "corniceB";
      const escape = r(5) < (face.street ? 0.45 : 0.7) && floors >= 3;
      for (let i = 0; i < size; i++) {
        const along = (lotStart + i + 0.5) * BAY_WIDTH * sx;
        const x = face.ox + face.dx * along;
        const z = face.oz + face.dz * along;
        const at = (kind: BayKind, y: number, tall = sy): BayInstance => ({
          kind,
          x,
          y,
          z,
          yaw: face.yaw,
          sx,
          sy: tall,
          back: !face.street,
          color,
        });
        // ground: a door at the start of each lot, shopfronts after it
        const ground: BayKind = !face.street
          ? window
          : i === 0
            ? pick(["doorA", "doorB"] as const, r(6))
            : b.style === "brick" && r(7) < 0.4
              ? "shopW"
              : pick(["shopA", "shopB"] as const, r(8 + i));
        out.push(at(ground, 0));
        if (
          face.street &&
          i === 0 &&
          ground === "doorB" &&
          b.style === "brick"
        ) {
          out.push(at("stoop", 0, 1));
        }
        for (let f = 1; f < floors; f++) {
          // the odd blank bay keeps a window column from looking stamped
          const kind: BayKind = r(20 + f + i * 7) < 0.06 ? "blank" : window;
          out.push(at(kind, f * BAY_HEIGHT * sy));
        }
        out.push(at(cornice, floors * BAY_HEIGHT * sy, CORNICE_HEIGHT));
        if (escape && i === 1) {
          for (let f = 1; f < floors; f++)
            out.push(at("fireEscape", f * BAY_HEIGHT * sy, sy));
        }
      }
      lotStart += size;
      lot++;
    }
  }
  // a post up each corner, over the seam where two faces meet
  const xs = b.footprint.map(([x]) => x);
  const zs = b.footprint.map(([, z]) => z);
  const px = (v: number, lo: number) => (v === lo ? v + 0.35 : v - 0.35);
  for (const cx of [Math.min(...xs), Math.max(...xs)])
    for (const cz of [Math.min(...zs), Math.max(...zs)])
      for (let f = 0; f < floors; f++)
        out.push({
          kind: "post",
          x: px(cx, Math.min(...xs)),
          y: f * BAY_HEIGHT * sy,
          z: px(cz, Math.min(...zs)),
          yaw: 0,
          sx: 1,
          sy,
          back: false,
          color: "#ffffff",
        });
  return out;
}

/** The house models, as paths under public/models/ (without .glb). Suburbia
 * draws Kenney's City Kit Suburban (CC0, one unit wide) and Quaternius's
 * Buildings packs (CC0, normalized so the longer side is one unit); Beachside's
 * cottages are Quaternius's Ultimate Textured Building Pack. */
export const HOUSE_MODELS = [
  "suburbia/house-a",
  "suburbia/house-c",
  "suburbia/house-e",
  "suburbia/house-g",
  "suburbia/house-h",
  "suburbia/house-i",
  "suburbia/house-j",
  "suburbia/house-l",
  "suburbia/house-q-1",
  "suburbia/house-q-2",
  "suburbia/house-q-3",
  "suburbia/house-q-4",
  "suburbia/house-q-side",
  "suburbia/house-q-columns",
  "beachside/cottage-gable",
  "beachside/cottage-round",
  "beachside/cottage-wide",
] as const;
/** The models Suburbia's lots pick from, and Beachside's. */
const SUBURB_VARIANTS = HOUSE_MODELS.flatMap((m, i) =>
  m.startsWith("suburbia/") ? [i] : [],
);
const BEACH_VARIANTS = HOUSE_MODELS.flatMap((m, i) =>
  m.startsWith("beachside/") ? [i] : [],
);
/** Width, depth and height in model units of the models that are not
 * Kenney's (those are about one unit wide and stand at a fixed scale). */
const HOUSE_UNITS: Partial<
  Record<(typeof HOUSE_MODELS)[number], { w: number; d: number; h: number }>
> = {
  "suburbia/house-q-1": { w: 0.712, d: 1, h: 0.825 },
  "suburbia/house-q-2": { w: 0.87, d: 1, h: 0.931 },
  "suburbia/house-q-3": { w: 0.875, d: 1, h: 1.384 },
  "suburbia/house-q-4": { w: 1, d: 0.664, h: 0.621 },
  "suburbia/house-q-side": { w: 1, d: 0.73, h: 0.795 },
  "suburbia/house-q-columns": { w: 0.867, d: 1, h: 1.112 },
  "beachside/cottage-gable": { w: 0.885, d: 1, h: 0.851 },
  "beachside/cottage-round": { w: 0.982, d: 1, h: 1.121 },
  "beachside/cottage-wide": { w: 0.988, d: 1, h: 0.613 },
};
/** Triangles of the largest house model, for the budget. */
export const HOUSE_TRIANGLES = 5300;
/** The tallest a cottage stands, meters. */
const BEACH_HOUSE_HEIGHT = 14;

export type HouseSpot = {
  x: number;
  z: number;
  yaw: number;
  /** Index into HOUSE_MODELS. */
  variant: number;
  /** Meters per model unit; the kit's houses are about one unit wide. */
  scale: number;
};

/** A Suburbia house lot (the `deck` blocks, which carry no door or sign). */
export const isSuburbHouse = (b: Building): boolean =>
  b.neighborhood === "suburbia" && b.style === "deck";

/** A Beachside lot with no shop on it: the pastel houses on the beach front
 * and the motels one block back. */
export const isBeachHouse = (b: Building): boolean =>
  b.neighborhood === "beachside" &&
  b.style === "deck" &&
  !b.door &&
  !b.sign &&
  !isMotel(b);

/** A Palm Court motel (layout.ts's BEACH_BACK): a strip block with a court,
 * drawn as boxes with its own dressing (motel.ts), never as a house model. */
export const isMotel = (b: Building): boolean => b.id.startsWith("motel-");

/** A lot that is drawn as a model when you are near, rather than a box. */
export const isHouse = (b: Building): boolean =>
  isSuburbHouse(b) || isBeachHouse(b);

/** The house for a lot: set back from the lawn edge, facing the street. */
export function houseAt(b: Building): HouseSpot {
  const xs = b.footprint.map(([x]) => x);
  const zs = b.footprint.map(([, z]) => z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const h = (k: number) => hash(cx, cz, k);
  const beach = b.neighborhood === "beachside";
  // Suburbia's north lots front the street on their +z side, south lots on
  // their -z; Beachside's lots all face south, to the lane or the boulevard
  const toStreet = beach || cz < GALLERY_Z ? 1 : -1;
  const front = toStreet > 0 ? Math.max(...zs) : Math.min(...zs);
  const pool = beach ? BEACH_VARIANTS : SUBURB_VARIANTS;
  const variant = pool[Math.floor(h(1) * pool.length)] ?? 0;
  const units = HOUSE_UNITS[HOUSE_MODELS[variant] ?? HOUSE_MODELS[0]];
  const lotW = Math.max(...xs) - Math.min(...xs);
  const lotD = Math.max(...zs) - Math.min(...zs);
  // Kenney's houses are one unit wide at a fixed scale; the others are fitted
  // to the lot (leaving a yard in front) and to a sensible height
  let scale = 7.2 + h(2) * 1.6;
  let depth = scale;
  if (units) {
    scale = beach
      ? Math.min(
          (lotW - 2) / units.w,
          (lotD - 6) / units.d,
          BEACH_HOUSE_HEIGHT / units.h,
        )
      : Math.min(scale, (lotW - 2) / units.w);
    depth = scale * units.d;
  }
  return {
    x: cx,
    z: front - toStreet * (depth * 0.5 + 1.5),
    yaw: toStreet > 0 ? 0 : Math.PI,
    variant,
    scale,
  };
}
