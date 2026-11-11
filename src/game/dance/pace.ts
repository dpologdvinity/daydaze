// How fast the player moves on foot: a stroll in her chosen walk style for a
// short trip, a hurry at the brisk game pace (the jog clip, see stride.ts
// needsRun) for a long one, like GTA. A stroll runs at her style clip's own
// pace (a touch brisk) so the clip plants its feet and the style shows; a
// hurry keeps long distances quick. The pace ramps between the two in a
// fraction of a second, and the clip crossfade in the doll hides the swap. Pure.

import { WALK_SPEED } from "../walk.ts";
import { MAX_TEMPO } from "./stride.ts";

/** A stroll plays its clip a little fast (within the walk tempo clamp). */
export const STROLL_TEMPO = 1.2;
/** Meters from a clicked target past which she hurries; once hurrying, she
 * keeps on until SLOW_DISTANCE from it, so a trip does not flicker. */
export const HURRY_DISTANCE = 7;
export const SLOW_DISTANCE = 2.5;
/** Seconds of held keys or stick before she hurries. */
export const HURRY_AFTER = 1;
/** How fast the pace changes, m/s per second. */
export const PACE_RAMP = 4;

/** Her pace for a short trip, m/s: her style's clip pace (m/s, `undefined`
 * for none, like a wheelchair) at a brisk tempo, never above the hurry. */
export function strollPace(clipSpeed: number | undefined): number {
  if (!(clipSpeed !== undefined && clipSpeed > 0)) return WALK_SPEED;
  return Math.min(WALK_SPEED, clipSpeed * Math.min(STROLL_TEMPO, MAX_TEMPO));
}

/** The player's pace over time. */
export type PaceState = {
  /** Ground speed she is walking at, m/s. */
  pace: number;
  /** In a hurry (long trip). */
  hurry: boolean;
  /** Seconds the move keys or stick have been held. */
  heldFor: number;
};

export function createPace(clipSpeed: number | undefined): PaceState {
  return { pace: strollPace(clipSpeed), hurry: false, heldFor: 0 };
}

/** What she is doing this frame. */
export type PaceInput = {
  /** Her style clip's ground speed, m/s (naturalPace). */
  clipSpeed: number | undefined;
  /** Meters left to a clicked target, or null without one. */
  remaining: number | null;
  /** Move keys or stick held. */
  held: boolean;
};

/** Advances `s` by `dt` seconds and returns it. */
export function stepPace(
  s: PaceState,
  input: PaceInput,
  dt: number,
): PaceState {
  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  s.heldFor = input.held ? s.heldFor + step : 0;
  const { remaining } = input;
  if (input.held) s.hurry = s.heldFor >= HURRY_AFTER;
  else if (remaining !== null && Number.isFinite(remaining))
    s.hurry = remaining > (s.hurry ? SLOW_DISTANCE : HURRY_DISTANCE);
  else s.hurry = false;
  const want = s.hurry ? WALK_SPEED : strollPace(input.clipSpeed);
  const move = PACE_RAMP * step;
  s.pace += Math.max(-move, Math.min(move, want - s.pace));
  return s;
}
