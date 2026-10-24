// Jade Whisk Matcha, the boba and matcha cafe: the shared FoodRoom with a
// green-and-pink palette, tapioca jars and glowing cups. Throws if the
// "jade-whisk-matcha" venue is missing from FOOD_VENUES.

import type { JSX } from "react";
import { FOOD_VENUES } from "../../../game/food/venues.ts";
import type { PickHandler } from "../shared/Floor.tsx";
import { FoodRoom, type FoodPalette } from "./FoodRoom.tsx";

const VENUE = FOOD_VENUES.find((v) => v.id === "jade-whisk-matcha");
const PALETTE: FoodPalette = {
  room: "boba-matcha",
  background: "#071a12",
  fog: "#0d2c20",
  sky: "#7dff6b",
  ground: "#ff4fb3",
  light: "#b8ffcf",
  floor: "#173d2c",
  wall: "#c9f7d4",
  counter: "#2e7d5b",
  accent: "#7dff6b",
};
const JARS = ["#2b1408", "#4a2a12", "#7a3b1a", "#1a3d25", "#d9a6c4"];

/**
 * The boba and matcha cafe: a green-and-pink bar with tapioca jars on shelves,
 * a stack of bubble-tea cups and a barista behind the counter.
 */
export function BobaMatchaCafe({
  onPick,
}: {
  onPick: PickHandler;
}): JSX.Element {
  if (!VENUE) throw new Error("Jade Whisk Matcha is missing from the venues");
  return (
    <FoodRoom
      venue={VENUE}
      palette={PALETTE}
      staff={{
        name: "Mei",
        role: "server",
        seed: 42,
        look: {
          skin: "#f3d4c4",
          hairStyle: "waves",
          hairColor: "#4a2a1c",
          lips: "lips-nude-pink-gloss",
          brows: "brows-feathered-honey",
          outfit: "jeans",
          outfitColor: "#3fe0d0",
          shadow: "#3fe0d0",
        },
      }}
      onPick={onPick}
    >
      {[-3.2, -1.6, 0, 1.6, 3.2].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.6, -2.05]}>
            <boxGeometry args={[1.2, 0.08, 0.5]} />
            <meshStandardMaterial color="#2e7d5b" />
          </mesh>
          <mesh position={[0, 2.1, -2.05]}>
            <cylinderGeometry args={[0.24, 0.24, 0.5, 14]} />
            <meshStandardMaterial color={JARS[i]} transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
      {[-2.4, 2.4].map((x, i) => (
        <group key={x} position={[x, 1.25, -1.6]}>
          <mesh>
            <cylinderGeometry args={[0.32, 0.26, 0.36, 16]} />
            <meshStandardMaterial
              color={i ? "#ff4fb3" : "#7dff6b"}
              emissive={i ? "#ff4fb3" : "#7dff6b"}
              emissiveIntensity={0.9}
            />
          </mesh>
          <mesh position={[0, -0.25, 0]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color="#2b1408" />
          </mesh>
        </group>
      ))}
      {[-3, -2.2, -1.4, 1.4, 2.2, 3].map((x) => (
        <mesh key={x} position={[x, 0.25, 0.2]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial color="#2b1408" />
        </mesh>
      ))}
    </FoodRoom>
  );
}
