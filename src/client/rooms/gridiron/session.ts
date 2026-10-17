import {
  AIM_LIMIT,
  kick,
  KICKS,
  NEW_SERIES,
  scoreKick,
  seriesOver,
  type KickResult,
  type Series,
} from "../../../game/fieldGoal.ts";
import { createStore } from "../shared/store.ts";
import { crowd } from "../shared/Stands.tsx";

/** Five field goals: press to sweep the aim, lock it, then the power. */
export type Phase = "off" | "aim" | "power" | "flying" | "over";

const OFF = {
  phase: "off" as Phase,
  series: NEW_SERIES as Series,
  since: 0,
  aim: 0,
  kick: null as KickResult | null,
};

export const fieldGoals = createStore(OFF);

export function aimAt(now: number, since: number): number {
  return Math.sin(((now - since) / 1000) * Math.PI * 0.8) * AIM_LIMIT;
}
export function powerAt(now: number, since: number): number {
  return 0.5 - Math.cos(((now - since) / 1000) * Math.PI * 1.3) * 0.5;
}
/** The kick up next: its distance and wind. */
export function current() {
  const s = fieldGoals.get();
  return KICKS[Math.min(s.series.results.length, KICKS.length - 1)];
}

export function start(now: number) {
  fieldGoals.set({ ...OFF, phase: "aim", since: now });
}
export function leave() {
  fieldGoals.set(OFF);
}
export function press(now: number) {
  const s = fieldGoals.get();
  if (s.phase === "aim")
    fieldGoals.set({ phase: "power", aim: aimAt(now, s.since), since: now });
  else if (s.phase === "power") {
    const { distance, wind } = current();
    const k = kick(distance, wind, {
      aim: s.aim,
      power: powerAt(now, s.since),
    });
    fieldGoals.set({ phase: "flying", kick: k, since: now });
  } else if (s.phase === "over") start(now);
}
export function tick(now: number) {
  const s = fieldGoals.get();
  if (s.phase !== "flying" || !s.kick) return;
  if ((now - s.since) / 1000 < s.kick.frames.length / 30 + 0.8) return;
  const series = scoreKick(s.series, s.kick);
  if (s.kick.result === "good") crowd.cheer = 1;
  fieldGoals.set({
    series,
    kick: null,
    phase: seriesOver(series) ? "over" : "aim",
    since: now,
  });
}
