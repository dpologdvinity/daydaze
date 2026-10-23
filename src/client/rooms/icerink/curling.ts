import {
  aimAt,
  endOver,
  endScore,
  newEnd,
  rest,
  slide,
  weightAt,
  type End,
} from "../../../game/curling.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** A curling end: aim, weight, then the slide (sweep it), six stones. */
export type Phase = "off" | "aim" | "weight" | "sliding" | "over";

const OFF = {
  phase: "off" as Phase,
  end: newEnd() as End,
  /** performance.now() the phase began. */
  since: 0,
  aim: 0,
  weight: 0,
  /** Seconds into the slide at each press of Sweep. */
  sweeps: [] as number[],
};

export const curling = createStore(OFF);

const secs = (now: number) => (now - curling.get().since) / 1000;
export const aimNow = (now: number) => aimAt(secs(now));
export const weightNow = (now: number) => weightAt(secs(now));

export function start(now: number) {
  curling.set({ ...OFF, phase: "aim", since: now });
}

export function leave() {
  curling.set(OFF);
}

/** Where the stone in play is now, or null between throws. */
export function stoneNow(now: number) {
  const s = curling.get();
  if (s.phase !== "sliding") return null;
  return slide({ aim: s.aim, weight: s.weight }, s.sweeps, secs(now));
}

/** `seen` is the phase the button showed: a press on a stale label drops. */
export function press(now: number, seen?: Phase) {
  const s = curling.get();
  if (seen !== undefined && seen !== s.phase) return;
  if (s.phase === "aim")
    curling.set({ phase: "weight", aim: aimNow(now), since: now });
  else if (s.phase === "weight")
    curling.set({
      phase: "sliding",
      weight: weightNow(now),
      sweeps: [],
      since: now,
    });
  else if (s.phase === "sliding")
    curling.set({ sweeps: [...s.sweeps, secs(now)] });
}

/** Rests the stone once it stops; ends the end after the last one. */
export function tick(now: number) {
  const s = curling.get();
  const at = stoneNow(now);
  if (!at?.stopped) return;
  const end = rest(s.end, at);
  if (endOver(end)) {
    curling.set({ phase: "over", end, since: now });
    award("curling", endScore(end));
  } else curling.set({ phase: "aim", end, since: now });
}
