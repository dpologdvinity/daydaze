import { SHOW_EVERY } from "../../game/city/fireworks.ts";

/** `?fireworks=20` shifts the show clock so a show is 20 s in at load, for
 * screenshots; 0 otherwise. */
const PREVIEW = Number(
  new URLSearchParams(window.location.search).get("fireworks") ?? Number.NaN,
);
const OFFSET = Number.isFinite(PREVIEW)
  ? SHOW_EVERY - ((Date.now() / 1000) % SHOW_EVERY) + PREVIEW
  : 0;

/** The fireworks clock, seconds. */
export function showClock(): number {
  return Date.now() / 1000 + OFFSET;
}
