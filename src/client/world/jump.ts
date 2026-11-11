// The player's jump: Space in the city plays the baked jump clip (a crouch,
// the hop and the landing, in place) on her doll and tells the room, so
// others see it too (peerAction's "jump"). Walking cancels it. No physics: the
// clip carries the height.

import { clipOf } from "../../game/dance/clips.ts";

/** How long a jump lasts, seconds: the clip's own length. */
export const JUMP_SECONDS = clipOf("jump")?.period ?? 2.4;

let until = 0;

/** Starts a jump at `now` (ms). */
export function startJump(now: number): void {
  until = now + JUMP_SECONDS * 1000;
}

/** Ends the jump early (she walked off). */
export function endJump(): void {
  until = 0;
}

/** Whether a jump is still going at `now` (ms). */
export function jumping(now: number): boolean {
  return now < until;
}
