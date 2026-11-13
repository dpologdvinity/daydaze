// Standing conversations inside venues: where a huddle of two to four stands
// in a room (ChatGroup.tsx draws it; game/dance/conversation.ts moves it).
// The city's sidewalk groups are in city/chatGroups.ts. A spot is the middle
// of the ring; its people stand a little round it, and the test keeps all of
// them on open floor.

import type { RoomId } from "./rooms.ts";
import type { Vec2 } from "./walk.ts";

export type ChatSpot = { at: Vec2; seed: number; size: 2 | 3 | 4 };

/** The ring's radius (m) for a group of `size`: wider for more people. */
export const CHAT_RING: Readonly<Record<2 | 3 | 4, number>> = {
  2: 0.55,
  3: 0.65,
  4: 0.75,
};

export const CHAT_SPOTS: Partial<Record<RoomId, readonly ChatSpot[]>> = {
  // by the entrance, clear of the shoppers' laps round the fountain
  galleria: [{ at: [3.4, 5.2], seed: 31, size: 3 }],
  // on the landing, between the benches and the bar
  marina: [{ at: [-1.6, 5.4], seed: 17, size: 2 }],
};
