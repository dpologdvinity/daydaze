// One-shot clips that join two postures: sitting down onto a seat and
// standing up from it, instead of popping between the two. Pure; HumanDoll
// plays the clip this picks, once, and then the posture's own loop.

import { clipOf, MOVING } from "./clips.ts";
import type { MocapPack } from "./mocapTypes.ts";
import type { Mood } from "../look.ts";

/** What a doll's body is doing, as far as joining clips care. */
export type Posture = "stand" | "sit" | "move";

/** The posture of a doll this frame: moving over the ground, sitting (the
 * Sit mood, or a wheelchair), or standing (every other mood, swimming
 * included, so a swimmer climbing out never plays a stand-up). */
export function postureOf(s: {
  speed: number;
  mood: Mood;
  seated?: boolean;
  afloat?: boolean;
}): Posture {
  if (s.afloat) return "stand";
  if (s.seated) return "sit";
  if (s.speed > MOVING) return "move";
  return s.mood === "sit" ? "sit" : "stand";
}

/** A transition to play: the clip, how long it runs, and the pack it needs. */
export type Transition = { id: string; seconds: number; pack: MocapPack };

// two ways down, picked by seed so a row of people sits differently (the
// player, seed 0, takes the first); one quick way up (the Mixamo stand-ups
// run five seconds and more)
const SIT_DOWN = ["sit-down", "sit-down-ual"] as const;
const STAND_UP = "stand-up-ual";

/**
 * The clip joining `from` to `to`, or null when the postures need none (or
 * are the same). Walking off a seat needs no stand-up: the walk takes over.
 */
export function pickTransition(
  from: Posture,
  to: Posture,
  seed: number,
): Transition | null {
  let id: string | null = null;
  if (from === "stand" && to === "sit")
    id = SIT_DOWN[Math.abs(Math.floor(seed)) % SIT_DOWN.length] ?? null;
  else if (from === "sit" && to === "stand") id = STAND_UP;
  const clip = clipOf(id ?? undefined);
  if (!id || !clip) return null;
  return { id, seconds: clip.period, pack: clip.pack };
}
