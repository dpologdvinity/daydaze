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

/**
 * A transition to play: the clip, how long it runs (`seconds`, at `rate`
 * times the clip's own speed), the pack it needs, and `reach`: how far (m)
 * ahead of the doll's root the clip's hips start (sit-down) or end (stand-up).
 * The clips carry that last step themselves, so the root only covers the rest.
 */
export type Transition = {
  id: string;
  seconds: number;
  pack: MocapPack;
  rate: number;
  reach: number;
};

// two ways down, picked by seed so a row of people sits differently (the
// player, seed 0, takes the first, the quicker); one quick way up (the Mixamo
// stand-ups run five seconds and more)
const SIT_DOWN = ["sit-down-ual", "sit-down"] as const;
const STAND_UP = "stand-up-ual";

/** A joining clip is sped up toward this many seconds, but never past
 * `MAX_RATE` times (a slow take looks wrong sped up much more). */
const TARGET_SECONDS = 1;
const MAX_RATE = 1.6;

// measured on the baked clips (the Hips track's forward travel, anims-seated.glb)
const REACH: Readonly<Record<string, number>> = {
  "sit-down": 0.47,
  "sit-down-ual": 0.26,
  "stand-up-ual": 0.26,
};

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
  const rate = Math.min(MAX_RATE, Math.max(1, clip.period / TARGET_SECONDS));
  return {
    id,
    seconds: clip.period / rate,
    pack: clip.pack,
    rate,
    reach: REACH[id] ?? 0,
  };
}
