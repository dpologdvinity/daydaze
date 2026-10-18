// The 18+ line. The main world is 16+; these rooms are 18+ and must not
// reach real players before the server-side age check ships (roadmap M10).
// Until then the client only lets a development build in, with ?adult=1.
import type { RoomId } from "./rooms.ts";

export const ADULT_ROOMS: ReadonlySet<RoomId> = new Set<RoomId>(["green-haze"]);

/** Whether `room` may be entered: everything but the 18+ rooms, which need
 * `adultOk` (the age check, or a development build's flag). */
export function mayEnter(room: RoomId, adultOk: boolean): boolean {
  return adultOk || !ADULT_ROOMS.has(room);
}
