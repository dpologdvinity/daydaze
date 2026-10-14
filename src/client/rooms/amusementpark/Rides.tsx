import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  dropTowerHeight,
  ferrisSeat,
  trackPose,
} from "../../../game/amusementPark.ts";
import { useReducedMotion } from "../../motion.ts";
import { canvasTex, hdr, LACQUER } from "../shared/materials.ts";
import { Neon } from "../shared/Neon.tsx";
import { Bulbs } from "./Bulbs.tsx";
import {
  CAROUSEL_AT,
  COASTER_CONTROLS,
  COASTER_TRACK,
  DROP_TOWER_AT,
  FERRIS,
  SWING_AT,
  TEACUPS_AT,
} from "./layout.ts";

const STEEL = new THREE.MeshStandardMaterial({
  color: "#2a1d3a",
  metalness: 0.6,
  roughness: 0.4,
});
const UP = new THREE.Vector3(0, 1, 0);
const TAU = Math.PI * 2;

/** A straight steel strut between two points, oriented to fit. */
function Strut({
  from,
  to,
  radius = 0.05,
}: {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  radius?: number;
}) {
  const { mid, length, quat } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    return {
      mid: a.clone().add(b).multiplyScalar(0.5),
      length: dir.length(),
      quat: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
    };
  }, [from, to]);
  return (
    <mesh position={mid} quaternion={quat} material={STEEL}>
      <cylinderGeometry args={[radius, radius, length, 6]} />
    </mesh>
  );
}

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

