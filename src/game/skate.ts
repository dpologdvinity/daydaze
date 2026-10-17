// Half-pipe: a timed trick run. The rider rolls lip to lip across a half-
// pipe on her own, launching into the air off each lip; press as she comes
// up the wall to throw a trick, timed to the lip. Pure and deterministic.
//
// Pipe space: x across the pipe (lips at ±HALF_WIDTH), y up. Seconds.

export const FLAT = 3;
export const RADIUS = 2.6;
/** From the middle of the flat to a lip, across. */
export const HALF_WIDTH = FLAT / 2 + RADIUS;
export const LIP_Y = RADIUS;
/** Seconds rolling from one lip, down, across and up to the other. */
export const PASS = 1.9;
/** Seconds in the air above a lip, up and back down. */
export const AIR = 0.75;
export const AIR_HEIGHT = 1.4;
export const RUN_SECONDS = 45;

export const TRICKS = [
  "Ollie",
  "Kickflip",
  "Heelflip",
  "Frontside Air",
  "Pop Shove-it",
  "360 Flip",
  "Method",
  "McTwist",
] as const;
export type Trick = (typeof TRICKS)[number];

export type Grade = "perfect" | "good" | "bail";

/** Where the rider is at `t` seconds into the run. */
export type RiderPose = {
  x: number;
  y: number;
  /** The board's tilt on the wall, radians (0 flat). */
  pitch: number;
  /** Which way she's rolling: +1 towards +x. */
  heading: 1 | -1;
  /** 0..1 through an air, or null on the ramp. */
  air: number | null;
  /** The lip she launched from (or will), counting from 0. */
  lip: number;
};

/** A point along the pipe's profile, 0 at the -x lip to 1 at the +x. */
function profile(u: number): { x: number; y: number; pitch: number } {
  const arc = (Math.PI / 2) * RADIUS;
  const total = 2 * arc + FLAT;
  const s = u * total;
  if (s < arc) {
    const a = (1 - s / arc) * (Math.PI / 2);
    return {
      x: -FLAT / 2 - Math.sin(a) * RADIUS,
      y: RADIUS - Math.cos(a) * RADIUS,
      pitch: -a,
    };
  }
  if (s < arc + FLAT) return { x: -FLAT / 2 + (s - arc), y: 0, pitch: 0 };
  const a = ((s - arc - FLAT) / arc) * (Math.PI / 2);
  return {
    x: FLAT / 2 + Math.sin(a) * RADIUS,
    y: RADIUS - Math.cos(a) * RADIUS,
    pitch: a,
  };
}

/** The rider's pose at `t`: she drops in off the -x lip at 0. */
export function riderAt(t: number): RiderPose {
  const cycle = PASS + AIR;
  const k = Math.max(0, Math.floor(t / cycle));
  const into = Math.max(0, t) - k * cycle;
  const towardPlus = k % 2 === 0;
  if (into < PASS) {
    // speed builds down the wall and fades up the other: ease in and out
    const f = into / PASS;
    const u = 0.5 - Math.cos(f * Math.PI) * 0.5;
    const p = profile(towardPlus ? u : 1 - u);
    return {
      x: p.x,
      y: p.y,
      pitch: p.pitch,
      heading: towardPlus ? 1 : -1,
      air: null,
      lip: k,
    };
  }
  const a = (into - PASS) / AIR;
  const side = towardPlus ? 1 : -1;
  return {
    x: side * HALF_WIDTH,
    y: LIP_Y + Math.sin(a * Math.PI) * AIR_HEIGHT,
    pitch: side * (Math.PI / 2) * (1 - a * 2),
    heading: towardPlus ? 1 : -1,
    air: a,
    lip: k,
  };
}

/** When she leaves lip `k`. */
export function lipTime(k: number): number {
  return k * (PASS + AIR) + PASS;
}

/** How well a press at `t` times the trick off the coming lip; null when it's
 * not near enough a lip to count (too early, or already in the air). */
export function gradePress(t: number): { lip: number; grade: Grade } | null {
  const k = Math.max(0, Math.floor((t + 0.6) / (PASS + AIR)));
  const off = t - lipTime(k);
  // the window: from 0.6 s before take-off to 0.15 s after
  if (off < -0.6 || off > 0.15) return null;
  const miss = Math.abs(off + 0.05);
  return {
    lip: k,
    grade: miss < 0.08 ? "perfect" : miss < 0.2 ? "good" : "bail",
  };
}

export type Run = {
  score: number;
  /** Tricks landed in a row; a bail resets it. */
  combo: number;
  /** Lips already tricked (or bailed) this run. */
  used: readonly number[];
  last: { trick: Trick; grade: Grade; points: number } | null;
};

export const NEW_RUN: Run = { score: 0, combo: 0, used: [], last: null };

const BASE: Record<Grade, number> = { perfect: 300, good: 150, bail: 0 };

/** Scores a press at `t`; presses that don't count leave the run alone. */
export function press(run: Run, t: number): Run {
  if (t > RUN_SECONDS) return run;
  const g = gradePress(t);
  if (!g || run.used.includes(g.lip)) return run;
  const trick = TRICKS[(run.used.length * 3 + g.lip) % TRICKS.length];
  const combo = g.grade === "bail" ? 0 : run.combo + 1;
  const points = BASE[g.grade] * Math.max(1, combo);
  return {
    score: run.score + points,
    combo,
    used: [...run.used, g.lip],
    last: { trick, grade: g.grade, points },
  };
}
