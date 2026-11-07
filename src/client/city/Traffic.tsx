// Moving lane traffic: downloaded car bodies and procedural jeepneys share one simulation.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SIGNAL } from "../../game/city/furniture.ts";
import { advance } from "../../game/driving/fixedStep.ts";
import {
  carPose,
  createTraffic,
  TRAFFIC_COUNT,
  TRAFFIC_SEED,
  signalAt,
  signalledJunctions,
  stepTraffic,
  type Signal,
} from "../../game/city/traffic.ts";
import type { Player } from "../world/PlayerController.tsx";
import { foodMotion } from "./foodVendors.ts";
import { busMotion } from "./busRide.ts";
import { taxiCab } from "./taxiStore.ts";
import { driving } from "../world/driving.ts";
import { FIXED_PAINT } from "../../game/driving/bodies.ts";
import { NEAR_BODY, useTrafficBodies } from "./trafficBodies.ts";
import { useQuality } from "../world/quality.ts";
import {
  JEEPNEY_CHROME,
  JEEPNEY_DARK,
  JEEPNEY_SHELL,
  JEEPNEY_TRIM,
} from "./carGeometry.ts";

/**
 * Moving traffic and the junction lights. The cars come from the pure
 * simulation in src/game/city/traffic.ts at the fixed 50 Hz step; here they
 * are instanced meshes (the downloaded car, cop, taxi, ambulance and school
 * bus bodies, one draw per body and level of detail: trafficBodies.ts; the
 * procedural jeepneys' shells, trim, chrome, interiors, wheels and lamps)
 * and the signal bulbs, which change color only when the phase does.
 */

const WHEEL = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12).rotateX(
  Math.PI / 2,
);
const LAMP = new THREE.BoxGeometry(0.12, 0.16, 0.34);
const BULB = new THREE.CircleGeometry(SIGNAL.radius, 12);

// jeepney-local offsets (nose at +x): wheels, then head and tail lamps
const JEEPNEY_WHEELS: [number, number, number][] = [
  [1.95, 0.36, 0.9],
  [1.95, 0.36, -0.9],
  [-1.7, 0.36, 0.9],
  [-1.7, 0.36, -0.9],
];
const JEEPNEY_LAMPS: [number, number, number][] = [
  [2.78, 0.8, 0.72],
  [2.78, 0.8, -0.72],
  [-2.84, 0.8, 0.72],
  [-2.84, 0.8, -0.72],
];
const LAMP_COLORS = ["#fff3dc", "#fff3dc", "#ff2040", "#ff2040"];
const PER_VEHICLE = 4;
/** Jeepney stripes: one of these per jeepney, never its own paint. */
const TRIM_COLORS = ["#ffd84f", "#ff2f4f", "#2f8aff", "#9b5cff", "#7dff6b"];

const LIT: Record<Signal, string> = {
  red: "#ff3b4f",
  yellow: "#ffd84f",
  green: "#7dff6b",
};
const DARK = "#24161e";
const ORDER: Signal[] = ["red", "yellow", "green"];

type Bulb = { matrix: THREE.Matrix4; axis: "ew" | "ns"; light: Signal };

/** Three bulbs on each face of every corner signal head. */
function signalBulbs(): Bulb[] {
  const out: Bulb[] = [];
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (const [cx] of signalledJunctions()) {
    for (const side of [-1, 1]) {
      const hx = cx + 7;
      const hz = side * 9;
      // faces towards ±z are read by cross-street traffic, ±x by the avenue
      for (const [nx, nz, axis] of [
        [0, 1, "ns"],
        [0, -1, "ns"],
        [1, 0, "ew"],
        [-1, 0, "ew"],
      ] as const) {
        q.setFromAxisAngle(up, Math.atan2(nx, nz));
        ORDER.forEach((light, i) => {
          const m = new THREE.Matrix4().compose(
            new THREE.Vector3(
              hx + nx * SIGNAL.out,
              SIGNAL.top - i * SIGNAL.gap,
              hz + nz * SIGNAL.out,
            ),
            q,
            new THREE.Vector3(1, 1, 1),
          );
          out.push({ matrix: m, axis, light });
        });
      }
    }
  }
  return out;
}

const pose = { x: 0, z: 0, yaw: 0 };
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3();
const yAxis = new THREE.Vector3(0, 1, 0);
const color = new THREE.Color();

const carMatrix = new THREE.Matrix4();
const partMatrix = new THREE.Matrix4();
const partPos = new THREE.Vector3();
const partScale = new THREE.Vector3();
const noTurn = new THREE.Quaternion();

