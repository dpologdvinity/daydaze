// The local player's doses (a joint, a vape, an edible, mushroom tea, an LSD tab, a
// molly pill, a line of cocaine) and the meters they make, in memory like the
// buzz: a reload sobers the doll up. Drugs exist only on 18+ servers, so at 13+ a dose does
// nothing. The curves and the body language are in
// game/effects/substances.ts.

import { activeTier, allows } from "../../game/age.ts";
import {
  readMeters,
  soberMeters,
  spent,
  takeWeedHint,
  type Dose,
  type HighLook,
  type Meters,
  type Strain,
  type Taken,
} from "../../game/effects/substances.ts";
import { hasAlcohol } from "./drunk.ts";

const taken: Taken[] = [];
/** Seconds of play: doses are timed on it, so a hidden tab doesn't age them. */
let clock = 0;
const meters: Meters = soberMeters();
const listeners = new Set<() => void>();
let doseToastListener: ((text: string) => void) | null = null;
const changed = () => {
  for (const listen of listeners) listen();
};

/** This frame's screen look, rewritten by DrunkState. */
export const liveHigh: HighLook = {
  glow: 0,
  hue: 0,
  breathe: 0,
  drift: 1,
  radiance: 0,
  geometry: 0,
  tracer: 0,
  wiggle: 0,
};

/** The live meters, refreshed once a frame by `ageHigh`. Read only: the doll
 * reads them every frame, so this is the object itself, not a copy. */
export const getMeters = (): Readonly<Meters> => meters;

/** Takes one of the lounge's items (a weed dose may name its strain; none is
 * hybrid). Returns whether it was taken. */
export function take(dose: Dose, strain?: Strain): boolean {
  if (!allows(activeTier(), "drugs")) return false;
  const hint = takeWeedHint(dose, taken, clock, hasAlcohol());
  taken.push(strain ? { dose, at: clock, strain } : { dose, at: clock });
  changed();
  if (hint) doseToastListener?.(hint);
  return true;
}

/** Registers a listener to show harm-reduction hints when doses are taken. */
export function setDoseToastListener(
  listener: ((text: string) => void) | null,
): void {
  doseToastListener = listener;
}

/** How many doses are still working (read by tests). */
export const dosesOnboard = (): number => taken.length;

/** Moves the play clock on by `seconds`, drops spent doses and refreshes
 * the meters. Called once a frame. */
export function ageHigh(seconds: number): void {
  if (Number.isFinite(seconds) && seconds > 0) clock += seconds;
  for (let i = taken.length - 1; i >= 0; i--) {
    const t = taken[i];
    if (t && spent(t, clock)) taken.splice(i, 1);
  }
  readMeters(taken, clock, meters);
}

/** Dev only: jumps every dose `seconds` further along its curve. */
export function skipAhead(seconds: number): void {
  for (const t of taken) t.at -= seconds;
  changed();
}

export function onHighChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
