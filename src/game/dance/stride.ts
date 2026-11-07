// How fast a walk plays, so the legs keep pace with the ground. Each baked
// walk clip (art/doll/blender/mocap.py) carries its natural ground speed:
// how fast a planted foot slides back under the hips in the take. Playing
// the clip at ground speed over that speed plants each foot while the body
// moves over it; any other rate skates or treadmills. A clip only stretches
// so far before it reads wrong (a shuffle sped up, a slow-motion stride), so
// the rate is clamped, and the player and the pedestrians walk at their
// gait clip's own pace, so theirs plays at 1x. Pure.

import { WALK_SPEED } from "../walk.ts";

/** The slowest and fastest a walk clip plays against its own pace. */
export const MIN_TEMPO = 0.8;
export const MAX_TEMPO = 1.25;

/** A walk clip's playback rate at ground speed `speed` (m/s), for a clip
 * whose natural speed is `clipSpeed` (m/s): their ratio, clamped. */
export function walkRate(speed: number, clipSpeed: number): number {
  if (!(clipSpeed > 0) || !(speed > 0)) return 1;
  return Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, speed / clipSpeed));
}

/** A gait's ground speed, m/s: the brisk walk speed for every gait. A clip
 * too slow to keep up with it is replaced by the jog (needsRun) rather than
 * played absurdly fast, so the feet stay planted. */
export function gaitPace(): number {
  return WALK_SPEED;
}

/** The built stride, meters a loop: the hand-made walk in pose.ts, worn
 * until the clips load (and by the toon doll). */
export const BUILT_STRIDE = 1.2;

/** Walk phase, radians a second, at ground speed `speed` (m/s) on a
 * `stride`-meter loop: one full turn per stride covered. */
export const walkPhaseRate = (speed: number, stride: number): number =>
  stride > 0 ? (2 * Math.PI * speed) / stride : 0;

/** The jog clip's id: what a walk hands over to when it cannot keep up. */
export const RUN_CLIP = "jog";

/** The fastest the jog plays against its own pace (a run stretches further
 * than a walk before it reads wrong). */
export const MAX_RUN_TEMPO = 1.6;

/** Whether ground speed `speed` is past what a walk clip of natural pace
 * `clipSpeed` can plant its feet to (beyond MAX_TEMPO): then she jogs. */
export function needsRun(speed: number, clipSpeed: number): boolean {
  return clipSpeed > 0 && speed > clipSpeed * MAX_TEMPO;
}

/** The jog clip's playback rate at ground speed `speed`, clamped. */
export function runRate(speed: number, clipSpeed: number): number {
  if (!(clipSpeed > 0) || !(speed > 0)) return 1;
  return Math.min(MAX_RUN_TEMPO, Math.max(MIN_TEMPO, speed / clipSpeed));
}
