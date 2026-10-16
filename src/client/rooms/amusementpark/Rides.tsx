import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  CAROUSEL_RADIUS,
  COASTER_TRACK,
  CUP_RADIUS,
  FERRIS,
  FLUME_TRACK,
  SPLASH_POOL,
  type TrackRide,
  PIRATE_ARM,
  PIRATE_AT,
  PIRATE_PIVOT,
  STARLIGHT_TRACK,
  SWING_RADIUS,
  SWING_TOP,
  TOWER_BASE,
  TOWER_TOP,
  carouselTurn,
  dropClock,
  dropTowerHeight,
  ferrisPose,
  newPose,
  shipSwing,
  swingTurn,
  teacupTurns,
  trackPose,
  type Track,
} from "../../../game/amusementPark.ts";
import { useReducedMotion } from "../../motion.ts";
import { canvasTex, GOLD, hdr, LACQUER } from "../shared/materials.ts";
import { Neon } from "../shared/Neon.tsx";
import { Bulbs } from "./Bulbs.tsx";
import {
  Boxes,
  Copies,
  Segments,
  type Box,
  type Copy,
  type Segment,
} from "./Instanced.tsx";
import {
  CAROUSEL_POLE,
  COASTER_CAR,
  COMET,
  FERRIS_FRAME,
  FLUME,
  LOG_BOAT,
  GONDOLA,
  HORSE,
  STARLIGHT,
  type CoasterParts,
  rimBulbs,
  rimLattice,
} from "./models.ts";
import { CAROUSEL_AT, DROP_TOWER_AT, SWING_AT, TEACUPS_AT } from "./layout.ts";

const STEEL = new THREE.MeshStandardMaterial({
  color: "#2a1d3a",
  metalness: 0.6,
  roughness: 0.4,
});
const TAU = Math.PI * 2;

// Shared materials for the detailed ride parts. Colours come per instance, so
// the materials stay white.
const PAINT = new THREE.MeshStandardMaterial({
  roughness: 0.45,
  metalness: 0.1,
});
const TRIM = new THREE.MeshStandardMaterial({
  color: "#2b1238",
  roughness: 0.6,
});
const GLASS = new THREE.MeshStandardMaterial({
  color: "#bff6ff",
  emissive: "#ffb02e",
  emissiveIntensity: 0.6,
  transparent: true,
  opacity: 0.55,
  roughness: 0.1,
  depthWrite: false,
});
const GLOW = new THREE.MeshBasicMaterial({
  color: "#ffffff",
  toneMapped: false,
});
const MIRROR = new THREE.MeshStandardMaterial({
  color: "#e8f6ff",
  metalness: 1,
  roughness: 0.05,
  envMapIntensity: 1.4,
});
const SCALLOP = new THREE.MeshStandardMaterial({ roughness: 0.5 });

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

const GONDOLAS = 12;
const GONDOLA_COLORS = ["#ff2f9a", "#3fe0d0", "#ffb02e"];
const RIM_RADIUS = FERRIS.radius;
const RIM_LATTICE = rimLattice(RIM_RADIUS);
const RIM_BULBS = rimBulbs(RIM_RADIUS);
const [HX, HY, HZ] = FERRIS.hub;

/** A ferris wheel that always turns. Gondolas stay upright on the rim. */
export function FerrisWheel() {
  const calm = useReducedMotion();
  const rim = useRef<THREE.Group>(null);
  const paint = useRef<THREE.InstancedMesh>(null);
  const glass = useRef<THREE.InstancedMesh>(null);
  const trim = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = paint.current;
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
      paint.current?.setMatrixAt(k, matrix);
      glass.current?.setMatrixAt(k, matrix);
      trim.current?.setMatrixAt(k, matrix);
    }
    if (paint.current) paint.current.instanceMatrix.needsUpdate = true;
    if (glass.current) glass.current.instanceMatrix.needsUpdate = true;
    if (trim.current) trim.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <Segments items={FERRIS_FRAME} />
      <mesh position={[HX, HY, HZ]} rotation-x={Math.PI / 2} material={LACQUER}>
        <cylinderGeometry args={[0.5, 0.5, 0.7, 12]} />
      </mesh>
      <mesh
        position={[HX, HY, HZ + 0.36]}
        rotation-x={Math.PI / 2}
        material={GOLD}
      >
        <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
      </mesh>
      <group ref={rim} position={[HX, HY, HZ]}>
        <mesh>
          <torusGeometry args={[RIM_RADIUS, 0.07, 6, 64]} />
          <meshBasicMaterial color={hdr("#ff6ac8", 2.2)} toneMapped={false} />
        </mesh>
        <Segments items={RIM_LATTICE} />
        <Bulbs points={RIM_BULBS} radius={0.08} detail={[6, 4]} />
      </group>
      <instancedMesh ref={paint} args={[GONDOLA.paint, PAINT, GONDOLAS]} />
      <instancedMesh ref={glass} args={[GONDOLA.glass, GLASS, GONDOLAS]} />
      <instancedMesh ref={trim} args={[GONDOLA.trim, TRIM, GONDOLAS]} />
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

