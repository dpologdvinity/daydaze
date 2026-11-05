// Steam Ladle Ramen, Downtown: the shared FoodRoom with a wooden counter, a row
// of bowls with egg halves and red paper lanterns. Throws on render if the
// "steam-ladle-ramen" venue is missing from FOOD_VENUES.

import type { JSX } from "react";
import { FOOD_VENUES } from "../../../game/food/venues.ts";
import type { PickHandler } from "../shared/Floor.tsx";
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
    ></FoodRoom>
  );
}
