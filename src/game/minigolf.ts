// Mini golf: three holes, each a walled green with bumpers, and a putt
// rolled across it until it drops or stops. Pure and deterministic: the
// same putt from the same spot always ends the same way.
//
// Hole space: x across, z along the hole (the tee near 0, the cup towards
// -z). Meters and seconds.

export type Vec2 = readonly [x: number, z: number];

export type Hole = {
  name: string;
  par: number;
  /** The green's outline; its edges are the walls the ball bounces off. */
  walls: readonly Vec2[];
  bumpers: readonly { at: Vec2; r: number }[];
  tee: Vec2;
  cup: Vec2;
};

export const HOLES: readonly Hole[] = [
  {
    name: "Straight Shot",
    par: 2,
    walls: [
      [-0.75, 0.6],
      [0.75, 0.6],
      [0.75, -8],
      [-0.75, -8],
    ],
    bumpers: [
      { at: [-0.32, -3.4], r: 0.18 },
      { at: [0.34, -5.2], r: 0.18 },
    ],
    tee: [0, 0],
    cup: [0, -7.2],
  },
  {
    name: "Dogleg",
    par: 3,
    walls: [
      [-0.75, 0.6],
      [0.75, 0.6],
      [0.75, -4.4],
      [3.4, -4.4],
      [3.4, -6],
      [-0.75, -6],
    ],
    bumpers: [{ at: [0, -5.2], r: 0.22 }],
    tee: [0, 0],
    cup: [2.8, -5.2],
  },
  {
    name: "Lighthouse",
    par: 3,
    walls: [
      [-1, 0.6],
      [1, 0.6],
      [1, -9],
      [-1, -9],
    ],
    bumpers: [
      // the lighthouse stands in the middle; the way past is either side
      { at: [0, -4.4], r: 0.5 },
      { at: [-0.75, -6.6], r: 0.16 },
      { at: [0.75, -6.6], r: 0.16 },
    ],
    tee: [0, 0],
    cup: [0, -8.2],
  },
];

export const BALL_RADIUS = 0.04;
export const CUP_RADIUS = 0.085;
/** A putt's speed off the club, m/s, from the lightest tap to the hardest. */
export const PUTT_SPEED = [0.8, 6] as const;
/** After this many strokes the ball is picked up. */
export const MAX_STROKES = 6;
const ROLL_DECEL = 1.1;
const WALL_BOUNCE = 0.72;
const BUMPER_BOUNCE = 0.85;
/** Faster than this over the cup and the ball lips out and rolls on. */
const DROP_SPEED = 1.7;
const DT = 1 / 240;
const SAMPLE_RATE = 30;
const MAX_TIME = 14;

export type Putt = {
  /** The way it's hit: radians, 0 straight down the hole (-z), positive to +x. */
  aim: number;
  /** 0 the lightest tap, 1 the hardest. */
  power: number;
};

export type PuttResult = {
  /** Where it came to rest (the cup's center if it dropped). */
  rest: Vec2;
  holed: boolean;
  /** Ball positions for playback, SAMPLE_RATE per second. */
  frames: readonly Vec2[];
};

const finite = (v: number) => (Number.isFinite(v) ? v : 0);

/** Pushes the ball out of one wall segment and reflects it if it's moving
 * into the wall. Returns whether it touched. */
function bounceSegment(
  p: { x: number; z: number; vx: number; vz: number },
  [ax, az]: Vec2,
  [bx, bz]: Vec2,
): boolean {
  const ex = bx - ax;
  const ez = bz - az;
  const len2 = ex * ex + ez * ez;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - ax) * ex + (p.z - az) * ez) / len2),
  );
  const cx = ax + ex * t;
  const cz = az + ez * t;
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d = Math.hypot(dx, dz);
  if (d >= BALL_RADIUS || d === 0) return false;
  const nx = dx / d;
  const nz = dz / d;
  p.x = cx + nx * BALL_RADIUS;
  p.z = cz + nz * BALL_RADIUS;
  const into = p.vx * nx + p.vz * nz;
  if (into < 0) {
    p.vx -= (1 + WALL_BOUNCE) * into * nx;
    p.vz -= (1 + WALL_BOUNCE) * into * nz;
  }
  return true;
}

