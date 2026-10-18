import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { ROOMS } from "../../game/rooms.ts";
import {
  BAR,
  BENCH_X,
  BENCH_ZS,
  CONTAINER,
  DANCE,
  STOOL_X,
  STOOL_ZS,
} from "../../game/warehouse.ts";
import { drink } from "../effects/drunk.ts";
import { useReducedMotion } from "../motion.ts";
import { type Beam, Beams } from "./shared/Beams.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Prop } from "./shared/Prop.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { WarehouseNpcs } from "./warehouse/Npcs.tsx";
import { BarStools } from "./shared/BarStools.tsx";
import { Batch } from "./shared/batch.ts";
import { Bottles, type ShelfRow } from "./shared/Bottles.tsx";
import { poster, shelf, stringLights } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";

const WALL_X = 7.6;
const BACK_Z = -7.2;
const HEIGHT = 6;
const RED = "#ff2a3a";
const CYAN = "#4fe3ff";
const TRUSS_ZS = [-4.2, -1, 2.2, 5.2];
const TRUSS_Y = 5.2;

const BEAMS: readonly Beam[] = TRUSS_ZS.slice(0, 3).flatMap((z, i) => [
  {
    position: [-4.5, TRUSS_Y - 0.2, z],
    color: i === 1 ? "#ffffff" : RED,
    phase: i,
  },
  { position: [4.5, TRUSS_Y - 0.2, z], color: RED, phase: i + 2.5 },
]);

// old red brick, a rusty-red corrugated container, rough pallet wood
const BRICK = surface("brick_wall_02", { scale: 0.45, color: "#8a6a72" });
const CONTAINER_STEEL = surface("corrugated_iron", {
  scale: 0.8,
  color: "#c04a36",
  metalness: 0.5,
  roughness: 0.8,
});
const PALLET = surface("wood_plank_wall", {
  scale: 0.9,
  color: "#c8a080",
  roughness: 0.9,
});
const STEEL_TOP = surface("metal_plate", {
  scale: 1.5,
  color: "#9a9aa8",
  metalness: 0.8,
  roughness: 0.5,
});
const SPEAKER_CLOTH = surface("carpet", { scale: 3, color: "#3a3640" });
const FLIGHT_CASE = surface("rubber_tiles", { scale: 2, color: "#5a5a66" });
const SHELF_STEEL = new THREE.MeshStandardMaterial({
  color: "#5a5a64",
  metalness: 0.8,
  roughness: 0.4,
});
// the back bar on the west wall over the pallets, in the frame of
// <Bottles>: x runs along the wall (minus room z), z out from it
const ROWS: readonly ShelfRow[] = [
  { x0: -3.3, x1: 1.3, y: 1.095, z: 0.22, count: 16 },
  { x0: -3.1, x1: 1.1, y: 1.7, z: 0.16, count: 14 },
  { x0: -3.1, x1: 1.1, y: 2.25, z: 0.16, count: 14 },
];

/** Steel shelves, wheat-pasted flyers, flight cases, pallets and work
 * lamps on a cable. */
function buildDressing() {
  const b = new Batch();
  const cz = (BAR.z0 + BAR.z1) / 2;
  for (const y of [1.7, 2.25])
    shelf(
      b,
      { x: -WALL_X + 0.31, y, z: cz, ry: Math.PI / 2 },
      4.8,
      SHELF_STEEL,
      0.28,
    );
  // flyers pasted up in clusters, a little crooked
  const flyers: [number, number, number, number][] = [
    [6.2, 1.5, -6.9, 0],
    [6.85, 1.9, -6.9, 1],
    [5.6, 2.1, -6.9, 5],
    [-6.2, 1.6, -6.9, 2],
    [-5.5, 2.05, -6.9, 7],
  ];
  flyers.forEach(([x, y, z, d], i) =>
    poster(b, { x, y, z: z + 0.15, ry: i % 2 ? 0.04 : -0.03 }, d, 0.5, 0.7),
  );
  [-3.4, -2.6, 0.4, 1.2, 4.6, 5.4].forEach((z, i) =>
    poster(
      b,
      { x: WALL_X - 0.16, y: 1.7 + (i % 2) * 0.3, z, ry: -Math.PI / 2 },
      i + 3,
      0.5,
      0.7,
    ),
  );
  // flight cases stacked by the speakers, chrome corners on each
  const caseGeo = new THREE.BoxGeometry(1, 1, 1);
  for (const [x, y, z, w, h, d] of [
    [-5.9, 0.3, -6.2, 1, 0.6, 0.7],
    [-5.9, 0.85, -6.25, 0.8, 0.5, 0.6],
    [5.9, 0.35, -6.1, 1.1, 0.7, 0.7],
    [5.2, 0.25, -4.4, 0.7, 0.5, 0.5],
  ] as const) {
    b.add(caseGeo, FLIGHT_CASE, { position: [x, y, z], scale: [w, h, d] });
    for (const sx of [-1, 1])
      b.add(caseGeo, STEEL_TOP, {
        position: [x + (sx * w) / 2, y, z],
        scale: [0.03, h + 0.01, d + 0.01],
      });
  }
  // a stack of spare pallets in the front corner
  for (let i = 0; i < 6; i++)
    b.add(caseGeo, PALLET, {
      position: [6.6, 0.07 + i * 0.15, 5.6],
      rotation: [0, (i % 2) * 0.08, 0],
      scale: [1.2, 0.12, 1],
    });
  // work lamps on a cable along each truss
  for (const z of [-1, 5.2])
    stringLights(
      b,
      [-7.2, TRUSS_Y - 0.1, z],
      [7.2, TRUSS_Y - 0.1, z],
      9,
      "#ffb070",
      0.6,
    );
  return b.build();
}

const scratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(),
  c: new THREE.Color(),
};

type Piece = readonly [
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
];

/** Boxes of one material in one draw call: each piece is a center and size. */
function Boxes({
  pieces,
  children,
}: {
  pieces: readonly Piece[];
  children: ReactNode;
}) {
  return (
    <instancedMesh
      ref={(mesh) => {
        if (!mesh) return;
        const { m, q, p, s } = scratch;
        pieces.forEach(([x, y, z, w, h, d], i) =>
          mesh.setMatrixAt(
            i,
            m.compose(p.set(x, y, z), q.identity(), s.set(w, h, d)),
          ),
        );
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }}
      args={[undefined, undefined, pieces.length]}
    >
      <boxGeometry />
      {children}
    </instancedMesh>
  );
}

// steel: the trusses' chords and posts, and the speaker stacks' frames
const TRUSSES: Piece[] = TRUSS_ZS.flatMap((z) => [
  [0, TRUSS_Y, z, WALL_X * 2, 0.12, 0.12] as Piece,
  [0, TRUSS_Y + 0.6, z, WALL_X * 2, 0.12, 0.12] as Piece,
  ...[-6, -3, 0, 3, 6].map((x): Piece => [
    x,
    TRUSS_Y + 0.3,
    z,
    0.08,
    0.6,
    0.08,
  ]),
]);

function Shell() {
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <primitive object={dressing} />
      <group position={[-WALL_X + 0.15, 0, 0]} rotation-y={Math.PI / 2}>
        <Bottles rows={ROWS} seed={17} />
      </group>
      <mesh position={[0, HEIGHT / 2, BACK_Z]} material={BRICK}>
        <boxGeometry args={[WALL_X * 2, HEIGHT, 0.3]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * WALL_X, HEIGHT / 2, -0.25]}
          material={BRICK}
        >
          <boxGeometry args={[0.3, HEIGHT, 14]} />
        </mesh>
      ))}
      <Boxes pieces={TRUSSES}>
        <meshStandardMaterial color="#3a3a44" metalness={0.8} roughness={0.4} />
      </Boxes>
    </>
  );
}

/** The DJ's shipping container, open to the floor, outlined in red neon. */
function Container() {
  const w = CONTAINER.x1 - CONTAINER.x0;
  const d = CONTAINER.z1 - CONTAINER.z0;
  const h = CONTAINER.height;
  const cz = (CONTAINER.z0 + CONTAINER.z1) / 2;
  const steel = <primitive object={CONTAINER_STEEL} attach="material" />;
  return (
    <group position={[0, 0, cz]}>
      <mesh position={[0, h / 2, -d / 2]}>
        <boxGeometry args={[w, h, 0.08]} />
        {steel}
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * w) / 2, h / 2, 0]}>
          <boxGeometry args={[0.08, h, d]} />
          {steel}
        </mesh>
      ))}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[w + 0.08, 0.08, d]} />
        {steel}
      </mesh>
      {/* the neon round its open end */}
      {[
        [0, h - 0.04, d / 2, w, 0.04, 0.04],
        [-w / 2, h / 2, d / 2, 0.04, h, 0.04],
        [w / 2, h / 2, d / 2, 0.04, h, 0.04],
      ].map(([x, y, z, bw, bh, bd], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[bw, bh, bd]} />
          <meshBasicMaterial color={hdr(RED, 3)} toneMapped={false} />
        </mesh>
      ))}
      <Suspense fallback={null}>
        <Prop
          model="dj-booth"
          width={2.2}
          depth={0.9}
          height={1.1}
          position={[0, 0, 0.3]}
        />
      </Suspense>
    </group>
  );
}

/** Speaker stacks either side of the container. */
function Speakers() {
  const cones = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const x of [-4.4, 4.4])
      for (const y of [0.6, 1.5, 2.4]) out.push([x, y, -5.05]);
    return out;
  }, []);
  return (
    <>
      <Boxes
        pieces={[
          [-4.4, 1.5, -5.6, 1.3, 3, 1],
          [4.4, 1.5, -5.6, 1.3, 3, 1],
        ]}
      >
        <primitive object={SPEAKER_CLOTH} attach="material" />
      </Boxes>
      {cones.map((at, i) => (
        <mesh key={i} position={at}>
          <circleGeometry args={[0.36, 24]} />
          <meshStandardMaterial
            color="#2a2830"
            metalness={0.4}
            roughness={0.5}
          />
        </mesh>
      ))}
    </>
  );
}

