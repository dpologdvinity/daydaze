import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Look } from "../../game/look.ts";
import { LOG_SEATS, SAND, SHELL_SPOTS } from "../../game/mermaidCove.ts";
import { ROOMS } from "../../game/rooms.ts";
import { Doll } from "../avatar/Doll.tsx";
import { useReducedMotion } from "../motion.ts";
import { leave, SHELL_COLORS, siren, tick } from "./cove/session.ts";
import { fluke, Tail } from "./cove/Tail.tsx";
import { Floor, type PickHandler } from "./shared/Floor.tsx";
import { surface } from "../city/worldTexture.ts";

// real rock round the lagoon, a darker sea cave, sun-bleached driftwood
const COVE_ROCK = surface("rock_face", { scale: 0.8, color: "#8a80a8" });
const CAVE_ROCK = surface("rock_face", { scale: 0.5, color: "#6a6088" });
const DRIFTWOOD = surface("palm_bark", { scale: 1.5, color: "#d8c0a0" });
import { hdr } from "./shared/materials.ts";
import { MARQUEE, NeonText } from "./shared/Neon.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";
import { TalkingNpc } from "./shared/TalkingNpc.tsx";

const PINK = "#ff4fb3";
const WATER_Y = -0.05;

/** The mermaids in the lagoon: where each swims, her look and her tail. */
const MERMAIDS: readonly {
  at: [number, number];
  look: Look;
  tail: string;
  turn: number;
}[] = [
  {
    at: [-3.2, -2.4],
    turn: 0.4,
    tail: "#3fe0d0",
    look: {
      skin: "#e6b48e",
      hairStyle: "mermaid",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-feathered-honey",
      outfit: "baby-tee-mini",
      outfitColor: "#3fe0d0",
      shadow: "#3fe0d0",
    },
  },
  {
    at: [3.4, -3.2],
    turn: -0.5,
    tail: "#9b5cff",
    look: {
      skin: "#633c29",
      hairStyle: "long-curly",
      hairColor: "#7b4dff",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "baby-tee-mini",
      outfitColor: "#9b5cff",
      shadow: "#d23cff",
    },
  },
  {
    at: [0.4, -6.4],
    turn: 0,
    tail: "#ffb02e",
    look: {
      skin: "#f3d4c4",
      hairStyle: "long-straight",
      hairColor: "#f1d78f",
      lips: "lips-nude-pink-gloss",
      brows: "brows-y2k-thin",
      outfit: "baby-tee-mini",
      outfitColor: "#ffb02e",
      shadow: "#ffd1f0",
    },
  },
];

/** A mermaid waist-deep in the lagoon, swaying, her tail flicking up out of
 * the water behind her every few seconds. */
function Mermaid({
  at,
  look,
  tail,
  turn,
  seed,
}: (typeof MERMAIDS)[number] & { seed: number }) {
  const calm = useReducedMotion();
  const body = useRef<THREE.Group>(null);
  const fin = useRef<THREE.Group>(null);
  const finShape = useMemo(fluke, []);
  useEffect(() => () => finShape.dispose(), [finShape]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 2.1;
    if (body.current && !calm)
      body.current.position.y = -0.95 + Math.sin(t * 1.3) * 0.06;
    if (fin.current) {
      // a flick out of the water every seven seconds
      const k = calm ? 0 : Math.max(0, Math.sin(((t % 7) / 1.4) * Math.PI));
      const up = t % 7 < 1.4 ? k : 0;
      fin.current.position.y = WATER_Y - 0.4 + up * 0.75;
      fin.current.rotation.x = -0.4 - up * 0.9;
    }
  });
  return (
    <group position={[at[0], 0, at[1]]} rotation-y={turn}>
      <group ref={body} position-y={-0.95}>
        <Doll look={look} mood="dance" dance="body-roll" seed={seed} />
      </group>
      <group ref={fin} position={[0, WATER_Y - 0.4, -1.1]}>
        <mesh geometry={finShape} rotation-x={-Math.PI / 2}>
          <meshStandardMaterial
            color={tail}
            emissive={tail}
            emissiveIntensity={0.5}
            metalness={0.5}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
      {/* a ring of ripples round her waist */}
      <mesh position-y={WATER_Y + 0.01} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.32, 0.4, 24]} />
        <meshBasicMaterial color="#bff8ff" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/** Mermaids perched on the lagoon's rocks, full tails draped down the rock
 * into the water: [rock x, z, size], her look, tail color and turn. */
