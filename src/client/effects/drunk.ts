import {
  addDrink,
  decayBuzz,
  type Drink,
  type DrunkLook,
} from "../../game/effects/buzz.ts";
import { activeTier, allows } from "../../game/age.ts";
import { relieveBuzz } from "../../game/food/consume.ts";

// The local player's buzz. It lives in memory, so a reload sobers the doll up.
let level = 0;
const listeners = new Set<() => void>();

/** The current drunk visuals, rewritten each frame by DrunkState. */
export const liveDrunk: DrunkLook = { sway: 0, wobble: 0, warm: 0, edge: 0 };

export function getBuzz(): number {
  return level;
}

/** Alcohol only exists on 18+ servers; at 13+ the drink is a mocktail and the buzz stays 0. */
export function drink(kind: Drink): void {
  if (!allows(activeTier(), "alcohol")) return;
  level = addDrink(level, kind);
  for (const listen of listeners) listen();
}

/** Eating or sipping a soft drink takes the edge off the buzz. */
export function relieve(kind: "food" | "drink"): void {
  level = relieveBuzz(level, kind);
  for (const listen of listeners) listen();
}

/** Fades the buzz by `seconds` of play. Called once a frame. */
export function ageBuzz(seconds: number): void {
  level = decayBuzz(level, seconds);
}

/** Lets the canvas redraw when the buzz changes while the scene is idle. */
export function onBuzzChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
