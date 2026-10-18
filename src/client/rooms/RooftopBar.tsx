import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Vec3 } from "../../game/amusementPark.ts";
import {
  BAR,
  DJ_BOOTH,
  FIRE,
  HIGH_TABLES,
  KIOSK,
  SOFA,
  STOOL_XS,
  STOOL_Z,
} from "../../game/rooftop.ts";
import { ROOMS } from "../../game/rooms.ts";
import { drink } from "../effects/drunk.ts";
import { useReducedMotion } from "../motion.ts";
import { Bulbs } from "./amusementpark/Bulbs.tsx";
import { SKY, WINDOWS } from "./plaza/Sky.tsx";
import { SkylarkNpcs } from "./rooftop/Npcs.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { hdr } from "./shared/materials.ts";
import { NeonText, SCRIPT } from "./shared/Neon.tsx";
import { Prop, PropSet } from "./shared/Prop.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

// the deck's edges: glass rails all round, the elevator kiosk in the south-west
const RAIL_X = 8.2;
const RAIL_Z = -6;
const LOBBY_Z = 7.1;
// the street is 30 m down
const STREET_Y = -30;

/** Towers all round, below and about the deck, as one merged mesh: lit
 * windows tiled at one size on every face. */
function skylineGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 64; i++) {
    const n = Math.sin(i * 12.9898) * 43758.5453;
    const r = n - Math.floor(n);
    const a = (i / 64) * Math.PI * 2 + r * 0.08;
    const dist = 26 + ((r * 7.1) % 1) * 80;
    const w = 6 + ((r * 3.7) % 1) * 9;
    const d = 6 + ((r * 5.3) % 1) * 9;
    // near towers top out below the deck, so you look down on them; the
    // far ones rise above it, round the horizon
    const h = dist > 60 ? 30 + ((r * 9.7) % 1) * 40 : 14 + ((r * 9.7) % 1) * 14;
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    for (let k = 0; k < uv.count; k++)
      uv.setXY(k, uv.getX(k) * (w / 4), uv.getY(k) * (h / 4));
    g.translate(Math.sin(a) * dist, STREET_Y + h / 2, Math.cos(a) * dist);
    parts.push(g);
  }
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error("Skyline parts have mismatched attributes.");
  return merged;
}

// where the festoon posts stand along both side rails
const POST_ZS = [-5.8, -3.2, -0.6, 2, 4.5, 6.9];

/** Festoon strands zigzagging rail to rail between posts, sagging midway. */
function festoons(): { bulbs: Vec3[]; wires: Float32Array } {
  const zs = POST_ZS;
  const bulbs: Vec3[] = [];
  const wire: number[] = [];
  for (let k = 0; k < zs.length - 1; k++) {
    // one zigzag, rail to rail and back
    {
      const [x0, x1] = k % 2 ? [RAIL_X, -RAIL_X] : [-RAIL_X, RAIL_X];
      const z0 = zs[k];
      const z1 = zs[k + 1];
      const at = (t: number): Vec3 => [
        x0 + (x1 - x0) * t,
        3.5 - Math.sin(Math.PI * t) * 0.7,
        z0 + (z1 - z0) * t,
      ];
      for (let i = 1; i < 16; i++) bulbs.push(at(i / 16));
      for (let i = 0; i < 16; i++)
        wire.push(...at(i / 16), ...at((i + 1) / 16));
    }
  }
  return { bulbs, wires: new Float32Array(wire) };
}

const FESTOONS = festoons();
const POSTS: Vec3[] = POST_ZS.flatMap((z) => [
  [-RAIL_X, 1.8, z] as Vec3,
  [RAIL_X, 1.8, z] as Vec3,
]);
const BULB_COLORS = ["#ffc878", "#ffb45a", "#ffd9a0"];
// amber, bottle-green and clear glass, lit from below
const BOTTLE_COLORS = ["#c87a2a", "#3a8a5a", "#d8c8a8", "#8a4a2a"];

