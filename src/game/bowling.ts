// Ten-pin bowling: a ball rolled down one lane into ten pins, simulated on
// the lane's plane, and the scoring of a ten-frame game. Pure and
// deterministic: the same throw always knocks down the same pins.
//
// Lane space: x across the lane (0 down the middle), z from the foul line
// (0) towards the pins. Meters and seconds.

export const LANE_HALF_WIDTH = 0.525;
/** The gutters run outside the lane to this half width. */
export const GUTTER_HALF_WIDTH = 0.64;
export const HEADPIN_Z = 18.29;
/** Past this the ball and any pin drop into the pit. */
export const PIT_Z = 19.4;
export const BALL_RADIUS = 0.109;
export const PIN_RADIUS = 0.06;
const PIN_SPACING = 0.3048;
const ROW_STEP = PIN_SPACING * (Math.sqrt(3) / 2);
/** The oil runs this far: the ball skids straight until here, then hooks. */
const OIL_LENGTH = 12;
const BALL_MASS = 6.5;
const PIN_MASS = 1.5;
const RESTITUTION = 0.7;
const DT = 1 / 240;
/** A pin hit this hard, or pushed this far, goes down. */
const TOPPLE_SPEED = 0.45;
const TOPPLE_SHIFT = 0.07;
/** How far a falling pin's body reaches into its neighbours. */
const TUMBLE_REACH = 0.15;
/** Snapshots for playback, this many per second. */
const SAMPLE_RATE = 30;
const MAX_TIME = 6;

export type Vec2 = readonly [x: number, z: number];

/** The ten pins' spots: the headpin first, then row by row, left to right. */
export const PIN_SPOTS: readonly Vec2[] = [0, 1, 2, 3].flatMap((row) =>
  Array.from({ length: row + 1 }, (_, i): Vec2 => [
    (i - row / 2) * PIN_SPACING,
    HEADPIN_Z + row * ROW_STEP,
  ]),
);

export type Throw = {
  /** Where the ball leaves the hand, across the lane. */
  offset: number;
  /** The line it is aimed along: radians off straight, positive to +x. */
  angle: number;
  /** Speed at release, m/s. */
  speed: number;
  /** Sideways pull once off the oil, m/s². Positive hooks towards +x. */
  hook: number;
};

export const THROW_LIMITS = {
  offset: 0.45,
  angle: 0.03,
  speed: [5, 9.5] as const,
  hook: 1.4,
} as const;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0));

/** A throw with every value held to what a person can bowl. */
export function clampThrow(t: Throw): Throw {
  return {
    offset: clamp(t.offset, -THROW_LIMITS.offset, THROW_LIMITS.offset),
    angle: clamp(t.angle, -THROW_LIMITS.angle, THROW_LIMITS.angle),
    speed: clamp(t.speed, THROW_LIMITS.speed[0], THROW_LIMITS.speed[1]),
    hook: clamp(t.hook, -THROW_LIMITS.hook, THROW_LIMITS.hook),
  };
}

/** One playback frame: the ball, and each pin's spot and how far it has
 * fallen (0 standing, 1 flat). Pins not in the rack stay where they were. */
export type Snapshot = {
  t: number;
  ball: Vec2;
  gutter: boolean;
  pins: readonly (readonly [x: number, z: number, fall: number])[];
};

export type Roll = {
  /** Indices into PIN_SPOTS of the pins this throw knocked down. */
  knocked: readonly number[];
  gutter: boolean;
  frames: readonly Snapshot[];
};

type Body = { x: number; z: number; vx: number; vz: number };
type Pin = Body & { up: boolean; down: boolean; downAt: number };

/** Two bodies touching: push them apart along the line between them. */
function collide(
  a: Body,
  b: Body,
  reach: number,
  ma: number,
  mb: number,
): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  if (d >= reach || d === 0) return false;
  const nx = dx / d;
  const nz = dz / d;
  const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
  if (closing > 0) {
    const j = ((1 + RESTITUTION) * closing) / (1 / ma + 1 / mb);
    a.vx -= (j / ma) * nx;
    a.vz -= (j / ma) * nz;
    b.vx += (j / mb) * nx;
    b.vz += (j / mb) * nz;
  }
  // separate, so they don't stick
  const push = (reach - d) / 2;
  a.x -= nx * push;
  a.z -= nz * push;
  b.x += nx * push;
  b.z += nz * push;
  return true;
}

