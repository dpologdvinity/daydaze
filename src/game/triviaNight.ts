// Trivia night's quiz host: on the night, each club that runs it (events.ts)
// puts a host on the floor with a glowing pad in front of them that opens a
// hosted round of Throwback Trivia (src/minigames/trivia/). Off the night
// there is neither. One layout, shared by the hotspots and the client scenes.
import { nightsAt } from "./events.ts";
import type { RoomId } from "./rooms.ts";
import type { Vec2 } from "./walk.ts";

/** Where the host stands (`at`, facing `rot` radians about Y) and where you
 * stand to play (`spot`), per club. Both are on open floor. */
export const TRIVIA_HOSTS: Partial<
  Record<RoomId, { at: Vec2; rot: number; spot: Vec2 }>
> = {
  // the open west wall of Cellar 214, facing east into the room
  "wine-bar": { at: [-6, 1.2], rot: Math.PI / 2, spot: [-4.6, 1.2] },
  // the diner's south-east corner, clear of the skaters' loop
  "skate-diner": { at: [5.6, 3.4], rot: -Math.PI / 2, spot: [4.2, 3.4] },
};

/** Whether a trivia round in `room` at `ms` is the night's hosted one. */
export const hostedTrivia = (room: RoomId, ms: number): boolean =>
  TRIVIA_HOSTS[room] !== undefined &&
  nightsAt(room, ms).some((n) => n.id === "trivia-night");
