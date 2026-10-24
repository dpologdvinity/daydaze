// The dance-off clock Pulse's sign and banner share: the real one, or, with
// `?danceoff=<s>`, held `s` seconds into a dance-off until the player first
// dances, so a test or screenshot can never miss the window.

import { DANCE_OFF_EVERY } from "../../../game/danceOff.ts";
import {
  heldClock,
  wallSeconds,
  type EventClock,
} from "../../../game/clock.ts";

const PREVIEW = Number(
  new URLSearchParams(window.location.search).get("danceoff") ?? Number.NaN,
);
const clock: EventClock | null = Number.isFinite(PREVIEW)
  ? heldClock(DANCE_OFF_EVERY, PREVIEW)
  : null;

/** The dance-off clock, seconds. */
export function danceOffClock(): number {
  return clock ? clock.read() : wallSeconds();
}

/** The player started dancing: a held preview clock runs on from here. */
export function releaseDanceOffClock(): void {
  clock?.release();
}
