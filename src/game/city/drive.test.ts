import { test } from "node:test";
import assert from "node:assert/strict";
import type { CarInput, CarState } from "../driving/car.ts";
import { carById } from "../driving/roster.ts";
import {
  cleanParkedCar,
  exitPoint,
  HOME_PARKING,
  onRoad,
  stepCityCar,
} from "./drive.ts";
import {
  fillCost,
  FULL_TANK_COINS,
  GAS_STATIONS,
  islandsOf,
  pumpBays,
  stationAt,
} from "./gasStations.ts";
import { startCity, stepSession } from "../speedway/session.ts";

const sedan = carById("quill-lite");
if (!sedan) throw new Error("starter sedan missing");
const spec = sedan;
const half = spec.width / 2;
const GAS: CarInput = { throttle: 1, brake: 0, steer: 0 };

function run(state: CarState, input: CarInput, ticks: number) {
  let s = state;
  for (let i = 0; i < ticks; i++) s = stepCityCar(spec, s, input);
  return s;
}

test("the home parking spot is on the avenue", () => {
  assert.ok(onRoad(HOME_PARKING.at, half));
});

test("driving down the avenue moves the car east", () => {
  const s = run(
    { position: HOME_PARKING.at, yaw: Math.PI / 2, speed: 0 },
    GAS,
    100,
  );
  assert.ok(s.position[0] > HOME_PARKING.at[0] + 5);
  assert.ok(onRoad(s.position, half));
});

test("the curb stops a car driven straight at it", () => {
  // nose south across the avenue: the south curb is at z = 7
  const s = run({ position: [30, 0], yaw: 0, speed: 0 }, GAS, 300);
  assert.ok(s.position[1] <= 7 - half + 1e-9);
  assert.ok(onRoad(s.position, half));
});

test("a car keeps to the asphalt through a junction turn", () => {
  let s: CarState = { position: [-80, 3], yaw: Math.PI / 2, speed: 8 };
  for (let i = 0; i < 400; i++) {
    s = stepCityCar(spec, s, { throttle: 0.4, brake: 0, steer: -1 });
    assert.ok(onRoad(s.position, half), `off road at ${s.position}`);
  }
});

test("traffic is solid: hitting a car bounces you back", () => {
  const s = stepCityCar(
    spec,
    { position: [20, 3], yaw: Math.PI / 2, speed: 10 },
    GAS,
    [[22, 3]],
  );
  assert.ok(s.speed <= 0);
  assert.ok(
    Math.hypot(s.position[0] - 22, s.position[1] - 3) >= 2.2 + half - 1e-6,
  );
});

test("you step out on the car's left", () => {
  // facing +x, left is -z
  const [x, z] = exitPoint({ position: [0, 0], yaw: Math.PI / 2, speed: 0 });
  assert.ok(Math.abs(x) < 1e-9);
  assert.ok(z < -2);
});

test("a saved parked car is checked before use", () => {
  const known = (id: string) => id === "quill-lite";
  const good = {
    id: "quill-lite",
    color: "#ff4fb3",
    at: [30, 3],
    yaw: 1,
    fuel: 0.25,
  };
  assert.deepEqual(cleanParkedCar(good, known), good);
  // saves from before gas stations fill the tank
  const { fuel: _, ...old } = good;
  assert.equal(cleanParkedCar(old, known)?.fuel, 1);
  assert.equal(cleanParkedCar({ ...good, id: "rocket" }, known), null);
  assert.equal(cleanParkedCar({ ...good, color: "red" }, known), null);
  // custom-shop mods survive; unknown ones fall back to stock
  const modded = { ...good, rims: "gold", glow: "cyan", tint: "limo" };
  assert.deepEqual(cleanParkedCar(modded, known), modded);
  assert.deepEqual(
    cleanParkedCar({ ...good, rims: "diamond", glow: 3 }, known),
    good,
  );
  assert.equal(cleanParkedCar({ ...good, at: [30, 50] }, known), null);
  assert.equal(cleanParkedCar({ ...good, yaw: NaN }, known), null);
  assert.equal(cleanParkedCar("car", known), null);
});

test("a car drives off the street onto a gas station's forecourt", () => {
  const glow = GAS_STATIONS[0];
  // southbound on Cross Street A, a right turn west, then straight in
  let s: CarState = { position: [-63, -125], yaw: 0, speed: 0 };
  s = run(s, GAS, 40);
  while (s.yaw > -Math.PI / 2)
    s = stepCityCar(spec, s, { throttle: 0.5, brake: 0, steer: -1 });
  s = run(s, GAS, 100);
  assert.ok(
    s.position[0] < glow.street,
    `still on the street at ${s.position}`,
  );
});

test("the pump islands are solid", () => {
  for (const island of islandsOf(GAS_STATIONS[0])) {
    const xs = island.map((p) => p[0]);
    const zs = island.map((p) => p[1]);
    const c: [number, number] = [
      (Math.min(...xs) + Math.max(...xs)) / 2,
      (Math.min(...zs) + Math.max(...zs)) / 2,
    ];
    let s: CarState = {
      position: [c[0] + 4, c[1]],
      yaw: -Math.PI / 2,
      speed: 0,
    };
    s = run(s, GAS, 120);
    assert.ok(
      s.position[0] > Math.max(...xs),
      `drove through at ${s.position}`,
    );
  }
});

test("pump bays find their station; filling costs coins by the empty share", () => {
  const glow = GAS_STATIONS[0];
  for (const bay of pumpBays(glow)) assert.equal(stationAt(bay), glow);
  assert.equal(stationAt([0, 0]), null);
  assert.equal(fillCost(0), FULL_TANK_COINS);
  assert.equal(fillCost(1), 1);
  assert.equal(fillCost(0.5), FULL_TANK_COINS / 2);
  assert.equal(fillCost(NaN), FULL_TANK_COINS);
});

test("driving burns gas, and an empty tank won't take the pedal", () => {
  const s = startCity(spec, "#ff4fb3", HOME_PARKING.at, HOME_PARKING.yaw, 1);
  for (let i = 0; i < 200; i++) stepSession(s, GAS);
  assert.ok(s.fuel < 1);
  const empty = startCity(
    spec,
    "#ff4fb3",
    HOME_PARKING.at,
    HOME_PARKING.yaw,
    0,
  );
  for (let i = 0; i < 100; i++) stepSession(empty, GAS);
  assert.equal(empty.car.speed, 0);
  assert.deepEqual(empty.car.position, HOME_PARKING.at);
});
