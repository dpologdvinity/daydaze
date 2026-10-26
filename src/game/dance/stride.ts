// How far a walk clip carries the doll, so the legs keep pace with the
// ground. Motion-capture walks are recorded in place: one loop of a clip is
// two steps, and over it each foot swings from in front of the hip to behind
// it and back. The ground covered by one loop (the stride) is twice that
// swing, measured from the clip's hip and knee angles with the doll's leg
// lengths. Advancing the walk phase by distance over stride plants each foot
// while the body moves over it; a fixed rate skates or treadmills. Pure.

import { WALK_SPEED } from "../walk.ts";
import type { Joint, Vec3 } from "./moves.ts";

/** The doll's leg, meters (hip to knee, knee to ankle) at 1.66 m tall. */
export const LEG = { thigh: 0.4, shin: 0.38 };

/** The stride when no clip is loaded yet (the built walk), meters. */
export const BUILT_STRIDE = 1.2;

type Keyed = {
  keys: readonly {
    joints?: Partial<Record<Joint, Vec3 | readonly number[]>>;
  }[];
};

/** Meters one loop of `clip` covers: twice its left foot's fore-aft swing. */
export function clipStride(clip: Keyed): number {
  let min = Infinity;
  let max = -Infinity;
  for (const k of clip.keys) {
    const hip = k.joints?.lLeg?.[0];
    if (hip === undefined) continue;
    const knee = k.joints?.lShin?.[0] ?? 0;
    const reach = LEG.thigh * Math.sin(hip) + LEG.shin * Math.sin(hip + knee);
    min = Math.min(min, reach);
    max = Math.max(max, reach);
  }
  return max > min ? 2 * (max - min) : 0;
}

/** Walk phase, radians a second, at ground speed `speed` (m/s) on a
 * `stride`-meter loop: one full turn per stride covered. */
export const walkPhaseRate = (speed: number, stride: number): number =>
  stride > 0 ? (2 * Math.PI * speed) / stride : 0;

/** How much faster than recorded a walk may play before it reads as a
 * shuffle: a gait walks at most this times its clip's own pace. */
const MAX_TEMPO = 1.5;

/** A gait's ground speed, m/s, from its clip's stride (m) and loop
 * (s): its own pace sped up at most MAX_TEMPO, capped at the walk speed. */
export function gaitPace(stride: number, period: number): number {
  if (!(stride > 0 && period > 0)) return WALK_SPEED;
  return Math.min(WALK_SPEED, (MAX_TEMPO * stride) / period);
}

const measured = new WeakMap<object, number>();

/** `clipStride`, measured once per clip (clips are loaded once, then kept). */
export function strideOf(clip: Keyed): number {
  let s = measured.get(clip);
  if (s === undefined) {
    s = clipStride(clip) || BUILT_STRIDE;
    measured.set(clip, s);
  }
  return s;
}
