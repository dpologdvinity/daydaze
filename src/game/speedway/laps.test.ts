import { test } from "node:test";
import assert from "node:assert/strict";
import type { Vec2 } from "../walk.ts";
import { TRACKS, type Track } from "./track.ts";
import { initialLap, updateLap, type LapState } from "./laps.ts";

const track = TRACKS[0];

function mid(cp: Track["checkpoints"][number]): Vec2 {
  return [(cp.a[0] + cp.b[0]) / 2, (cp.a[1] + cp.b[1]) / 2];
}

// A short hop straight across checkpoint i, forwards (dir 1) or backwards (dir -1).
function cross(state: LapState, i: number, now: number, dir = 1): LapState {
  const cp = track.checkpoints[i];
  const m = mid(cp);
  const fwd = track.checkpointForward[i];
  const from: Vec2 = [m[0] - fwd[0] * dir, m[1] - fwd[1] * dir];
  const to: Vec2 = [m[0] + fwd[0] * dir, m[1] + fwd[1] * dir];
  return updateLap(track, state, from, to, now);
}

function fullLap(state: LapState, start: number, ms: number): LapState {
  let s = state;
  const n = track.checkpoints.length;
  for (let i = 1; i < n; i++) s = cross(s, i, start + (ms * i) / n);
  return cross(s, 0, start + ms);
}

test("a forward pass through every checkpoint completes lap 1 with its time", () => {
  let s = cross(initialLap(0), 0, 1000); // leave the grid over the start line
  assert.equal(s.lap, 1);
  s = fullLap(s, 1000, 40000);
  assert.deepEqual(s.lapTimesMs, [40000]);
  assert.equal(s.lap, 2);
});

test("skipping a checkpoint does not complete a lap", () => {
  let s = cross(initialLap(0), 0, 0);
  const n = track.checkpoints.length;
  for (let i = 1; i < n; i++) if (i !== 2) s = cross(s, i, i * 1000);
  s = cross(s, 0, 60000);
  assert.deepEqual(s.lapTimesMs, []);
});

test("crossing the start line backwards and then forwards does not count a lap", () => {
  let s = cross(initialLap(0), 0, 0);
  s = cross(s, 0, 2000, -1);
  s = cross(s, 0, 3000, 1);
  assert.deepEqual(s.lapTimesMs, []);
  assert.equal(s.lap, 1);
});

test("bestLapMs is the fastest lap", () => {
  let s = cross(initialLap(0), 0, 0);
  s = fullLap(s, 0, 50000);
  s = fullLap(s, 50000, 42000);
  s = fullLap(s, 92000, 47000);
  assert.deepEqual(s.lapTimesMs, [50000, 42000, 47000]);
  assert.equal(s.bestLapMs, 42000);
});
