// How an animated creature behaves: a small mood machine (idle, walk, eat,
// alert) for animals wandering a loop, and the turning helper that makes them
// face a visitor. Pure and allocation-free: the client's useFrame calls
// `stepWanderer` on a long-lived record. The same record drives a pet; only
// where `a` (the loop angle) goes differs.

export type Mood = "idle" | "walk" | "eat" | "alert";

export type Wanderer = {
  mood: Mood;
  /** Seconds left in the current mood. */
  timer: number;
  /** Angle round the loop (zoo.ts loopAt with t = 0, speed = 1). */
  a: number;
};

/** A visitor this close (meters) makes the animal stop and look. */
export const ALERT_RANGE = 5;
const IDLE_SECONDS: readonly [number, number] = [2, 5];
const WALK_SECONDS: readonly [number, number] = [5, 10];
const EAT_SECONDS: readonly [number, number] = [3, 6];

const span = ([lo, hi]: readonly [number, number], r: number) =>
  lo + (hi - lo) * r;

export const newWanderer = (a: number, timer = 0): Wanderer => ({
  mood: "idle",
  timer,
  a,
});

/**
 * Advances `w` by `dt` seconds. `near` is whether a visitor is within
 * ALERT_RANGE, `angular` the loop angle gained per second while walking
 * (negative walks the other way) and `roll` a 0..1 random source.
 */
export function stepWanderer(
  w: Wanderer,
  dt: number,
  near: boolean,
  angular: number,
  roll: () => number,
): void {
  if (near) {
    w.mood = "alert";
    w.timer = 1;
    return;
  }
  w.timer -= dt;
  if (w.mood === "walk") w.a += angular * dt;
  if (w.timer > 0) return;
  // the mood ran out (or the visitor left): pick the next one
  if (w.mood === "idle") {
    const walk = roll() < 0.6;
    w.mood = walk ? "walk" : "eat";
    w.timer = span(walk ? WALK_SECONDS : EAT_SECONDS, roll());
  } else {
    w.mood = "idle";
    w.timer = span(IDLE_SECONDS, roll());
  }
}

/** `cur` turned toward `target` by at most `step` radians, the short way. */
export function turnToward(cur: number, target: number, step: number): number {
  const d = Math.atan2(Math.sin(target - cur), Math.cos(target - cur));
  return Math.abs(d) <= step ? target : cur + Math.sign(d) * step;
}
