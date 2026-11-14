// Purple Pandesal, the ube bakery: the shared FoodRoom in lilac and purple with
// a row of pendant lamps over the counter and ube sweets (Meshy dishes) along
// it. Throws on render if the "purple-pandesal" venue is missing from
// FOOD_VENUES.

import type { JSX } from "react";
import { FOOD_VENUES } from "../../../game/food/venues.ts";
import { Bakes, type Bake } from "../shared/Bakes.tsx";
import { Dishes, type DishAt } from "../shared/Dishes.tsx";
import type { PickHandler } from "../shared/Floor.tsx";
import { FoodRoom, type FoodPalette } from "./FoodRoom.tsx";

const VENUE = FOOD_VENUES.find((v) => v.id === "purple-pandesal");
const PALETTE: FoodPalette = {
  room: "ube-bakery",
  background: "#120820",
  fog: "#241040",
  sky: "#b06bff",
  ground: "#ffd84f",
  light: "#e2b8ff",
  floor: "#3b1c5c",
  wall: "#e3c6ff",
  counter: "#6b3fa0",
  accent: "#b06bff",
};

/** The Quaternius trays (pandesal and rolls, crinkle cookies, donuts and
 * croissants) that stand along the counter top (y 1.17) until the dishes load. */
const COUNTER_BAKES: readonly Bake[] = (
  ["buns", "rolls", "cookies", "donuts", "croissants", "buns", "rolls"] as const
).map((model, i) => ({
  model,
  x: -2.7 + i * 0.9,
  y: 1.17,
  z: -0.85,
  yaw: Math.PI / 2,
}));

/** The day's ube sweets along the counter top, the baker behind them. */
const COUNTER_DISHES: readonly DishAt[] = (
  [
    "pandesal",
    "ensaymada",
    "ube-halaya",
    "bibingka",
    "puto-bumbong",
    "puto-kutsinta",
    "ensaymada",
  ] as const
).map((dish, i) => ({ dish, x: -2.7 + i * 0.9, y: 1.17, z: -0.85 }));

/**
 * The ube bakery: a lilac room with a glass display case of pandesal and
 * ube sweets, hanging pendant lamps and a baker behind the counter.
 */
export function UbeBakery({ onPick }: { onPick: PickHandler }): JSX.Element {
  if (!VENUE)
    throw new Error("Purple Pandesal Bakery is missing from the venues");
  return (
    <FoodRoom
      venue={VENUE}
      palette={PALETTE}
      staff={{
        name: "Dolores",
        role: "cashier",
        seed: 43,
        look: {
          skin: "#633c29",
          hairStyle: "ponytail",
          hairColor: "#4a2a1c",
          lips: "lips-burgundy-cherry",
          brows: "brows-y2k-thin",
          outfit: "fur",
          outfitColor: "#9b5cff",
          shadow: "#7b4dff",
        },
      }}
      onPick={onPick}
    >
      <Dishes
        items={COUNTER_DISHES}
        fallback={<Bakes items={COUNTER_BAKES} />}
      />
      {[-2.6, -1.3, 0, 1.3, 2.6].map((x, i) => (
        <group key={x} position={[x, 2.2, -2.0]}>
          <mesh>
            <sphereGeometry args={[0.2, 12, 10]} />
            <meshStandardMaterial color={i % 2 ? "#ffd84f" : "#c99bff"} />
          </mesh>
        </group>
      ))}
    </FoodRoom>
  );
}