/** A ferris wheel that always turns. Gondolas stay upright on the rim. */
export function FerrisWheel() {
  const calm = useReducedMotion();
  const rim = useRef<THREE.Group>(null);
  const gondolas = useRef<(THREE.Group | null)[]>([]);
  const [hx, hy, hz] = FERRIS.hub;
  useFrame(({ clock }) => {
    // one turn every 36 s; calm mode turns at a third of that speed
    const turn = (clock.elapsedTime / 36) * (calm ? 0.35 : 1);
    if (rim.current) rim.current.rotation.z = turn * TAU;
    gondolas.current.forEach((g, k) => {
      if (!g) return;
      g.position.set(...ferrisSeat(FERRIS, k / 12 + turn).position);
    });
  });
  const spokes = useMemo(() => [0, 1, 2, 3, 4, 5], []);
  return (
    <group>
      <Strut from={[hx - 2.4, 0, hz]} to={[hx, hy, hz]} radius={0.12} />
      <Strut from={[hx + 2.4, 0, hz]} to={[hx, hy, hz]} radius={0.12} />
      <Strut from={[hx - 2.4, 0, hz]} to={[hx - 0.9, 0, hz]} radius={0.1} />
      <Strut from={[hx + 2.4, 0, hz]} to={[hx + 0.9, 0, hz]} radius={0.1} />
      <mesh position={[hx, hy, hz]} rotation-x={Math.PI / 2} material={LACQUER}>
        <cylinderGeometry args={[0.5, 0.5, 0.7, 16]} />
      </mesh>
      <group ref={rim} position={[hx, hy, hz]}>
        <mesh>
          <torusGeometry args={[FERRIS.radius, 0.07, 8, 96]} />
          <meshBasicMaterial color={hdr("#ff6ac8", 2.2)} toneMapped={false} />
        </mesh>
        {spokes.map((k) => (
          <mesh key={k} rotation-z={(k * Math.PI) / 6} material={STEEL}>
            <boxGeometry args={[0.06, FERRIS.radius * 2, 0.06]} />
          </mesh>
        ))}
      </group>
      {Array.from({ length: 12 }, (_, k) => (
        <group
          key={k}
          ref={(g) => {
            gondolas.current[k] = g;
          }}
        >
          <mesh position={[0, -0.25, 0]} material={STEEL}>
            <boxGeometry args={[0.05, 0.5, 0.05]} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.9, 0.7, 0.8]} />
            <meshStandardMaterial
              color={
                k % 3 === 0 ? "#ff2f9a" : k % 3 === 1 ? "#3fe0d0" : "#ffb02e"
              }
              emissive={
                k % 3 === 0 ? "#ff2f9a" : k % 3 === 1 ? "#3fe0d0" : "#ffb02e"
              }
              emissiveIntensity={0.25}
              roughness={0.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const HORSES = 8;
const CANOPY_RIM: readonly [number, number, number][] = Array.from(
  { length: 24 },
  (_, i) => {
    const a = (i / 24) * TAU;
    return [Math.cos(a) * 3.5, 3.5, Math.sin(a) * 3.5];
  },
);

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
        <cylinderGeometry args={[3.9, 3.9, 0.24, 32]} />
        <meshStandardMaterial color="#3a1450" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.7, 0]} material={LACQUER}>
        <cylinderGeometry args={[0.18, 0.18, 1.4, 12]} />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <coneGeometry args={[4, 1.4, 32, 1, true]} />
        <meshStandardMaterial map={stripes} side={THREE.DoubleSide} />
      </mesh>
      <Bulbs points={CANOPY_RIM} radius={0.09} />
      <group ref={ring}>
        {Array.from({ length: HORSES }, (_, k) => {
          const a = (k / HORSES) * TAU;
          const x = Math.cos(a) * 2.6;
          const z = Math.sin(a) * 2.6;
          const color = k % 2 ? "#3fe0d0" : "#ffb02e";
          return (
            <group key={k} position={[x, 0, z]} rotation-y={-a}>
              <mesh position={[0, 1.0, 0]} material={STEEL}>
                <cylinderGeometry args={[0.05, 0.05, 2, 6]} />
              </mesh>
              <mesh position={[0, 0.95, 0.12]}>
                <boxGeometry args={[0.45, 0.42, 0.9]} />
                <meshStandardMaterial color={color} roughness={0.35} />
              </mesh>
              <mesh position={[0, 1.35, 0.5]}>
                <boxGeometry args={[0.22, 0.46, 0.3]} />
                <meshStandardMaterial color={color} roughness={0.35} />
              </mesh>
            </group>
          );
        })}
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
const CAR_COUNT = 3;
const CAR_SPACING = 2.4;

/** The coaster: a glowing loop of track with a decorative train always running it. */
export function Coaster() {
  const calm = useReducedMotion();
  const cars = useRef<(THREE.Group | null)[]>([]);
  const track = useMemo(
    () => new THREE.TubeGeometry(TRACK_CURVE, 360, 0.07, 6, true),
    [],
  );
  const pillars = useMemo(
    () => COASTER_CONTROLS.filter(([, y]) => y > 2.5),
    [],
  );
  useFrame(({ clock }) => {
    // metres per second along the loop; calm mode runs a slow train
    const speed = calm ? 3 : 8;
    cars.current.forEach((g, k) => {
      if (!g) return;
      const pose = trackPose(
        COASTER_TRACK,
        clock.elapsedTime * speed - k * CAR_SPACING,
      );
      g.position.set(
        pose.position[0],
        pose.position[1] + 0.2,
        pose.position[2],
      );
      g.rotation.y = pose.yaw;
    });
  });
  return (
    <group>
      <mesh geometry={track}>
        <meshBasicMaterial color={hdr("#3fe0d0", 2)} toneMapped={false} />
      </mesh>
      {pillars.map(([x, y, z], i) => (
        <Strut key={i} from={[x, 0, z]} to={[x, y, z]} radius={0.06} />
      ))}
      {Array.from({ length: CAR_COUNT }, (_, k) => (
        <group
          key={k}
          ref={(g) => {
            cars.current[k] = g;
          }}
        >
          <mesh>
            <boxGeometry args={[0.9, 0.42, 1.3]} />
            <meshStandardMaterial
              color="#ffb02e"
              emissive="#ff2f9a"
              emissiveIntensity={0.35}
              roughness={0.4}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const TOWER_TOP = 17;
const TOWER_BASE = 1.4;

/** A drop tower: the car lifts, pauses, drops, and rests. */
export function DropTower() {
  const calm = useReducedMotion();
  const car = useRef<THREE.Group>(null);
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
  const legs: readonly [number, number][] = [
    [-0.9, -0.9],
    [0.9, -0.9],
    [-0.9, 0.9],
    [0.9, 0.9],
  ];
  return (
    <group position={[x, 0, z]}>
      {legs.map(([lx, lz], i) => (
        <Strut
          key={i}
          from={[lx, 0, lz]}
          to={[lx * 0.6, TOWER_TOP, lz * 0.6]}
          radius={0.08}
        />
      ))}
      <Neon
        points={Array.from({ length: 24 }, (_, i) => {
          const a = (i / 24) * TAU;
          return new THREE.Vector3(
            Math.cos(a) * 1.1,
            TOWER_TOP + 0.4,
            Math.sin(a) * 1.1,
          );
        })}
        color="#ff6ac8"
        k={3.5}
        radius={0.04}
        closed
      />
      <group ref={car}>
        <mesh>
          <boxGeometry args={[1.5, 0.5, 1.5]} />
          <meshStandardMaterial
            color="#3dff9a"
            emissive="#3dff9a"
            emissiveIntensity={0.3}
          />
        </mesh>
      </group>
    </group>
  );
}

const SWING_ARMS = 8;
const SWING_RADIUS = 2.8;
const SWING_TOP = 6.4;

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
      <Strut from={[0, 0, 0]} to={[0, SWING_TOP, 0]} radius={0.1} />
      <mesh position={[0, SWING_TOP + 0.3, 0]} material={LACQUER}>
        <cylinderGeometry args={[0.5, 0.5, 0.6, 16]} />
      </mesh>
      <group ref={arms} position={[0, SWING_TOP, 0]}>
        {Array.from({ length: SWING_ARMS }, (_, k) => {
          const a = (k / SWING_ARMS) * TAU;
          return (
            <group key={k} rotation-y={-a}>
              <Strut from={[0, 0, 0]} to={[SWING_RADIUS, 0, 0]} radius={0.04} />
              <Strut
                from={[SWING_RADIUS, 0, 0]}
                to={[SWING_RADIUS, -1.7, 0]}
                radius={0.02}
              />
              <group position={[SWING_RADIUS, -2, 0]}>
                <mesh>
                  <boxGeometry args={[0.55, 0.12, 0.55]} />
                  <meshStandardMaterial color={k % 2 ? "#ff2f9a" : "#ffb02e"} />
                </mesh>
                <mesh position={[0, 0.35, -0.25]}>
                  <boxGeometry args={[0.55, 0.6, 0.1]} />
                  <meshStandardMaterial color={k % 2 ? "#ffb02e" : "#ff2f9a"} />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}

const CUPS = 5;
const CUP_RADIUS = 1.7;

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
  const rim = useMemo<[number, number, number][]>(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * TAU;
        return [Math.cos(a) * 2.8, 2.9, Math.sin(a) * 2.8];
      }),
    [],
  );
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[2.9, 2.9, 0.24, 32]} />
        <meshStandardMaterial color="#2b1238" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.5, 0]} material={LACQUER}>
        <cylinderGeometry args={[0.16, 0.16, 2.8, 10]} />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <coneGeometry args={[3.1, 1.2, 32, 1, true]} />
        <meshStandardMaterial map={stripes} side={THREE.DoubleSide} />
      </mesh>
      <Bulbs points={rim} radius={0.08} />
      <group ref={plate}>
        {Array.from({ length: CUPS }, (_, k) => {
          const a = (k / CUPS) * TAU;
          const color = ["#ff6ac8", "#3fe0d0", "#ffb02e", "#3dff9a", "#9b5cff"][
            k
          ];
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
                  <cylinderGeometry args={[0.42, 0.3, 0.45, 16, 1, true]} />
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
