import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  COASTER_CONTROLS,
  COASTER_TRACK,
  FERRIS,
  dropTowerHeight,
  ferrisPose,
  newPose,
  trackPose,
} from "../../../game/amusementPark.ts";
import { useReducedMotion } from "../../motion.ts";
import { canvasTex, hdr, LACQUER } from "../shared/materials.ts";
import { Neon } from "../shared/Neon.tsx";
import { Bulbs } from "./Bulbs.tsx";
import { Boxes, Segments, type Box, type Segment } from "./Instanced.tsx";
import { CAROUSEL_AT, DROP_TOWER_AT, SWING_AT, TEACUPS_AT } from "./layout.ts";

const STEEL = new THREE.MeshStandardMaterial({
  color: "#2a1d3a",
  metalness: 0.6,
  roughness: 0.4,
});
const TAU = Math.PI * 2;

// Per-frame scratch, shared by the rides (they run one after another in
// useFrame), so the frame loop allocates nothing.
const scratch = {
  pose: newPose(),
  matrix: new THREE.Matrix4(),
  position: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  scale: new THREE.Vector3(1, 1, 1),
  axis: new THREE.Vector3(0, 1, 0),
};

/** Stripes for awnings and canopies: alternating colours around the canopy. */
export function useStripes(a: string, b: string) {
  return useMemo(
    () =>
      canvasTex(
        256,
        64,
        (ctx) => {
          for (let i = 0; i < 8; i++) {
            ctx.fillStyle = i % 2 ? a : b;
            ctx.fillRect(i * 32, 0, 32, 64);
          }
        },
        [4, 1],
      ),
    [a, b],
  );
}

const [HX, HY, HZ] = FERRIS.hub;
const FERRIS_LEGS: readonly Segment[] = [
  { from: [HX - 2.4, 0, HZ], to: [HX, HY, HZ], radius: 0.12 },
  { from: [HX + 2.4, 0, HZ], to: [HX, HY, HZ], radius: 0.12 },
  { from: [HX - 2.4, 0, HZ], to: [HX - 0.9, 0, HZ], radius: 0.1 },
  { from: [HX + 2.4, 0, HZ], to: [HX + 0.9, 0, HZ], radius: 0.1 },
];
// Six diameters of the wheel, in the rim's own frame so they turn with it.
const FERRIS_SPOKES: readonly Segment[] = Array.from(
  { length: 6 },
  (_, k): Segment => {
    const a = (k * Math.PI) / 6;
    const r = FERRIS.radius;
    return {
      from: [-Math.cos(a) * r, -Math.sin(a) * r, 0],
      to: [Math.cos(a) * r, Math.sin(a) * r, 0],
      radius: 0.03,
    };
  },
);
const GONDOLAS = 12;
const GONDOLA_COLORS = ["#ff2f9a", "#3fe0d0", "#ffb02e"];

/** A ferris wheel that always turns. Gondolas stay upright on the rim. */
export function FerrisWheel() {
  const calm = useReducedMotion();
  const rim = useRef<THREE.Group>(null);
  const cabins = useRef<THREE.InstancedMesh>(null);
  const rods = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = cabins.current;
    if (!m) return;
    for (let k = 0; k < GONDOLAS; k++) {
      m.setColorAt(k, new THREE.Color(GONDOLA_COLORS[k % 3]));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    // one turn every 36 s; calm mode turns at a third of that speed
    const turn = (clock.elapsedTime / 36) * (calm ? 0.35 : 1);
    if (rim.current) rim.current.rotation.z = turn * TAU;
    const { pose, matrix } = scratch;
    for (let k = 0; k < GONDOLAS; k++) {
      ferrisPose(FERRIS, k / GONDOLAS + turn, pose);
      matrix.makeTranslation(pose.x, pose.y, pose.z);
      cabins.current?.setMatrixAt(k, matrix);
      // the hanger rod runs from the rim down to the cabin roof
      matrix.makeTranslation(pose.x, pose.y - 0.25, pose.z);
      rods.current?.setMatrixAt(k, matrix);
    }
    if (cabins.current) cabins.current.instanceMatrix.needsUpdate = true;
    if (rods.current) rods.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <Segments items={FERRIS_LEGS} />
      <mesh position={[HX, HY, HZ]} rotation-x={Math.PI / 2} material={LACQUER}>
        <cylinderGeometry args={[0.5, 0.5, 0.7, 12]} />
      </mesh>
      <group ref={rim} position={[HX, HY, HZ]}>
        <mesh>
          <torusGeometry args={[FERRIS.radius, 0.07, 6, 64]} />
          <meshBasicMaterial color={hdr("#ff6ac8", 2.2)} toneMapped={false} />
        </mesh>
        <Segments items={FERRIS_SPOKES} />
      </group>
      <instancedMesh
        ref={rods}
        args={[undefined, undefined, GONDOLAS]}
        material={STEEL}
      >
        <cylinderGeometry args={[0.025, 0.025, 0.5, 4]} />
      </instancedMesh>
      <instancedMesh ref={cabins} args={[undefined, undefined, GONDOLAS]}>
        <boxGeometry args={[0.9, 0.7, 0.8]} />
        <meshStandardMaterial
          emissive="#ffffff"
          emissiveIntensity={0.2}
          roughness={0.5}
        />
      </instancedMesh>
    </group>
  );
}

