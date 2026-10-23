import type { JSX } from "react";
import { FOOD_VENUES } from "../../../game/food/venues.ts";
import type { PickHandler } from "../shared/Floor.tsx";
import { hdr } from "../shared/materials.ts";
import { FoodRoom, type FoodPalette } from "./FoodRoom.tsx";

const VENUE = FOOD_VENUES.find((v) => v.id === "steam-ladle-ramen");
const PALETTE: FoodPalette = {
  room: "ramen-shop",
  background: "#120806",
  fog: "#24120c",
  sky: "#ffd8a8",
  ground: "#5a2a1a",
  light: "#ffe2c0",
  floor: "#2a1a14",
  wall: "#e8d2b0",
  counter: "#6a3a22",
  accent: "#d23a2a",
};
const BOWLS = [-2.4, -1.2, 0, 1.2, 2.4];

/**
 * Steam Ladle Ramen, Downtown: a warm wooden counter under red paper
 * lanterns, steaming bowls lined up for the pass, and Ren at the stockpot.
 * Tap him for a bowl, or work the counter yourself.
 */
export function RamenShop({ onPick }: { onPick: PickHandler }): JSX.Element {
  if (!VENUE) throw new Error("Steam Ladle Ramen is missing from the venues");
  return (
    <FoodRoom
      venue={VENUE}
      palette={PALETTE}
      staff={{
        name: "Ren",
        role: "server",
        seed: 361,
        look: {
          skin: "#e6b48e",
          hairStyle: "sleek-bob",
          hairColor: "#1b1014",
          lips: "lips-burgundy-cherry",
          brows: "brows-sculpted-espresso",
          outfit: "blouse",
          outfitColor: "#f2e6c8",
          shadow: "#8a5a3c",
        },
      }}
      onPick={onPick}
    >
      {BOWLS.map((x) => (
        <group key={x} position={[x, 1.17, -0.85]}>
          <mesh position-y={0.07}>
            <cylinderGeometry args={[0.17, 0.09, 0.14, 16, 1, true]} />
            <meshStandardMaterial color="#1a1414" roughness={0.4} side={2} />
          </mesh>
          <mesh position-y={0.12} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.15, 16]} />
            <meshStandardMaterial color="#e8b878" roughness={0.3} />
          </mesh>
          {/* a soft egg half on each */}
          <mesh position={[0.06, 0.13, 0.03]} scale={[1, 0.5, 1]}>
            <sphereGeometry args={[0.04, 10, 6]} />
            <meshStandardMaterial color="#ffb03a" roughness={0.5} />
          </mesh>
        </group>
      ))}
      {/* red paper lanterns over the counter */}
      {[-2.6, -0.4, 2.6].map((x) => (
        <group key={x} position={[x, 2.45, 0.5]}>
          <mesh scale={[1, 1.3, 1]}>
            <sphereGeometry args={[0.22, 12, 8]} />
            <meshBasicMaterial color={hdr("#ff4a2a", 1.6)} toneMapped={false} />
          </mesh>
          <mesh position-y={0.8}>
            <cylinderGeometry args={[0.008, 0.008, 1.3, 4]} />
            <meshBasicMaterial color="#1a1010" />
          </mesh>
        </group>
      ))}
    </FoodRoom>
  );
}
