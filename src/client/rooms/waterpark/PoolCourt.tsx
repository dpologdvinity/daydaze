// Pool volleyball in the Water Park's wave pool: a low net strung across the
// water, and the beach court's rally (city/VolleyCourt.tsx) played waist-deep
// across it, with splashes instead of sand.

import * as THREE from "three";
import { POOL } from "../../../game/waterPark.ts";
import { VolleyCourt, type CourtSpot } from "../../city/VolleyCourt.tsx";
import type { Player } from "../../world/PlayerController.tsx";
import { POOL_CENTER } from "./Pool.tsx";

/** The pool court: the net runs across the pool's width (along z), so the
 * long sides face east and west; the player's side is the west half. */
export const POOL_COURT: CourtSpot = {
  court: {
    half: (POOL.z1 - POOL.z0) / 2 - 0.4,
    depth: (POOL.x1 - POOL.x0) / 2 - 0.5,
    net: 1.25,
  },
  center: [POOL_CENTER[0], POOL.water, POOL_CENTER[1]],
  // waist-deep: the dolls stand this far below the water line
  floor: POOL.water - 0.85,
  yaw: Math.PI / 2,
  // in close over the coping, in front of the Wave Pool sign
  shot: { back: 2.4, up: 4.4 },
};

const NET_W = POOL.z1 - POOL.z0 + 0.4;
const { net } = POOL_COURT.court;

/** The net across the pool on two posts at the coping, and the rally on it
 * while a pool game is on. */
export function PoolCourt({ player }: { player: Player }) {
  const [x, y, z] = POOL_COURT.center;
  return (
    <>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[x, (net + 0.15) / 2 - 0.1, z + (side * NET_W) / 2]}
        >
          <cylinderGeometry args={[0.05, 0.05, net + 0.35, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      ))}
      {/* the mesh: a translucent band with a bright tape along its top */}
      <mesh position={[x, y + net - 0.3, z]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[NET_W, 0.6]} />
        <meshStandardMaterial
          color="#f4f1ea"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[x, y + net, z]}>
        <boxGeometry args={[0.04, 0.06, NET_W]} />
        <meshStandardMaterial
          color="#ff2f9a"
          emissive="#ff2f9a"
          emissiveIntensity={0.3}
        />
      </mesh>
      <VolleyCourt
        spot={POOL_COURT}
        prize="pool-volleyball"
        player={player}
        water
      />
    </>
  );
}
