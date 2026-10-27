// Moving lane traffic: procedural city cars and downloaded transport share one simulation.
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SIGNAL } from "../../game/city/furniture.ts";
import { advance } from "../../game/driving/fixedStep.ts";
import {
  carPose,
  createTraffic,
  signalAt,
  signalledJunctions,
  stepTraffic,
  type Signal,
  type VehicleKind,
} from "../../game/city/traffic.ts";
import type { Player } from "../world/PlayerController.tsx";
import { busMotion } from "./busRide.ts";
import { driving } from "../world/driving.ts";
import {
  useTransitModels,
  resetTransit,
  placeTransit,
  updateTransit,
  type TransitModel,
} from "./transitModels.ts";
import { useQuality } from "../world/quality.ts";
import {
  CAR_BODY,
  CAR_CABIN,
  JEEPNEY_CHROME,
  JEEPNEY_DARK,
  JEEPNEY_SHELL,
  JEEPNEY_TRIM,
} from "./carGeometry.ts";

/**
 * Moving traffic and the junction lights. The cars come from the pure
 * simulation in src/game/city/traffic.ts at the fixed 50 Hz step; here they
 * are instanced meshes (car bodies and cabins; jeepney shells, trim, chrome
 * and interiors; everyone's wheels and lamps) and the signal bulbs, which
 * change color only when the phase does.
 */

const DOWNLOADED: readonly TransitModel[] = ["taxi", "sedan", "van"];

const WHEEL = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12).rotateX(
  Math.PI / 2,
);
const LAMP = new THREE.BoxGeometry(0.12, 0.16, 0.34);
const BULB = new THREE.CircleGeometry(SIGNAL.radius, 12);

