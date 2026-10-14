import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { ROOMS } from "../../game/rooms.ts";
import { POOL } from "../../game/waterPark.ts";
import { useReducedMotion } from "../motion.ts";
import type { PickHandler } from "./shared/Floor.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Deck } from "./waterpark/Deck.tsx";
import { Locals } from "./waterpark/Locals.tsx";
import { Pool, POOL_CENTER } from "./waterpark/Pool.tsx";
import { Sky } from "./waterpark/Sky.tsx";
import { SplashZone } from "./waterpark/SplashZone.tsx";
import { Tower } from "./waterpark/Tower.tsx";

/** The Water Park: wave pool, slide tower and a sunny deck. */
export function WaterPark({
  onPick,
  onRide,
}: {
  onPick: PickHandler;
  onRide: (slide: number) => void;
}) {
  const calm = useReducedMotion();
  return (
    <>
      <color attach="background" args={["#8fdcff"]} />
      <fog attach="fog" args={["#cdeefc", 40, 110]} />
      <Environment resolution={64} frames={1}>
        <Lightformer
          form="rect"
          color="#ffffff"
          intensity={2}
          position={[0, 8, 0]}
          rotation-x={Math.PI / 2}
          scale={[20, 20, 1]}
        />
        <Lightformer
          form="rect"
          color="#7fe3ff"
          intensity={1.5}
          position={[0, 2, -10]}
          scale={[24, 4, 1]}
        />
      </Environment>
      <ambientLight color="#ffffff" intensity={0.45} />
      <hemisphereLight args={["#d4f1ff", "#f6c58f", 1.1]} />
      <directionalLight position={[-8, 14, 6]} color="#fff0d2" intensity={2} />
      <Sky />
      <Deck onPick={onPick} />
      <Pool />
      <Tower onRide={onRide} />
      <SplashZone position={[-6, 0, 3.6]} />
      <PortalPads room={ROOMS["water-park"]} color="#3fc2ff" />
      <Locals />
      <Sparkles
        count={60}
        scale={[POOL.x1 - POOL.x0, 0.4, POOL.z1 - POOL.z0]}
        position={[POOL_CENTER[0], POOL.water + 0.25, POOL_CENTER[1]]}
        size={3}
        speed={calm ? 0 : 0.3}
        color="#ffffff"
      />
    </>
  );
}
