// Eating and sipping soft drinks both take the edge off the buzz. Alcohol
// goes through `addDrink`; this is the other direction.
import { eatFood, drinkWater } from "../effects/buzz.ts";

export function relieveBuzz(level: number, kind: "food" | "drink"): number {
  return kind === "food" ? eatFood(level) : drinkWater(level);
}
