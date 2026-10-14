/**
 * Bassline rhythm rules, ported from Club Lion's DJ Beat Drop. Pure
 * TypeScript: no DOM, no audio, so every rule is testable in Node.
 */

export type Lane = 0 | 1 | 2 | 3;
export const LANES: readonly Lane[] = [0, 1, 2, 3];
export const DJ_BEAT_COUNT = 32;
// 10 hits at 1x, 10 at 2x, 10 at 3x, and the last two at 4x.
export const DJ_MAX_SCORE = 6800;
export const LANE_KEYS = ["D", "F", "J", "K"] as const;
export const LANE_ARROW_KEYS = [
  "ArrowLeft",
  "ArrowDown",
  "ArrowUp",
  "ArrowRight",
] as const;

export type Judgment = "perfect" | "great" | "good" | "miss";

export const JUDGMENT_WINDOW_MS: Record<Exclude<Judgment, "miss">, number> = {
  perfect: 45,
  great: 90,
  good: 140,
};

export const JUDGMENT_LABEL: Record<Judgment, string> = {
  perfect: "Perfect",
  great: "Great",
  good: "Good",
  miss: "Miss",
};

export const JUDGMENT_BASE_POINTS: Record<Judgment, number> = {
  perfect: 100,
  great: 70,
  good: 40,
  miss: 0,
};

export const MAX_COMBO_MULTIPLIER = 4;

/** One multiplier tier per 10 unbroken hits, capped at 4x. */
export function comboMultiplier(combo: number): number {
  if (!Number.isSafeInteger(combo) || combo < 0) return 1;
  return Math.min(MAX_COMBO_MULTIPLIER, 1 + Math.floor(combo / 10));
}

/**
 * Classifies a hit by how far off (ms) the press landed from the note's
 * target time. Negative and positive offsets are equally forgiving.
 */
export function judge(offsetMs: number): Judgment {
  const abs = Math.abs(offsetMs);
  if (abs <= JUDGMENT_WINDOW_MS.perfect) return "perfect";
  if (abs <= JUDGMENT_WINDOW_MS.great) return "great";
  if (abs <= JUDGMENT_WINDOW_MS.good) return "good";
  return "miss";
}

/** Points earned for one note hit, scaled by the combo multiplier in effect. */
export function pointsFor(judgment: Judgment, comboBeforeHit: number): number {
  return JUDGMENT_BASE_POINTS[judgment] * comboMultiplier(comboBeforeHit);
}

/** Combo streak continues on any non-miss hit and resets to zero on a miss. */
export function nextCombo(judgment: Judgment, comboBeforeHit: number): number {
  return judgment === "miss" ? 0 : comboBeforeHit + 1;
}

/** 1 coin per 20 score, so runs with big combos pay out meaningfully more. */
export function coinsForScore(score: number): number {
  if (!Number.isSafeInteger(score) || score < 0) return 0;
  return Math.floor(score / 20);
}

export type BeatNote = {
  id: number;
  lane: Lane;
  timeMs: number;
};

/**
 * Deterministic note chart: one note per lane every beat, lanes chosen by a
 * fixed pattern so charts are reproducible and testable without randomness.
 */
export function generateChart(beatCount: number, bpm = 120): BeatNote[] {
  if (!Number.isSafeInteger(beatCount) || beatCount <= 0) return [];
  const msPerBeat = 60000 / bpm;
  const pattern: Lane[] = [0, 2, 1, 3];
  return Array.from({ length: beatCount }, (_, index) => ({
    id: index,
    lane: pattern[index % pattern.length],
    timeMs: (index + 1) * msPerBeat,
  }));
}

/** Finds the closest unhit note in a lane within the widest (Good) window. */
export function findHittableNote(
  notes: BeatNote[],
  lane: Lane,
  hitNoteIds: ReadonlySet<number>,
  nowMs: number,
): BeatNote | null {
  let best: BeatNote | null = null;
  let bestAbsOffset = Infinity;
  for (const note of notes) {
    if (note.lane !== lane || hitNoteIds.has(note.id)) continue;
    const absOffset = Math.abs(nowMs - note.timeMs);
    if (absOffset <= JUDGMENT_WINDOW_MS.good && absOffset < bestAbsOffset) {
      best = note;
      bestAbsOffset = absOffset;
    }
  }
  return best;
}

/** Lane for a D F J K or arrow key press (any case), or null for other keys. */
export function laneForKey(key: string): Lane | null {
  const upper = key.toUpperCase();
  const index = LANES.findIndex(
    (lane) => LANE_KEYS[lane] === upper || LANE_ARROW_KEYS[lane] === key,
  );
  return index < 0 ? null : LANES[index];
}

export type Tally = { score: number; combo: number; peakStreak: number };

/** Replays judgments in the order they happened into score and streaks. */
export function tally(judgments: readonly Judgment[]): Tally {
  let score = 0;
  let combo = 0;
  let peakStreak = 0;
  for (const judgment of judgments) {
    score += pointsFor(judgment, combo);
    combo = nextCombo(judgment, combo);
    peakStreak = Math.max(peakStreak, combo);
  }
  return { score, combo, peakStreak };
}

export type Grade = "S" | "A" | "B" | "C";

export type Result = {
  score: number;
  peakStreak: number;
  /** Whole percent, 0 to 100: base points earned over a perfect run's. */
  accuracy: number;
  grade: Grade;
};

/** Grade thresholds on whole-percent accuracy. */
export function gradeFor(accuracy: number): Grade {
  if (accuracy >= 95) return "S";
  if (accuracy >= 85) return "A";
  if (accuracy >= 70) return "B";
  return "C";
}

/** Final result of a set; notes never judged count as misses. */
export function resultFor(
  judgments: readonly Judgment[],
  noteCount: number,
): Result {
  const { score, peakStreak } = tally(judgments);
  const earned = judgments.reduce(
    (sum, judgment) => sum + JUDGMENT_BASE_POINTS[judgment],
    0,
  );
  const possible =
    Math.max(noteCount, judgments.length) * JUDGMENT_BASE_POINTS.perfect;
  const accuracy = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  return { score, peakStreak, accuracy, grade: gradeFor(accuracy) };
}
