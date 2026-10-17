import { DANCE_OFF_EVERY } from "../../../game/danceOff.ts";

/** `?danceoff=5` shifts the clock so a dance-off is 5 s in at load, for
 * tests and screenshots; 0 otherwise. */
const PREVIEW = Number(
  new URLSearchParams(window.location.search).get("danceoff") ?? Number.NaN,
);
const OFFSET = Number.isFinite(PREVIEW)
  ? DANCE_OFF_EVERY - ((Date.now() / 1000) % DANCE_OFF_EVERY) + PREVIEW
  : 0;

/** The dance-off clock, seconds. */
export function danceOffClock(): number {
  return Date.now() / 1000 + OFFSET;
}
