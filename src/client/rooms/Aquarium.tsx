import { SealShow } from "./aquarium/SealShow.tsx";
import { SwimmingCreature } from "../creatures/Swimmer.tsx";
import type { CreaturePose } from "../creatures/Creature.tsx";
import type { FishKind } from "../../game/creatures.ts";
import { useQuality } from "../world/quality.ts";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DEFAULT_LOOK } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import type { DialogueContext } from "../../game/dialogue/types.ts";
import { useReducedMotion } from "../motion.ts";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { Batch } from "./shared/batch.ts";
import { GLOSS, painted, plant } from "./shared/details.ts";
import { surface } from "../city/worldTexture.ts";

// wet rock round the touch pool and along the tank bases, a teak bench
const ROCK = surface("rock_face", { scale: 1.2, color: "#8a8aa8" });
const TEAK = surface("wood_veneer", { scale: 1.5, color: "#a07050" });

/** Rock piles along the reef and jelly walls, starfish in the touch pool, a
 * viewing bench and planters by the door. */
function buildDressing() {
  const b = new Batch();
  const rock = new THREE.DodecahedronGeometry(1, 0);
  for (let k = 0; k < 14; k++) {
    const side = k % 2 ? 1 : -1;
    const r = 0.25 + ((k * 37) % 5) * 0.08;
    b.add(rock, ROCK, {
      position: [side * (7.2 - r * 0.4), r * 0.5, -6 + Math.floor(k / 2) * 1.9],
      rotation: [k, k * 2.3, 0],
      scale: [r * 1.3, r * 0.8, r],
    });
  }
  const star = new THREE.CylinderGeometry(0.09, 0.09, 0.02, 5);
  for (let k = 0; k < 5; k++) {
    const a = k * 1.3;
    b.add(
      painted(star, ["#ff7a3d", "#ff4fb3", "#ffd84f"][k % 3] ?? "#ff7a3d"),
      GLOSS,
      {
        position: [-3.6 + Math.cos(a) * 0.7, 0.73, 4.4 + Math.sin(a) * 0.7],
        rotation: [0, a, 0],
      },
    );
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  b.add(box, TEAK, { position: [2.4, 0.42, -2], scale: [0.5, 0.08, 2.2] });
  for (const z of [-2.9, -1.1])
    b.add(box, TEAK, { position: [2.4, 0.2, z], scale: [0.4, 0.4, 0.1] });
  plant(b, { x: 6.8, z: 6.2 }, 1.4);
  plant(b, { x: -6.8, z: 6.2 }, 1.4);
  return b.build();
}
import { PortalPads } from "./shared/PortalPads.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";
import { hdr } from "./shared/materials.ts";

const CONTEXT: DialogueContext = { venue: "aquarium", neighborhood: "uptown" };

// The shark tunnel: a glass half-pipe over the middle aisle, water beyond it.
const TUNNEL = { z0: -6, z1: 1, radius: 3.2 };
const JELLIES = 22;
const CORAL = 34;

const scratch = {
  m: new THREE.Matrix4(),
  q: new THREE.Quaternion(),
  e: new THREE.Euler(),
  p: new THREE.Vector3(),
  s: new THREE.Vector3(),
};

/** A fixed pseudo-random value in 0..1 per index, so the reef never reshuffles. */
function rand(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const REEF_FISH: readonly FishKind[] = [
  "cute-clownfish",
  "cute-bluetang",
  "cute-yellowtang",
  "cute-butterflyfish",
  "cute-mandarinfish",
  "cute-goldfish",
  "fish1",
  "cute-zebraclownfish",
  "fish2",
  "cute-koi",
  "fish3",
  "cute-lionfish",
  "cute-puffer",
];
const FISH_HIGH = 16;
const FISH_LOW = 6;

/** Sharks lap the tank over the tunnel; the mantas glide above them; a school
 * of reef fish loops along the reef wall. Each is its own skinned mesh, so the
 * low tier keeps fewer. */
function Swimmers() {
  const low = useQuality() === "low";
  const zc = (TUNNEL.z0 + TUNNEL.z1) / 2;
  const sharks = low ? 2 : 3;
  const fish = low ? FISH_LOW : FISH_HIGH;
  return (
    <>
      {Array.from({ length: sharks }, (_, i) => (
        <SwimmingCreature
          key={`shark${i}`}
          kind="shark"
          scale={1 + (i % 2) * 0.25}
          path={(t, pose) =>
            lap(pose, t * 0.22 + (i / sharks) * Math.PI * 2, i, zc)
          }
        />
      ))}
      {!low && (
        <SwimmingCreature
          kind="manta-ray"
          path={(t, pose) => lap(pose, t * 0.15 + 1, 3, zc, 1.1)}
        />
      )}
      {Array.from({ length: fish }, (_, i) => (
        <SwimmingCreature
          key={`fish${i}`}
          kind={REEF_FISH[i % REEF_FISH.length] ?? "fish1"}
          scale={1.4}
          path={(t, pose) => reef(pose, t, i)}
        />
      ))}
    </>
  );
}

/** A slow oval lap round the tank at angle `a`, nose along the way it goes (angle grows with time). */
function lap(pose: CreaturePose, a: number, i: number, zc: number, k = 1) {
  const rx = (5.4 + (i % 2) * 0.9) * k;
  const rz = (2.6 + (i % 2) * 0.6) * k;
  pose.x = Math.cos(a) * rx;
  pose.y = 3.9 + (i % 2) * 0.8 + Math.sin(a * 2) * 0.25;
  pose.z = zc + Math.sin(a) * rz;
  pose.yaw = Math.atan2(-Math.sin(a) * rx, Math.cos(a) * rz);
}

/** Reef fish loop in a long thin oval along the right wall. */
function reef(pose: CreaturePose, t: number, i: number) {
  const lane = rand(i, 10);
  const a = t * (0.4 + rand(i, 11) * 0.5) + i * 1.7;
  pose.x = 6.5 + lane * 0.5 + Math.cos(a) * 0.35;
  pose.y = 0.7 + rand(i, 12) * 2.6 + Math.sin(a * 2) * 0.1;
  pose.z = Math.sin(a) * 5.5;
  pose.yaw = Math.atan2(-Math.sin(a) * 0.35, Math.cos(a) * 5.5);
}

/**
 * Uptown Aquarium: a dark hall lit by its tanks. Sharks circle over the glass
 * tunnel, jellyfish pulse in the left bay, fish dart across the reef wall on
 * the right, and starfish lie in the touch pool by the door. Every creature
 * kind is one instanced draw call.
 */
export function Aquarium({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  const dressing = useMemo(buildDressing, []);
  const jellies = useRef<THREE.InstancedMesh>(null);
  const coral = useRef<THREE.InstancedMesh>(null);
  const bell = useMemo(
    () => new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    [],
  );
  const coralShape = useMemo(() => new THREE.IcosahedronGeometry(0.35, 1), []);

  // the reef never moves: place it once, a color per piece
  useLayoutEffect(() => {
    const m = coral.current;
    if (!m) return;
    const { m: mat, q, p, s } = scratch;
    const colors = ["#ff6b8b", "#ffb02e", "#9b5cff", "#3fe0d0", "#ff8a3d"];
    for (let i = 0; i < CORAL; i++) {
      const r = 0.6 + rand(i, 3) * 1.1;
      p.set(7.4 - rand(i, 1) * 0.6, r * 0.35, -6 + rand(i, 2) * 12);
      s.set(r, r * (0.6 + rand(i, 4)), r);
      q.identity();
      m.setMatrixAt(i, mat.compose(p, q, s));
      m.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [coral]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (calm ? 0.3 : 1);
    const { m, q, p, s } = scratch;
    // jellyfish rise and sink, pulsing as they go
    const jl = jellies.current;
    if (jl) {
      for (let i = 0; i < JELLIES; i++) {
        const phase = rand(i, 5) * Math.PI * 2;
        p.set(
          -7.2 + rand(i, 6) * 1.2,
          0.8 + ((t * 0.12 + rand(i, 7)) % 1) * 3.2,
          -6 + rand(i, 8) * 12,
        );
        const pulse = 1 + Math.sin(t * 2 + phase) * 0.12;
        s.set(pulse, 1 / pulse, pulse);
        q.identity();
        jl.setMatrixAt(i, m.compose(p, q, s));
      }
      jl.instanceMatrix.needsUpdate = true;
    }
  });

  const zc = (TUNNEL.z0 + TUNNEL.z1) / 2;
  const len = TUNNEL.z1 - TUNNEL.z0;
  return (
    <>
      <color attach="background" args={["#010614"]} />
      <fog attach="fog" args={["#02132a", 8, 26]} />
      <hemisphereLight args={["#4fb8ff", "#05101f", 0.9]} />
      <pointLight
        position={[0, 4, zc]}
        color="#3fc8ff"
        intensity={6}
        distance={14}
      />
      <Floor
        width={16}
        depth={14}
        center={[0, 0]}
        color="#4a6a90"
        texture={{ id: "slate_floor", scale: 0.5 }}
        mirror={0.6}
        low={{ metalness: 0.2, roughness: 0.5 }}
        onPick={onPick}
      />
      <primitive object={dressing} />
      <PortalPads room={ROOMS.aquarium} color="#4fe3ff" />
      {/* the shark tank: a glowing body of water the tunnel runs through */}
      {/* its floor sits a little above the hall's, so the two never fight */}
      <mesh position={[0, 3.05, zc]}>
        <boxGeometry args={[15.6, 5.9, len + 2]} />
        <meshBasicMaterial
          color={hdr("#0a5e9e", 0.9)}
          transparent
          opacity={0.35}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* the tunnel's glass, a half-pipe over the aisle */}
      <mesh position={[0, 0, zc]} rotation-x={Math.PI / 2}>
        <cylinderGeometry
          args={[
            TUNNEL.radius,
            TUNNEL.radius,
            len,
            32,
            1,
            true,
            -Math.PI / 2,
            Math.PI,
          ]}
        />
        <meshStandardMaterial
          color="#9fdcff"
          transparent
          opacity={0.16}
          roughness={0.05}
          metalness={0.2}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Swimmers />
      {/* the jellyfish bay, along the left wall */}
      <mesh position={[-7.6, 2, 0]}>
        <boxGeometry args={[0.2, 4, 13.6]} />
        <meshBasicMaterial color={hdr("#3a1a5e", 0.8)} />
      </mesh>
      <instancedMesh ref={jellies} args={[bell, undefined, JELLIES]}>
        <meshBasicMaterial
          color={hdr("#ff7ad9", 2.2)}
          toneMapped={false}
          transparent
          opacity={0.75}
        />
      </instancedMesh>
      {/* the reef wall, along the right */}
      <mesh position={[7.85, 2, 0]}>
        <boxGeometry args={[0.2, 4, 13.6]} />
        <meshBasicMaterial color={hdr("#0b4f6c", 1)} />
      </mesh>
      <instancedMesh ref={coral} args={[coralShape, undefined, CORAL]}>
        <meshStandardMaterial roughness={0.7} emissive="#331022" />
      </instancedMesh>
      <SealShow />
      {/* the touch pool by the door */}
      <mesh position={[-3.6, 0.35, 4.4]} material={ROCK}>
        <cylinderGeometry args={[1.4, 1.5, 0.7, 28]} />
      </mesh>
      <mesh position={[-3.6, 0.71, 4.4]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.3, 28]} />
        <meshBasicMaterial color={hdr("#1fa6c9", 1.2)} />
      </mesh>
      <TalkingNpc
        name="Marisol"
        role="ticket-cashier"
        look={{
          ...DEFAULT_LOOK,
          outfit: "blouse",
          outfitColor: "#3fe0d0",
          hairStyle: "bob",
        }}
        mood="idle"
        at={[3.4, 0, 4.6]}
        rot={-Math.PI / 2}
        seed={57}
        greet
        situation="greeting-first"
        context={CONTEXT}
      />
      <TalkingNpc
        name="Bea"
        role="regular"
        look={{
          ...DEFAULT_LOOK,
          outfit: "jeans",
          outfitColor: "#ff2f9a",
          hairStyle: "waves",
          hairColor: "#4a2a1c",
        }}
        mood="pose"
        at={[-5.6, 0, -2.4]}
        rot={-Math.PI / 2}
        seed={58}
        context={CONTEXT}
      />
    </>
  );
}
