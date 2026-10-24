// Bistro Rue Vert, the Park Avenue French bistro: the shared FoodRoom with a
// green-and-zinc palette, wine bottles, baguettes and globe lamps. Throws if
// the "bistro-rue" venue is missing from FOOD_VENUES.

import type { JSX } from "react";
import { FOOD_VENUES } from "../../../game/food/venues.ts";
import type { PickHandler } from "../shared/Floor.tsx";
import { hdr } from "../shared/materials.ts";
import { FoodRoom, type FoodPalette } from "./FoodRoom.tsx";

const VENUE = FOOD_VENUES.find((v) => v.id === "bistro-rue");
const PALETTE: FoodPalette = {
  room: "bistro",
  background: "#0a120c",
  fog: "#142218",
  sky: "#ffe8c0",
  ground: "#2a4a2a",
  light: "#ffe6c4",
  floor: "#3a2a1e",
  wall: "#e8dcc0",
  counter: "#2f5a3a",
  accent: "#c9a24a",
};
const BOTTLES = ["#3a0a14", "#d8c890", "#3a0a14", "#1a3a1a", "#d8c890"];

/**
 * Bistro Rue Vert on Park Avenue: green tiles under a zinc-topped bar, a
 * row of wine bottles and baguettes in a basket on it, globe lamps, and
 * Élodie behind it. Tap her for the plat du jour.
 */
export function Bistro({ onPick }: { onPick: PickHandler }): JSX.Element {
  if (!VENUE) throw new Error("Bistro Rue Vert is missing from the venues");
  return (
    <FoodRoom
      venue={VENUE}
      palette={PALETTE}
      staff={{
        name: "Élodie",
        role: "server",
        seed: 381,
        look: {
          skin: "#f3d4c4",
          hairStyle: "waves",
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
      {BOTTLES.map((c, i) => (
        <mesh key={i} position={[-2.6 + i * 0.28, 1.32, -0.85]}>
          <cylinderGeometry args={[0.045, 0.045, 0.3, 10]} />
          <meshStandardMaterial color={c} roughness={0.15} metalness={0.2} />
        </mesh>
      ))}
      {/* a basket of baguettes at the far end of the zinc */}
      <mesh position={[2.3, 1.22, -0.85]}>
        <cylinderGeometry args={[0.22, 0.18, 0.14, 14]} />
        <meshStandardMaterial color="#8a5a2a" roughness={0.9} />
      </mesh>
      {[-0.08, 0, 0.08].map((dx, i) => (
        <mesh
          key={i}
          position={[2.3 + dx, 1.45, -0.85]}
          rotation={[0.2 * (i - 1), 0, 0.15 * (i - 1)]}
        >
          <capsuleGeometry args={[0.035, 0.42, 4, 8]} />
          <meshStandardMaterial color="#d8a050" roughness={0.8} />
        </mesh>
      ))}
      {/* globe lamps */}
      {[-2, 0, 2].map((x) => (
        <group key={x} position={[x, 2.6, -0.2]}>
          <mesh>
            <sphereGeometry args={[0.2, 14, 10]} />
            <meshBasicMaterial color={hdr("#fff1d6", 1.5)} toneMapped={false} />
          </mesh>
          <mesh position-y={0.7}>
            <cylinderGeometry args={[0.008, 0.008, 1.2, 4]} />
            <meshBasicMaterial color="#1a1010" />
          </mesh>
        </group>
      ))}
    </FoodRoom>
  );
}