const LED_BARS = 10;

/** Horizontal LED bars across the back wall, a wave of red and cyan
 * rolling up them in time. */
function LedBars() {
  const calm = useReducedMotion();
  const ref = useRef<THREE.InstancedMesh>(null);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = calm ? 0 : clock.elapsedTime;
    const { c } = scratch;
    for (let i = 0; i < LED_BARS; i++) {
      const wave = 0.5 + 0.5 * Math.sin(t * 2.2 - i * 0.6);
      c.set(i % 2 ? CYAN : RED).multiplyScalar(0.4 + wave * 2.6);
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={(mesh) => {
        ref.current = mesh;
        if (!mesh) return;
        const { m, q, p, s, c } = scratch;
        for (let i = 0; i < LED_BARS; i++) {
          mesh.setMatrixAt(
            i,
            m.compose(
              p.set(0, 2.85 + i * 0.16, BACK_Z + 0.17),
              q.identity(),
              s.set(10, 0.06, 0.04),
            ),
          );
          mesh.setColorAt(i, c.set(RED));
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }}
      args={[undefined, undefined, LED_BARS]}
    >
      <boxGeometry />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Bar() {
  const length = BAR.z1 - BAR.z0;
  const cz = (BAR.z0 + BAR.z1) / 2;
  const cx = (BAR.front + BAR.back) / 2;
  const stools = useMemo(
    () => STOOL_ZS.map((z) => [STOOL_X, 0, z, -Math.PI / 2] as const),
    [],
  );
  return (
    <>
      <mesh position={[cx, 0.52, cz]} material={PALLET}>
        <boxGeometry args={[BAR.front - BAR.back, 1.04, length]} />
      </mesh>
      <mesh position={[cx + 0.05, 1.07, cz]} material={STEEL_TOP}>
        <boxGeometry args={[BAR.front - BAR.back + 0.1, 0.05, length + 0.1]} />
      </mesh>
      <NeonText
        text="BAR"
        color={RED}
        font={MARQUEE}
        width={1.8}
        k={3.4}
        position={[-WALL_X + 0.17, 3, cz]}
        rotation-y={Math.PI / 2}
      />
      <BarStools at={stools} color="#ff8a1f" />
    </>
  );
}

/** Crate benches along the east wall: two crates under each seat. */
function Benches() {
  const crates = useMemo(
    () => BENCH_ZS.map((z): Piece => [BENCH_X + 0.15, 0.22, z, 0.6, 0.44, 0.9]),
    [],
  );
  return (
    <Boxes pieces={crates}>
      <primitive object={PALLET} attach="material" />
    </Boxes>
  );
}

function Lights() {
  const calm = useReducedMotion();
  const red = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (red.current)
      red.current.intensity =
        5 + (calm ? 0 : Math.sin(clock.elapsedTime * 4.4) * 1.5);
  });
  return (
    <>
      <hemisphereLight args={["#6a7a9a", "#2a0a10", 0.6]} />
      {/* inside the container, on the DJ */}
      <pointLight
        position={[0, 2.2, (CONTAINER.z0 + CONTAINER.z1) / 2]}
        color="#ff6a5a"
        intensity={3}
        distance={4.5}
      />
      <pointLight
        ref={red}
        position={[DANCE[0], 3.6, DANCE[1]]}
        color={RED}
        intensity={5}
        distance={10}
      />
      <pointLight
        position={[-5.2, 2.6, 1]}
        color="#ffd2a0"
        intensity={2.5}
        distance={6}
      />
    </>
  );
}

/**
 * Bassline, the techno warehouse down the alley behind Sugar Rush: bare
 * brick and concrete under steel trusses, red beams cutting through the
 * haze, the DJ in an open shipping container between speaker stacks, LED
 * bars rolling up the back wall, a bar knocked together from pallets and
 * crate benches. Bassline is played on the decks.
 */
export function Warehouse({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#060408"]} />
      <fog attach="fog" args={["#1a0608", 9, 34]} />
      <Lights />
      <Beams beams={BEAMS} aim={DANCE} />
      <Floor
        width={WALL_X * 2}
        depth={14}
        center={[0, -0.25]}
        color="#5a5458"
        texture={{ id: "brushed_concrete", scale: 0.5 }}
        mirror={0.1}
        low={{ metalness: 0, roughness: 0.85 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.warehouse} color={RED} />
      <Shell />
      <Container />
      <Speakers />
      <LedBars />
      <NeonText
        text="BASSLINE"
        color={CYAN}
        font={MARQUEE}
        width={5}
        k={3.6}
        position={[0, 4.75, BACK_Z + 0.17]}
      />
      <Bar />
      <Benches />
      {/* haze: dust hanging in the beams */}
      <Sparkles
        count={calm ? 0 : 60}
        scale={[14, 5, 12]}
        position={[0, 2.6, -0.5]}
        size={1.6}
        speed={calm ? 0 : 0.15}
        color="#ffd2d2"
        opacity={0.35}
      />
      <WarehouseNpcs onDrink={orderCocktail} />
    </>
  );
}

const orderCocktail = () => drink("cocktail");
