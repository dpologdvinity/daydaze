import { Environment, Lightformer } from "@react-three/drei";
import { ROOMS } from "../../game/rooms.ts";
import { SHOP_Z } from "./plaza/layout.ts";
import { Sky } from "./plaza/Sky.tsx";
import { Storefronts } from "./plaza/Storefronts.tsx";
import { Street } from "./plaza/Street.tsx";
import { StringLights } from "./plaza/StringLights.tsx";
import { Beams, type Beam } from "./shared/Beams.tsx";
import type { PickHandler } from "./shared/Floor.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";

// Searchlights from the club roof, sweeping the clouds.
const SEARCHLIGHTS: readonly Beam[] = [
  {
    position: [-1.6, 5.8, SHOP_Z - 0.4],
    color: "#ff2f9a",
    phase: 0,
    length: 42,
  },
  {
    position: [1.2, 5.8, SHOP_Z - 0.4],
    color: "#9b5cff",
    phase: 2.6,
    length: 42,
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
      <Beams beams={SEARCHLIGHTS} aim={[0, -40]} aimY={45} spread={[22, 6]} />
    </>
  );
}
