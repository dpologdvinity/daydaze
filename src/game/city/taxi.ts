// Taxi fares and routes. A cab never leaves the streets: the route snaps the
// pickup and the destination to their nearest road edge and runs the shortest
// path over ROAD_NODES/ROAD_EDGES between them. Pure; the client only samples
// `routePose` once per frame.
import type { Vec2 } from "../walk.ts";
import { ROAD_EDGES, ROAD_NODES } from "./layout.ts";

/** Coins: the flag drop, one more per stretch driven, and a ceiling. */
export const TAXI_BASE_FARE = 6;
export const TAXI_STRETCH = 60;
export const TAXI_MAX_FARE = 30;
/** Meters per second on the way to the fare and with the fare aboard. */
export const TAXI_SPEED = 17;

/** Coins for a trip of `meters`. */
export function fareFor(meters: number): number {
  if (!Number.isFinite(meters) || meters <= 0) return TAXI_BASE_FARE;
  return Math.min(
    TAXI_MAX_FARE,
    TAXI_BASE_FARE + Math.floor(meters / TAXI_STRETCH),
  );
}

const nodeAt = new Map(ROAD_NODES.map((n) => [n.id, n.position]));
const NEIGHBORS = new Map<string, string[]>();
for (const e of ROAD_EDGES) {
  NEIGHBORS.set(e.from, [...(NEIGHBORS.get(e.from) ?? []), e.to]);
  NEIGHBORS.set(e.to, [...(NEIGHBORS.get(e.to) ?? []), e.from]);
}

const dist = (a: Vec2, b: Vec2) => Math.hypot(a[0] - b[0], a[1] - b[1]);

type Snap = { point: Vec2; from: string; to: string };

/** The point on a road center line nearest `p`, and that edge's ends. */
function snap(p: Vec2): Snap {
  let best: Snap | null = null;
  let bestD = Infinity;
  for (const e of ROAD_EDGES) {
    const a = nodeAt.get(e.from);
    const b = nodeAt.get(e.to);
    if (!a || !b) continue;
    const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / len2,
      ),
    );
    const point: Vec2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const d = dist(p, point);
    if (d < bestD) {
      bestD = d;
      best = { point, from: e.from, to: e.to };
    }
  }
  if (!best) throw new Error("The city has no roads");
  return best;
}

/** Shortest node path from `a` to `b` (Dijkstra; the graph is tiny). */
function shortest(a: string, b: string): { ids: string[]; length: number } {
  const best = new Map<string, number>([[a, 0]]);
  const prev = new Map<string, string>();
  const open = new Set([a]);
  while (open.size) {
    let cur = "";
    let curD = Infinity;
    for (const id of open) {
      const d = best.get(id) ?? Infinity;
      if (d < curD) {
        cur = id;
        curD = d;
      }
    }
    open.delete(cur);
    if (cur === b) break;
    const here = nodeAt.get(cur);
    if (!here) continue;
    for (const n of NEIGHBORS.get(cur) ?? []) {
      const there = nodeAt.get(n);
      if (!there) continue;
      const d = curD + dist(here, there);
      if (d < (best.get(n) ?? Infinity)) {
        best.set(n, d);
        prev.set(n, cur);
        open.add(n);
      }
    }
  }
  const length = best.get(b);
  if (length === undefined) return { ids: [], length: Infinity };
  const ids = [b];
  while (ids[0] !== a) {
    const p = prev.get(ids[0]);
    if (!p) break;
    ids.unshift(p);
  }
  return { ids, length };
}

/**
 * The road points a cab drives from the road beside `from` to the road
 * beside `to`. Always at least one point.
 */
export function planRoute(from: Vec2, to: Vec2): Vec2[] {
  const a = snap(from);
  const b = snap(to);
  if (a.from === b.from && a.to === b.to) return [a.point, b.point];
  let route: Vec2[] | null = null;
  let routeD = Infinity;
  for (const s of [a.from, a.to])
    for (const e of [b.from, b.to]) {
      const sp = nodeAt.get(s);
      const ep = nodeAt.get(e);
      if (!sp || !ep) continue;
      const { ids, length } = shortest(s, e);
      const d = dist(a.point, sp) + length + dist(ep, b.point);
      if (d < routeD && ids.length) {
        routeD = d;
        route = [a.point];
        for (const id of ids) {
          const at = nodeAt.get(id);
          if (at) route.push(at);
        }
        route.push(b.point);
      }
    }
  if (!route) throw new Error("No road connects the two places");
  return route;
}

/** Meters along the route. */
export function routeLength(route: readonly Vec2[]): number {
  let total = 0;
  for (let i = 1; i < route.length; i++) total += dist(route[i - 1], route[i]);
  return total;
}

/** Where a cab is `d` meters along the route, facing the way it goes (yaw 0
 * faces +x, the same convention as the bus); clamped to the ends. */
export function routePose(
  route: readonly Vec2[],
  d: number,
): { x: number; z: number; yaw: number } {
  let left = Math.max(0, d);
  let yaw = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const len = dist(a, b);
    if (len > 0) yaw = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
    if (left <= len || i === route.length - 1) {
      const t = len > 0 ? Math.min(1, left / len) : 0;
      return {
        x: a[0] + (b[0] - a[0]) * t,
        z: a[1] + (b[1] - a[1]) * t,
        yaw,
      };
    }
    left -= len;
  }
  const only = route[0] ?? [0, 0];
  return { x: only[0], z: only[1], yaw };
}

/** The road point beside `p` where a cab pulls up. */
export function curbPoint(p: Vec2): Vec2 {
  return snap(p).point;
}

/**
 * The last stretch of a cab's way to a fare at `p`: up to `run` meters of the
 * road it stands on, ending at the curb point.
 */
export function approachRoute(p: Vec2, run = 55): Vec2[] {
  const s = snap(p);
  const a = nodeAt.get(s.from);
  const b = nodeAt.get(s.to);
  if (!a || !b) return [s.point, s.point];
  // start from the end that is farther away, so there is room to roll in
  const far = dist(s.point, a) >= dist(s.point, b) ? a : b;
  const d = dist(s.point, far);
  const t = d > run ? run / d : 1;
  return [
    [
      s.point[0] + (far[0] - s.point[0]) * t,
      s.point[1] + (far[1] - s.point[1]) * t,
    ],
    s.point,
  ];
}
