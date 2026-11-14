// The weekly night on in a room right now, for whatever in the room cares
// (its decor, its camera). Worked out as the room is drawn, so a new room
// never shows the last room's night, and re-checked every half minute so a
// night starting while you are there shows up.

import { useEffect, useState } from "react";
import { nightsAt, type ClubNight } from "../../game/events.ts";
import type { RoomId } from "../../game/rooms.ts";
import { nightClock } from "../city/eventClocks.ts";

/** The night on in `room` right now, or null. */
export function useNight(room: RoomId): ClubNight | null {
  // the tick only makes the caller draw again, which reads the clock again
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return nightsAt(room, nightClock())[0] ?? null;
}
