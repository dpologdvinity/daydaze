// The move a venue's dancer is doing right now (game/dance/venueDances.ts): her
// style's, or the line dance the floor was called to, changing as the shared
// clock moves on. The club night clock decides the night, so `?night=<id>`
// shows a night's style.

import { useEffect, useState } from "react";
import type { DanceMoveId } from "../../../game/dance/moves.ts";
import { crowdMove, nextChangeAt } from "../../../game/dance/venueDances.ts";
import type { RoomId } from "../../../game/rooms.ts";
import { nightClock } from "../../city/eventClocks.ts";

/** The dancer's move on `floor` (undefined when she has no floor to follow). */
export function useCrowdMove(
  floor: RoomId | undefined,
  seed: number,
): DanceMoveId | undefined {
  const [move, setMove] = useState<DanceMoveId | undefined>(() =>
    floor ? crowdMove(floor, seed, nightClock()).move : undefined,
  );
  useEffect(() => {
    if (!floor) {
      setMove(undefined);
      return;
    }
    let timer = 0;
    const tick = () => {
      const ms = nightClock();
      setMove(crowdMove(floor, seed, ms).move);
      // wake when this dancer's move can next change (not before half a second)
      timer = window.setTimeout(
        tick,
        Math.max(500, nextChangeAt(seed, ms) - ms),
      );
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [floor, seed]);
  return move;
}