const PERCHED: readonly {
  rock: readonly [number, number, number];
  look: Look;
  tail: string;
  turn: number;
}[] = [
  {
    rock: [-7, -3, 1.6],
    turn: 0.5,
    tail: "#ff4fb3",
    look: {
      skin: "#c48d68",
      hairStyle: "mermaid",
      hairColor: "#7ee8a2",
      lips: "lips-90s-caramel-ombre",
      brows: "brows-fox-snatched",
      outfit: "baby-tee-mini",
      outfitColor: "#ff2f9a",
      shadow: "#ff2f9a",
    },
  },
  {
    rock: [6.5, -5, 1.3],
    turn: -0.6,
    tail: "#3a6bff",
    look: {
      skin: "#94603f",
      hairStyle: "waves",
      hairColor: "#c0c0c8",
      lips: "lips-hot-pink-glam",
      brows: "brows-sculpted-espresso",
      outfit: "baby-tee-mini",
      outfitColor: "#3fe0d0",
      shadow: "#2e7dff",
    },
  },
];

/** A mermaid sitting on a rock's front edge, leaning back, her tail
 * hanging down the rock and her fluke over the water. */
function PerchedMermaid({
  rock: [x, z, r],
  look,
  tail,
  turn,
  seed,
}: (typeof PERCHED)[number] & { seed: number }) {
  return (
    <group position={[x, 0, z]} rotation-y={turn}>
      {/* seated on the rock's front edge, leaning back on her hands; the
          sit pose's thighs rest this far above her root */}
      <group position={[0, r * 1.05 - 0.5, r * 0.45]}>
        {/* a shell-top bikini, and no shoes to poke out of the tail */}
        <Doll
          look={look}
          swim={{ style: "bikini", color: look.outfitColor }}
          mood="sit"
          hold="sit-lean-back"
          seed={seed}
        />
        <Tail color={tail} pose="seated" />
      </group>
    </group>
  );
}

