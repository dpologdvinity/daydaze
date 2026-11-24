// The dance-off clock Pulse's sign and banner share: the real one, or, with
// `?danceoff=<s>`, held `s` seconds into a dance-off until the player first
// dances, so a test or screenshot can never miss the window.

import { DANCE_OFF_EVERY } from "../../../game/danceOff.ts";
import {
  heldClock,
  toNextStart,
  wallSeconds,
  type EventClock,
} from "../../../game/clock.ts";
import { locationSearch } from "../../flags.ts";

// Node tests import this with no `location` global: read it only when present.
const PREVIEW = Number(
  new URLSearchParams(locationSearch()).get("danceoff") ?? Number.NaN,
);
const clock: EventClock | null = Number.isFinite(PREVIEW)
  ? heldClock(DANCE_OFF_EVERY, PREVIEW)
  : null;

/** A dev panel skip, seconds (0 outside development). */
let skew = 0;

/** The dance-off clock, seconds. */
export function danceOffClock(): number {
  return (clock ? clock.read() : wallSeconds()) + skew;
}

/** Dev panel: skip to the start of the next dance-off. */
export function devStartDanceOff(): void {
  skew += toNextStart(danceOffClock(), DANCE_OFF_EVERY);
}

/** The player started dancing: a held preview clock runs on from here. */
export function releaseDanceOffClock(): void {
  clock?.release();
}
