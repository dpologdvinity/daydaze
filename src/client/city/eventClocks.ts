import { SHOW_EVERY } from "../../game/city/fireworks.ts";
import { PARADE_EVERY } from "../../game/city/parade.ts";
import { PRIDE_EVERY } from "../../game/prideNight.ts";

/** A schedule's clock: the real one, or with `?<flag>=<s>` held still `s`
 * seconds into an event, so screenshots catch it however long the page
 * takes to load. */
function clockFor(flag: string, every: number): () => number {
  const preview = Number(
    new URLSearchParams(window.location.search).get(flag) ?? Number.NaN,
  );
  if (!Number.isFinite(preview)) return () => Date.now() / 1000;
  const held = every * 1000 + preview;
  return () => held;
}

/** The fireworks clock (`?fireworks=20` holds it 20 s into a show). */
export const showClock = clockFor("fireworks", SHOW_EVERY);
/** The parade clock (`?parade=20` holds it 20 s into a parade). */
export const paradeClock = clockFor("parade", PARADE_EVERY);
/** The clubs' Pride night clock (`?pride=20` holds it 20 s into one). */
export const prideClock = clockFor("pride", PRIDE_EVERY);
