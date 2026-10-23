import {
  bendAt,
  finishTenths,
  rivalTenths,
  runOver,
  tuck,
  type Run,
} from "../../../game/speedSlide.ts";
import { gradeSwing, type Swing } from "../../../game/tennis.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** A speed slide race: tuck as you hit each bend, then the times. */
export type Phase = "off" | "sliding" | "over";

const OFF = {
  phase: "off" as Phase,
  run: [] as Run,
  seed: 0,
  /** performance.now() of the push-off. */
  since: 0,
  last: null as Swing | null,
};

export const slide = createStore(OFF);

export function start(now: number) {
  slide.set({
    ...OFF,
    phase: "sliding",
    seed: Math.floor(Math.random() * 1e9),
    since: now,
  });
}

export const leave = () => slide.set(OFF);

/** performance.now() the next bend arrives. */
export const nextBend = () => {
  const s = slide.get();
  return s.since + bendAt(s.run.length) * 1000;
};

function take(now: number, swing: Swing) {
  const s = slide.get();
  const run = tuck(s.run, swing);
  slide.set({ run, last: swing });
  if (runOver(run)) {
    slide.set({ phase: "over", since: now });
    award("speed-slide", finishTenths(run));
  }
}

export function press(now: number) {
  if (slide.get().phase === "sliding")
    take(now, gradeSwing((now - nextBend()) / 1000));
}

/** A bend you didn't tuck for scrubs your speed. */
export function tick(now: number) {
  if (slide.get().phase === "sliding" && now - nextBend() > 400)
    take(now, "late");
}

export const rivalNow = () => rivalTenths(slide.get().seed);
