import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Vec3 } from "../../game/amusementPark.ts";
import {
  ATRIUM_BENCHES,
  CINEMA,
  ESCALATORS,
  FLOOR_BOUNDS,
  FOUNTAIN,
  FOUNTAIN_R,
  KIOSKS,
  NORTH_Z,
  STALL_X,
  STALLS,
  STORE_WIDTH,
  STORES,
  TABLES,
} from "../../game/galleria.ts";
import { ROOMS } from "../../game/rooms.ts";
import { useReducedMotion } from "../motion.ts";
import { Bulbs } from "./amusementpark/Bulbs.tsx";
import { GalleriaNpcs } from "./galleria/Npcs.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { canvasTex, hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText, SCRIPT } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { PropSet } from "./shared/Prop.tsx";

const W = FLOOR_BOUNDS.x1 - FLOOR_BOUNDS.x0;
const D = FLOOR_BOUNDS.z1 - NORTH_Z;
const CZ = (NORTH_Z + FLOOR_BOUNDS.z1) / 2;
const HEIGHT = 9;
const BALCONY_Y = 4.2;
const PINK = "#ff4fb3";
const STEPS = 14;

const scratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(1, 1, 1),
};

// polished terrazzo: pale chips scattered on cream
const TERRAZZO = canvasTex(
  128,
  128,
  (ctx) => {
    ctx.fillStyle = "#efe6e0";
    ctx.fillRect(0, 0, 128, 128);
    const chips = ["#ff9ec2", "#9ad8ff", "#c9b3ff", "#ffe28a", "#b0a8a0"];
    let r = 11;
    const rand = () => {
      r = (r * 16807) % 2147483647;
      return r / 2147483647;
    };
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = chips[i % chips.length];
      ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 3, 1 + rand() * 3);
    }
  },
  [7, 5],
);

/** The stores along the north wall: lit windows, a sign over each, the
 * glass shopfront; the balcony runs over them. */
function Storefronts() {
  return (
    <>
      {STORES.map((store) => (
        <group key={store.id} position={[store.x, 0, NORTH_Z]}>
          {/* the store's lit interior behind the glass */}
          <mesh position={[0, 1.6, -1]}>
            <boxGeometry args={[STORE_WIDTH - 0.3, 3.2, 2]} />
            <meshStandardMaterial
              color="#5a4a6a"
              emissive={store.color}
              emissiveIntensity={0.12}
              side={THREE.BackSide}
            />
          </mesh>
          {/* racks or shelves inside, in the store's color */}
          {[-1.4, 0, 1.4].map((dx) => (
            <mesh key={dx} position={[dx, 0.8, -1.3]}>
              <boxGeometry args={[0.9, 1.6, 0.4]} />
              <meshStandardMaterial color={store.color} roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[0, 1.6, 0.02]}>
            <planeGeometry args={[STORE_WIDTH - 0.3, 3.2]} />
            <meshStandardMaterial
              color="#cfe8ff"
              transparent
              opacity={0.15}
              roughness={0.05}
              depthWrite={false}
            />
          </mesh>
          <NeonText
            text={store.name}
            color={store.color}
            font={SCRIPT}
            width={STORE_WIDTH - 1.4}
            k={3.4}
            position={[0, 3.25, 0.05]}
          />
        </group>
      ))}
      {/* piers between the stores, up to the balcony */}
      {STORES.slice(1).map((store) => (
        <mesh
          key={store.id}
          position={[store.x - STORE_WIDTH / 2, BALCONY_Y / 2, NORTH_Z]}
        >
          <boxGeometry args={[0.4, BALCONY_Y, 0.4]} />
          <meshStandardMaterial color="#f4ecf0" roughness={0.4} />
        </mesh>
      ))}
    </>
  );
}

/** The balcony over the stores: a gallery floor and a glass rail. */
function Balcony() {
  return (
    <group position={[0, BALCONY_Y, NORTH_Z + 1.2]}>
      <mesh>
        <boxGeometry args={[W, 0.3, 2.4]} />
        <meshStandardMaterial color="#f4ecf0" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.6, 1.2]}>
        <boxGeometry args={[W, 0.9, 0.04]} />
        <meshStandardMaterial
          color="#cfe8ff"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1.08, 1.2]}>
        <boxGeometry args={[W, 0.05, 0.08]} />
        <meshBasicMaterial color={hdr(PINK, 2)} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Two escalators up the west wall, their steps climbing for ever. */
