// Kain Tayo, Little Manila's turo-turo: the shared FoodRoom in pink, gold and
// magenta with a row of colored banners and three glowing parol lanterns over
// the counter. Throws on render if the "kain-tayo-turo-turo" venue is missing
// from FOOD_VENUES.

import type { JSX } from "react";
import { FOOD_VENUES } from "../../../game/food/venues.ts";
import type { PickHandler } from "../shared/Floor.tsx";
import { FoodRoom, type FoodPalette } from "./FoodRoom.tsx";

const VENUE = FOOD_VENUES.find((v) => v.id === "kain-tayo-turo-turo");
const PALETTE: FoodPalette = {
  room: "filipino-joint",
  background: "#1a0a10",
  fog: "#2b0f1a",
  sky: "#ffd84f",
  ground: "#ff4fb3",
  light: "#ffb36b",
  floor: "#3a1420",
  wall: "#ffd84f",
  counter: "#c2185b",
  accent: "#ff4fb3",
};
const COLORS = [
  "#ff4fb3",
  "#4fe3ff",
  "#ffd84f",
  "#7dff6b",
  "#b06bff",
  "#ff8a3d",
];

/**
 * The turo-turo: a point-and-eat Filipino kitchen. Parol star lanterns, pandan
 * banners, steam trays along the wall and a cashier behind the counter.
 */
export function FilipinoJoint({
  onPick,
}: {
  onPick: PickHandler;
}): JSX.Element {
  if (!VENUE)
    throw new Error("Point and Eat Kitchen is missing from the venues");
  return (
    <FoodRoom
      venue={VENUE}
      palette={PALETTE}
      staff={{
        name: "Tita Nena",
        role: "cashier",
        seed: 41,
        look: {
          skin: "#94603f",
          hairStyle: "buns",
          hairColor: "#1b1014",
          lips: "lips-hot-pink-glam",
          brows: "brows-sculpted-espresso",
          outfit: "blouse",
          outfitColor: "#ffb02e",
          shadow: "#ff2f9a",
        },
      }}
      onPick={onPick}
    >
      {COLORS.map((color, i) => (
        <mesh key={color} position={[-3.4 + i * 1.36, 3.1, 0.6]}>
          <boxGeometry args={[0.9, 0.12, 0.05]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}
      {[-2.6, 0, 2.6].map((x) => (
        <mesh key={x} position={[x, 2.4, -1.2]}>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshStandardMaterial
            color="#ffd84f"
            emissive="#ffb020"
            emissiveIntensity={2.2}
          />
        </mesh>
      ))}
    </FoodRoom>
  );
}
