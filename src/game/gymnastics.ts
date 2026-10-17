// A floor routine: a run of elements, each with its cue on the music.
// Press as each element's ring closes to stick it; the judges take a
// tenth off for a near miss and half a point for a missed one, from a
// start value of 10. Pure and deterministic.

export type Element = {
  name: string;
  /** Seconds into the routine when it lands. */
  at: number;
  /** Which dance clip the doll performs while she builds to it. */
  move:
    "voguing" | "hair-flip" | "body-roll" | "y2k-shuffle" | "groove" | "shimmy";
  /** How hard it is: a hit is worth its difficulty in bonus. */
  difficulty: number;
};

export const ROUTINE: readonly Element[] = [
  { name: "Round-off", at: 2.5, move: "groove", difficulty: 0.1 },
  { name: "Back handspring", at: 4.5, move: "body-roll", difficulty: 0.1 },
  { name: "Full twist", at: 6.5, move: "hair-flip", difficulty: 0.2 },
  { name: "Split leap", at: 8.4, move: "voguing", difficulty: 0.1 },
  { name: "Switch ring", at: 10.2, move: "shimmy", difficulty: 0.2 },
  { name: "Double back", at: 12.4, move: "y2k-shuffle", difficulty: 0.3 },
  { name: "Aerial", at: 14.2, move: "hair-flip", difficulty: 0.2 },
  { name: "Stuck landing", at: 16.5, move: "voguing", difficulty: 0.3 },
];
export const ROUTINE_SECONDS = 18;
/** How long before its cue an element's ring starts closing. */
export const LEAD = 1.4;

export type Mark = "stuck" | "near" | "miss";

const PERFECT = 0.1;
const NEAR = 0.25;

/** The element a press at `t` is aimed at, and how well it's timed. */
export function judgePress(t: number): { element: number; mark: Mark } | null {
  let best = -1;
  let off = Infinity;
  ROUTINE.forEach((e, i) => {
    const d = Math.abs(t - e.at);
    if (d < off) {
      off = d;
      best = i;
    }
  });
  if (best < 0 || off > LEAD) return null;
  return {
    element: best,
    mark: off <= PERFECT ? "stuck" : off <= NEAR ? "near" : "miss",
  };
}

export type Routine = { marks: readonly (Mark | null)[] };
export const NEW_ROUTINE: Routine = { marks: ROUTINE.map(() => null) };

/** Scores a press; each element is judged once. */
export function press(r: Routine, t: number): Routine {
  const j = judgePress(t);
  if (!j || r.marks[j.element] !== null) return r;
  const marks = [...r.marks];
  marks[j.element] = j.mark;
  return { marks };
}

/** Elements the clock has passed unpressed count as missed. */
export function closeOut(r: Routine, t: number): Routine {
  const marks = r.marks.map((m, i) =>
    m === null && t > ROUTINE[i].at + NEAR ? ("miss" as const) : m,
  );
  return { marks };
}

/** The judges' score: 10.0 less deductions, plus difficulty for stuck
 * elements, never below 0. */
export function judgesScore(r: Routine): number {
  let score = 10;
  r.marks.forEach((m, i) => {
    if (m === "near") score -= 0.1;
    if (m === "miss") score -= 0.5;
    if (m === "stuck") score += ROUTINE[i].difficulty;
  });
  return Math.max(0, Math.round(score * 1000) / 1000);
}
