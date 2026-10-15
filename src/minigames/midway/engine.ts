/**
 * The midway: three carnival booths at the Amusement Park. Whack-a-mole is
 * reactions, the shooting gallery is aim against moving targets (corks, never
 * blood), and ring toss is timing two swinging meters. Pure TypeScript, so
 * every rule is testable in Node; the view only reads state and reports taps.
 */
import type { PayGrade } from "../../game/wallet.ts";

export type BoothId = "whack" | "gallery" | "rings";
export type Level = "easy" | "medium" | "hard";

export const BOOTHS: readonly { id: BoothId; label: string; blurb: string }[] =
  [
    {
      id: "whack",
      label: "Whack-a-mole",
      blurb: "Bop the moles before they duck. Gold ones pay extra.",
    },
    {
      id: "gallery",
      label: "Shooting gallery",
      blurb: "Pop the ducks and stars with the cork gun. Corks run out.",
    },
    {
      id: "rings",
      label: "Ring toss",
      blurb: "Stop the aim and the power meters to land a ring on a bottle.",
    },
  ];

export const LEVELS: readonly { id: Level; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

/** A seeded 0..1 generator (mulberry32), so a round replays exactly. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------ whack-a-mole

export const WHACK_SECONDS = 30;
export const HOLES = 9;

export type Mole = {
  hole: number;
  /** Seconds into the round when it pops up and ducks back down. */
  up: number;
  down: number;
  golden: boolean;
  hit: boolean;
};

const WHACK_TUNING: Record<Level, { gap: number; stay: number }> = {
  easy: { gap: 0.9, stay: 1.4 },
  medium: { gap: 0.65, stay: 1.0 },
  hard: { gap: 0.45, stay: 0.7 },
};

/** Moles for a whole round; never two in one hole at once. */
export function moleSchedule(level: Level, seed: number): Mole[] {
  const rand = seeded(seed);
  const { gap, stay } = WHACK_TUNING[level];
  const busyUntil: number[] = Array(HOLES).fill(0);
  const moles: Mole[] = [];
  for (let t = 0.6; t < WHACK_SECONDS - 0.5;) {
    // the pace picks up through the round
    const speed = 1 - 0.35 * (t / WHACK_SECONDS);
    const free = busyUntil
      .map((until, hole) => (until <= t ? hole : -1))
      .filter((h) => h >= 0);
    if (free.length) {
      const hole = free[Math.floor(rand() * free.length)];
      const down = t + stay * speed * (0.8 + rand() * 0.4);
      busyUntil[hole] = down + 0.2;
      moles.push({ hole, up: t, down, golden: rand() < 0.08, hit: false });
    }
    t += gap * speed * (0.6 + rand() * 0.8);
  }
  return moles;
}

export type WhackOutcome = "hit" | "golden" | "miss";

/** A tap on a hole at time t: the mole up there now, or a miss. */
export function whack(moles: Mole[], hole: number, t: number): WhackOutcome {
  const mole = moles.find(
    (m) => m.hole === hole && !m.hit && m.up <= t && t <= m.down,
  );
  if (!mole) return "miss";
  mole.hit = true;
  return mole.golden ? "golden" : "hit";
}

export const WHACK_POINTS: Record<WhackOutcome, number> = {
  hit: 10,
  golden: 30,
  miss: -3,
};

// --------------------------------------------------------- shooting gallery

export const GALLERY_SECONDS = 40;
export const LANES = 3;

export type TargetKind = "duck" | "star" | "can";

export type Target = {
  id: number;
  lane: number;
  kind: TargetKind;
  /** Where it was at t = 0, as a fraction of the lane width. */
  x0: number;
  /** Lane widths per second; the sign is the direction. */
  speed: number;
  hit: boolean;
};

export const TARGET_POINTS: Record<TargetKind, number> = {
  duck: 10,
  can: 15,
  star: 40,
};

/** Half-width of a target's hit box, in lane widths. */
export const TARGET_RADIUS: Record<Level, number> = {
  easy: 0.06,
  medium: 0.045,
  hard: 0.035,
};

export const CORKS: Record<Level, number> = { easy: 24, medium: 18, hard: 14 };

const LANE_SPEED: Record<Level, number> = {
  easy: 0.12,
  medium: 0.18,
  hard: 0.26,
};