// Each horse stands on a ring around the carousel's centre, facing along the tangent.
const HORSE_ITEMS: readonly Copy[] = Array.from(
  { length: CAROUSEL_HORSES },
  (_, k): Copy => {
    const a = (k / CAROUSEL_HORSES) * TAU;
    return {
      position: [
        Math.cos(a) * CAROUSEL_RADIUS,
        0,
        Math.sin(a) * CAROUSEL_RADIUS,
      ],
      yaw: -a,
    };
  },
);
const HORSE_BODY = HORSE_ITEMS.map((h, k) => ({
  ...h,
  color: k % 2 ? "#3fe0d0" : "#ffb02e",
}));
const HORSE_TRIM = HORSE_ITEMS.map((h, k) => ({
  ...h,
  color: k % 2 ? "#ff2f9a" : "#fff1c8",
}));
const HORSE_POLES: readonly Copy[] = HORSE_ITEMS.map((h) => ({
  position: h.position,
}));
// Scallops hang from the canopy's lower edge, alternating two stripe colours.
const SCALLOP_GEOMETRY = new THREE.SphereGeometry(
  0.3,
  10,
  5,
  0,
  TAU,
  0,
  Math.PI / 2,
).rotateX(Math.PI);
const SCALLOPS: readonly Copy[] = Array.from({ length: 24 }, (_, i): Copy => {
  const a = (i / 24) * TAU;
  return {
    position: [Math.cos(a) * 3.95, 3.4, Math.sin(a) * 3.95],
    color: i % 2 ? "#fff1c8" : "#ff2f9a",
  };
});

/** The carousel: a striped canopy over a ring of painted horses that turns. */
export function Carousel() {
  const calm = useReducedMotion();
  const ring = useRef<THREE.Group>(null);
  const stripes = useStripes("#ff2f9a", "#fff1c8");
  useFrame(({ clock }) => {
    if (ring.current)
      ring.current.rotation.y = carouselTurn(clock.elapsedTime, calm);
  });
  return (
    <group position={[CAROUSEL_AT[0], 0, CAROUSEL_AT[1]]}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[3.9, 3.9, 0.24, 24]} />
        <meshStandardMaterial color="#3a1450" roughness={0.5} />
      </mesh>
      {/* a mirrored drum at the centre and a mirrored skirt round the platform */}
      <mesh position={[0, 0.9, 0]} material={MIRROR}>
        <cylinderGeometry args={[1.1, 1.1, 1.8, 16, 1, true]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={MIRROR}>
        <cylinderGeometry args={[3.85, 3.85, 0.5, 24, 1, true]} />
      </mesh>
      <mesh position={[0, 0.7, 0]} material={LACQUER}>
        <cylinderGeometry args={[0.18, 0.18, 1.4, 8]} />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <coneGeometry args={[4, 1.4, 24, 1, true]} />
        <meshStandardMaterial map={stripes} side={THREE.DoubleSide} />
      </mesh>
      <Copies geometry={SCALLOP_GEOMETRY} material={SCALLOP} items={SCALLOPS} />
      <mesh position={[0, 4.9, 0]} material={GOLD}>
        <sphereGeometry args={[0.2, 12, 8]} />
      </mesh>
      <Bulbs points={CANOPY_BULBS} radius={0.09} />
      <group ref={ring}>
        <Copies geometry={CAROUSEL_POLE} material={GOLD} items={HORSE_POLES} />
        <Copies geometry={HORSE.paint} material={PAINT} items={HORSE_BODY} />
        <Copies geometry={HORSE.trim} material={TRIM} items={HORSE_TRIM} />
        <Copies geometry={HORSE.gilt} material={GOLD} items={HORSE_ITEMS} />
      </group>
    </group>
  );
}

const CAR_SPACING = 2.4;
const CAR_COLORS = ["#ffb02e", "#ff2f9a", "#3dff9a"];