/** One draw call for a set of identical pieces placed at `at`. */
function Instanced({
  at,
  children,
}: {
  at: readonly Vec3[];
  children: ReactNode;
}) {
  return (
    <instancedMesh
      ref={(m) => {
        if (!m) return;
        const o = new THREE.Object3D();
        at.forEach((p, i) => {
          o.position.set(...p);
          o.updateMatrix();
          m.setMatrixAt(i, o.matrix);
        });
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      }}
      args={[undefined, undefined, at.length]}
    >
      {children}
    </instancedMesh>
  );
}

function Rails() {
  const glass = (
    <meshStandardMaterial
      color="#9ad8ff"
      transparent
      opacity={0.14}
      roughness={0.05}
      metalness={0.2}
      depthWrite={false}
    />
  );
  const gold = (
    <meshStandardMaterial color="#d8a85a" metalness={0.8} roughness={0.3} />
  );
  const span = RAIL_X * 2;
  const depth = LOBBY_Z - RAIL_Z;
  const midZ = (LOBBY_Z + RAIL_Z) / 2;
  return (
    <>
      <mesh position={[0, 0.55, RAIL_Z]}>
        <boxGeometry args={[span, 1.1, 0.04]} />
        {glass}
      </mesh>
      {[-RAIL_X, RAIL_X].map((x) => (
        <mesh key={x} position={[x, 0.55, midZ]}>
          <boxGeometry args={[0.04, 1.1, depth]} />
          {glass}
        </mesh>
      ))}
      {/* the south rail runs from the elevator kiosk to the east corner */}
      <mesh position={[(KIOSK.x1 + RAIL_X) / 2, 0.55, LOBBY_Z]}>
        <boxGeometry args={[RAIL_X - KIOSK.x1, 1.1, 0.04]} />
        {glass}
      </mesh>
      <mesh position={[(KIOSK.x1 + RAIL_X) / 2, 1.12, LOBBY_Z]}>
        <boxGeometry args={[RAIL_X - KIOSK.x1, 0.06, 0.1]} />
        {gold}
      </mesh>
      <mesh position={[0, 1.12, RAIL_Z]}>
        <boxGeometry args={[span, 0.06, 0.1]} />
        {gold}
      </mesh>
      {[-RAIL_X, RAIL_X].map((x) => (
        <mesh key={x} position={[x, 1.12, midZ]}>
          <boxGeometry args={[0.1, 0.06, depth]} />
          {gold}
        </mesh>
      ))}
      {/* the festoon posts along both side rails */}
      <Instanced at={POSTS}>
        <cylinderGeometry args={[0.04, 0.05, 3.6, 8]} />
        <meshStandardMaterial color="#2a1c30" metalness={0.6} roughness={0.4} />
      </Instanced>
    </>
  );
}

/** The elevator kiosk in the south-west corner: dark panelling, brass doors in
 * a glowing frame, and the bar's name in neon over them. */
function Kiosk() {
  const width = KIOSK.x1 - KIOSK.x0;
  return (
    <group position={[(KIOSK.x0 + KIOSK.x1) / 2, 0, KIOSK.front + 0.6]}>
      <mesh position-y={1.45}>
        <boxGeometry args={[width, 2.9, 1.2]} />
        <meshStandardMaterial color="#2a1830" roughness={0.8} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 1.15, -0.62]}>
          <boxGeometry args={[0.82, 2.3, 0.04]} />
          <meshStandardMaterial
            color="#c9a26a"
            metalness={0.9}
            roughness={0.35}
          />
        </mesh>
      ))}
      <mesh position={[0, 1.2, -0.61]}>
        <boxGeometry args={[1.9, 2.5, 0.02]} />
        <meshBasicMaterial color={hdr("#7fd8ff", 1.6)} toneMapped={false} />
      </mesh>
      <NeonText
        text="Skylark"
        color="#7fd8ff"
        font={SCRIPT}
        width={2.8}
        k={3.4}
        position={[0, 2.62, -0.64]}
        rotation-y={Math.PI}
      />
    </group>
  );
}

