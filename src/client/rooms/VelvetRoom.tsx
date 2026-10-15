import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { hotspotsIn, type MinigameId } from "../../game/hotspots.ts";
import { DEFAULT_LOOK, NPC_LOOKS } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { Couple } from "../avatar/Couple.tsx";
import { Doll } from "../avatar/Doll.tsx";
import { useReducedMotion } from "../motion.ts";
import { Bar } from "./velvet/Bar.tsx";
import { Booth } from "./velvet/Booth.tsx";
import { DanceFloor, DiscoBall } from "./velvet/DanceFloor.tsx";
import { Chandelier, Drape, LionCrest } from "./velvet/Decor.tsx";
import { BOOTH, DANCE, ROOM } from "./velvet/layout.ts";
import { Walls } from "./velvet/Walls.tsx";
import { Beams, type Beam } from "./shared/Beams.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { GamePad } from "./shared/GamePad.tsx";
import { DECO, RingNeon, Neon, NeonText, SCRIPT } from "./shared/Neon.tsx";
import { Palm } from "./shared/Palm.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

const BEAMS: readonly Beam[] = [
  { position: [-5.2, 4.4, 4.5], color: "#ff2f9a", phase: 0 },
  { position: [0.5, 4.4, 5], color: "#9b5cff", phase: 2 },
  { position: [-5.2, 4.4, -2.5], color: "#ffb02e", phase: 4 },
];

function Lights() {
  const dance = useRef<THREE.PointLight>(null);
  const calm = useReducedMotion();
  useFrame(({ clock }) => {
    if (dance.current && !calm)
      dance.current.intensity = 3 + Math.sin(clock.elapsedTime * 2.2) * 1.5;
  });
  return (
    <>
      <ambientLight color="#4a2468" intensity={0.25} />
      <hemisphereLight args={["#6b3cff", "#ff2f9a", 0.25]} />
      <directionalLight
        position={[-6, 3, -4]}
        color="#3fe0d0"
        intensity={0.5}
      />
      <pointLight
        position={[-0.8, 2.0, -4.0]}
        color="#ffa040"
        intensity={10}
        distance={7}
      />
      <pointLight
        position={[BOOTH.x - 0.5, 2.4, BOOTH.z]}
        color="#ff2fa8"
        intensity={9}
        distance={6}
      />
      <pointLight
        ref={dance}
        position={[DANCE.x, 2.4, DANCE.z]}
        color="#9b5cff"
        intensity={4}
        distance={5}
      />
      <pointLight
        position={[-5.2, 2.6, -1.4]}
        color="#c03cff"
        intensity={8}
        distance={6}
      />
      <Beams beams={BEAMS} aim={[DANCE.x, DANCE.z]} />
    </>
  );
}

function Reflections() {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer
        form="ring"
        color="#ff2f9a"
        intensity={3}
        position={[0, 3, 4]}
        scale={4}
      />
      <Lightformer
        form="rect"
        color="#ffb02e"
        intensity={3}
        position={[0, 2, -6]}
        scale={[10, 2, 1]}
      />
      <Lightformer
        form="rect"
        color="#9b5cff"
        intensity={2.5}
        position={[-6, 2, 0]}
        rotation-y={Math.PI / 2}
        scale={[10, 3, 1]}
      />
      <Lightformer
        form="rect"
        color="#ffffff"
        intensity={1.5}
        position={[3, 5, 3]}
        scale={[3, 3, 1]}
      />
    </Environment>
  );
}

/** The arched mirror doorway on the west wall that leads out to the Plaza. */
function PlazaDoor() {
  const arch = useMemo(() => {
    const pts = [
      new THREE.Vector3(0, 0.1, -0.9),
      new THREE.Vector3(0, 2.2, -0.9),
    ];
    for (let i = 1; i < 12; i++) {
      const a = Math.PI - (i / 12) * Math.PI;
      pts.push(
        new THREE.Vector3(0, 2.2 + Math.sin(a) * 0.9, Math.cos(a) * 0.9),
      );
    }
    pts.push(new THREE.Vector3(0, 2.2, 0.9), new THREE.Vector3(0, 0.1, 0.9));
    return pts;
  }, []);
  return (
    <group position={[-5.9, 0, -1.5]}>
      <Neon points={arch} color="#ff2f9a" k={4} radius={0.025} />
      <mesh position={[0.01, 1.6, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.7, 3.1]} />
        <meshStandardMaterial color="#1a0c24" metalness={1} roughness={0.08} />
      </mesh>
      <NeonText
        text="VIP"
        color="#b14dff"
        font={DECO}
        width={1.6}
        k={3.6}
        position={[0, 3.55, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <NeonText
        text="to the plaza"
        color="#ffb02e"
        font={SCRIPT}
        width={1.5}
        k={2.6}
        position={[0.05, 3.15, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );
}

function Regulars() {
  return (
    <>
      {NPC_LOOKS.map((n, i) => (
        <Doll
          key={i}
          look={n.look}
          mood={n.mood}
          seed={i + 1}
          position={[n.at[0], n.at[1], n.at[2]]}
          rotation-y={n.rot}
        />
      ))}
    </>
  );
}

export function VelvetRoom({
  onPick,
  onGame,
}: {
  onPick: PickHandler;
  onGame: (game: MinigameId) => void;
}) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#07020b"]} />
      <fog attach="fog" args={["#12041c", 9, 26]} />
      <Reflections />
      <Lights />
      <Floor
        width={ROOM * 2}
        depth={ROOM * 2}
        color="#120814"
        onPick={onPick}
      />
      <PortalPads room={ROOMS["velvet-room"]} />
      <Walls />
      <Bar />
      <LionCrest position={[-0.8, 3.75, -5.9]} />
      <NeonText
        text="Daydaze"
        color="#ff2f9a"
        font={SCRIPT}
        width={3.4}
        position={[3.9, 2.9, -5.9]}
      />
      <RingNeon
        caption="velvet hour"
        position={[5.92, 2.95, BOOTH.z]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <PlazaDoor />
      <Drape position={[-5.85, 0, -3.4]} />
      <Drape position={[-5.85, 0, 0.4]} />
      <Drape position={[-5.85, 0, 3.6]} color="#3a0a2e" />
      <Booth />
      <DanceFloor />
      <Couple
        a={{ ...DEFAULT_LOOK, hairStyle: "buns", outfit: "mini" }}
        b={{ ...DEFAULT_LOOK, skin: "#94603f", outfit: "fur" }}
        centre={[DANCE.x, DANCE.z]}
        facing={0}
        move="slow-dance"
      />
      <DiscoBall />
      <Chandelier position={[2.2, 3.5, -1.0]} />
      <Palm position={[-5.1, 0, -5.1]} />
      <Palm position={[-5.0, 0, 3.0]} scale={0.85} />
      <Palm position={[5.0, 0, 4.6]} scale={1.1} />
      <Palm position={[5.1, 0, -4.9]} scale={0.9} />
      <Sparkles
        count={140}
        scale={[11, 3.8, 11]}
        position={[0, 2.1, 0]}
        size={2.2}
        speed={calm ? 0 : 0.25}
        color="#ffc8f0"
        opacity={0.7}
      />
      <Regulars />
      {hotspotsIn("velvet-room").map((spot) => (
        <GamePad key={spot.id} spot={spot} onGame={onGame} />
      ))}
    </>
  );
}
