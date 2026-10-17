import { DANCE_OFF_EVERY } from "../../../game/danceOff.ts";

/** `?danceoff=5` shifts the clock so a dance-off is 5 s in when the clock
 * is first read (the HUD's first tick, once the page is up), for tests and
 * screenshots; the real clock otherwise. */
const PREVIEW = Number(
  new URLSearchParams(window.location.search).get("danceoff") ?? Number.NaN,
);
let offset: number | null = Number.isFinite(PREVIEW) ? null : 0;

/** The dance-off clock, seconds. */
export function danceOffClock(): number {
  const now = Date.now() / 1000;
  offset ??= DANCE_OFF_EVERY - (now % DANCE_OFF_EVERY) + PREVIEW;
  return now + offset;
}