function Bar() {
  const length = BAR.x1 - BAR.x0;
  const cx = (BAR.x0 + BAR.x1) / 2;
  const cz = (BAR.front + BAR.back) / 2;
  const bottles = useMemo(() => {
    const out: Vec3[] = [];
    for (let x = BAR.x0 + 0.2; x < BAR.x1 - 0.1; x += 0.24)
      out.push([x, 1.17, -5.75]);
    return out;
  }, []);
  return (
    <>
      <mesh position={[cx, 0.52, cz]}>
        <boxGeometry args={[length, 1.04, BAR.front - BAR.back]} />
        <meshStandardMaterial color="#3a1f3c" roughness={0.6} />
      </mesh>
      {/* a pale stone top, lipped over the front */}
      <mesh position={[cx, 1.07, cz + 0.05]}>
        <boxGeometry args={[length + 0.1, 0.06, BAR.front - BAR.back + 0.1]} />
        <meshStandardMaterial color="#efe6ee" roughness={0.25} />
      </mesh>
      {/* the underglow along the foot rail */}
      <mesh position={[cx, 0.1, BAR.front + 0.02]}>
        <boxGeometry args={[length, 0.03, 0.03]} />
        <meshBasicMaterial color={hdr("#ff6ac8", 3)} toneMapped={false} />
      </mesh>
      {/* the back bar: a low cabinet with a row of lit bottles */}
      <mesh position={[cx, 0.5, -5.75]}>
        <boxGeometry args={[length, 1, 0.35]} />
        <meshStandardMaterial color="#24142a" roughness={0.7} />
      </mesh>
      <Bottles at={bottles} />
    </>
  );
}