const CAROUSEL_HORSES = 8;
const CANOPY_BULBS: [number, number, number][] = Array.from(
  { length: 24 },
  (_, i) => {
    const a = (i / 24) * TAU;
    return [Math.cos(a) * 3.5, 3.5, Math.sin(a) * 3.5];
  },
);

// Each horse is a pole, a body and a head, placed on a ring around the carousel's centre.
const HORSE_POLES: readonly Segment[] = Array.from(
  { length: CAROUSEL_HORSES },
  (_, k): Segment => {
    const a = (k / CAROUSEL_HORSES) * TAU;
    const x = Math.cos(a) * 2.6;
    const z = Math.sin(a) * 2.6;
    return { from: [x, 0, z], to: [x, 2, z], radius: 0.05 };
  },
);
const HORSE_BOXES: readonly Box[] = Array.from(
  { length: CAROUSEL_HORSES },
  (_, k): Box[] => {
    const a = (k / CAROUSEL_HORSES) * TAU;
    const x = Math.cos(a) * 2.6;
    const z = Math.sin(a) * 2.6;
    const color = k % 2 ? "#3fe0d0" : "#ffb02e";
    // the body and head sit along the horse's own forward axis, -a in yaw
    return [
      {
        position: [x - Math.sin(a) * 0.12, 0.95, z + Math.cos(a) * 0.12],
        size: [0.45, 0.42, 0.9],
        yaw: -a,
        color,
      },
      {
        position: [x - Math.sin(a) * 0.5, 1.35, z + Math.cos(a) * 0.5],
        size: [0.22, 0.46, 0.3],
        yaw: -a,
        color,
      },
    ];
  },
).flat();

/** The carousel: a striped canopy over a ring of painted horses that turns. */
export function Carousel() {
  const calm = useReducedMotion();
  const ring = useRef<THREE.Group>(null);
  const stripes = useStripes("#ff2f9a", "#fff1c8");
  useFrame(({ clock }) => {
    if (ring.current)
      ring.current.rotation.y = clock.elapsedTime * (calm ? 0.2 : 0.55);
  });
  return (
    <group position={[CAROUSEL_AT[0], 0, CAROUSEL_AT[1]]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[3.9, 3.9, 0.24, 24]} />
        <meshStandardMaterial color="#3a1450" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.7, 0]} material={LACQUER}>
        <cylinderGeometry args={[0.18, 0.18, 1.4, 8]} />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <coneGeometry args={[4, 1.4, 24, 1, true]} />
        <meshStandardMaterial map={stripes} side={THREE.DoubleSide} />
      </mesh>
      <Bulbs points={CANOPY_BULBS} radius={0.09} />
      <group ref={ring}>
        <Segments items={HORSE_POLES} />
        <Boxes items={HORSE_BOXES} />
      </group>
    </group>
  );
}