function Escalators() {
  const calm = useReducedMotion();
  const ref = useRef<THREE.InstancedMesh>(null);
  const run = ESCALATORS.z1 - ESCALATORS.z0;
  const lanes = [ESCALATORS.x0 + 0.5, ESCALATORS.x1 - 0.5];
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = calm ? 0 : clock.elapsedTime * 0.25;
    const { m: mat, q, p, s } = scratch;
    let i = 0;
    for (const [lane, x] of lanes.entries())
      for (let k = 0; k < STEPS; k++) {
        // one lane climbs north, the other comes down
        const along = (((k / STEPS + (lane ? -t : t)) % 1) + 1) % 1;
        p.set(x, 0.2 + along * BALCONY_Y, ESCALATORS.z1 - along * run);
        m.setMatrixAt(i++, mat.compose(p, q, s));
      }
    m.instanceMatrix.needsUpdate = true;
  });
  const slope = Math.atan2(BALCONY_Y, run);
  return (
    <>
      {lanes.map((x) => (
        <mesh
          key={x}
          position={[
            x,
            BALCONY_Y / 2 - 0.1,
            (ESCALATORS.z0 + ESCALATORS.z1) / 2,
          ]}
          rotation-x={slope}
        >
          <boxGeometry args={[0.9, 0.2, Math.hypot(run, BALCONY_Y)]} />
          <meshStandardMaterial
            color="#2a2440"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      ))}
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, STEPS * lanes.length]}
        frustumCulled={false}
      >
        <boxGeometry args={[0.8, 0.06, run / STEPS - 0.04]} />
        <meshStandardMaterial color="#c9c9d4" metalness={0.8} roughness={0.3} />
      </instancedMesh>
    </>
  );
}

/** The cinema on the west wall: poster frames, a marquee of chasing bulbs. */
function Cinema() {
  const posters = useMemo(
    () =>
      ["#ff4fb3", "#4fe3ff", "#ffd84f"].map((c, i) =>
        canvasTex(64, 96, (ctx) => {
          const g = ctx.createLinearGradient(0, 0, 0, 96);
          g.addColorStop(0, "#14051f");
          g.addColorStop(1, c);
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 64, 96);
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(32, 36 + i * 4, 14, 0, Math.PI * 2);
          ctx.fill();
        }),
      ),
    [],
  );
  const bulbs = useMemo(() => {
    const out: Vec3[] = [];
    for (let z = CINEMA.z0; z <= CINEMA.z1; z += 0.35)
      out.push([FLOOR_BOUNDS.x0 + 0.08, 3.4, z]);
    return out;
  }, []);
  return (
    <group>
      {posters.map((tex, i) => (
        <mesh
          key={i}
          position={[FLOOR_BOUNDS.x0 + 0.06, 1.7, CINEMA.z0 + 1.2 + i * 2]}
          rotation-y={Math.PI / 2}
        >
          <planeGeometry args={[1.1, 1.65]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      ))}
      <Bulbs points={bulbs} colors={["#fff1c8", "#ffd84f"]} radius={0.05} />
      <NeonText
        text="CINEMA 6"
        color="#ffd84f"
        font={MARQUEE}
        width={3}
        k={3.4}
        position={[FLOOR_BOUNDS.x0 + 0.1, 4, (CINEMA.z0 + CINEMA.z1) / 2]}
        rotation-y={Math.PI / 2}
      />
    </group>
  );
}

/** The food court: three stall counters on the east wall under their
 * neon, and tables with chairs in front. */
