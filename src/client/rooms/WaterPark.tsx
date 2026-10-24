import { Environment, Lightformer } from "@react-three/drei";
import { Suspense } from "react";
import { useQuality } from "../world/quality.ts";
import { ROOMS } from "../../game/rooms.ts";
import { POOL } from "../../game/waterPark.ts";
import { useReducedMotion } from "../motion.ts";
import type { PickHandler } from "./shared/Floor.tsx";
import { PortalPads } from "./shared/PortalPads.tsx";
import { Deck } from "./waterpark/Deck.tsx";
import { Locals } from "./waterpark/Locals.tsx";
import { Pool, POOL_CENTER } from "./waterpark/Pool.tsx";
import { PoolCourt } from "./waterpark/PoolCourt.tsx";
import { DiveScene } from "./waterpark/DiveScene.tsx";
import { SlideRace } from "./waterpark/SlideRace.tsx";
import type { Player } from "../world/PlayerController.tsx";
import { Sky } from "./waterpark/Sky.tsx";
import { SplashZone } from "./waterpark/SplashZone.tsx";
import { Tower } from "./waterpark/Tower.tsx";
import { Sparkles } from "./shared/Sparkles.tsx";

/** The Water Park: wave pool, slide tower and a sunny deck. */
export function WaterPark({
  onPick,
  onRide,
  player,
}: {
  onPick: PickHandler;
  onRide: (slide: number) => void;
  player: Player;
}) {
  const calm = useReducedMotion();
  const quality = useQuality();
  return (
    <>
      <color attach="background" args={["#8fdcff"]} />
      <fog attach="fog" args={["#cdeefc", 40, 110]} />
      {/* high tier: a real sky in the water and on wet skin */}
      {quality === "high" ? (
        <Suspense fallback={null}>
          <Environment
            files="/hdri/kloofendal_48d_partly_cloudy_puresky.hdr"
            environmentIntensity={0.8}
          />
        </Suspense>
      ) : (
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
      )}
      <ambientLight color="#ffffff" intensity={0.45} />
      <hemisphereLight args={["#d4f1ff", "#f6c58f", 1.1]} />
      <directionalLight position={[-8, 14, 6]} color="#fff0d2" intensity={2} />
      <Sky />
      <Deck onPick={onPick} />
      <Pool />
      <PoolCourt player={player} />
      <DiveScene player={player} />
      <SlideRace player={player} />
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
