// The cliff-dive session: the pure engine (cliffDive.ts) on a clock. The
// dive itself plays in the world (DiveScene.tsx); the panel picks tricks
// and keeps score.

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
export type Phase = "off" | "climb" | "pick" | "entry" | "splash" | "over";
/** The dive's beat after the press: the flight (DiveScene's FLY, 1.35 s),
 * the splash, and the judge's card. */
const SPLASH = 2.9;
/** The longest the climb waits for the diver to reach the board, s (a paused
 * 3D view never walks her there). */
const CLIMB_WAIT = 6;

const OFF = {
  phase: "off" as Phase,
  dives: newDives() as Dives,
  trick: "pencil" as TrickId,
  /** performance.now() the phase began. */
  since: 0,
};

export const diving = createStore(OFF);

/** Off to the tower: she climbs, then picks her first trick. */
export const start = () =>
  diving.set({ ...OFF, phase: "climb", since: performance.now() });

/** The dive scene: she's out on the board. */
export function onBoard() {
  if (diving.get().phase === "climb") diving.set({ phase: "pick" });
}
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
  if (s.phase === "climb" && now - s.since >= CLIMB_WAIT * 1000) {
    diving.set({ phase: "pick" });
    return;
  }
  if (s.phase !== "splash" || now - s.since < SPLASH * 1000) return;
  if (gameOver(s.dives)) {
    diving.set({ phase: "over", since: now });
    award("cliff-dive", total(s.dives));
  } else diving.set({ phase: "pick", since: now });
}
