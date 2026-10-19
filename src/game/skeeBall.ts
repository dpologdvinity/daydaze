// Skee-Ball at the Boardwalk Arcade: nine balls a game. For each, stop the
// aim meter, then the power meter; where it lands depends on both. Soft
// rolls drop in the low rings, a firm straight one finds the 50, and a hard
// one angled to a top corner can sink a 100 pocket. Pure: the client stops
// the meters and animates the roll.

export const BALLS = 9;
export const RINGS = [0, 10, 20, 30, 40, 50, 100] as const;
export type Ring = (typeof RINGS)[number];

/** Where a ball lands, from aim (-1 left .. 1 right) and power (0..1). */
export function landing(aim: number, power: number): Ring {
  const a = Math.abs(aim);
  if (power < 0.3) return 0;
  if (power < 0.5) return 10;
  if (power < 0.65) return 20;
  if (power < 0.75) return 30;
  if (power < 0.85) return a < 0.35 ? 40 : 20;
  if (power < 0.93) return a < 0.2 ? 50 : 30;
  // a hard roll: into a corner pocket, or off the backboard into the 10
  return a > 0.75 ? 100 : 10;
}

/** The meters sweep back and forth: aim -1..1, power 0..1. */
export function aimAt(seconds: number): number {
  return Math.sin(seconds * 2.4);
}
export function powerAt(seconds: number): number {
  const p = (seconds * 0.8) % 1;
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

export type Game = { rolls: readonly Ring[] };
export const newGame = (): Game => ({ rolls: [] });
export const gameOver = (g: Game) => g.rolls.length >= BALLS;
export const total = (g: Game) => g.rolls.reduce<number>((s, r) => s + r, 0);

export function roll(g: Game, aim: number, power: number): Game {
  if (gameOver(g)) return g;
  return { rolls: [...g.rolls, landing(aim, power)] };
}
