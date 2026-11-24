// The local player's drinking (blood alcohol, drinks still absorbing, food in
// her stomach, any hangover) with change listeners; the rules are in
// `game/effects/buzz.ts`. It lives in memory, so a reload sobers the doll up.
import {
  buzzLevel,
  drinkUp,
  eat,
  sipWater,
  soberBar,
  stepBar,
  type Drink,
  type DrunkLook,
} from "../../game/effects/buzz.ts";
import { activeTier, allows } from "../../game/age.ts";

const bar = soberBar();
const listeners = new Set<() => void>();

/** The current drunk visuals, rewritten each frame by DrunkState. */
export const liveDrunk: DrunkLook = {
  sway: 0,
  wobble: 0,
  warm: 0,
  edge: 0,
  ghost: 0,
  glare: 0,
};

/** The 0..1 buzz meter (BAC / 0.25). */
export function getBuzz(): number {
  return buzzLevel(bar);
}

/** Whether any alcohol is in the system (active BAC or still absorbing). */
export function hasAlcohol(): boolean {
  return bar.bac > 0 || bar.absorbing.length > 0;
}

/** How bad the hangover is, 0..1. */
export function getHangover(): number {
  return bar.hangover;
}

let softDrinkListener: (() => void) | null = null;

/** The food store registers here to show a toast when a 13+ player "has a drink". */
export function setSoftDrinkListener(listener: (() => void) | null): void {
  softDrinkListener = listener;
}

/** Alcohol only exists on 18+ servers; at 13+ the drink is a mocktail and the buzz stays 0. */
export function drink(kind: Drink): void {
  if (!allows(activeTier(), "alcohol")) {
    softDrinkListener?.();
    return;
  }
  drinkUp(bar, kind);
  for (const listen of listeners) listen();
}

/** Eating slows the next drinks; water or a soft drink eases a hangover.
 * Neither sobers her up: only time does. */
export function relieve(kind: "food" | "drink"): void {
  if (kind === "food") eat(bar);
  else sipWater(bar);
  for (const listen of listeners) listen();
}

/** Dev only: moves the drinking on `seconds` at once, and redraws. */
export function passTime(seconds: number): void {
  stepBar(bar, seconds);
  for (const listen of listeners) listen();
}

/** Moves the drinking on by `seconds` of play. Called once a frame. */
export function ageBuzz(seconds: number): void {
  stepBar(bar, seconds);
}

/** Lets the canvas redraw when the buzz changes while the scene is idle. */
export function onBuzzChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
