import {
  NEW_RUN,
  press as pressRun,
  RUN_SECONDS,
  type Run,
} from "../../../game/skate.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";
import { crowd } from "../shared/Stands.tsx";

/** A half-pipe run: drop in, then press as you come up each wall to throw
 * a trick off the lip. */
export type Phase = "off" | "riding" | "over";

const OFF = {
  phase: "off" as Phase,
  run: NEW_RUN as Run,
  /** performance.now() when she dropped in. */
  startAt: 0,
};

export const skate = createStore(OFF);

/** Seconds into the run at `now`. */
export function runTime(now: number): number {
  const s = skate.get();
  return s.phase === "riding" ? (now - s.startAt) / 1000 : 0;
}

export function dropIn(now: number) {
  skate.set({ ...OFF, phase: "riding", startAt: now });
}

export function bail() {
  skate.set(OFF);
}

export function trick(now: number) {
  const s = skate.get();
  if (s.phase === "over") return dropIn(now);
  if (s.phase !== "riding") return;
  const run = pressRun(s.run, runTime(now));
  if (run === s.run) return;
  if (run.last && run.last.grade !== "bail")
    crowd.cheer = run.last.grade === "perfect" ? 1 : 0.5;
  skate.set({ run });
}

/** The scene calls this each frame: the clock runs the run out. */
export function tick(now: number) {
  const s = skate.get();
  if (s.phase === "riding" && runTime(now) >= RUN_SECONDS) {
    award("skate", s.run.score);
    skate.set({ phase: "over" });
  }
}