// vehicle-local offsets (nose at +x): wheels, then head and tail lamps
const WHEELS: Record<VehicleKind, [number, number, number][]> = {
  car: [
    [1.35, 0.36, 0.86],
    [1.35, 0.36, -0.86],
    [-1.35, 0.36, 0.86],
    [-1.35, 0.36, -0.86],
  ],
  jeepney: [
    [1.95, 0.36, 0.9],
    [1.95, 0.36, -0.9],
    [-1.7, 0.36, 0.9],
    [-1.7, 0.36, -0.9],
  ],
};
const LAMPS: Record<VehicleKind, [number, number, number][]> = {
  car: [
    [2.1, 0.62, 0.62],
    [2.1, 0.62, -0.62],
    [-2.1, 0.7, 0.62],
    [-2.1, 0.7, -0.62],
  ],
  jeepney: [
    [2.78, 0.8, 0.72],
    [2.78, 0.8, -0.72],
    [-2.84, 0.8, 0.72],
    [-2.84, 0.8, -0.72],
  ],
};
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
  const downloaded = useTransitModels(DOWNLOADED, 22);
  const count = tier === "high" ? 22 : 12;
  const traffic = useMemo(() => createTraffic(count, 11), [count]);
  const clock = useRef({ accumulator: 0 });
  const here = useRef<[number, number]>([0, 0]);
  const busPosition = useRef<[number, number]>([0, 0]);
  const phase = useRef("");
  const bulbs = useMemo(signalBulbs, []);

  // Capacity stays fixed; each frame packs only the visible procedural vehicles.
  const slots = useMemo(
    () => ({
      cars: traffic.cars.filter((car) => car.kind === "car").length,
      jeepneys: traffic.cars.filter((car) => car.kind === "jeepney").length,
    }),
    [traffic],
  );

  const meshes = useMemo(() => {
    const cars = Math.max(1, slots.cars);
    const jeepneys = Math.max(1, slots.jeepneys);
    const body = new THREE.InstancedMesh(
      CAR_BODY,
      new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.35,
        emissive: "#202030",
        emissiveIntensity: 0.6,
      }),
      cars,
    );
    const cabin = new THREE.InstancedMesh(
      CAR_CABIN,
      new THREE.MeshStandardMaterial({
        color: "#3a2f7a",
        roughness: 0.08,
        metalness: 0.7,
      }),
      cars,
    );
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
    body.count = slots.cars;
    cabin.count = slots.cars;
    for (const mesh of [shell, trim, chrome, dark]) mesh.count = slots.jeepneys;
    const wheels = new THREE.InstancedMesh(
      WHEEL,
      new THREE.MeshStandardMaterial({ color: "#120c18", roughness: 0.8 }),
      count * PER_VEHICLE,
    );
    const lamps = new THREE.InstancedMesh(
      LAMP,
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      count * PER_VEHICLE,
    );
    const signals = new THREE.InstancedMesh(
      BULB,
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      bulbs.length,
    );
    traffic.cars.forEach((_, i) => {
      LAMP_COLORS.forEach((c, k) =>
        lamps.setColorAt(i * PER_VEHICLE + k, color.set(c).multiplyScalar(2)),
      );
    });
    bulbs.forEach((b, i) => signals.setMatrixAt(i, b.matrix));
    const all = { body, cabin, shell, trim, chrome, dark, wheels, lamps };
    for (const mesh of [...Object.values(all), signals])
      mesh.frustumCulled = false;
    return { ...all, signals };
  }, [count, traffic, bulbs, slots]);

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
    here.current[0] = player.pos.x;
    here.current[1] = player.pos.z;
    busPosition.current[0] = busMotion.pose.x;
    busPosition.current[1] = busMotion.pose.z;
    advance(clock.current, dt, () =>
      stepTraffic(
        traffic,
        1 / 50,
        here.current,
        busMotion.active ? busPosition.current : null,
      ),
    );
    const { body, cabin, shell, trim, chrome, dark, wheels, lamps, signals } =
      meshes;
    const city = driving.session?.kind === "city" ? driving.session : null;
    resetTransit(downloaded.all);
    let carCount = 0,
      jeepCount = 0,
      partCount = 0;
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
      const model = car.kind === "car" ? car.id % 4 : 0;
      if (model > 0) {
        placeTransit(
          downloaded.models,
          model - 1,
          pose.x,
          pose.z,
          pose.yaw,
          distance,
          tier === "low",
        );
        continue;
      }
      const slot = car.kind === "car" ? carCount++ : jeepCount++;
      if (car.kind === "car") body.setColorAt(slot, color.set(car.color));
      else {
        shell.setColorAt(slot, color.set(car.color));
        const n = TRIM_COLORS.length;
        let stripe = TRIM_COLORS[car.id % n];
        if (stripe === car.color) stripe = TRIM_COLORS[(car.id + 1) % n];
        trim.setColorAt(slot, color.set(stripe));
      }
      // the car's own matrix once; each part is a car-local offset on it
      carMatrix.compose(
        pos.set(pose.x, 0, pose.z),
        quat.setFromAxisAngle(yAxis, pose.yaw),
        scl.set(1, 1, 1),
      );
      if (car.kind === "car") {
        placePart(body, slot, 0, 0.62, 0, 4.3, 0.95, 1.9);
        placePart(cabin, slot, -0.25, 1.38, 0, 2.4, 0.62, 1.7);
      } else {
        // jeepney parts are modeled full size
        for (const mesh of [shell, trim, chrome, dark])
          mesh.setMatrixAt(slot, carMatrix);
      }
      const wheelAt = WHEELS[car.kind];
      const lampAt = LAMPS[car.kind];
      for (let k = 0; k < PER_VEHICLE; k++) {
        const [x, y, z] = wheelAt[k];
        placePart(wheels, partCount * PER_VEHICLE + k, x, y, z, 1, 1, 1);
        const [lx, ly, lz] = lampAt[k];
        placePart(lamps, partCount * PER_VEHICLE + k, lx, ly, lz, 1, 1, 1);
      }
      partCount++;
    }
    if (city) {
      // Three collision points cover the bus's full length for your own car.
      const bus = busMotion.pose;
      const n = traffic.cars.length;
      city.traffic.length = n + (busMotion.active ? 3 : 0);
      if (busMotion.active)
        for (let k = 0; k < 3; k++) {
          const offset = (k - 1) * 3;
          const x = bus.x + Math.cos(bus.yaw) * offset;
          const z = bus.z - Math.sin(bus.yaw) * offset;
          const point = city.traffic[n + k];
          if (point) {
            point[0] = x;
            point[1] = z;
          } else city.traffic[n + k] = [x, z];
        }
    }
    body.count = cabin.count = carCount;
    shell.count = trim.count = chrome.count = dark.count = jeepCount;
    wheels.count = lamps.count = partCount * PER_VEHICLE;
    for (const mesh of [
      body,
      cabin,
      shell,
      trim,
      chrome,
      dark,
      wheels,
      lamps,
    ]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    updateTransit(downloaded.all);

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
      {downloaded.all.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      {Object.entries(meshes).map(([name, mesh]) => (
        <primitive key={name} object={mesh} />
      ))}
    </>
  );
}