/** One car part: its car-local offset and size, on the current car. */
function placePart(
  mesh: THREE.InstancedMesh,
  index: number,
  lx: number,
  ly: number,
  lz: number,
  sx: number,
  sy: number,
  sz: number,
) {
  partMatrix.compose(
    partPos.set(lx, ly, lz),
    noTurn,
    partScale.set(sx, sy, sz),
  );
  mesh.setMatrixAt(index, partMatrix.premultiply(carMatrix));
}

export function Traffic({ player }: { player: Player }) {
  const tier = useQuality();
  const count = TRAFFIC_COUNT[tier];
  const bodies = useTrafficBodies(count);
  const traffic = useMemo(() => createTraffic(count, TRAFFIC_SEED), [count]);
  const clock = useRef({ accumulator: 0 });
  const here = useRef<[number, number]>([0, 0]);
  const busPosition = useRef<[number, number]>([0, 0]);
  const truckPosition = useRef<[number, number]>([0, 0]);
  const busCollision = useMemo<[number, number][]>(
    () => [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    [],
  );
  const truckCollision = useMemo<[number, number][]>(
    () => [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    [],
  );
  const phase = useRef("");
  const bulbs = useMemo(signalBulbs, []);

  // Capacity stays fixed; each frame packs only the visible jeepneys (cars
  // and heavy vehicles are the downloaded bodies, drawn by useTrafficBodies).
  const slots = useMemo(
    () => ({
      jeepneys: traffic.cars.filter((car) => car.kind === "jeepney").length,
    }),
    [traffic],
  );

  const meshes = useMemo(() => {
    const jeepneys = Math.max(1, slots.jeepneys);
    const shell = new THREE.InstancedMesh(
      JEEPNEY_SHELL,
      new THREE.MeshStandardMaterial({
        roughness: 0.35,
        metalness: 0.2,
        emissive: "#202030",
        emissiveIntensity: 0.6,
      }),
      jeepneys,
    );
    const trim = new THREE.InstancedMesh(
      JEEPNEY_TRIM,
      new THREE.MeshStandardMaterial({
        roughness: 0.4,
        emissive: "#303040",
        emissiveIntensity: 0.6,
      }),
      jeepneys,
    );
    const chrome = new THREE.InstancedMesh(
      JEEPNEY_CHROME,
      new THREE.MeshStandardMaterial({
        color: "#e8ecf4",
        roughness: 0.15,
        metalness: 0.9,
        emissive: "#4a4a5a",
        emissiveIntensity: 0.5,
      }),
      jeepneys,
    );
    const dark = new THREE.InstancedMesh(
      JEEPNEY_DARK,
      new THREE.MeshStandardMaterial({
        color: "#2a2038",
        roughness: 0.2,
        metalness: 0.4,
      }),
      jeepneys,
    );
    for (const mesh of [shell, trim, chrome, dark]) mesh.count = slots.jeepneys;
    const wheels = new THREE.InstancedMesh(
      WHEEL,
      new THREE.MeshStandardMaterial({ color: "#120c18", roughness: 0.8 }),
      jeepneys * PER_VEHICLE,
    );
    const lamps = new THREE.InstancedMesh(
      LAMP,
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      jeepneys * PER_VEHICLE,
    );
    const signals = new THREE.InstancedMesh(
      BULB,
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      bulbs.length,
    );
    for (let i = 0; i < jeepneys; i++)
      LAMP_COLORS.forEach((c, k) =>
        lamps.setColorAt(i * PER_VEHICLE + k, color.set(c).multiplyScalar(2)),
      );
    bulbs.forEach((b, i) => signals.setMatrixAt(i, b.matrix));
    const all = { shell, trim, chrome, dark, wheels, lamps };
    for (const mesh of [...Object.values(all), signals])
      mesh.frustumCulled = false;
    return { ...all, signals };
  }, [bulbs, slots]);

  useEffect(
    () => () => {
      for (const mesh of Object.values(meshes)) {
        [mesh.material].flat().forEach((mat) => mat.dispose());
        mesh.dispose();
      }
    },
    [meshes],
  );

  useFrame((_, dt) => {
    // the hailed taxi drives in the same lanes as everyone else
    const cab = taxiCab.car;
    if (traffic.cars.length > count) traffic.cars.length = count;
    if (cab) traffic.cars.push(cab);
    // a rider on a seat (the El, a bus) is not in the road, whatever the
    // walker's ground position says
    here.current[0] = player.pos.x;
    here.current[1] = player.pos.z;
    const onFoot = player.seat === null;
    busPosition.current[0] = busMotion.pose.x;
    busPosition.current[1] = busMotion.pose.z;
    truckPosition.current[0] = foodMotion.pose.x;
    truckPosition.current[1] = foodMotion.pose.z;
    advance(clock.current, dt, () =>
      stepTraffic(
        traffic,
        1 / 50,
        onFoot ? here.current : null,
        busMotion.active ? busPosition.current : null,
        foodMotion.origin !== null ? truckPosition.current : null,
      ),
    );
    const { shell, trim, chrome, dark, wheels, lamps, signals } = meshes;
    const city = driving.session?.kind === "city" ? driving.session : null;
    bodies.reset();
    let jeepCount = 0;
    for (let i = 0; i < traffic.cars.length; i++) {
      const car = traffic.cars[i];
      carPose(car, pose);
      // your own car out on the street bumps into this one
      if (city) {
        const c = city.traffic[i];
        if (c) {
          c[0] = pose.x;
          c[1] = pose.z;
        } else city.traffic[i] = [pose.x, pose.z];
      }
      const distance = Math.hypot(pose.x - player.pos.x, pose.z - player.pos.z);
      if (distance > (tier === "low" ? 80 : 180)) continue;
      if (car.body) {
        // a downloaded body: the taxi, cop car, ambulance and school bus wear
        // their own paint, everyone else the car's
        const paint = FIXED_PAINT[car.body] ?? car.color;
        bodies.put(
          car.body,
          color.set(paint),
          pose.x,
          pose.z,
          pose.yaw,
          tier === "low" || distance > NEAR_BODY,
        );
        continue;
      }
      const slot = jeepCount++;
      shell.setColorAt(slot, color.set(car.color));
      const n = TRIM_COLORS.length;
      let stripe = TRIM_COLORS[car.id % n];
      if (stripe === car.color) stripe = TRIM_COLORS[(car.id + 1) % n];
      trim.setColorAt(slot, color.set(stripe));
      // the jeepney's own matrix once; its parts are modeled full size, and
      // the wheels and lamps are offsets on it
      carMatrix.compose(
        pos.set(pose.x, 0, pose.z),
        quat.setFromAxisAngle(yAxis, pose.yaw),
        scl.set(1, 1, 1),
      );
      for (const mesh of [shell, trim, chrome, dark])
        mesh.setMatrixAt(slot, carMatrix);
      for (let k = 0; k < PER_VEHICLE; k++) {
        const [x, y, z] = JEEPNEY_WHEELS[k];
        placePart(wheels, slot * PER_VEHICLE + k, x, y, z, 1, 1, 1);
        const [lx, ly, lz] = JEEPNEY_LAMPS[k];
        placePart(lamps, slot * PER_VEHICLE + k, lx, ly, lz, 1, 1, 1);
      }
    }
    if (city) {
      // Three collision points cover the bus's full length for your own car.
      const bus = busMotion.pose;
      const n = traffic.cars.length;
      const truckStart = n + (busMotion.active ? 3 : 0);
      const truckActive = foodMotion.origin !== null;
      city.traffic.length = truckStart + (truckActive ? 3 : 0);
      if (truckActive) {
        const truck = foodMotion.pose;
        for (let k = 0; k < 3; k++) {
          const offset = (k - 1) * 1.5;
          const point = truckCollision[k];
          point[0] = truck.x + Math.cos(truck.yaw) * offset;
          point[1] = truck.z - Math.sin(truck.yaw) * offset;
          city.traffic[truckStart + k] = point;
        }
      }
      if (busMotion.active)
        for (let k = 0; k < 3; k++) {
          const offset = (k - 1) * 3;
          const x = bus.x + Math.cos(bus.yaw) * offset;
          const z = bus.z - Math.sin(bus.yaw) * offset;
          const point = busCollision[k];
          point[0] = x;
          point[1] = z;
          city.traffic[n + k] = point;
        }
    }
    shell.count = trim.count = chrome.count = dark.count = jeepCount;
    wheels.count = lamps.count = jeepCount * PER_VEHICLE;
    bodies.flush();
    for (const mesh of [shell, trim, chrome, dark, wheels, lamps]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // the bulbs only change with the light phase
    const ew = signalAt(traffic.time, "ew");
    const ns = signalAt(traffic.time, "ns");
    const key = ew + ns;
    if (key !== phase.current) {
      phase.current = key;
      bulbs.forEach((b, i) => {
        const on = (b.axis === "ew" ? ew : ns) === b.light;
        signals.setColorAt(
          i,
          on ? color.set(LIT[b.light]).multiplyScalar(2.5) : color.set(DARK),
        );
      });
      if (signals.instanceColor) signals.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      {bodies.all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      {Object.entries(meshes).map(([name, mesh]) => (
        <primitive key={name} object={mesh} />
      ))}
    </>
  );
}
