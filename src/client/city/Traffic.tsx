import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { advance } from "../../game/driving/fixedStep.ts";
import {
  carPose,
  createTraffic,
  signalAt,
  signalledJunctions,
  stepTraffic,
  type Signal,
} from "../../game/city/traffic.ts";
import type { Player } from "../world/PlayerController.tsx";
import { useQuality } from "../world/quality.ts";
import { CAR_BODY, CAR_CABIN } from "./carGeometry.ts";

/**
 * Moving traffic and the junction lights. The cars come from the pure
 * simulation in src/game/city/traffic.ts at the fixed 50 Hz step; here they
 * are four instanced meshes (bodies, cabins, wheels, lamps) and the signal
 * bulbs, which change colour only when the phase does.
 */

const WHEEL = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12).rotateX(
  Math.PI / 2,
);
const LAMP = new THREE.BoxGeometry(0.12, 0.16, 0.34);
const BULB = new THREE.CircleGeometry(0.14, 12);

// car-local offsets (nose at +x): wheels, then head and tail lamps
const WHEELS: [number, number, number][] = [
  [1.35, 0.36, 0.86],
  [1.35, 0.36, -0.86],
  [-1.35, 0.36, 0.86],
  [-1.35, 0.36, -0.86],
];
const LAMPS: [number, number, number, string][] = [
  [2.1, 0.62, 0.62, "#fff3dc"],
  [2.1, 0.62, -0.62, "#fff3dc"],
  [-2.1, 0.7, 0.62, "#ff2040"],
  [-2.1, 0.7, -0.62, "#ff2040"],
];

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
            new THREE.Vector3(hx + nx * 0.27, 4.6 - i * 0.4, hz + nz * 0.27),
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
const colour = new THREE.Color();

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
  const count = tier === "high" ? 22 : 12;
  const traffic = useMemo(() => createTraffic(count, 11), [count]);
  const clock = useRef({ accumulator: 0 });
  const here = useRef<[number, number]>([0, 0]);
  const phase = useRef("");
  const bulbs = useMemo(signalBulbs, []);

  const meshes = useMemo(() => {
    const body = new THREE.InstancedMesh(
      CAR_BODY,
      new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.35,
        emissive: "#202030",
        emissiveIntensity: 0.6,
      }),
      count,
    );
    const cabin = new THREE.InstancedMesh(
      CAR_CABIN,
      new THREE.MeshStandardMaterial({
        color: "#3a2f7a",
        roughness: 0.08,
        metalness: 0.7,
      }),
      count,
    );
    const wheels = new THREE.InstancedMesh(
      WHEEL,
      new THREE.MeshStandardMaterial({ color: "#120c18", roughness: 0.8 }),
      count * WHEELS.length,
    );
    const lamps = new THREE.InstancedMesh(
      LAMP,
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      count * LAMPS.length,
    );
    const signals = new THREE.InstancedMesh(
      BULB,
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      bulbs.length,
    );
    traffic.cars.forEach((car, i) => {
      body.setColorAt(i, colour.set(car.colour));
      LAMPS.forEach(([, , , c], k) =>
        lamps.setColorAt(i * LAMPS.length + k, colour.set(c).multiplyScalar(2)),
      );
    });
    bulbs.forEach((b, i) => signals.setMatrixAt(i, b.matrix));
    for (const mesh of [body, cabin, wheels, lamps, signals])
      mesh.frustumCulled = false;
    return { body, cabin, wheels, lamps, signals };
  }, [count, traffic, bulbs]);

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
    advance(clock.current, dt, () =>
      stepTraffic(traffic, 1 / 50, here.current),
    );
    const { body, cabin, wheels, lamps, signals } = meshes;
    for (let i = 0; i < traffic.cars.length; i++) {
      carPose(traffic.cars[i], pose);
      // the car's own matrix once; each part is a car-local offset on it
      carMatrix.compose(
        pos.set(pose.x, 0, pose.z),
        quat.setFromAxisAngle(yAxis, pose.yaw),
        scl.set(1, 1, 1),
      );
      placePart(body, i, 0, 0.62, 0, 4.3, 0.95, 1.9);
      placePart(cabin, i, -0.25, 1.38, 0, 2.4, 0.62, 1.7);
      for (let k = 0; k < WHEELS.length; k++) {
        const [x, y, z] = WHEELS[k];
        placePart(wheels, i * WHEELS.length + k, x, y, z, 1, 1, 1);
      }
      for (let k = 0; k < LAMPS.length; k++) {
        const [x, y, z] = LAMPS[k];
        placePart(lamps, i * LAMPS.length + k, x, y, z, 1, 1, 1);
      }
    }
    for (const mesh of [body, cabin, wheels, lamps])
      mesh.instanceMatrix.needsUpdate = true;

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
          on ? colour.set(LIT[b.light]).multiplyScalar(2.5) : colour.set(DARK),
        );
      });
      if (signals.instanceColor) signals.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      {Object.entries(meshes).map(([name, mesh]) => (
        <primitive key={name} object={mesh} />
      ))}
    </>
  );
}
