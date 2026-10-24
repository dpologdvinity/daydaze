// Belt Sushi Yard on Nightlife Row: the shared FoodRoom in slate and pale wood
// with the conveyor belt and paper lamps. Throws on render if the
// "belt-sushi-yard" venue is missing from FOOD_VENUES.

import type { JSX } from "react";
import { FOOD_VENUES } from "../../../game/food/venues.ts";
import { FoodRoom, type FoodPalette } from "../food/FoodRoom.tsx";
import type { PickHandler } from "../shared/Floor.tsx";
import { hdr } from "../shared/materials.ts";
import { SushiBelt } from "./SushiBelt.tsx";

const VENUE = FOOD_VENUES.find((v) => v.id === "belt-sushi-yard");
const PALETTE: FoodPalette = {
  room: "sushi-bar",
  background: "#060a12",
  fog: "#0e1624",
  sky: "#d8ecff",
  ground: "#1a2a3a",
  light: "#eaf4ff",
  floor: "#1a1e26",
  wall: "#e8e4dc",
  counter: "#3a5a7a",
  accent: "#3fe0d0",
};

/**
 * Belt Sushi Yard on Nightlife Row: pale wood and slate, a conveyor riding
 * the length of the counter with plates in every color, and Aiko behind it.
 * Tap her to order, or try Sushi Catch at the belt.
 */
export function SushiBar({ onPick }: { onPick: PickHandler }): JSX.Element {
  if (!VENUE) throw new Error("Belt Sushi Yard is missing from the venues");
  return (
    <FoodRoom
      venue={VENUE}
      palette={PALETTE}
      staff={{
        name: "Aiko",
        role: "server",
        seed: 371,
        look: {
          skin: "#f3d4c4",
          hairStyle: "sleek-bob",
          hairColor: "#1b1014",
          lips: "lips-hot-pink-glam",
          brows: "brows-sculpted-espresso",
          outfit: "blouse",
          outfitColor: "#3a5a8a",
          shadow: "#8a5a3c",
        },
      }}
      onPick={onPick}
    >
      <SushiBelt />
      {/* paper lamps, cool white */}
      {[-2.6, 0, 2.6].map((x) => (
        <group key={x} position={[x, 2.5, 0.5]}>
          <mesh>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshBasicMaterial color={hdr("#f4f8ff", 1.4)} toneMapped={false} />
          </mesh>
          <mesh position-y={0.8}>
            <cylinderGeometry args={[0.008, 0.008, 1.2, 4]} />
            <meshBasicMaterial color="#1a1010" />
          </mesh>
        </group>
      ))}
    </FoodRoom>
  );
}