/**
 * Rolls one ball at the pins still standing (`standing[i]` for PIN_SPOTS[i])
 * and returns which go down, with snapshots to play it back.
 */
export function roll(standing: readonly boolean[], input: Throw): Roll {
  const t0 = clampThrow(input);
  const ball: Body = {
    x: t0.offset,
    z: 0,
    vx: Math.sin(t0.angle) * t0.speed,
    vz: Math.cos(t0.angle) * t0.speed,
  };
  const pins: Pin[] = PIN_SPOTS.map(([x, z], i) => ({
    x,
    z,
    vx: 0,
    vz: 0,
    up: standing[i] === true,
    down: false,
    downAt: 0,
  }));
  const frames: Snapshot[] = [];
  let gutter = false;
  let nextSample = 0;
  let quietFor = 0;
  for (let t = 0; t <= MAX_TIME; t += DT) {
    // the ball: straight on the oil, hooking once it grips the dry lane
    if (ball.z < PIT_Z) {
      if (!gutter && ball.z > OIL_LENGTH) ball.vx += t0.hook * DT;
      ball.x += ball.vx * DT;
      ball.z += ball.vz * DT;
      // off the lane before the pins: into the gutter, straight to the pit
      // and touching nothing (once among the pins it goes where it's thrown)
      if (
        !gutter &&
        ball.z < HEADPIN_Z - 0.3 &&
        Math.abs(ball.x) > LANE_HALF_WIDTH
      ) {
        gutter = true;
        ball.x = Math.sign(ball.x) * GUTTER_HALF_WIDTH;
        ball.vx = 0;
      }
    }
    const live = pins.filter((p) => p.up);
    if (!gutter && ball.z < PIT_Z)
      for (const p of live)
        collide(ball, p, BALL_RADIUS + PIN_RADIUS, BALL_MASS, PIN_MASS);
    // a falling pin tumbles: its body sweeps much wider than its base
    const reach = (p: Pin) => (p.down ? TUMBLE_REACH : PIN_RADIUS);
    for (let i = 0; i < live.length; i++)
      for (let k = i + 1; k < live.length; k++)
        collide(
          live[i],
          live[k],
          reach(live[i]) + reach(live[k]),
          PIN_MASS,
          PIN_MASS,
        );
    let moving = ball.z < PIT_Z;
    pins.forEach((p, i) => {
      if (!p.up) return;
      // pins slide and tumble to a stop
      const decay = Math.exp(-3 * DT);
      p.vx *= decay;
      p.vz *= decay;
      p.x += p.vx * DT;
      p.z += p.vz * DT;
      const [sx, sz] = PIN_SPOTS[i];
      const speed = Math.hypot(p.vx, p.vz);
      if (speed > 0.02) moving = true;
      const off =
        Math.abs(p.x) > LANE_HALF_WIDTH + 0.1 ||
        p.z > PIT_Z ||
        Math.hypot(p.x - sx, p.z - sz) > TOPPLE_SHIFT;
      if (!p.down && (speed > TOPPLE_SPEED || off)) {
        p.down = true;
        p.downAt = t;
      }
    });
    if (t >= nextSample) {
      nextSample += 1 / SAMPLE_RATE;
      frames.push({
        t,
        ball: [ball.x, Math.min(ball.z, PIT_Z)],
        gutter,
        pins: pins.map((p) => [
          p.x,
          p.z,
          p.down ? Math.min(1, (t - p.downAt) * 4) : 0,
        ]),
      });
    }
    quietFor = moving ? 0 : quietFor + DT;
    if (quietFor > 0.6) break;
  }
  const knocked = pins.flatMap((p, i) => (p.up && p.down ? [i] : []));
  return { knocked, gutter, frames };
}

// --- scoring ---------------------------------------------------------------

/** A game in progress: every roll's pin count, in order. */
export type Game = { rolls: readonly number[] };

