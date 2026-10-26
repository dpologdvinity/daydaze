// Karaoke duets at the Karaoke Loft: two players sing the same chart (the
// asker's seed, sent over the `game` relay), trading lines of DUET_LINE notes
// — the asker leads, singing the first line, the partner the next, and so
// on. Each sings their own lines against their own music, so the two clocks
// never need to agree; each sends their part's score when the song ends, and
// both see the two parts and the total. Pure.

import { MAX_GAME_DATA } from "../net/networkProtocol.ts";
import { NOTES, POINTS, type Song } from "./karaokeGame.ts";

/** Notes per line: the singers trade every this many notes. */
export const DUET_LINE = 4;

/** The asker leads (the first line); the one who said yes follows. */
export type DuetRole = "lead" | "follow";

/** Whose line note `index` is on. */
export const duetTurn = (index: number): DuetRole =>
  Math.floor(index / DUET_LINE) % 2 === 0 ? "lead" : "follow";

/** One singer's part of the song: the points of their own lines. */
export const partScore = (song: Song, role: DuetRole) =>
  song.reduce(
    (t, n, i) => t + (duetTurn(i) === role && n.lane ? POINTS[n.swing] : 0),
    0,
  );

/** The most one part can score: half the notes, all perfect. */
const MAX_PART = (NOTES / 2) * POINTS.perfect;

export type DuetMessage =
  | { k: "duet-ask"; seed: number }
  | { k: "duet-yes" }
  | { k: "duet-no" }
  /** Your part's score, once the song is over. */
  | { k: "duet-done"; score: number };

export const encodeDuet = (m: DuetMessage) => JSON.stringify(m);

const whole = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;

/** A relayed message, if it's a duet message and well formed. */
export function parseDuetMessage(data: string): DuetMessage | null {
  if (data.length > MAX_GAME_DATA) return null;
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const k: unknown = Reflect.get(value, "k");
  if (k === "duet-yes" || k === "duet-no") return { k };
  if (k === "duet-ask") {
    const seed: unknown = Reflect.get(value, "seed");
    return whole(seed, 2 ** 32 - 1) ? { k, seed } : null;
  }
  if (k === "duet-done") {
    const score: unknown = Reflect.get(value, "score");
    return whole(score, MAX_PART) ? { k, score } : null;
  }
  return null;
}
