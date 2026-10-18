// Penalty shootout: five kicks from the spot at a keeper who guesses a way
// to dive. Pure and deterministic: the keeper's guesses come from a seed.
//
// Goal space: x across the goal line (posts at ±POST_X), y up, z out from
// the line towards the spot at SPOT_Z. Meters and seconds.

export type Vec3 = readonly [x: number, y: number, z: number];

export const POST_X = 3.66;
export const BAR_Y = 2.44;
export const SPOT_Z = 11;
export const KICKS = 5;

export type Kick = {
  /** -1 the left post's outside, 1 the right's; the sweep runs past both. */
  direction: number;
  /** 0 a gentle side-foot, 1 everything into it (and it rises). */
  power: number;
};

export type Outcome = "goal" | "saved" | "wide" | "over" | "post";

export type KickResult = {
  outcome: Outcome;
  /** Where it crosses the line (or would have). */
  target: Vec3;
  /** Where the keeper dives to, and when (s after the strike). */
  dive: { x: number; y: number; at: number };
  /** The ball's flight, 30 frames a second, from the spot. */
  frames: readonly Vec3[];
};

/** A small seeded random number generator: the same seed, the same guesses. */
export function seeded(seed: number): () => number {
  let a = Math.floor(seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const finite = (v: number) => (Number.isFinite(v) ? v : 0);

/** Takes kick number `n` of a shootout seeded with `seed`. */
export function kick(seed: number, n: number, input: Kick): KickResult {
  const dir = Math.max(-1.2, Math.min(1.2, finite(input.direction)));
  const power = Math.max(0, Math.min(1, finite(input.power)));
  const x = dir * POST_X;
  // harder strikes rise: the top of the meter clears the bar
  const y = 0.25 + power * power * 2.6;
  const speed = 16 + power * 14;
  const flight = SPOT_Z / speed;

  // the keeper guesses: left, right or stand tall, each kick its own coin
  const rand = seeded(seed * 31 + n * 7919 + 1);
  const r = rand();
  const side = r < 0.42 ? -1 : r < 0.84 ? 1 : 0;
  const dive = {
    x: side * (1.6 + rand() * 1.2),
    y: side === 0 ? 1.1 : 0.4 + rand() * 1.1,
    at: 0.08 + rand() * 0.12,
  };

  let outcome: Outcome;
  const ax = Math.abs(x);
  if (ax > POST_X + 0.12) outcome = "wide";
  else if (y > BAR_Y + 0.12) outcome = "over";
  else if (ax > POST_X - 0.12 || y > BAR_Y - 0.12) outcome = "post";
  else {
    // how far the keeper can stretch, less the faster it comes
    const reach = 1.1 - power * 0.45;
    const gap = Math.hypot(x - dive.x, (y - dive.y) * 0.8);
    outcome = gap < reach ? "saved" : "goal";
  }

  const frames: Vec3[] = [];
  const steps = Math.max(2, Math.round(flight * 30));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // a little loft through the middle of the flight
    frames.push([
      x * t,
      y * t + Math.sin(t * Math.PI) * 0.3 * power,
      SPOT_Z * (1 - t),
    ]);
  }
  // after the line: into the net, back off the keeper, or on out of play
  const last = frames[frames.length - 1];
  const after: Vec3 =
    outcome === "goal"
      ? [last[0] * 1.05, Math.max(0.2, last[1] * 0.6), -1.6]
      : outcome === "saved" || outcome === "post"
        ? [last[0] * 0.8, 0.2, 3.5]
        : [last[0] * 1.4, last[1] + 1, -6];
  for (let i = 1; i <= 15; i++) {
    const t = i / 15;
    frames.push([
      last[0] + (after[0] - last[0]) * t,
      last[1] + (after[1] - last[1]) * t,
      last[2] + (after[2] - last[2]) * t,
    ]);
  }
  return { outcome, target: [x, y, 0], dive, frames };
}

export type Shootout = { results: readonly Outcome[] };

export const NEW_SHOOTOUT: Shootout = { results: [] };

export function goals(game: Shootout): number {
  return game.results.filter((r) => r === "goal").length;
}

export function shootoutOver(game: Shootout): boolean {
  return game.results.length >= KICKS;
}

export function scoreKick(game: Shootout, result: KickResult): Shootout {
  if (shootoutOver(game)) return game;
  return { results: [...game.results, result.outcome] };
}
