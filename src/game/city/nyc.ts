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
  type Building,
  type BuildingStyle,
  type Neighborhood,
} from "./layout.ts";

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
  fireEscape: 196,
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
  const tints = b.style === "tower" ? STONES : BRICKS;
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
