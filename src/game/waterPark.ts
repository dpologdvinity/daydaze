// Water Park geometry shared by the room data, the 3D scene and the slide ride:
// the wave pool and slide tower placement, the three slides' paths, and
// sampling a rider's position along a path. Meters, y up.

import type { Vec2 } from "./walk.ts";

/** A point in meters, y up. */
export type Vec3 = readonly [x: number, y: number, z: number];

// Water Park layout in meters, shared by the room data, the scene and the
// slide ride. The wave pool sits behind the deck, the slide tower to its east.
/** The wave pool's x/z bounds and water surface height, in meters. */
export const POOL = { x0: -10, x1: 3, z0: -9.5, z1: -1.5, water: 0.06 };
/**
 * The slide tower's center on the ground and its platform height, in meters.
 */
export const TOWER = { x: 7.5, z: -6.6, top: 6.6 };

/** One water slide: its menu label, tube color and ride path. */
export type Slide = {
  id: string;
  label: string;
  color: string;
  /** Where the rider's hips go, top to splash, in meters. */
  path: readonly Vec3[];
  /** Where the rider climbs out onto the deck after the splash. */
  exit: Vec2;
};

/**
 * A slide that spirals down around the tower, then runs out on a curve into
 * the pool at `landing`.
 */
function spiral(o: {
  radius: number;
  turns: number;
  start: number;
  top: number;
  bottom: number;
  landing: Vec3;
}): Vec3[] {
  const steps = Math.ceil(o.turns * 48);
  const pts: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const a = o.start - k * o.turns * Math.PI * 2;
    pts.push([
      TOWER.x + Math.cos(a) * o.radius,
      o.top + (o.bottom - o.top) * k,
      TOWER.z + Math.sin(a) * o.radius,
    ]);
  }
  // a quadratic run-out that leaves the spiral along its own tangent
  const [ax, ay, az] = pts[pts.length - 2];
  const [bx, by, bz] = pts[pts.length - 1];
  const len = Math.hypot(bx - ax, bz - az) || 1;
  const reach = 2.4;
  const c: Vec3 = [
    bx + ((bx - ax) / len) * reach,
    by - 0.3,
    bz + ((bz - az) / len) * reach,
  ];
  for (let i = 1; i <= 24; i++) {
    const k = i / 24;
    const u = 1 - k;
    pts.push([
      u * u * bx + 2 * u * k * c[0] + k * k * o.landing[0],
      u * u * by + 2 * u * k * c[1] + k * k * o.landing[1],
      u * u * bz + 2 * u * k * c[2] + k * k * o.landing[2],
    ]);
  }
  return pts;
}

/**
 * The slides off the tower, each spiraling down then running out into the pool.
 */
export const SLIDES: readonly Slide[] = [
  {
    id: "twister",
    label: "Twister",
    color: "#ff3f9e",
    path: spiral({
      radius: 2.1,
      turns: 1.75,
      start: Math.PI,
      top: TOWER.top,
      bottom: 1.6,
      landing: [0.6, POOL.water, -6.4],
    }),
    exit: [0.6, -0.8],
  },
  {
    id: "lagoon-loop",
    label: "Lagoon Loop",
    color: "#ffd23f",
    path: spiral({
      radius: 2.9,
      turns: 1.25,
      start: 0,
      top: TOWER.top - 1.3,
      bottom: 1.3,
      landing: [0.2, POOL.water, -3.6],
    }),
    exit: [0.2, -0.8],
  },
  {
    id: "sunset-drop",
    label: "Sunset Drop",
    color: "#3fc2ff",
    path: spiral({
      radius: 1.6,
      turns: 0.5,
      start: Math.PI / 2,
      top: TOWER.top,
      bottom: 3.6,
      landing: [0.4, POOL.water, -8.6],
    }),
    exit: [0.4, -0.8],
  },
];

/** Total length of a polyline path, in meters. */
export function pathLength(path: readonly Vec3[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay, az] = path[i - 1];
    const [bx, by, bz] = path[i];
    total += Math.hypot(bx - ax, by - ay, bz - az);
  }
  return total;
}

/**
 * The point `t` (0..1) of the way along the path by distance, and the yaw a
 * doll faces there (0 faces +z, as in walk.ts). `t` is clamped.
 */
export function samplePath(
  path: readonly Vec3[],
  t: number,
): { point: Vec3; yaw: number } {
  const want =
    (Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0) * pathLength(path);
  let walked = 0;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay, az] = path[i - 1];
    const [bx, by, bz] = path[i];
    const seg = Math.hypot(bx - ax, by - ay, bz - az);
    if (walked + seg >= want || i === path.length - 1) {
      const k = seg > 0 ? Math.min(1, (want - walked) / seg) : 1;
      return {
        point: [ax + (bx - ax) * k, ay + (by - ay) * k, az + (bz - az) * k],
        yaw: Math.atan2(bx - ax, bz - az),
      };
    }
    walked += seg;
  }
  return { point: path[0] ?? [0, 0, 0], yaw: 0 };
}
