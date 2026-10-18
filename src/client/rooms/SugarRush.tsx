import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { ROOMS } from "../../game/rooms.ts";
import {
  BAR,
  CHAIR_X,
  CHAIR_ZS,
  DANCE,
  DJ,
  PODIUM_RADIUS,
  PODIUM_TOP,
  PODIUMS,
  STOOL_X,
  STOOL_ZS,
} from "../../game/sugarRush.ts";
import { drink } from "../effects/drunk.ts";
import { useReducedMotion } from "../motion.ts";
import { MirrorBall } from "./pulse/Decor.tsx";
import { type Beam, Beams } from "./shared/Beams.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { LedFloor } from "./shared/LedFloor.tsx";
import { canvasTex, gradientTex, hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Prop } from "./shared/Prop.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { SugarRushNpcs } from "./sugarrush/Npcs.tsx";
import { BarStools } from "./shared/BarStools.tsx";
import { Batch } from "./shared/batch.ts";
import { Bottles, type ShelfRow } from "./shared/Bottles.tsx";
import { poster, rug, shelf, stringLights } from "./shared/details.ts";
import { groundMaps, surface } from "../city/worldTexture.ts";

const WALL_X = 6;
const BACK_Z = -6;
const HEIGHT = 4.2;
const PINK = "#ff6ac8";
const BABY_BLUE = "#7fd8ff";

const BEAMS: readonly Beam[] = [
  { position: [-4, 3.9, -5.8], color: PINK, phase: 0 },
  { position: [4, 3.9, -5.8], color: BABY_BLUE, phase: 2 },
  { position: [-5.5, 3.6, 3], color: BABY_BLUE, phase: 1 },
  { position: [5.5, 3.6, 3], color: PINK, phase: 3 },
];

// bubblegum walls: pink at the floor through lilac to baby blue overhead
const WALL_TEX = gradientTex([
  [0, "#9ad8ff"],
  [0.5, "#c9a2ff"],
  [1, "#ff9ad8"],
]);

// glossy little tiles under the gradient, from a CC0 scan
const WALL_TILES = groundMaps("rounded_square_tiled_wall").normalMap;
WALL_TILES.repeat.set(10, 3.5);
const WALL_MAT = new THREE.MeshStandardMaterial({
  map: WALL_TEX,
  normalMap: WALL_TILES,
  roughness: 0.35,
});
const BAR_TOP = surface("marble_01", {
  scale: 0.8,
  color: "#fff4fb",
  roughness: 0.2,
});
const SHELF_GLASS = new THREE.MeshStandardMaterial({
  color: "#d8f4ff",
  metalness: 0.4,
  roughness: 0.05,
});
// the back bar high on the east wall, over the bartender's head, in the
// frame of <Bottles>: x runs along the wall (room z), z out from it
const SHELVES = [1.95, 2.5];
const ROWS: readonly ShelfRow[] = SHELVES.map((y) => ({
  x0: BAR.z0 + 0.1,
  x1: BAR.z1 - 0.1,
  y,
  z: 0.16,
  count: 14,
}));

/** Flyers, a fluffy rug under the chairs, bulbs and the back bar's shelves. */
function buildDressing() {
  const b = new Batch();
  for (const y of SHELVES)
    shelf(
      b,
      { x: WALL_X - 0.16, y, z: (BAR.z0 + BAR.z1) / 2, ry: -Math.PI / 2 },
      5,
      SHELF_GLASS,
      0.24,
    );
  // a wall of Y2K flyers over the blow-up chairs
  [
    [-2.6, 1.7, 6],
    [-1.6, 2.0, 7],
    [-0.6, 1.65, 4],
    [0.4, 1.95, 5],
    [1.4, 1.7, 0],
    [2.4, 2.0, 6],
  ].forEach(([z, y, d]) =>
    poster(b, { x: -WALL_X + 0.03, y, z, ry: Math.PI / 2 }, d, 0.55, 0.72),
  );
  rug(
    b,
    { x: CHAIR_X + 0.2, z: (CHAIR_ZS[0] + CHAIR_ZS[2]) / 2 },
    1.4,
    5.4,
    "#ffb8e8",
  );
  // pink and baby-blue bulbs criss-crossing over the dance floor
  stringLights(b, [-5.8, 4, -5.8], [5.8, 4, 5.8], 24, PINK, 0.5);
  stringLights(b, [5.8, 4, -5.8], [-5.8, 4, 5.8], 24, BABY_BLUE, 0.5);
  return b.build();
}

