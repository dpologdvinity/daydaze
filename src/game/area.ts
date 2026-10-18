import { CITY_AREA } from "./city/layout.ts";
import type { Portal, RoomDefinition } from "./rooms.ts";
import {
  nearestPointOnPolygon,
  pointInPolygon,
  stepTowards,
  type Vec2,
} from "./walk.ts";

/** Meters the player's body keeps clear of a blocker's edge. */
export const BODY_RADIUS = 0.35;

/**
 * Where a player can stand and what stops them. Surfaces may overlap; a
 * point is walkable if any surface holds it. Blockers are solid footprints.
 */
export type WalkArea = {
  surfaces: readonly (readonly Vec2[])[];
  blockers: readonly (readonly Vec2[])[];
  portals: readonly Portal[];
};

export function roomArea(room: RoomDefinition): WalkArea {
  return {
    surfaces: [room.walkable],
    blockers: room.blockers ?? [],
    portals: room.portals,
  };
}

/** The walk area of any room; the city is one area of many surfaces. */
export function areaOf(room: RoomDefinition): WalkArea {
  return room.id === "city" ? CITY_AREA : roomArea(room);
}

function distanceSq(a: Vec2, b: Vec2): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

/** The point itself if walkable, else the nearest walkable point. */
export function clampToArea(area: WalkArea, p: Vec2): Vec2 {
  let best: Vec2 | null = null;
  let bestSq = Infinity;
  for (const surface of area.surfaces) {
    if (pointInPolygon(surface, p)) return p;
    const candidate = nearestPointOnPolygon(surface, p);
    const sq = distanceSq(candidate, p);
    if (best === null || sq < bestSq) {
      best = candidate;
      bestSq = sq;
    }
  }
  return best ?? p;
}

// Blockers are bucketed on an 8 m grid, so a point only tests the few
// footprints near it instead of every footprint in the city.
const BUCKET = 8;
type BlockerIndex = Map<number, number[]>;
const indexes = new WeakMap<readonly (readonly Vec2[])[], BlockerIndex>();

function bucketKey(ix: number, iz: number): number {
  return ix * 1_000_003 + iz;
}

function indexOf(blockers: readonly (readonly Vec2[])[]): BlockerIndex {
  const cached = indexes.get(blockers);
  if (cached) return cached;
  const index: BlockerIndex = new Map();
  blockers.forEach((blocker, i) => {
    const xs = blocker.map(([x]) => x);
    const zs = blocker.map(([, z]) => z);
    // expanded by the body radius, so any point that could touch it finds it
    const x0 = Math.floor((Math.min(...xs) - BODY_RADIUS) / BUCKET);
    const x1 = Math.floor((Math.max(...xs) + BODY_RADIUS) / BUCKET);
    const z0 = Math.floor((Math.min(...zs) - BODY_RADIUS) / BUCKET);
    const z1 = Math.floor((Math.max(...zs) + BODY_RADIUS) / BUCKET);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const key = bucketKey(ix, iz);
        const bucket = index.get(key);
        if (bucket) bucket.push(i);
        else index.set(key, [i]);
      }
    }
  });
  indexes.set(blockers, index);
  return index;
}

/** True if the body would overlap a blocker at this point. */
export function isBlocked(area: WalkArea, p: Vec2): boolean {
  const near = indexOf(area.blockers).get(
    bucketKey(Math.floor(p[0] / BUCKET), Math.floor(p[1] / BUCKET)),
  );
  if (!near) return false;
  return near.some((i) => {
    const blocker = area.blockers[i];
    return (
      pointInPolygon(blocker, p) ||
      distanceSq(nearestPointOnPolygon(blocker, p), p) <
        BODY_RADIUS * BODY_RADIUS
    );
  });
}

/**
 * One frame of walking towards `goal`: at most `maxStep` meters, clamped to
 * the walkable surfaces, and slid along whichever axis is still open when a
 * blocker is in the way. Bad input or no open axis leaves you at `from`.
 */
export function stepInArea(
  area: WalkArea,
  from: Vec2,
  goal: Vec2,
  maxStep: number,
): Vec2 {
  const aim = clampToArea(area, stepTowards(from, goal, maxStep));
  if (!isBlocked(area, aim)) return aim;
  const slides: Vec2[] = [
    [aim[0], from[1]],
    [from[0], aim[1]],
  ];
  for (const slide of slides) {
    const p = clampToArea(area, slide);
    if (!isBlocked(area, p)) return p;
  }
  return from;
}