/** A full gallery: five targets per lane, lanes alternating direction. */
export function galleryTargets(level: Level, seed: number): Target[] {
  const rand = seeded(seed);
  const targets: Target[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    const dir = lane % 2 ? -1 : 1;
    const speed = dir * LANE_SPEED[level] * (1 + lane * 0.25);
    for (let k = 0; k < 5; k++) {
      const r = rand();
      targets.push({
        id: targets.length,
        lane,
        kind: r < 0.12 ? "star" : r < 0.4 ? "can" : "duck",
        x0: (k + rand() * 0.4) / 5,
        speed,
        hit: false,
      });
    }
  }
  return targets;
}

/** Where a target is at time t, 0..1 across its lane (it wraps around). */
export function targetX(target: Target, t: number): number {
  const x = (target.x0 + target.speed * t) % 1;
  return x < 0 ? x + 1 : x;
}

/** A cork fired at (x, lane) at time t: the target it pops, or null. */
export function shoot(
  targets: Target[],
  level: Level,
  lane: number,
  x: number,
  t: number,
): Target | null {
  let best: Target | null = null;
  let bestD = TARGET_RADIUS[level];
  for (const target of targets) {
    if (target.hit || target.lane !== lane) continue;
    const tx = targetX(target, t);
    // the lane wraps, so a target at 0.99 is next to one at 0.01
    const d = Math.min(Math.abs(tx - x), 1 - Math.abs(tx - x));
    if (d <= bestD) {
      best = target;
      bestD = d;
    }
  }
  if (best) best.hit = true;
  // a cleared gallery restocks, so a sharp shooter never runs dry of targets
  if (targets.every((tg) => tg.hit)) for (const tg of targets) tg.hit = false;
  return best;
}

// ---------------------------------------------------------------- ring toss

export const RINGS = 10;
/** Bottles in a 3 by 3 crate: columns across, rows from front to back. */
export const BOTTLE_COLUMNS = 3;
export const BOTTLE_ROWS = 3;

const METER_PERIOD: Record<Level, { aim: number; power: number }> = {
  easy: { aim: 2.6, power: 2.2 },
  medium: { aim: 1.9, power: 1.6 },
  hard: { aim: 1.3, power: 1.1 },
};

/** How close to a bottle's neck counts as a ringer, in crate cells. */
const RINGER: Record<Level, number> = { easy: 0.3, medium: 0.22, hard: 0.16 };

/** The swinging meters at time t, each 0..1 (ping-pong, eased at the ends). */
export function meters(
  level: Level,
  t: number,
): { aim: number; power: number } {
  const p = METER_PERIOD[level];
  const swing = (period: number, phase: number) =>
    (1 - Math.cos((2 * Math.PI * t) / period + phase)) / 2;
  return { aim: swing(p.aim, 0), power: swing(p.power, 1.3) };
}

export type Toss = {
  /** Where the ring lands, in crate cells (column, row from the front). */
  at: [number, number];
  /** The bottle it rings, [column, row], or null for a miss. */
  ringer: [number, number] | null;
  points: number;
};

/** Throws with the aim and power the meters show at the moment of release. */
export function toss(level: Level, aim: number, power: number): Toss {
  const at: [number, number] = [aim * BOTTLE_COLUMNS, power * BOTTLE_ROWS];
  const col = Math.floor(at[0]);
  const row = Math.floor(at[1]);
  if (col < 0 || col >= BOTTLE_COLUMNS || row < 0 || row >= BOTTLE_ROWS)
    return { at, ringer: null, points: 0 };
  // a ringer needs to drop near the bottle's neck, the centre of its cell
  const d = Math.hypot(at[0] - (col + 0.5), at[1] - (row + 0.5));
  if (d > RINGER[level]) return { at, ringer: null, points: 0 };
  // the back row is the hardest reach and pays the most
  return { at, ringer: [col, row], points: 10 * (row + 1) };
}

// ------------------------------------------------------------------ grading

/** Scores needed for S, A and B; anything less grades C. */
const BARS: Record<BoothId, Record<Level, [number, number, number]>> = {
  whack: {
    easy: [220, 160, 90],
    medium: [300, 220, 130],
    hard: [380, 280, 170],
  },
  gallery: {
    easy: [220, 150, 80],
    medium: [200, 140, 75],
    hard: [180, 120, 60],
  },
  rings: {
    easy: [150, 100, 50],
    medium: [130, 80, 40],
    hard: [110, 60, 30],
  },
};

export function grade(booth: BoothId, level: Level, score: number): PayGrade {
  const [s, a, b] = BARS[booth][level];
  return score >= s ? "S" : score >= a ? "A" : score >= b ? "B" : "C";
}