function FoodCourt() {
  const chairs = useMemo(
    () =>
      TABLES.flatMap(([x, z]) =>
        [-0.75, 0.75].map(
          (dx) => [x + dx, 0, z, dx < 0 ? Math.PI / 2 : -Math.PI / 2] as const,
        ),
      ),
    [],
  );
  return (
    <>
      {STALLS.map((stall) => (
        <group key={stall.venue} position={[STALL_X, 0, stall.z]}>
          <mesh position={[0.4, 0.55, 0]}>
            <boxGeometry args={[1.6, 1.1, 2.8]} />
            <meshStandardMaterial color="#1c1430" roughness={0.5} />
          </mesh>
          <mesh position={[-0.42, 0.95, 0]}>
            <boxGeometry args={[0.04, 0.1, 2.8]} />
            <meshBasicMaterial
              color={hdr(stall.color, 2.4)}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
      {TABLES.map(([x, z]) => (
        <group key={z} position={[x, 0, z]}>
          <mesh position-y={0.74}>
            <cylinderGeometry args={[0.4, 0.4, 0.04, 20]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position-y={0.37}>
            <cylinderGeometry args={[0.04, 0.2, 0.74, 10]} />
            <meshStandardMaterial color="#2a2440" metalness={0.6} />
          </mesh>
        </group>
      ))}
      <Suspense fallback={null}>
        <PropSet
          model="cafe-chair"
          width={0.48}
          depth={0.48}
          height={0.9}
          at={chairs}
        />
      </Suspense>
      <NeonText
        text="FOOD COURT"
        color="#7dff6b"
        font={MARQUEE}
        width={3.6}
        k={3.4}
        position={[FLOOR_BOUNDS.x1 - 0.1, 4.2, -1.5]}
        rotation-y={-Math.PI / 2}
      />
    </>
  );
}

/** The atrium fountain: a round pool and a column of water lit pink. */
function Fountain() {
  const calm = useReducedMotion();
  const jet = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (jet.current && !calm)
      jet.current.scale.y = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.25;
  });
  const [x, z] = FOUNTAIN;
  return (
    <group position={[x, 0, z]}>
      <mesh position-y={0.3}>
        <cylinderGeometry
          args={[FOUNTAIN_R, FOUNTAIN_R + 0.1, 0.6, 32, 1, true]}
        />
        <meshStandardMaterial color="#f4ecf0" roughness={0.4} />
      </mesh>
      <mesh position-y={0.45} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[FOUNTAIN_R - 0.1, 32]} />
        <meshStandardMaterial
          color="#2a8ac8"
          emissive="#ff4fb3"
          emissiveIntensity={0.35}
          roughness={0.05}
        />
      </mesh>
      <mesh ref={jet} position-y={1.4}>
        <cylinderGeometry args={[0.08, 0.3, 2, 12, 1, true]} />
        <meshBasicMaterial
          color={hdr("#d8f4ff", 1.6)}
          toneMapped={false}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** The hall: cream walls, a glass roof on white ribs showing the night, and
 * banners hanging down the height of it. */
function Hall() {
  const calm = useReducedMotion();
  const banners = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const b = banners.current;
    if (!b || calm) return;
    b.children.forEach((c, i) => {
      c.rotation.y = Math.sin(clock.elapsedTime * 0.5 + i) * 0.15;
    });
  });
  const wall = <meshStandardMaterial color="#d8c8ec" roughness={0.7} />;
  return (
    <>
      <mesh position={[0, HEIGHT / 2, NORTH_Z - 2.1]}>
        <boxGeometry args={[W, HEIGHT, 0.2]} />
        {wall}
      </mesh>
      {[FLOOR_BOUNDS.x0 - 0.1, FLOOR_BOUNDS.x1 + 0.1].map((x) => (
        <mesh key={x} position={[x, HEIGHT / 2, CZ]}>
          <boxGeometry args={[0.2, HEIGHT, D + 2]} />
          {wall}
        </mesh>
      ))}
      {/* the glass roof and its ribs */}
      <mesh position={[0, HEIGHT, CZ]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W, D + 2]} />
        <meshStandardMaterial
          color="#1a2a5a"
          emissive="#0a1030"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[-12, -8, -4, 0, 4, 8, 12].map((x) => (
        <mesh key={x} position={[x, HEIGHT - 0.1, CZ]}>
          <boxGeometry args={[0.15, 0.2, D + 2]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      <group ref={banners}>
        {[-11, -6.5, 6.5, 11].map((x, i) => (
          <mesh key={x} position={[x, 7.2, -7.6]}>
            <planeGeometry args={[1, 2.2]} />
            <meshBasicMaterial
              color={hdr(["#ff4fb3", "#4fe3ff", "#ffd84f", "#b06bff"][i], 0.9)}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <NeonText
        text="Starlight Galleria"
        color={PINK}
        font={SCRIPT}
        width={7}
        k={3.8}
        position={[0, 6.4, NORTH_Z - 1.95]}
      />
    </>
  );
}

function Furniture() {
  return (
    <>
      {ATRIUM_BENCHES.map(([x, z]) => (
        <mesh key={x} position={[x, 0.42, z]}>
          <boxGeometry args={[1.8, 0.08, 0.45]} />
          <meshStandardMaterial color="#8a5a3a" roughness={0.6} />
        </mesh>
      ))}
      {KIOSKS.map(([x, z], i) => (
        <group key={x} position={[x, 0, z]}>
          <mesh position-y={0.5}>
            <boxGeometry args={[1.2, 1, 0.8]} />
            <meshStandardMaterial
              color={i ? "#4fe3ff" : "#ff4fb3"}
              roughness={0.5}
            />
          </mesh>
          <mesh position-y={2.1}>
            <boxGeometry args={[1.5, 0.08, 1.1]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position-y={1.55}>
            <cylinderGeometry args={[0.03, 0.03, 1.1, 6]} />
            <meshStandardMaterial color="#c9c9d4" metalness={0.8} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/**
 * The Starlight Galleria, the big mall on Shore Boulevard: a great hall of
 * terrazzo under a glass roof, five stores along the north wall under their
 * neon (Glitterbox, Gloss & Glow and Curl & Chrome sell; tap the clerks),
 * a balcony over them reached by escalators that never stop, the cinema's
 * marquee on the west wall, the food court on the east, a fountain in the
 * atrium and shoppers doing laps with their bags.
 */
export function Galleria({ onPick }: { onPick: PickHandler }) {
  return (
    <>
      <color attach="background" args={["#0a0820"]} />
      <fog attach="fog" args={["#1a1430", 20, 44]} />
      <hemisphereLight args={["#fff4fa", "#8a7a9a", 1.1]} />
      <pointLight
        position={[0, 6, -2]}
        color="#fff0f6"
        intensity={6}
        distance={20}
      />
      <pointLight
        position={[0, 5, 6]}
        color="#ffe8d8"
        intensity={4}
        distance={16}
      />
      <Floor
        width={W}
        depth={D}
        center={[0, CZ]}
        color="#ffffff"
        map={TERRAZZO}
        mirror={0.35}
        low={{ metalness: 0.1, roughness: 0.3 }}
        onPick={onPick}
      />
      <PortalPads room={ROOMS.galleria} color={PINK} />
      <Hall />
      <Storefronts />
      <Balcony />
      <Escalators />
      <Cinema />
      <FoodCourt />
      <Fountain />
      <Furniture />
      <GalleriaNpcs />
    </>
  );
}