const TRACK_CURVE = new THREE.CatmullRomCurve3(
  COASTER_CONTROLS.map((p) => new THREE.Vector3(...p)),
  true,
  "catmullrom",
  0.5,
);
const COASTER_PILLARS: readonly Segment[] = COASTER_CONTROLS.filter(
  ([, y]) => y > 2.5,
).map(([x, y, z]): Segment => ({
  from: [x, 0, z],
  to: [x, y, z],
  radius: 0.06,
}));
const CAR_COUNT = 3;
const CAR_SPACING = 2.4;
const CAR_COLORS = ["#ffb02e", "#ff2f9a", "#3dff9a"];

/** The coaster: a glowing loop of track with a decorative train always running it. */
export function Coaster() {
  const calm = useReducedMotion();
  const cars = useRef<THREE.InstancedMesh>(null);
  const track = useMemo(
    () => new THREE.TubeGeometry(TRACK_CURVE, 240, 0.07, 6, true),
    [],
  );
  useLayoutEffect(() => {
    const m = cars.current;
    if (!m) return;
    for (let k = 0; k < CAR_COUNT; k++) {
      m.setColorAt(k, new THREE.Color(CAR_COLORS[k]));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    // metres per second along the loop; calm mode runs a slow train
    const speed = calm ? 3 : 8;
    const m = cars.current;
    if (!m) return;
    const { pose, matrix, position, quaternion, scale, axis } = scratch;
    for (let k = 0; k < CAR_COUNT; k++) {
      trackPose(
        COASTER_TRACK,
        clock.elapsedTime * speed - k * CAR_SPACING,
        pose,
      );
      position.set(pose.x, pose.y + 0.2, pose.z);
      quaternion.setFromAxisAngle(axis, pose.yaw);
      matrix.compose(position, quaternion, scale);
      m.setMatrixAt(k, matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <mesh geometry={track}>
        <meshBasicMaterial color={hdr("#3fe0d0", 2)} toneMapped={false} />
      </mesh>
      <Segments items={COASTER_PILLARS} />
      <instancedMesh ref={cars} args={[undefined, undefined, CAR_COUNT]}>
        <boxGeometry args={[0.9, 0.42, 1.3]} />
        <meshStandardMaterial
          emissive="#ff2f9a"
          emissiveIntensity={0.35}
          roughness={0.4}
        />
      </instancedMesh>
    </group>
  );
}

const TOWER_TOP = 17;
const TOWER_BASE = 1.4;
const TOWER_LEGS: readonly Segment[] = [
  [-0.9, -0.9],
  [0.9, -0.9],
  [-0.9, 0.9],
  [0.9, 0.9],
].map(([lx, lz]): Segment => ({
  from: [lx, 0, lz],
  to: [lx * 0.6, TOWER_TOP, lz * 0.6],
  radius: 0.08,
}));
const TOWER_RING = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * TAU;
  return new THREE.Vector3(
    Math.cos(a) * 1.1,
    TOWER_TOP + 0.4,
    Math.sin(a) * 1.1,
  );
});

/** A drop tower: the car lifts, pauses, drops, and rests. */
export function DropTower() {
  const calm = useReducedMotion();
  const car = useRef<THREE.Mesh>(null);
  const [x, z] = DROP_TOWER_AT;
  useFrame(({ clock }) => {
    if (car.current) {
      car.current.position.y = dropTowerHeight(
        clock.elapsedTime * (calm ? 0.6 : 1),
        TOWER_BASE,
        TOWER_TOP,
      );
    }
  });
  return (
    <group position={[x, 0, z]}>
      <Segments items={TOWER_LEGS} />
      <Neon points={TOWER_RING} color="#ff6ac8" k={3.5} radius={0.04} closed />
      <mesh ref={car}>
        <boxGeometry args={[1.5, 0.5, 1.5]} />
        <meshStandardMaterial
          color="#3dff9a"
          emissive="#3dff9a"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

const SWING_ARMS = 8;
const SWING_RADIUS = 2.8;
const SWING_TOP = 6.4;

// Each arm is a spoke from the mast, a chain and a chair. Built once in the arm's frame.
const SWING_SEGMENTS: readonly Segment[] = Array.from(
  { length: SWING_ARMS },
  (_, k): Segment[] => {
    const a = (k / SWING_ARMS) * TAU;
    const ex = Math.cos(a) * SWING_RADIUS;
    const ez = Math.sin(a) * SWING_RADIUS;
    return [
      { from: [0, 0, 0], to: [ex, 0, ez], radius: 0.04 },
      { from: [ex, 0, ez], to: [ex, -1.7, ez], radius: 0.02 },
    ];
  },
).flat();
const SWING_CHAIRS: readonly Box[] = Array.from(
  { length: SWING_ARMS },
  (_, k): Box[] => {
    const a = (k / SWING_ARMS) * TAU;
    const cx = Math.cos(a) * SWING_RADIUS;
    const cz = Math.sin(a) * SWING_RADIUS;
    const color = k % 2 ? "#ff2f9a" : "#ffb02e";
    const back = k % 2 ? "#ffb02e" : "#ff2f9a";
    return [
      { position: [cx, -2, cz], size: [0.55, 0.12, 0.55], yaw: -a, color },
      {
        position: [cx + Math.sin(a) * 0.25, -1.65, cz - Math.cos(a) * 0.25],
        size: [0.55, 0.6, 0.1],
        yaw: -a,
        color: back,
      },
    ];
  },
).flat();

/** A swing ride: a turning crown of chairs on chains. */
export function SwingRide() {
  const calm = useReducedMotion();
  const arms = useRef<THREE.Group>(null);
  const [x, z] = SWING_AT;
  useFrame(({ clock }) => {
    if (arms.current)
      arms.current.rotation.y = clock.elapsedTime * (calm ? 0.25 : 0.9);
  });
  return (
    <group position={[x, 0, z]}>
      <Segments
        items={[{ from: [0, 0, 0], to: [0, SWING_TOP, 0], radius: 0.1 }]}
      />
      <mesh position={[0, SWING_TOP + 0.3, 0]} material={LACQUER}>
        <cylinderGeometry args={[0.5, 0.5, 0.6, 12]} />
      </mesh>
      <group ref={arms} position={[0, SWING_TOP, 0]}>
        <Segments items={SWING_SEGMENTS} />
        <Boxes items={SWING_CHAIRS} />
      </group>
    </group>
  );
}

const CUPS = 5;
const CUP_RADIUS = 1.7;
const CUP_COLORS = ["#ff6ac8", "#3fe0d0", "#ffb02e", "#3dff9a", "#9b5cff"];
const TEACUP_RIM: [number, number, number][] = Array.from(
  { length: 16 },
  (_, i) => {
    const a = (i / 16) * TAU;
    return [Math.cos(a) * 2.8, 2.9, Math.sin(a) * 2.8];
  },
);

/** Teacups: a platform of cups that spin on their own while the plate turns. */
export function Teacups() {
  const calm = useReducedMotion();
  const plate = useRef<THREE.Group>(null);
  const cups = useRef<(THREE.Group | null)[]>([]);
  const stripes = useStripes("#9b5cff", "#fff1c8");
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (calm ? 0.5 : 1);
    if (plate.current) plate.current.rotation.y = t * 0.35;
    cups.current.forEach((g) => {
      if (g) g.rotation.y = -t * 0.9;
    });
  });
  const [x, z] = TEACUPS_AT;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[2.9, 2.9, 0.24, 24]} />
        <meshStandardMaterial color="#2b1238" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.5, 0]} material={LACQUER}>
        <cylinderGeometry args={[0.16, 0.16, 2.8, 8]} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <coneGeometry args={[3.1, 1.2, 24, 1, true]} />
        <meshStandardMaterial map={stripes} side={THREE.DoubleSide} />
      </mesh>
      <Bulbs points={TEACUP_RIM} radius={0.08} />
      <group ref={plate}>
        {CUP_COLORS.map((color, k) => {
          const a = (k / CUPS) * TAU;
          return (
            <group
              key={k}
              position={[
                Math.cos(a) * CUP_RADIUS,
                0.3,
                Math.sin(a) * CUP_RADIUS,
              ]}
            >
              <group
                ref={(g) => {
                  cups.current[k] = g;
                }}
              >
                <mesh>
                  <cylinderGeometry args={[0.42, 0.3, 0.45, 12, 1, true]} />
                  <meshStandardMaterial
                    color={color}
                    side={THREE.DoubleSide}
                    roughness={0.4}
                  />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}
