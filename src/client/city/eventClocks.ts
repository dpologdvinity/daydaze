// The city's event clocks: the real one, or with `?<flag>=<s>` held still `s`
// seconds into an event, so screenshots catch it however long the page takes
// to load.

import { SHOW_EVERY } from "../../game/city/fireworks.ts";
import { PARADE_EVERY } from "../../game/city/parade.ts";
import { heldClock, wallSeconds } from "../../game/clock.ts";
import { PRIDE_EVERY } from "../../game/prideNight.ts";
import { schedule } from "../../game/events.ts";

/** A schedule's clock: real, or held by its URL flag. */
function clockFor(flag: string, every: number): () => number {
  const preview = Number(
    new URLSearchParams(window.location.search).get(flag) ?? Number.NaN,
  );
  if (!Number.isFinite(preview)) return wallSeconds;
  const held = heldClock(every, preview);
  return () => held.read();
}

/** The fireworks clock (`?fireworks=20` holds it 20 s into a show). */
export const showClock = clockFor("fireworks", SHOW_EVERY);
/** The parade clock (`?parade=20` holds it 20 s into a parade). */
export const paradeClock = clockFor("parade", PARADE_EVERY);
/** The clubs' Pride night clock (`?pride=20` holds it 20 s into one). */
export const prideClock = clockFor("pride", PRIDE_EVERY);

/**
 * The club nights' clock, in epoch ms: the real time, or with
 * `?night=latin-night` (any CLUB_NIGHTS id) set an hour into that night's
 * next run, so a screenshot or a test can see it on any day of the week.
 */
export const nightClock: () => number = (() => {
  const id = new URLSearchParams(window.location.search).get("night");
  const row = schedule(Date.now()).find((r) => r.id === id);
  if (!row) return () => Date.now();
  const offset = row.on ? 0 : row.inMs + 3_600_000;
  return () => Date.now() + offset;
})();
