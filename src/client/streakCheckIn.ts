// Opening the game on a new day counts toward the daily streak (and again if
// the tab stays open past midnight): the record grows, a milestone pays coins,
// Street XP and, at day 30, an outfit, and the celebration is posted. Loaded on demand by
// App.tsx so the streak rules stay out of the first download.

import type { MutableRefObject } from "react";
import { dayOf } from "../game/challenges.ts";
import type { SaveV1 } from "../game/save.ts";
import { applyCheckIn } from "../game/progression/streakReward.ts";
import { checkIn } from "../game/streak.ts";
import { postCheckIn } from "./ui/Streak.tsx";

/** Counts today for the streak; a no-op when today is already counted. */
export function countToday(
  latest: MutableRefObject<SaveV1>,
  setSave: (update: (s: SaveV1) => SaveV1) => void,
) {
  const day = dayOf(Date.now());
  const r = checkIn(latest.current.streak, day);
  if (!r.fresh) return;
  // the next check in this tab sees the new record even before a render
  latest.current = { ...latest.current, streak: r.save };
  setSave((s) => applyCheckIn(s, day));
  postCheckIn(r.reward, r.froze);
}
