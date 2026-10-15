export const TICK_HZ = 50;
export const MAX_TICKS_PER_FRAME = 5;

const TICK = 1 / TICK_HZ;

export type StepClock = { accumulator: number };

// Runs `step` once per whole fixed tick and returns the interpolation alpha in [0, 1).
// After a long pause (a backgrounded tab) at most MAX_TICKS_PER_FRAME run; the rest is dropped.
export function advance(
  clock: StepClock,
  dtSeconds: number,
  step: () => void,
): number {
  const dt = Number.isNaN(dtSeconds) || dtSeconds < 0 ? 0 : dtSeconds;
  clock.accumulator = Math.min(
    clock.accumulator + dt,
    TICK * (MAX_TICKS_PER_FRAME + 1),
  );
  let ticks = 0;
  while (clock.accumulator >= TICK && ticks < MAX_TICKS_PER_FRAME) {
    step();
    clock.accumulator -= TICK;
    ticks++;
  }
  if (clock.accumulator >= TICK) clock.accumulator %= TICK;
  return clock.accumulator / TICK;
}
