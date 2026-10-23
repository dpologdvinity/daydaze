import {
  dive,
  entryAt,
  gameOver,
  newDives,
  total,
  type Dives,
  type TrickId,
} from "../../../game/cliffDive.ts";
import { award } from "../../ui/prizeDesk.ts";
import { createStore } from "../shared/store.ts";

/** A set of cliff dives: pick the trick, stop the entry meter, splash. */
export type Phase = "off" | "pick" | "entry" | "splash" | "over";
const SPLASH = 1.3;

const OFF = {
  phase: "off" as Phase,
  dives: newDives() as Dives,
  trick: "pencil" as TrickId,
  /** performance.now() the phase began. */
  since: 0,
};

export const diving = createStore(OFF);

export const start = () => diving.set({ ...OFF, phase: "pick" });
export const leave = () => diving.set(OFF);

export function pick(trick: TrickId, now: number) {
  if (diving.get().phase === "pick")
    diving.set({ phase: "entry", trick, since: now });
}

export const entryNow = (now: number) => {
  const s = diving.get();
  return entryAt(s.trick, (now - s.since) / 1000);
};

export function press(now: number) {
  const s = diving.get();
  if (s.phase !== "entry") return;
  diving.set({
    phase: "splash",
    dives: dive(s.dives, s.trick, entryNow(now)),
    since: now,
  });
}

/** Moves on from the splash once it's had a moment. */
export function tick(now: number) {
  const s = diving.get();
  if (s.phase !== "splash" || now - s.since < SPLASH * 1000) return;
  if (gameOver(s.dives)) {
    diving.set({ phase: "over", since: now });
    award("cliff-dive", total(s.dives));
  } else diving.set({ phase: "pick", since: now });
}
