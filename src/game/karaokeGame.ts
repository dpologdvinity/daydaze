// Karaoke at the Karaoke Loft: no lyrics, just the melody. Notes come down
// three lanes (low, mid, high) on the beat of the backing track; sing each
// on its lane as it reaches the line. Timing grades like tennis (tennis.ts).
// Pure and seeded: the client keeps the clock (the audio clock, so the notes
// and the music never drift apart).
import type { Swing } from "./tennis.ts";

export const NOTES = 16;
export const LANES = 3;
/** Beats of count-in before the first note. */
export const LEAD_IN = 4;

/** A note: when it reaches the line (clock seconds), its lane, and which
 * beat of the backing track it falls on (counted from the track's start). */
export type Note = { at: number; lane: number; beat: number };

/**
 * The melody for a seed, on the beat of a track at `bpm` that started at
 * clock time `startAt`: one note a beat, sometimes skipping one, the first
 * `LEAD_IN` beats after `from` (now, when you join mid-track).
 */
export function chart(
  seed: number,
  bpm: number,
  startAt: number,
  from = startAt,
): Note[] {
  let h = seed >>> 0 || 1;
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
    h ^= h + Math.imul(h ^ (h >>> 7), 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
  const span = 60 / bpm;
  const notes: Note[] = [];
  let beat = Math.ceil((from - startAt) / span - 1e-9) + LEAD_IN;
  for (let i = 0; i < NOTES; i++) {
    notes.push({
      at: startAt + beat * span,
      lane: Math.floor(rand() * LANES),
      beat,
    });
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

/** Notes sung right (the lane, on time) in a row, back from the last one. */
export function streak(s: Song): number {
  let n = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const note = s[i];
    if (!note?.lane || (note.swing !== "perfect" && note.swing !== "good"))
      break;
    n++;
  }
  return n;
}
