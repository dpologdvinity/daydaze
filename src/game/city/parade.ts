// The Pride parade along the Beachside boardwalk: every few minutes a line
// of floats rolls from the west end to the east, dancers aboard. Pure and
// deterministic on the clock, so every player sees the same parade.
import { BOARDWALK } from "./layout.ts";

export const PARADE_EVERY = 360;
/** Meters a second the floats roll at. */
export const PARADE_SPEED = 5;
/** Where the floats start and finish, and their gap. */
export const PARADE_FROM = -330;
export const PARADE_TO = 330;
export const FLOAT_GAP = 22;
export const FLOATS = 4;
export const PARADE_Z = (BOARDWALK.z0 + BOARDWALK.z1) / 2;
/** Seconds from the first float's start to the last float's finish. */
export const PARADE_SECONDS =
  (PARADE_TO - PARADE_FROM + FLOAT_GAP * (FLOATS - 1)) / PARADE_SPEED;

function into(t: number): number {
  return ((t % PARADE_EVERY) + PARADE_EVERY) % PARADE_EVERY;
}

export function paradeOn(t: number): boolean {
  return into(t) < PARADE_SECONDS;
}

/** Each float's x along the boardwalk at `t`, or null when it's not out
 * (still waiting to set off, or finished). */
export function floatX(t: number, k: number): number | null {
  const x = PARADE_FROM + (into(t) * PARADE_SPEED - k * FLOAT_GAP);
  return x >= PARADE_FROM && x <= PARADE_TO ? x : null;
}

/** Seconds until the next parade sets off; 0 while one is on. */
export function nextParadeIn(t: number): number {
  return paradeOn(t) ? 0 : PARADE_EVERY - into(t);
}
