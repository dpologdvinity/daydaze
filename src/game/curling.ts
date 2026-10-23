// Curling at the Park Ice Rink: six stones down a sheet laid along the ice.
// Stop the aim meter, then the weight meter; the stone slides, slowing on
// the ice and curling a little; sweep in front of it and it runs further.
// Each stone at rest scores by the ring it sits in. Pure: the client keeps
// time and draws the slide.
// shortcut: stones don't knock each other; add collisions if it ever feels
// flat.

export const STONES = 6;
/** Along +x: the hack you throw from, the button at the house's center. */
export const HACK_X = -6;
export const BUTTON_X = 5;
/** Past this the stone is out the back; wider than this, off the side. */
export const BACK_X = BUTTON_X + 2.2;
export const SIDE = 2;
/** The house's rings, inside out: radius (m) and points. */
export const RINGS = [
  { r: 0.15, points: 4 },
  { r: 0.6, points: 3 },
  { r: 1.2, points: 2 },
  { r: 1.83, points: 1 },
] as const;

const FRICTION = 0.35;
const SWEPT = 0.22;
/** How long one press of Sweep keeps the broom going, in seconds. */
export const SWEEP_SECONDS = 0.5;
const CURL = 0.03;
const STEP = 1 / 60;

export type Throw = {
  /** -1 (left) .. 1 (right). */
  aim: number;
  /** 0 .. 1. */
  weight: number;
};

export const launchSpeed = (weight: number) => 2 + 1.4 * weight;

export type Slide = { x: number; z: number; speed: number; stopped: boolean };

/** Where the stone is `t` seconds after release, swept at `sweeps` (s). */
export function slide(th: Throw, sweeps: readonly number[], t: number): Slide {
  let x = HACK_X;
  let z = 0;
  let v = launchSpeed(th.weight);
  let vz = th.aim * 0.25;
  const steps = Math.min(Math.ceil(t / STEP), 60 * 40);
  for (let i = 0; i < steps && v > 0; i++) {
    const now = i * STEP;
    const swept = sweeps.some((s) => now >= s && now < s + SWEEP_SECONDS);
    v = Math.max(0, v - (swept ? SWEPT : FRICTION) * STEP);
    vz += CURL * STEP;
    x += v * STEP;
    z += vz * STEP * (v > 0 ? 1 : 0);
    if (x > BACK_X || Math.abs(z) > SIDE)
      return { x, z, speed: 0, stopped: true };
  }
  return { x, z, speed: v, stopped: v <= 0 };
}

/** Points for a stone at rest at (x, z). */
export function pointsAt(x: number, z: number): number {
  const d = Math.hypot(x - BUTTON_X, z);
  return RINGS.find((ring) => d <= ring.r)?.points ?? 0;
}

/** The meters sweep back and forth: aim -1..1, weight 0..1. */
export const aimAt = (seconds: number) => Math.sin(seconds * 2.2);
export function weightAt(seconds: number): number {
  const p = (seconds * 0.7) % 1;
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

export type End = {
  stones: readonly { x: number; z: number; points: number }[];
};
export const newEnd = (): End => ({ stones: [] });
export const endOver = (e: End) => e.stones.length >= STONES;
export const endScore = (e: End) =>
  e.stones.reduce((sum, s) => sum + s.points, 0);

export function rest(e: End, at: Slide): End {
  return {
    stones: [...e.stones, { x: at.x, z: at.z, points: pointsAt(at.x, at.z) }],
  };
}