export const NEW_GAME: Game = { rolls: [] };

/** Where the game stands: the frame (0-9) and ball (0-2) up next, or done. */
export function position(game: Game): {
  frame: number;
  ball: number;
  over: boolean;
} {
  let i = 0;
  for (let frame = 0; frame < 9; frame++) {
    if (i >= game.rolls.length) return { frame, ball: 0, over: false };
    if (game.rolls[i] === 10) {
      i += 1;
      continue;
    }
    if (i + 1 >= game.rolls.length) return { frame, ball: 1, over: false };
    i += 2;
  }
  // the tenth: two balls, or three after a strike or spare
  const tenth = game.rolls.slice(i);
  const bonus = tenth.length >= 2 && tenth[0] + tenth[1] >= 10;
  const balls = bonus ? 3 : 2;
  return {
    frame: 9,
    ball: Math.min(tenth.length, balls),
    over: tenth.length >= balls,
  };
}

/** Whether the next ball meets a fresh rack of ten, or the pins the last
 * ball left standing. */
export function freshRack(game: Game): boolean {
  const { frame, ball } = position(game);
  if (ball === 0) return true;
  const last = game.rolls[game.rolls.length - 1];
  if (frame < 9) return false;
  // in the tenth, a strike or spare racks them again
  const tenth = game.rolls.slice(game.rolls.length - ball);
  if (ball === 1) return last === 10;
  return tenth[0] === 10 ? tenth[1] === 10 : tenth[0] + tenth[1] === 10;
}

/** Adds one ball's pin count, rejecting counts the rack can't have held. */
export function bowl(game: Game, pins: number): Game {
  const at = position(game);
  if (at.over || !Number.isInteger(pins) || pins < 0 || pins > 10) return game;
  if (!freshRack(game)) {
    const prev = game.rolls[game.rolls.length - 1];
    if (prev + pins > 10) return game;
  }
  return { rolls: [...game.rolls, pins] };
}

/** Running totals per frame; null where a frame's bonus balls aren't in. */
export function frameTotals(game: Game): (number | null)[] {
  const r = game.rolls;
  const out: (number | null)[] = [];
  let total = 0;
  let pending = false;
  let i = 0;
  for (let frame = 0; frame < 10; frame++) {
    if (i >= r.length) break;
    let score: number | null;
    if (r[i] === 10) {
      score = i + 2 < r.length ? 10 + r[i + 1] + r[i + 2] : null;
      i += frame === 9 ? 3 : 1;
    } else if (i + 1 >= r.length) {
      score = null;
      i += 2;
    } else if (r[i] + r[i + 1] === 10) {
      score = i + 2 < r.length ? 10 + r[i + 2] : null;
      i += frame === 9 ? 3 : 2;
    } else {
      score = r[i] + r[i + 1];
      i += 2;
    }
    if (score === null || pending) {
      // a total waits on its bonus balls, and every frame after it waits too
      pending = true;
      out.push(null);
      continue;
    }
    total += score;
    out.push(total);
  }
  return out;
}

/** What a scoreboard shows for each frame's balls: X a strike, / a spare,
 * - a miss, otherwise the count. */
export function marks(game: Game): string[][] {
  const r = game.rolls;
  const out: string[][] = [];
  let i = 0;
  const digit = (n: number) => (n === 0 ? "-" : String(n));
  for (let frame = 0; frame < 10 && i < r.length; frame++) {
    if (frame < 9) {
      if (r[i] === 10) {
        out.push(["X"]);
        i += 1;
        continue;
      }
      const balls = [digit(r[i])];
      if (i + 1 < r.length)
        balls.push(r[i] + r[i + 1] === 10 ? "/" : digit(r[i + 1]));
      out.push(balls);
      i += 2;
      continue;
    }
    // the tenth: up to three balls, each racked fresh after a strike/spare
    const balls: string[] = [];
    let left = 10;
    for (const n of r.slice(i, i + 3)) {
      if (n === 10 && left === 10) balls.push("X");
      else if (n === left) balls.push("/");
      else balls.push(digit(n));
      left = n === left ? 10 : left - n;
    }
    out.push(balls);
    i = r.length;
  }
  return out;
}
