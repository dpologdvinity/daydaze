import { Environment, Lightformer } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import type { Look, Mood } from "../../game/look.ts";
import { ROOMS } from "../../game/rooms.ts";
import { Doll } from "../avatar/Doll.tsx";
import { SHOP_Z, SHOPS } from "./plaza/layout.ts";
import { Sky } from "./plaza/Sky.tsx";
import { Storefronts } from "./plaza/Storefronts.tsx";
import { Street } from "./plaza/Street.tsx";
import { StringLights } from "./plaza/StringLights.tsx";
import { AmusementGate } from "./plaza/AmusementGate.tsx";
import { Beams, type Beam } from "./shared/Beams.tsx";
import type { PickHandler } from "./shared/Floor.tsx";
import { DECO, Neon, NeonText, SCRIPT } from "./shared/Neon.tsx";
import { Palm } from "./shared/Palm.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

// Found by destination, so other portals on the Plaza can come and go.
const parkGate = ROOMS.plaza.portals.find((p) => p.target === "amusement-park");

const WATER_GATE = ROOMS.plaza.portals.find((p) => p.target === "water-park");

/** A turquoise neon arch at the east end of the street, out to the pools. */
function WaterParkGate() {
  const arch = useMemo(() => {
    const pts = [new THREE.Vector3(0, 0.1, -1), new THREE.Vector3(0, 2.3, -1)];
    for (let i = 1; i < 12; i++) {
      const a = Math.PI - (i / 12) * Math.PI;
      pts.push(new THREE.Vector3(0, 2.3 + Math.sin(a), Math.cos(a)));
    }
    pts.push(new THREE.Vector3(0, 2.3, 1), new THREE.Vector3(0, 0.1, 1));
    return pts;
  }, []);
  if (!WATER_GATE) return null;
  const [x, z] = WATER_GATE.position;
  return (
    <group position={[x + 0.7, 0, z]}>
      <Neon points={arch} color="#3fe0d0" k={4} radius={0.03} />
      <NeonText
        text="water park"
        color="#3fe0d0"
        font={SCRIPT}
        width={2.4}
        k={3}
        position={[0, 3.75, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <NeonText
        text="SPLASH"
        color="#ffb02e"
        font={DECO}
        width={1.4}
        k={2.6}
        position={[0, 4.35, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Palm position={[0, 0, -1.9]} scale={1.2} />
      <Palm position={[0, 0, 1.9]} scale={1.1} />
    </group>
  );
}

// Searchlights from the club roof, sweeping the clouds.
const CLUB_X = SHOPS.find((s) => s.id === "club")?.x ?? 0;
const SEARCHLIGHTS: readonly Beam[] = [
  {
    position: [CLUB_X - 1.4, 5.8, SHOP_Z - 0.4],
    color: "#ff2f9a",
    phase: 0,
    length: 42,
  },
  {
    position: [CLUB_X + 1.4, 5.8, SHOP_Z - 0.4],
    color: "#9b5cff",
    phase: 2.6,
    length: 42,
  },
];

// Regulars out on the street; positions sit inside ROOMS.plaza.walkable.
const LOCALS: readonly {
  look: Look;
  mood: Mood;
  at: [number, number, number];
  rot: number;
}[] = [
  {
    look: {
      skin: "#c48d68",
      hairStyle: "buns",
      hairColor: "#f1d78f",
      lips: "lips-burgundy-cherry",
      brows: "brows-sculpted-espresso",
      outfit: "mini",
      outfitColor: "#141018",
      shadow: "#3fe0d0",
    },
    mood: "pose",
    at: [CLUB_X + 1.9, 0, SHOP_Z + 1.6],
    rot: -0.5,
  },
  {
    look: {
      skin: "#633c29",
      hairStyle: "waves",
      hairColor: "#ff4fb3",
      lips: "lips-hot-pink-glam",
      brows: "brows-fox-snatched",
      outfit: "flares",
      outfitColor: "#e8e2ff",
      shadow: "#ff2f9a",
    },
    mood: "lean",
    at: [6.6, 0, SHOP_Z + 1.3],
    rot: -0.35,
  },
  {
    look: {
      skin: "#f3d4c4",
      hairStyle: "ponytail",
      hairColor: "#4a2a1c",
      lips: "lips-nude-pink-gloss",
      brows: "brows-feathered-honey",
      outfit: "fur",
      outfitColor: "#ff2f9a",
      shadow: "#d23cff",
    },
    mood: "dance",
    at: [-9.4, 0, -3.6],
    rot: 0.7,
  },
];

/** Daydaze Plaza: the outdoor night street that links every venue. */
export function Plaza({ onPick }: { onPick: PickHandler }) {
  return (
    <>
      <color attach="background" args={["#05020f"]} />
      <fog attach="fog" args={["#1c0a3a", 16, 70]} />
      <Environment resolution={128} frames={1}>
        <Lightformer
          form="rect"
          color="#ff2f9a"
          intensity={3}
          position={[0, 3, -8]}
          scale={[20, 3, 1]}
        />
        <Lightformer
          form="rect"
          color="#ffb02e"
          intensity={2}
          position={[0, 6, 6]}
          scale={[16, 2, 1]}
        />
        <Lightformer
          form="ring"
          color="#9b5cff"
          intensity={2}
          position={[-8, 5, 2]}
          scale={4}
        />
      </Environment>
      <ambientLight color="#4a2468" intensity={0.35} />
      <hemisphereLight args={["#3a2a8a", "#ff2f9a", 0.35]} />
      <directionalLight
        position={[-6, 8, -4]}
        color="#9ab8ff"
        intensity={0.6}
      />
      <Sky />
      <Street onPick={onPick} />
      <Storefronts />
      <StringLights />
      <PortalPads room={ROOMS.plaza} />
      {parkGate && <AmusementGate at={parkGate.position} />}
      <WaterParkGate />
      {LOCALS.map((n, i) => (
        <Doll
          key={i}
          look={n.look}
          mood={n.mood}
          seed={i + 11}
          position={n.at}
          rotation-y={n.rot}
        />
      ))}
      <Beams
        beams={SEARCHLIGHTS}
        aim={[CLUB_X, -40]}
        aimY={45}
        spread={[22, 6]}
      />
    </>
  );
}
