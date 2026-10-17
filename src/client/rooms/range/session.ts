import {
  addShot,
  bucketEmpty,
  hit,
  NEW_BUCKET,
  type Bucket,
  type Shot,
} from "../../../game/golfRange.ts";
import { createStore } from "../shared/store.ts";

/** A bucket of balls: press to start the backswing, press at the top for
 * the power, then press as the strike meter crosses the middle. */
export type Phase = "off" | "power" | "strike" | "flying" | "over";

const OFF = {
  phase: "off" as Phase,
  bucket: NEW_BUCKET as Bucket,
  since: 0,
  power: 0,
  shot: null as Shot | null,
  best: 0,
};

export const range = createStore(OFF);

export function powerAt(now: number, since: number): number {
  return 0.5 - Math.cos(((now - since) / 1000) * Math.PI * 1.1) * 0.5;
}
/** The strike meter, -1..1 sweeping: 0 is a pure strike. */
export function strikeAt(now: number, since: number): number {
  return Math.sin(((now - since) / 1000) * Math.PI * 1.6 - Math.PI / 2);
}

export function start(now: number) {
  range.set({ ...OFF, best: range.get().best, phase: "power", since: now });
}
export function leave() {
  range.set({ ...OFF, best: range.get().best });
}
export function press(now: number) {
  const s = range.get();
  if (s.phase === "power")
    range.set({ phase: "strike", power: powerAt(now, s.since), since: now });
  else if (s.phase === "strike") {
    const shot = hit({ power: s.power, strike: strikeAt(now, s.since) });
    range.set({ phase: "flying", shot, since: now });
  } else if (s.phase === "over") start(now);
}
export function tick(now: number) {
  const s = range.get();
  if (s.phase !== "flying" || !s.shot) return;
  if ((now - s.since) / 1000 < s.shot.frames.length / 30 + 0.8) return;
  const bucket = addShot(s.bucket, s.shot);
  const over = bucketEmpty(bucket);
  const score = bucket.shots.reduce((t, x) => t + x.points, 0);
  range.set({
    bucket,
    shot: null,
    phase: over ? "over" : "power",
    since: now,
    best: over ? Math.max(s.best, score) : s.best,
  });
}
