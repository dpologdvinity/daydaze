// Walking on the ground plane: 2D points as [x, z] in meters, point-in-polygon
// tests and clamping to a room's walkable area, and stepping and turning
// towards a target. Pure; non-finite input is tolerated and never moves you.

/** A point or direction on the ground plane, [x, z] in meters. */
export type Vec2 = readonly [x: number, z: number];

/** Meters per second. */
export const WALK_SPEED = 2.2;

// Points this close to an edge count as on it, so clamped points test inside.
const EDGE_EPSILON = 1e-9;

function isFiniteVec(p: Vec2): boolean {
  return Number.isFinite(p[0]) && Number.isFinite(p[1]);
}

function closestOnSegment(a: Vec2, b: Vec2, p: Vec2): Vec2 {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq === 0) return a;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / lengthSq;
  const clamped = Math.min(1, Math.max(0, t));
  return [a[0] + clamped * dx, a[1] + clamped * dz];
}

function distanceSq(a: Vec2, b: Vec2): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

/** The closest point on any edge. Non-finite points map to the first vertex. */
export function nearestPointOnPolygon(polygon: readonly Vec2[], p: Vec2): Vec2 {
  if (!isFiniteVec(p)) return polygon[0];
  let best = polygon[0];
  let bestSq = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const candidate = closestOnSegment(polygon[j], polygon[i], p);
    const sq = distanceSq(candidate, p);
    if (sq < bestSq) {
      best = candidate;
      bestSq = sq;
    }
  }
  return best;
}

/** Ray casting; points on an edge or vertex count as inside. */
export function pointInPolygon(polygon: readonly Vec2[], p: Vec2): boolean {
  if (!isFiniteVec(p)) return false;
  if (distanceSq(nearestPointOnPolygon(polygon, p), p) <= EDGE_EPSILON ** 2) {
    return true;
  }
  const [x, z] = p;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * `p` when it is inside (or on the edge of) the walkable polygon, else the
 * nearest point on its edge.
 */
export function clampToWalkable(polygon: readonly Vec2[], p: Vec2): Vec2 {
  return pointInPolygon(polygon, p) ? p : nearestPointOnPolygon(polygon, p);
}

/** Moves at most `maxStep` towards `to`; bad input leaves you at `from`. */
export function stepTowards(from: Vec2, to: Vec2, maxStep: number): Vec2 {
  if (!isFiniteVec(from) || !isFiniteVec(to) || !Number.isFinite(maxStep)) {
    return from;
  }
  if (maxStep <= 0) return from;
  const distance = Math.sqrt(distanceSq(from, to));
  if (distance <= maxStep) return to;
  const k = maxStep / distance;
  return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
}

/** Yaw in (-pi, pi], 0 facing +z and pi/2 facing +x. */
export function yawTowards(from: Vec2, to: Vec2): number {
  if (!isFiniteVec(from) || !isFiniteVec(to)) return 0;
  const yaw = Math.atan2(to[0] - from[0], to[1] - from[1]);
  // atan2 gives -pi for a -0 x offset; fold it onto pi.
  return yaw === -Math.PI ? Math.PI : yaw;
}
