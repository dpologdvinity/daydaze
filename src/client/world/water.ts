// The rooms where the player is in the sea: how deep it is under her, and
// whether she is diving (always afloat, a body's height off the seabed) or at
// the surface (wading until she is out of her depth, then swimming).

import { depthAt as reefDepth, terrainY } from "../../game/dive.ts";
import { depthAt as seaDepth } from "../../game/openWater.ts";
import type { RoomId } from "../../game/rooms.ts";

export type Water = {
  /** Meters of water over the floor at x, z (0 on dry sand). */
  depthAt: (x: number, z: number) => number;
  /** Underwater on scuba: afloat everywhere, off the bottom. */
  dive: boolean;
  /** The seabed's height under her, when it is not level (the reef's dunes). */
  floorAt?: (x: number, z: number) => number;
};

export const WATER: Partial<Record<RoomId, Water>> = {
  "open-water": { depthAt: seaDepth, dive: false },
  "reef-dive": { depthAt: reefDepth, dive: true, floorAt: terrainY },
};
