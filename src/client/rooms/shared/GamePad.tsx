import type { ThreeEvent } from "@react-three/fiber";
import type { Hotspot, MinigameId } from "../../../game/hotspots.ts";
import { hdr } from "./materials.ts";

/** A glowing floor ring that opens a 2D minigame when tapped. */
export function GamePad({
  spot,
  onGame,
}: {
  spot: Hotspot;
  onGame: (game: MinigameId) => void;
}) {
  const tap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onGame(spot.game);
  };
  return (
    <group position={[spot.position[0], 0, spot.position[1]]}>
      <mesh position-y={0.02} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[spot.radius * 0.72, spot.radius, 48]} />
        <meshBasicMaterial
          color={hdr("#3fe0d0", 3)}
          toneMapped={false}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* the whole disc is the tap target, so a tap anywhere inside counts */}
      <mesh position-y={0.03} rotation-x={-Math.PI / 2} onClick={tap}>
        <circleGeometry args={[spot.radius, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