function Bottles({ at }: { at: readonly Vec3[] }) {
  return (
    <instancedMesh
      ref={(m) => {
        if (!m) return;
        const o = new THREE.Object3D();
        at.forEach((p, i) => {
          o.position.set(...p);
          o.updateMatrix();
          m.setMatrixAt(i, o.matrix);
          m.setColorAt(i, hdr(BOTTLE_COLORS[i % BOTTLE_COLORS.length], 0.9));
        });
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
        m.computeBoundingSphere();
      }}
      args={[undefined, undefined, at.length]}
    >
      <cylinderGeometry args={[0.05, 0.05, 0.3, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** The fire pit: a stone bowl with flames that lick and a light that flickers. */
function FirePit() {
  const calm = useReducedMotion();
  const flames = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const g = flames.current;
    if (g && !calm)
      g.children.forEach((c, i) => {
        c.scale.y = 1 + Math.sin(t * (7 + i * 2.3) + i) * 0.25;
      });
    if (light.current)
      light.current.intensity =
        3 + (calm ? 0 : Math.sin(t * 11) * 0.5 + Math.sin(t * 6.7) * 0.4);
  });
  return (
    <group position={[FIRE[0], 0, FIRE[1]]}>
      <mesh position-y={0.2}>
        <cylinderGeometry args={[0.45, 0.38, 0.4, 20]} />
        <meshStandardMaterial color="#4a3a44" roughness={0.9} />
      </mesh>
      <group ref={flames} position-y={0.4}>
        {[
          [0, 0, 0.42],
          [0.12, 0.06, 0.3],
          [-0.1, -0.08, 0.34],
        ].map(([x, z, h], i) => (
          <mesh key={i} position={[x, h / 2, z]}>
            <coneGeometry args={[0.11, h, 8]} />
            <meshBasicMaterial
              color={hdr(i ? "#ffb02e" : "#ff6a2a", 2.4)}
              toneMapped={false}
              transparent
              opacity={0.9}
            />
          </mesh>
        ))}
      </group>
      <pointLight
        ref={light}
        position={[0, 1, 0]}
        color="#ff8a3d"
        intensity={3}
        distance={6}
      />
    </group>
  );
}

function HighTables() {
  const tops = HIGH_TABLES.map(([x, z]): Vec3 => [x, 1.08, z]);
  const poles = HIGH_TABLES.map(([x, z]): Vec3 => [x, 0.54, z]);
  return (
    <>
      <Instanced at={tops}>
        <cylinderGeometry args={[0.38, 0.38, 0.04, 20]} />
        <meshStandardMaterial color="#efe6ee" roughness={0.3} />
      </Instanced>
      <Instanced at={poles}>
        <cylinderGeometry args={[0.04, 0.2, 1.08, 10]} />
        <meshStandardMaterial color="#2a1c30" metalness={0.6} roughness={0.4} />
      </Instanced>
    </>
  );
}

function Furniture() {
  const stools = useMemo(
    () => STOOL_XS.map((x) => [x, 0, STOOL_Z - 0.05, 0] as const),
    [],
  );
  return (
    <Suspense fallback={null}>
      <PropSet
        model="bar-stool"
        width={0.42}
        depth={0.42}
        height={0.82}
        at={stools}
      />
      <Prop
        model="sofa"
        width={3}
        depth={0.95}
        height={0.85}
        yaw={Math.PI / 2}
        position={[SOFA.at[0], 0, SOFA.at[1]]}
      />
      <Prop
        model="dj-booth"
        width={DJ_BOOTH.x1 - DJ_BOOTH.x0}
        depth={DJ_BOOTH.z1 - DJ_BOOTH.z0}
        height={1.15}
        position={[
          (DJ_BOOTH.x0 + DJ_BOOTH.x1) / 2,
          0,
          (DJ_BOOTH.z0 + DJ_BOOTH.z1) / 2,
        ]}
      />
      <PropSet
        model="plant"
        width={0.7}
        depth={0.7}
        height={1.4}
        at={[
          [7.6, 0, 6.5, 1],
          [7.6, 0, -5.5, 0],
          [-7.6, 0, -5.5, 2],
        ]}
      />
    </Suspense>
  );
}

/**
 * The Skylark: a rooftop bar 30 m over Nightlife Row. A wooden deck behind
 * glass rails, festoon lights zigzagging overhead, the city lit up all round
 * and below, a bar along the north rail, a sofa by the fire pit, standing
 * tables and a DJ in the corner. The bartender pours; Last Call is played
 * at the end of the bar.
 */
export function RooftopBar({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  const skyline = useMemo(skylineGeometry, []);
  const windows = useMemo(() => {
    const t = WINDOWS.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    return t;
  }, []);
  const wires = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(FESTOONS.wires, 3));
    return g;
  }, []);
  return (
    <>
      <color attach="background" args={["#05030c"]} />
      <fog attach="fog" args={["#1c0a3a", 40, 150]} />
      <mesh material={SKY} scale={160} renderOrder={-1}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      <Stars
        radius={120}
        depth={20}
        count={1200}
        factor={4}
        saturation={0.6}
        fade
        speed={calm ? 0 : 0.5}
      />
      <mesh position={[40, 45, -110]}>
        <circleGeometry args={[4, 40]} />
        <meshBasicMaterial
          color={hdr("#ffe6f4", 1.6)}
          toneMapped={false}
          fog={false}
        />
      </mesh>
      <mesh geometry={skyline}>
        <meshBasicMaterial map={windows} color="#c8b8d8" />
      </mesh>
      {/* the streets far below, a dark glow under the towers */}
      <mesh rotation-x={-Math.PI / 2} position-y={STREET_Y}>
        <circleGeometry args={[200, 32]} />
        <meshBasicMaterial color="#2a1030" />
      </mesh>
      <hemisphereLight args={["#7a5cff", "#ff9a6a", 0.55]} />
      <pointLight
        position={[(BAR.x0 + BAR.x1) / 2, 2.6, BAR.front + 0.8]}
        color="#ffb070"
        intensity={5}
        distance={8}
      />
      <Floor
        width={RAIL_X * 2}
        depth={LOBBY_Z - RAIL_Z}
        center={[0, (LOBBY_Z + RAIL_Z) / 2]}
        color="#9a7a6a"
        texture={{ id: "dark_wooden_planks", scale: 0.5 }}
        mirror={0.15}
        low={{ metalness: 0, roughness: 0.8 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS["rooftop-bar"]} color="#7fd8ff" />
      <Rails />
      <Kiosk />
      <Bar />
      <FirePit />
      <HighTables />
      <Furniture />
      <Bulbs points={FESTOONS.bulbs} colors={BULB_COLORS} radius={0.045} />
      <lineSegments geometry={wires}>
        <lineBasicMaterial color="#6a5a50" />
      </lineSegments>
      <SkylarkNpcs onDrink={orderCocktail} />
    </>
  );
}

const orderCocktail = () => drink("cocktail");