/** Whether a point is on the green (inside the walls). */
export function onGreen(hole: Hole, [x, z]: Vec2): boolean {
  let inside = false;
  const w = hole.walls;
  for (let i = 0, j = w.length - 1; i < w.length; j = i++) {
    const [xi, zi] = w[i];
    const [xj, zj] = w[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)
      inside = !inside;
  }
  return inside;
}

/** Rolls one putt from `from` on `hole`. */
export function putt(hole: Hole, from: Vec2, input: Putt): PuttResult {
  const power = Math.max(0, Math.min(1, finite(input.power)));
  const aim = finite(input.aim);
  const speed = PUTT_SPEED[0] + (PUTT_SPEED[1] - PUTT_SPEED[0]) * power;
  const p = {
    x: from[0],
    z: from[1],
    vx: Math.sin(aim) * speed,
    vz: -Math.cos(aim) * speed,
  };
  const frames: Vec2[] = [];
  let nextSample = 0;
  const w = hole.walls;
  for (let t = 0; t <= MAX_TIME; t += DT) {
    if (t >= nextSample) {
      nextSample += 1 / SAMPLE_RATE;
      frames.push([p.x, p.z]);
    }
    const v = Math.hypot(p.vx, p.vz);
    // over the cup slowly enough: in it goes
    if (
      Math.hypot(p.x - hole.cup[0], p.z - hole.cup[1]) < CUP_RADIUS &&
      v < DROP_SPEED
    ) {
      frames.push(hole.cup);
      return { rest: hole.cup, holed: true, frames };
    }
    if (v < 0.02) break;
    // the green slows it evenly
    const slow = Math.max(0, v - ROLL_DECEL * DT) / v;
    p.vx *= slow;
    p.vz *= slow;
    p.x += p.vx * DT;
    p.z += p.vz * DT;
    for (let i = 0; i < w.length; i++)
      bounceSegment(p, w[i], w[(i + 1) % w.length]);
    for (const { at, r } of hole.bumpers) {
      const dx = p.x - at[0];
      const dz = p.z - at[1];
      const d = Math.hypot(dx, dz);
      const reach = r + BALL_RADIUS;
      if (d >= reach || d === 0) continue;
      const nx = dx / d;
      const nz = dz / d;
      p.x = at[0] + nx * reach;
      p.z = at[1] + nz * reach;
      const into = p.vx * nx + p.vz * nz;
      if (into < 0) {
        p.vx -= (1 + BUMPER_BOUNCE) * into * nx;
        p.vz -= (1 + BUMPER_BOUNCE) * into * nz;
      }
    }
  }
  const rest: Vec2 = [p.x, p.z];
  frames.push(rest);
  return { rest, holed: false, frames };
}

// --- a round -----------------------------------------------------------------

/** Strokes taken on each hole so far; the last entry is the hole in play. */
export type Round = {
  strokes: readonly number[];
  /** Where the ball lies on the hole in play. */
  ball: Vec2;
  /** Whether the hole in play is finished (holed or picked up). */
  done: boolean;
};

export const NEW_ROUND: Round = {
  strokes: [0],
  ball: HOLES[0].tee,
  done: false,
};

export function holeIndex(round: Round): number {
  return round.strokes.length - 1;
}

export function roundOver(round: Round): boolean {
  return round.done && holeIndex(round) === HOLES.length - 1;
}

/** Scores a putt into the round. */
export function scorePutt(round: Round, result: PuttResult): Round {
  if (round.done) return round;
  const strokes = [...round.strokes];
  const i = strokes.length - 1;
  strokes[i] += 1;
  const done = result.holed || strokes[i] >= MAX_STROKES;
  return { strokes, ball: result.holed ? HOLES[i].cup : result.rest, done };
}

/** On to the next hole, its ball on the tee. */
export function nextHole(round: Round): Round {
  if (!round.done || roundOver(round)) return round;
  const next = round.strokes.length;
  return { strokes: [...round.strokes, 0], ball: HOLES[next].tee, done: false };
}

/** Total strokes, and how that stands against par for the holes played. */
export function totals(round: Round): { strokes: number; toPar: number } {
  let strokes = 0;
  let par = 0;
  round.strokes.forEach((n, i) => {
    const finished = i < round.strokes.length - 1 || round.done;
    if (!finished) return;
    strokes += n;
    par += HOLES[i].par;
  });
  return { strokes, toPar: strokes - par };
}
