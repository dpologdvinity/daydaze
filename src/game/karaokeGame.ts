// Karaoke at the Karaoke Loft: no lyrics, just the melody. Notes come down
// three lanes (low, mid, high) in time with the backing track; sing each on
// its lane as it reaches the line. Timing grades like tennis (tennis.ts).
// Pure and seeded: the client keeps the clock.
import type { Swing } from "./tennis.ts";

export const NOTES = 16;
export const LANES = 3;
/** Seconds between beats, and the beats before the first note. */
export const BEAT = 0.6;
const LEAD_IN = 4;

export type Note = { at: number; lane: number };

/** The melody for a seed: one note on a beat, sometimes skipping one. */
export function chart(seed: number): Note[] {
  let h = seed >>> 0 || 1;
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
    h ^= h + Math.imul(h ^ (h >>> 7), 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
  const notes: Note[] = [];
  let beat = LEAD_IN;
  for (let i = 0; i < NOTES; i++) {
    notes.push({ at: beat * BEAT, lane: Math.floor(rand() * LANES) });
    beat += rand() < 0.25 ? 2 : 1;
  }
  return notes;
}

/** Each note as sung: how the timing graded, and whether it was the lane. */
export type Song = readonly { swing: Swing; lane: boolean }[];

const POINTS: Record<Swing, number> = {
  perfect: 100,
  good: 60,
  early: 0,
  late: 0,
};

export const songOver = (s: Song) => s.length >= NOTES;

export function sing(s: Song, swing: Swing, rightLane: boolean): Song {
  return songOver(s) ? s : [...s, { swing, lane: rightLane }];
}

export const songScore = (s: Song) =>
  s.reduce((t, n) => t + (n.lane ? POINTS[n.swing] : 0), 0);