/** Metres along each coaster's track of the player's car while she rides it;
 * the scene writes it every frame, the train follows it. */
export const coasterRiders: Partial<Record<TrackRide, number>> = {};
const tilt = new THREE.Euler(0, 0, 0, "YXZ");

/** A coaster: a glowing line of track with a train always running it; while
 * the player rides, its lead car carries her. */
function CoasterTrack({
  id,
  parts,
  track,
  neon,
  cars,
  speed,
  car = COASTER_CAR,
  railMaterial = STEEL,
  lift = 0.2,
  spacing = CAR_SPACING,
}: {
  id: TrackRide;
  parts: CoasterParts;
  /** The car or boat model; a coaster car by default. */
  car?: typeof COASTER_CAR;
  /** What the "rails" (a trough, for the flume) are made of. */
  railMaterial?: THREE.Material;
  /** Car above the track line. */
  lift?: number;
  /** Metres between cars along the track. */
  spacing?: number;
  track: Track;
  neon: string;
  cars: readonly string[];
  /** Metres per second along the loop, and in calm mode. */
  speed: { normal: number; calm: number };
}) {
  const calm = useReducedMotion();
  const paint = useRef<THREE.InstancedMesh>(null);
  const trim = useRef<THREE.InstancedMesh>(null);
  const glow = useRef<THREE.InstancedMesh>(null);
  const line = useMemo(
    () => new THREE.TubeGeometry(parts.curve, 300, 0.07, 5, true),
    [parts],
  );
  useLayoutEffect(() => {
    const m = paint.current;
    if (!m) return;
    cars.forEach((c, k) => m.setColorAt(k, new THREE.Color(c)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [cars]);
  useFrame(({ clock }) => {
    const v = calm ? speed.calm : speed.normal;
    const lead = coasterRiders[id] ?? clock.elapsedTime * v;
    const { pose, matrix, position, quaternion, scale } = scratch;
    for (let k = 0; k < cars.length; k++) {
      trackPose(track, lead - k * spacing, pose);
      position.set(pose.x, pose.y + lift, pose.z);
      // nose along +z: yaw about y, then nose up or down with the track
      quaternion.setFromEuler(tilt.set(-pose.pitch, pose.yaw, 0));
      matrix.compose(position, quaternion, scale);
      paint.current?.setMatrixAt(k, matrix);
      trim.current?.setMatrixAt(k, matrix);
      glow.current?.setMatrixAt(k, matrix);
    }
    if (paint.current) paint.current.instanceMatrix.needsUpdate = true;
    if (trim.current) trim.current.instanceMatrix.needsUpdate = true;
    if (glow.current) glow.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <mesh geometry={line}>
        <meshBasicMaterial color={hdr(neon, 2)} toneMapped={false} />
      </mesh>
      <mesh geometry={parts.rails} material={railMaterial} />
      <Boxes items={parts.ties} />
      <Segments items={parts.supports} />
      <instancedMesh ref={paint} args={[car.paint, PAINT, cars.length]} />
      <instancedMesh ref={trim} args={[car.trim, TRIM, cars.length]} />
      <instancedMesh ref={glow} args={[car.glow, GLOW, cars.length]} />
    </group>
  );
}

/** The Comet: the midway's coaster loop behind the right-hand booths. */
export function Coaster() {
  return (
    <CoasterTrack
      id="coaster"
      parts={COMET}
      track={COASTER_TRACK}
      neon="#3fe0d0"
      cars={CAR_COLORS}
      speed={{ normal: 8, calm: 3 }}
    />
  );
}

/** The Starlight: the hyper coaster in the back lot, a five-car train. */
export function Starlight() {
  return (
    <CoasterTrack
      id="starlight"
      parts={STARLIGHT}
      track={STARLIGHT_TRACK}
      neon="#ff2f9a"
      cars={["#9b5cff", "#3fe0d0", "#ff2f9a", "#ffb02e", "#3dff9a"]}
      speed={{ normal: 13, calm: 4 }}
    />
  );
}

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
        dropClock(clock.elapsedTime, calm),
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
      arms.current.rotation.y = swingTurn(clock.elapsedTime, calm);
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
    const turn = teacupTurns(clock.elapsedTime, calm);
    if (plate.current) plate.current.rotation.y = turn.plate;
    cups.current.forEach((g) => {
      if (g) g.rotation.y = turn.cup;
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

// The pirate ship, in the swinging frame: the pivot at the origin, the boat's
// keel PIRATE_ARM below, its length along z.
const SHIP_BOXES: readonly Box[] = [
  // hull: a deep middle and raked bow and stern
  {
    position: [0, -PIRATE_ARM, 0],
    size: [2.2, 1.1, 5.2],
    yaw: 0,
    color: "#7a2f1f",
  },
  {
    position: [0, -PIRATE_ARM + 0.35, 3],
    size: [1.6, 1.2, 1.4],
    yaw: 0,
    color: "#7a2f1f",
  },
  {
    position: [0, -PIRATE_ARM + 0.35, -3],
    size: [1.6, 1.2, 1.4],
    yaw: 0,
    color: "#7a2f1f",
  },
  // gold rail and three benches
  {
    position: [0, -PIRATE_ARM + 0.6, 0],
    size: [2.3, 0.1, 5.3],
    yaw: 0,
    color: "#ffb02e",
  },
  ...[-1.6, 0, 1.6].map((z): Box => ({
    position: [0.4, -PIRATE_ARM + 0.4, z],
    size: [1.2, 0.12, 0.5],
    yaw: 0,
    color: "#3a1450",
  })),
  // the sail on its mast
  {
    position: [0, -PIRATE_ARM + 2.3, 0],
    size: [0.06, 1.8, 2.4],
    yaw: 0,
    color: "#fff1c8",
  },
];
const SHIP_ARMS: readonly Segment[] = [-1.2, 1.2].flatMap((x): Segment[] => [
  { from: [x, 0, 0], to: [x, -PIRATE_ARM + 0.5, 1.8], radius: 0.07 },
  { from: [x, 0, 0], to: [x, -PIRATE_ARM + 0.5, -1.8], radius: 0.07 },
]);
const SHIP_MAST: readonly Segment[] = [
  { from: [0, -PIRATE_ARM, 0], to: [0, -PIRATE_ARM + 3.4, 0], radius: 0.06 },
];
// the A-frame, in the ride's own frame (pivot at PIRATE_PIVOT)
const SHIP_FRAME: readonly Segment[] = [-1.6, 1.6]
  .flatMap((x): Segment[] => [
    { from: [x, 0, -2.8], to: [x, PIRATE_PIVOT, 0], radius: 0.12 },
    { from: [x, 0, 2.8], to: [x, PIRATE_PIVOT, 0], radius: 0.12 },
  ])
  .concat([
    { from: [-1.7, PIRATE_PIVOT, 0], to: [1.7, PIRATE_PIVOT, 0], radius: 0.1 },
  ]);

/** A pirate ship: a boat on two arms swinging like a pendulum. */
export function PirateShip() {
  const calm = useReducedMotion();
  const boat = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // positive swing carries the keel towards +z
    if (boat.current)
      boat.current.rotation.x = -shipSwing(clock.elapsedTime, calm);
  });
  return (
    <group position={[PIRATE_AT[0], 0, PIRATE_AT[1]]}>
      <Segments items={SHIP_FRAME} />
      <group ref={boat} position={[0, PIRATE_PIVOT, 0]}>
        <Segments items={SHIP_ARMS} color="#ffb02e" />
        <Segments items={SHIP_MAST} color="#3a1d12" />
        <Boxes items={SHIP_BOXES} />
      </group>
    </group>
  );
}

const TROUGH = new THREE.MeshStandardMaterial({
  color: "#6b3f2a",
  roughness: 0.8,
  side: THREE.DoubleSide,
});
const WATER = new THREE.MeshStandardMaterial({
  color: "#1fa6c9",
  emissive: "#0b5d7a",
  emissiveIntensity: 0.6,
  roughness: 0.15,
  metalness: 0.1,
});

/** The log flume: a wooden trough of glowing water on towers, logs floating
 * round, and the splash pool at the foot of the chute. */
export function LogFlume() {
  return (
    <group>
      <CoasterTrack
        id="log-flume"
        parts={FLUME}
        track={FLUME_TRACK}
        neon="#5fe3ff"
        cars={["#8a5a36", "#7a4a2a", "#94603a"]}
        speed={{ normal: 6, calm: 2.5 }}
        car={LOG_BOAT}
        railMaterial={TROUGH}
        lift={0.05}
        spacing={22}
      />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[SPLASH_POOL.at[0], 0.08, SPLASH_POOL.at[1]]}
        material={WATER}
      >
        <circleGeometry args={[SPLASH_POOL.radius, 32]} />
      </mesh>
    </group>
  );
}
