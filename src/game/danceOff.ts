// Pulse's dance-off: every few minutes the DJ calls one, and for half a
// minute the floor scores whoever keeps dancing. Same clock for everyone.

export const DANCE_OFF_EVERY = 300;
export const DANCE_OFF_SECONDS = 30;

export type DanceOffState =
  { on: true; left: number } | { on: false; startsIn: number };

/** Where the dance-off clock stands at `t` seconds. */
export function danceOffAt(t: number): DanceOffState {
  const into = ((t % DANCE_OFF_EVERY) + DANCE_OFF_EVERY) % DANCE_OFF_EVERY;
  return into < DANCE_OFF_SECONDS
    ? { on: true, left: DANCE_OFF_SECONDS - into }
    : { on: false, startsIn: DANCE_OFF_EVERY - into };
}

/** Which dance-off `t` falls in (or follows), to tell one from the next. */
export function danceOffIndex(t: number): number {
  return Math.floor(t / DANCE_OFF_EVERY);
}
