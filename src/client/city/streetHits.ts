// What cars have done on the city's street this visit, shared by the frame
// loops: Traffic.tsx posts a car hitting the player on foot and counts the
// hard stops, CarHits.tsx plays them and runs the player's own car into
// walkers, and Pedestrians.tsx draws each walker where her street state
// (game/city/streetKnocks.ts) puts her. Plain module values, read each frame.

import { newStreet, type StreetState } from "../../game/city/streetKnocks.ts";
import type { TrafficHit } from "../../game/city/traffic.ts";
import type { HeistFrame } from "../../game/city/heist.ts";
import type { ChaseFrame } from "../../game/city/chase.ts";

export const streetHits: {
  /** Walkers a car has come near, by their PEDESTRIANS index. */
  walkers: Map<number, StreetState>;
  /** A traffic car that just hit the player on foot, until CarHits plays it. */
  hit: TrafficHit | null;
  /** The hard stops traffic has made for the player in the road. */
  alarms: number;
  heist: HeistFrame | null;
  chase: ChaseFrame | null;
} = { walkers: new Map(), hit: null, alarms: 0, heist: null, chase: null };

/** Walker `i`'s street state, made the first time a car comes near her. */
export function walkerState(i: number): StreetState {
  let s = streetHits.walkers.get(i);
  if (!s) {
    s = newStreet();
    streetHits.walkers.set(i, s);
  }
  return s;
}
