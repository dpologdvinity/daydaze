// Shared bits of the El's client side: the clock the timetable runs on and
// the foot of each station's stairs.
import { stairsFoot, type ElStation } from "../../game/city/el.ts";

/** The timetable's clock: wall-clock seconds, so every player sees the train in the same place. */
export const elClock = (): number => PINNED ?? (Date.now() / 1000) * SPEED;

/** `?elspeed=10` runs the timetable ten times faster, for tests and
 * screenshots. Development builds only. */
const SPEED = (() => {
  if (!import.meta.env.DEV) return 1;
  try {
    const v = Number(new URLSearchParams(location.search).get("elspeed"));
    return v > 0 && v <= 60 ? v : 1;
  } catch {
    return 1;
  }
})();

export const STAIRS_FOOT = (station: ElStation): [number, number] =>
  stairsFoot(station);

/** `?elat=69` freezes the timetable at that second (screenshots).
 * Development builds only. */
const PINNED = (() => {
  if (!import.meta.env.DEV) return null;
  try {
    const v = new URLSearchParams(location.search).get("elat");
    return v === null || !Number.isFinite(Number(v)) ? null : Number(v);
  } catch {
    return null;
  }
})();