/** The four singing shells at the waterline, lighting up as they sing. */
function Shells() {
  const calm = useReducedMotion();
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const { lit } = siren.get();
    SHELL_SPOTS.forEach((_, i) => {
      const m = mats.current[i];
      const g = groups.current[i];
      const on = lit === i;
      if (m) m.color.set(SHELL_COLORS[i]).multiplyScalar(on ? 3 : 0.9);
      if (g)
        g.scale.setScalar(
          on
            ? 1.25
            : 1 + (calm ? 0 : Math.sin(clock.elapsedTime * 2 + i) * 0.03),
        );
    });
  });
  return (
    <>
      {SHELL_SPOTS.map(([x, z], i) => (
        <group
          key={i}
          ref={(g) => {
            groups.current[i] = g;
          }}
          position={[x, 0.05, z]}
        >
          <mesh scale={[0.5, 0.28, 0.42]} rotation-x={-0.2}>
            <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshBasicMaterial
              ref={(m) => {
                mats.current[i] = m;
              }}
              color={SHELL_COLORS[i]}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Ticks Siren Song's playback, and stops it when you leave the cove. */
function SongClock() {
  useEffect(() => () => leave(), []);
  useFrame(() => tick(performance.now()));
  return null;
}

/**
 * Mermaid Cove off Shore Boulevard: a crescent of moonlit sand round a
 * glowing lagoon, rocks and a sea cave's arch beyond, mermaids swaying in
 * the water and flicking their tails, driftwood logs to sit on, and four
 * singing shells at the waterline for Siren Song.
 */
export function MermaidCove({ onPick }: { onPick: PickHandler }) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#0a0820"]} />
      <fog attach="fog" args={["#140c34", 18, 70]} />
      <Stars
        radius={80}
        depth={20}
        count={900}
        factor={3}
        fade
        speed={calm ? 0 : 0.3}
      />
      <hemisphereLight args={["#b8a8ff", "#0b3a4a", 1]} />
      <pointLight
        position={[0, 4, 3]}
        color="#bff8ff"
        intensity={5}
        distance={16}
      />
      <Floor
        width={SAND.x1 - SAND.x0}
        depth={SAND.z1 - SAND.z0}
        center={[0, (SAND.z0 + SAND.z1) / 2]}
        color="#f4e2c8"
        texture={{ id: "coast_sand_01", scale: 0.4 }}
        low={{ metalness: 0, roughness: 0.95 }}
        onPick={onPick}
      />
      {/* the lagoon, glowing faintly from below; opaque, so the swimming
          mermaids are seen from the waist up */}
      <mesh position={[0, WATER_Y, SAND.z0 - 20]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial
          color="#0e5a6a"
          emissive="#0b8a9a"
          emissiveIntensity={0.35}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
      <PortalPads room={ROOMS["mermaid-cove"]} color={PINK} />
      {/* rocks round the lagoon, and the sea cave's arch */}
      {(
        [
          [-7, -3, 1.6],
          [6.5, -5, 1.3],
          [-2.5, -9, 1.1],
          [9, -1.2, 0.9],
        ] as const
      ).map(([x, z, r]) => (
        <mesh
          key={`${x}${z}`}
          position={[x, r * 0.3, z]}
          scale={[r, r * 0.8, r]}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <primitive object={COVE_ROCK} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0, -16]} scale={[1.4, 1.2, 1]}>
        <torusGeometry args={[6, 1.6, 8, 24, Math.PI]} />
        <primitive object={CAVE_ROCK} attach="material" />
      </mesh>
      {/* the moon, and its path on the water */}
      <mesh position={[8, 13, -45]}>
        <circleGeometry args={[3, 32]} />
        <meshBasicMaterial
          color={hdr("#fff4dc", 1.4)}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      {MERMAIDS.map((m, i) => (
        <Mermaid key={i} {...m} seed={271 + i} />
      ))}
      {PERCHED.map((m, i) => (
        <PerchedMermaid key={i} {...m} seed={281 + i} />
      ))}
      <Shells />
      <SongClock />
      {/* driftwood logs up the beach */}
      {[-7.2, 7.2].map((x) => (
        <mesh
          key={x}
          position={[x, 0.2, LOG_SEATS[0][1] + 0.05]}
          rotation-z={Math.PI / 2}
        >
          <cylinderGeometry args={[0.2, 0.22, 1.9, 10]} />
          <primitive object={DRIFTWOOD} attach="material" />
        </mesh>
      ))}
      <Sparkles
        count={60}
        scale={[18, 3, 14]}
        position={[0, 1.4, -4]}
        size={2.4}
        speed={calm ? 0 : 0.25}
        color="#9ff8ff"
        opacity={0.8}
      />
      <NeonText
        text="MERMAID COVE"
        color={PINK}
        font={MARQUEE}
        width={4.6}
        k={3.2}
        position={[0, 3.4, SAND.z1 - 0.1]}
        rotation-y={Math.PI}
      />
      <TalkingNpc
        name="Marina"
        role="regular"
        look={MERMAIDS[0].look}
        mood="idle"
        at={[SAND.x1 - 1.6, 0, 4.4]}
        rot={-Math.PI / 2}
        seed={275}
        greet
        context={{ venue: "mermaid-cove", neighborhood: "beachside" }}
      />
    </>
  );
}
