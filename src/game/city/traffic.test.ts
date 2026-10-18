import { test } from "node:test";
import assert from "node:assert/strict";
import { neighborhoodAt } from "./cells.ts";
import { CITY_SURFACES } from "./layout.ts";
import {
  EDGES,
  JEEPNEY_COLORS,
  SIGNAL_PHASES,
  VEHICLE_LENGTH,
  carPose,
  createTraffic,
  signalAt,
  stepTraffic,
  type Traffic,
} from "./traffic.ts";
import { pointInPolygon } from "../walk.ts";

const DT = 1 / 50;
const run = (
  t: Traffic,
  seconds: number,
  player: [number, number] | null = null,
) => {
  for (let i = 0; i < seconds / DT; i++) stepTraffic(t, DT, player);
};
const pose = { x: 0, z: 0, yaw: 0 };

test("the avenue and the cross streets never both have green", () => {
  const cycle = SIGNAL_PHASES.reduce((a, b) => a + b, 0);
  let sawEw = false;
  let sawNs = false;
  for (let t = 0; t < cycle * 2; t += 0.25) {
    const ew = signalAt(t, "ew");
    const ns = signalAt(t, "ns");
    assert.ok(ew === "red" || ns === "red", `both lit at ${t}s`);
    sawEw ||= ew === "green";
    sawNs ||= ns === "green";
  }
  assert.ok(sawEw && sawNs);
});

test("cars stay on the asphalt while they drive for two minutes", () => {
  const roads = CITY_SURFACES.filter((s) => s.kind === "road");
  const t = createTraffic(20, 3);
  for (let step = 0; step < 120 / DT; step++) {
    stepTraffic(t, DT, null);
    if (step % 25) continue;
    for (const car of t.cars) {
      carPose(car, pose);
      assert.ok(
        roads.some((r) => pointInPolygon(r.polygon, [pose.x, pose.z])),
        `car ${car.id} left the road at ${pose.x.toFixed(1)}, ${pose.z.toFixed(1)}`,
      );
    }
  }
});

test("cars and jeepneys on one lane keep their distance", () => {
  const t = createTraffic(40, 5);
  assert.ok(t.cars.some((c) => c.kind === "jeepney"));
  for (let step = 0; step < 90 / DT; step++) {
    stepTraffic(t, DT, null);
    if (step % 50) continue;
    for (const a of t.cars)
      for (const b of t.cars) {
        if (a === b || a.lane.edge !== b.lane.edge || a.lane.way !== b.lane.way)
          continue;
        // bumper to bumper, with each vehicle's own length
        const clear =
          Math.abs(a.s - b.s) -
          (VEHICLE_LENGTH[a.kind] + VEHICLE_LENGTH[b.kind]) / 2;
        assert.ok(clear > 0, `${a.kind} ${a.id} and ${b.kind} ${b.id} overlap`);
      }
  }
});

test("jeepneys are longer, brightly painted, and start in Little Manila", () => {
  assert.ok(VEHICLE_LENGTH.jeepney > VEHICLE_LENGTH.car + 1);
  // the low tier's traffic still has a few
  const t = createTraffic(12, 11);
  assert.deepEqual(
    t.cars.map((c) => c.kind),
    createTraffic(12, 11).cars.map((c) => c.kind),
  );
  const jeepneys = t.cars.filter((c) => c.kind === "jeepney");
  assert.ok(jeepneys.length >= 1 && jeepneys.length <= 6);
  for (const c of jeepneys) {
    const { from, to } = EDGES[c.lane.edge];
    const mid: [number, number] = [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2,
    ];
    assert.equal(neighborhoodAt(mid), "little-manila");
    assert.ok(JEEPNEY_COLORS.some((color) => color === c.color));
  }
});

test("traffic keeps moving: every car gets somewhere", () => {
  const t = createTraffic(16, 7);
  const start = t.cars.map(
    (c) => `${c.lane.edge}:${c.lane.way}:${c.s.toFixed(1)}`,
  );
  run(t, 60);
  const moved = t.cars.filter(
    (c, i) => `${c.lane.edge}:${c.lane.way}:${c.s.toFixed(1)}` !== start[i],
  );
  assert.equal(moved.length, t.cars.length);
});

test("a car stops for the player standing in its lane", () => {
  const t = createTraffic(1, 1);
  const car = t.cars[0];
  car.s = 40;
  carPose(car, pose);
  // stand 10 m ahead of the car, in its lane
  const ahead: [number, number] = [
    pose.x + Math.cos(pose.yaw) * 10,
    pose.z - Math.sin(pose.yaw) * 10,
  ];
  run(t, 10, ahead);
  assert.equal(car.speed, 0);
  carPose(car, pose);
  const gap = Math.hypot(ahead[0] - pose.x, ahead[1] - pose.z);
  assert.ok(gap > 3, `stopped ${gap.toFixed(1)} m away`);
});

test("lanes run along real road edges", () => {
  assert.ok(EDGES.length > 0);
  for (const e of EDGES) assert.ok(e.laneOffset > 1 && e.length > 50);
});
