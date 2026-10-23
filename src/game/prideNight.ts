// Pride night at the clubs: every so often the dance floors go rainbow for a
// few minutes. Pure and deterministic on the clock, like the parade, so
// every player in every club sees the same night.
import type { RoomId } from "./rooms.ts";

export const PRIDE_EVERY = 900;
export const PRIDE_SECONDS = 240;

export const PRIDE_CLUBS: ReadonlySet<RoomId> = new Set<RoomId>([
  "pulse",
  "sugar-rush",
  "warehouse",
  "la-noche",
  "velvet-room",
  "violet-hour",
]);

const into = (t: number) => ((t % PRIDE_EVERY) + PRIDE_EVERY) % PRIDE_EVERY;

export const prideNightOn = (t: number) => into(t) < PRIDE_SECONDS;

/** Seconds until the next Pride night; 0 while one is on. */
export const nextPrideNightIn = (t: number) =>
  prideNightOn(t) ? 0 : PRIDE_EVERY - into(t);
