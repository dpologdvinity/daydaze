import { test } from "node:test";
import assert from "node:assert/strict";
import { ROAD_EDGES, ROAD_NODES } from "./layout.ts";
import { CITY_PLACES } from "./places.ts";
import {
  approachRoute,
  curbPoint,
  fareFor,
  planRoute,
  routeLength,
  routePose,
  TAXI_BASE_FARE,
  TAXI_MAX_FARE,
} from "./taxi.ts";

const at = (id: string) => {
  const n = ROAD_NODES.find((r) => r.id === id);
  assert.ok(n, id);
  return n.position;
};

test("the fare is the base plus a coin per stretch, never over the cap", () => {
  assert.equal(fareFor(0), TAXI_BASE_FARE);
  assert.ok(fareFor(400) > fareFor(100));
  assert.equal(fareFor(1e6), TAXI_MAX_FARE);
  assert.equal(fareFor(Number.NaN), TAXI_BASE_FARE);
});

test("a route follows the road graph: every leg lies on an edge", () => {
  const route = planRoute([-345, 9], [290, 9]);
  assert.ok(route.length >= 2);
  const onEdge = ([x, z]: readonly [number, number]) =>
    ROAD_EDGES.some((e) => {
      const [ax, az] = at(e.from);
      const [bx, bz] = at(e.to);
      const cross = Math.abs((bx - ax) * (z - az) - (bz - az) * (x - ax));
      const len = Math.hypot(bx - ax, bz - az);
      const t = ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (len * len);
      return cross / len < 0.5 && t > -1e-6 && t < 1 + 1e-6;
    });
  for (const p of route) assert.ok(onEdge(p), `off-road point ${p}`);
});

test("every district reaches every other", () => {
  for (const a of CITY_PLACES)
    for (const b of CITY_PLACES) {
      const len = routeLength(planRoute(a.spawn.position, b.spawn.position));
      assert.ok(Number.isFinite(len) && len >= 0, `${a.id} to ${b.id}`);
    }
});

test("a trip along the avenue is as long as the avenue", () => {
  const len = routeLength(planRoute([-30, 7], [30, -7]));
  assert.ok(Math.abs(len - 60) < 1);
});

test("poses walk the route start to end and clamp past it", () => {
  const route = planRoute([-30, 7], [30, 7]);
  const start = routePose(route, 0);
  const end = routePose(route, 1e9);
  assert.ok(Math.abs(start.x - -30) < 1 && Math.abs(end.x - 30) < 1);
  // eastward: yaw 0 faces +x
  assert.ok(Math.abs(Math.sin(start.yaw)) < 1e-6 && Math.cos(start.yaw) > 0);
  const mid = routePose(route, 30);
  assert.ok(Math.abs(mid.x) < 1);
});

test("a one-point trip is a zero-length route", () => {
  const route = planRoute([0, 7], [0, 7]);
  assert.equal(routeLength(route), 0);
  assert.doesNotThrow(() => routePose(route, 5));
});

test("a cab rolls in along the road to the curb, from at most 55 m back", () => {
  const route = approachRoute([-30, 7]);
  const len = routeLength(route);
  assert.ok(len > 0 && len <= 55 + 1e-6);
  const curb = curbPoint([-30, 7]);
  assert.deepEqual(route[1], curb);
  assert.ok(Math.abs(curb[1]) < 1e-6);
});
