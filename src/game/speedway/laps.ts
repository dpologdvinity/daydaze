// Lap timing for the Speedway: checkpoints must be crossed in order and
// forward; checkpoint 0 is the start line, so crossing it starts lap 1 and then
// closes each lap.

import type { Vec2 } from "../walk.ts";
import type { Track } from "./track.ts";

/**
 * Lap progress for one car; times are in milliseconds on the caller's clock.
 */
export type LapState = {
  nextCheckpoint: number;
  /** The lap being driven; 0 until the car first crosses the start line. */
  lap: number;
  lapStartMs: number;
  bestLapMs: number | null;
  lapTimesMs: readonly number[];
};

/** A car at the grid, before its first crossing of the start line. */
export function initialLap(nowMs: number): LapState {
  return {
    nextCheckpoint: 0,
    lap: 0,
    lapStartMs: nowMs,
    bestLapMs: null,
    lapTimesMs: [],
  };
}

function crosses(p: Vec2, q: Vec2, a: Vec2, b: Vec2): boolean {
  const side = (u: Vec2, v: Vec2, w: Vec2) =>
    (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]);
  const d1 = side(a, b, p);
  const d2 = side(a, b, q);
  const d3 = side(p, q, a);
  const d4 = side(p, q, b);
  return (
    ((d1 > 0 && d2 <= 0) || (d1 < 0 && d2 >= 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

/** Counts only the next checkpoint, and only when crossed in the driving direction. */
export function updateLap(
  track: Track,
  state: LapState,
  from: Vec2,
  to: Vec2,
  nowMs: number,
): LapState {
  const k = state.nextCheckpoint;
  const cp = track.checkpoints[k];
  const fwd = track.checkpointForward[k];
  if (!cp || !fwd || !crosses(from, to, cp.a, cp.b)) return state;
  if ((to[0] - from[0]) * fwd[0] + (to[1] - from[1]) * fwd[1] <= 0)
    return state;
  const next = (k + 1) % track.checkpoints.length;
  if (k !== 0) return { ...state, nextCheckpoint: next };
  if (state.lap === 0)
    return { ...state, nextCheckpoint: next, lap: 1, lapStartMs: nowMs };
  const time = nowMs - state.lapStartMs;
  return {
    nextCheckpoint: next,
    lap: state.lap + 1,
    lapStartMs: nowMs,
    bestLapMs:
      state.bestLapMs === null ? time : Math.min(state.bestLapMs, time),
    lapTimesMs: [...state.lapTimesMs, time],
  };
}