// a butterfly, wings open, for the swarm on the walls
const BUTTERFLY = canvasTex(128, 128, (ctx) => {
  ctx.translate(64, 64);
  for (const side of [-1, 1]) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(side * 26, -16, 26, 30, side * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(side * 20, 24, 18, 22, -side * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#3a2050";
  ctx.fillRect(-3, -34, 6, 70);
});

const BUTTERFLIES = 24;
const butterflyScratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(),
  e: new THREE.Euler(),
};

/** Where each butterfly rests: on the side and back walls, high up. */
const PERCHES: readonly { at: THREE.Vector3; yaw: number; color: string }[] =
  Array.from({ length: BUTTERFLIES }, (_, i) => {
    const n = Math.sin(i * 78.233) * 43758.5453;
    const r = n - Math.floor(n);
    const wall = i % 3;
    const along = -4.6 + ((i * 0.83) % 1) * 9.2;
    const y = 1.9 + r * 1.9;
    const color = [PINK, BABY_BLUE, "#c9a2ff", "#fff1fb"][i % 4];
    if (wall === 0)
      return { at: new THREE.Vector3(along, y, BACK_Z + 0.08), yaw: 0, color };
    const x = wall === 1 ? -WALL_X + 0.08 : WALL_X - 0.08;
    return {
      at: new THREE.Vector3(x, y, along * 0.9),
      yaw: wall === 1 ? Math.PI / 2 : -Math.PI / 2,
      color,
    };
  });

/** Butterflies on the walls, flexing their wings: one draw call. */
function Butterflies() {
  const calm = useReducedMotion();
  const ref = useRef<THREE.InstancedMesh>(null);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = calm ? 0 : clock.elapsedTime;
    const { m, q, p, s, e } = butterflyScratch;
    for (let i = 0; i < BUTTERFLIES; i++) {
      const perch = PERCHES[i];
      p.copy(perch.at);
      p.y += Math.sin(t * 0.8 + i) * 0.06;
      q.setFromEuler(e.set(0, perch.yaw, Math.sin(t * 0.5 + i * 2) * 0.3));
      // wings fold towards the body and open again
      s.set(0.35 + Math.abs(Math.sin(t * 3 + i * 1.7)) * 0.65, 1, 1);
      mesh.setMatrixAt(i, m.compose(p, q, s.multiplyScalar(0.32)));
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={(mesh) => {
        ref.current = mesh;
        if (!mesh) return;
        PERCHES.forEach((perch, i) =>
          mesh.setColorAt(i, hdr(perch.color, 1.3)),
        );
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      }}
      args={[undefined, undefined, BUTTERFLIES]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={BUTTERFLY}
        alphaTest={0.5}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

function Walls() {
  const dressing = useMemo(buildDressing, []);
  return (
    <>
      <primitive object={dressing} />
      <group position={[WALL_X, 0, 0]} rotation-y={-Math.PI / 2}>
        <Bottles rows={ROWS} seed={13} />
      </group>
      <mesh position={[0, HEIGHT / 2, BACK_Z]} material={WALL_MAT}>
        <planeGeometry args={[WALL_X * 2, HEIGHT]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * WALL_X, HEIGHT / 2, 0]}
            rotation-y={-side * (Math.PI / 2)}
            material={WALL_MAT}
          >
            <planeGeometry args={[12.4, HEIGHT]} />
          </mesh>
          {/* baby-blue neon running the length of each wall */}
          {[0.25, 3.3].map((y) => (
            <mesh key={y} position={[side * (WALL_X - 0.04), y, 0]}>
              <boxGeometry args={[0.03, 0.03, 12]} />
              <meshBasicMaterial color={hdr(BABY_BLUE, 3)} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      <NeonText
        text="Sugar Rush"
        color={PINK}
        font={SCRIPT}
        width={5.2}
        k={3.8}
        flicker
        position={[0, 3.25, BACK_Z + 0.06]}
      />
    </>
  );
}

/** Chrome podiums with a pink ring of light round each top. */
function Podiums() {
  return (
    <>
      {PODIUMS.map(([x, z]) => (
        <group key={x} position={[x, 0, z]}>
          <mesh position-y={PODIUM_TOP / 2}>
            <cylinderGeometry
              args={[PODIUM_RADIUS, PODIUM_RADIUS, PODIUM_TOP, 28]}
            />
            <meshStandardMaterial
              color="#e8e2ff"
              metalness={1}
              roughness={0.18}
            />
          </mesh>
          <mesh position-y={PODIUM_TOP} rotation-x={Math.PI / 2}>
            <torusGeometry args={[PODIUM_RADIUS, 0.025, 8, 40]} />
            <meshBasicMaterial color={hdr(PINK, 3)} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** The bar on the east wall: a glowing baby-blue acrylic front, a white top. */
function Bar() {
  const length = BAR.z1 - BAR.z0;
  const cz = (BAR.z0 + BAR.z1) / 2;
  const cx = (BAR.front + BAR.back) / 2;
  const stools = useMemo(
    () => STOOL_ZS.map((z) => [STOOL_X, 0, z, Math.PI / 2] as const),
    [],
  );
  return (
    <>
      <mesh position={[cx, 0.52, cz]}>
        <boxGeometry args={[BAR.back - BAR.front, 1.04, length]} />
        <meshStandardMaterial
          color={BABY_BLUE}
          emissive={BABY_BLUE}
          emissiveIntensity={0.5}
          transparent
          opacity={0.85}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[cx - 0.05, 1.07, cz]} material={BAR_TOP}>
        <boxGeometry args={[BAR.back - BAR.front + 0.1, 0.06, length + 0.1]} />
      </mesh>
      <BarStools at={stools} color="#ff5fb8" />
    </>
  );
}

/** Blow-up chairs in see-through pink vinyl: a seat ring and a back ring. */
function Chairs() {
  const vinyl = (
    <meshStandardMaterial
      color="#ff8ad8"
      transparent
      opacity={0.72}
      roughness={0.12}
      metalness={0.1}
    />
  );
  return (
    <>
      {CHAIR_ZS.map((z) => (
        <group
          key={z}
          position={[CHAIR_X - 0.05, 0, z]}
          rotation-y={Math.PI / 2}
        >
          <mesh position-y={0.3} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.32, 0.16, 12, 24]} />
            {vinyl}
          </mesh>
          <mesh position={[0, 0.66, -0.3]} rotation-x={-0.25}>
            <torusGeometry args={[0.3, 0.13, 12, 24]} />
            {vinyl}
          </mesh>
        </group>
      ))}
    </>
  );
}

/** The DJ booth on its riser at the back. */
function Booth() {
  return (
    <Suspense fallback={null}>
      <Prop
        model="dj-booth"
        width={DJ.x1 - DJ.x0}
        depth={DJ.z1 - DJ.z0}
        height={1.15}
        position={[(DJ.x0 + DJ.x1) / 2, 0, (DJ.z0 + DJ.z1) / 2]}
      />
    </Suspense>
  );
}

function ClubLights() {
  const calm = useReducedMotion();
  const pink = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (pink.current)
      pink.current.intensity =
        4 + (calm ? 0 : Math.sin(clock.elapsedTime * 4.13) * 1.5);
  });
  return (
    <>
      <hemisphereLight args={["#9ad8ff", "#ff6ac8", 0.5]} />
      <pointLight
        ref={pink}
        position={[DANCE[0], 3, DANCE[1]]}
        color={PINK}
        intensity={4}
        distance={8}
      />
      <pointLight
        position={[4.6, 2.4, 0.5]}
        color={BABY_BLUE}
        intensity={3}
        distance={6}
      />
    </>
  );
}

/**
 * Sugar Rush, Nightlife Row's Y2K pop club: bubblegum walls under baby-blue
 * neon, butterflies flexing their wings up the walls, a pastel LED floor
 * under a mirror ball, chrome podiums for the dancers, a glowing acrylic
 * bar and blow-up chairs. The bartender pours; the DJ plays bubblegum pop.
 */
export function SugarRush({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#14051f"]} />
      <fog attach="fog" args={["#2a0a3a", 10, 26]} />
      <ClubLights />
      <Beams beams={BEAMS} aim={DANCE} />
      <Floor
        width={WALL_X * 2}
        depth={12.4}
        center={[0, 0.2]}
        color="#a07ac8"
        texture={{ id: "terrazzo_tiles", scale: 0.5 }}
        mirror={0.5}
        low={{ metalness: 0.2, roughness: 0.4 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["sugar-rush"]} color={PINK} />
      <Walls />
      <LedFloor
        center={DANCE}
        cols={6}
        rows={5}
        colors={[PINK, BABY_BLUE, "#c9a2ff", "#fff1fb"]}
      />
      <MirrorBall />
      <Podiums />
      <Bar />
      <Chairs />
      <Booth />
      <Butterflies />
      <Sparkles
        count={calm ? 0 : 80}
        scale={[11, 3.6, 11]}
        position={[0, 1.9, 0]}
        size={2.2}
        speed={calm ? 0 : 0.25}
        color="#ffd1f0"
        opacity={0.7}
      />
      <SugarRushNpcs onDrink={orderCocktail} />
    </>
  );
}

const orderCocktail = () => drink("cocktail");
